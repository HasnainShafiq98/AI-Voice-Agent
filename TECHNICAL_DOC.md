# TECHNICAL_DOC

## 1) System Architecture

Core modules:
- `SttService`: runs local Whisper CLI and returns transcript.
- `LlmService`: calls Ollama `/api/chat` and returns model content.
- `IntentService`: validates JSON intent output and applies deterministic bilingual fallback heuristics when LLM output is invalid, unknown, or low confidence.
- `ActionService`: simulates policy, claim, and appointment workflows in English and German.
- `SessionMemoryService`: manages in-session turn history and persists cross-session customer profiles to JSON.
- `TtsService`: synthesizes speech using macOS `say` (preferred) or Linux `espeak` fallback, then converts output to MP3 via ffmpeg.
- `VoicePipeline`: orchestrates end-to-end turn execution and timing.
- `LatencyLogger`: writes step timings in NDJSON format.

Flow per turn:
1. Receive audio file for `sessionId`
2. STT transcription
3. Intent + entities extraction via LLM
4. Heuristic intent fallback if model output is invalid/low confidence
5. Simulated action execution
6. Session + cross-session memory update
7. TTS generation and MP3 conversion
8. Structured latency logging

## 2) Technology Decisions

### STT: Local Whisper
- Chosen to satisfy local STT requirement and Apple Silicon compatibility.
- Runtime configuration supports multilingual model with automatic language detection (`WHISPER_MODEL=base`, `WHISPER_LANGUAGE=auto`).

### LLM: Ollama Cloud API
- Flexible model selection via `.env` (`OLLAMA_MODEL`).
- Intent prompt enforces strict JSON shape and includes `responseLanguage`.
- Heuristic fallback ensures robust intent detection for clear phrases even when model output quality varies.

### TTS: `say`/`espeak` + ffmpeg
- macOS path: `say` for native speech synthesis.
- Linux/container path: `espeak` fallback when `say` is unavailable.
- ffmpeg converts generated audio to MP3 for browser playback compatibility.

### Containerization
- `Dockerfile` builds a production image with Node.js, Whisper CLI, ffmpeg, and espeak.
- `docker-compose.yml` runs the service with persistent mounts for `uploads/`, `outputs/`, `logs/`, and `data/`.

## 3) Prompt Design and Versioning

Prompt file:
- `src/prompts/intent-system.ts`

Version metadata:
- `src/storage/prompt-versions.ts`

Design principles:
- strict JSON output contract
- fixed intent enum
- explicit `responseLanguage` (`en`/`de`)
- confidence and extracted entities included
- explicit unknown-intent fallback behavior

Versioning approach:
- each prompt update increments version metadata
- changelog notes capture what changed and why

## 4) Memory and Session Behavior

In-session memory:
- session created via `POST /api/session`
- full message history stored in-memory per session
- customer name, preferred language, and optional last policy ID tracked in session entities
- session clear via `POST /api/session/end` removes in-process session context

Cross-session memory (JSON):
- stored at `data/customer-memory.json`
- profile fields: customerName, preferredLanguage, turnCount, lastIntent, lastPolicyId, updatedAt
- when a known customer appears in a new session, profile context is hydrated (returning-customer behavior)

## 5) Observability and Latency

Per-turn logged timings:
- `sttMs`
- `llmMs`
- `ttsMs`
- `totalMs`

Storage:
- `logs/latency.ndjson`

Summary script:
- `npm run latency:summary`
- filters out zero or invalid records
- outputs min/max/avg/p95 and excluded record count

Current benchmark snapshot (`npm run latency:summary`):
- sampleSize: 37
- excludedRecords: 10
- STT: min 1940, avg 3451, p95 10852, max 20549
- LLM: min 1482, avg 2869, p95 5108, max 6193
- TTS: min 646, avg 720, p95 821, max 830
- Total: min 4437, avg 7040, p95 16299, max 25043

## 6) Validation and Testing

Implemented tests:
- unit tests for session memory behavior (including persistence hydration)
- unit tests for action simulation behavior
- integration test for full `VoicePipeline` execution with mocked dependencies

Validation commands:
- `npm run typecheck`
- `npm test`

Acceptance points covered:
- required intent families supported
- fallback path covered
- name recall in-session covered
- session clear behavior covered
- cross-session JSON persistence implemented
- German support implemented

## 7) Known Limitations and Improvements

Current limitations:
- file-based cross-session storage is not designed for high-concurrency multi-instance writes
- business actions are simulated and not connected to insurer backend systems
- no real-time streaming STT/LLM/TTS pipeline yet

Suggested next improvements:
- move persistent memory to SQLite or managed database with concurrency guarantees
- add tracing IDs and structured request correlation for debugging
- add domain-specific extraction for German entity normalization
- integrate telephony adapters (Twilio/SIP)
