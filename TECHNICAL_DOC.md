# TECHNICAL_DOC

## 1) System Architecture

Core modules:
- `SttService`: runs local Whisper CLI and returns transcript.
- `LlmService`: calls Ollama Cloud `/api/chat`.
- `IntentService`: enforces prompt contract and validates structured JSON intent output.
- `ActionService`: simulates policy, claim, and appointment workflows.
- `SessionMemoryService`: stores conversation turns and customer name by session.
- `TtsService`: synthesizes response audio via macOS `say`.
- `VoicePipeline`: orchestrates end-to-end turn execution and timing.
- `LatencyLogger`: writes step timings in NDJSON format.

Flow per turn:
1. Receive audio file for `sessionId`
2. STT transcription
3. Intent + entities extraction via LLM
4. Simulated action execution
5. Session memory update
6. TTS generation
7. Structured latency logging

## 2) Technology Decisions

### STT: Local Whisper
- Chosen to satisfy local STT requirement and Apple Silicon compatibility.
- Works with `.wav/.m4a/...` input and provides accurate transcription.

### LLM: Ollama Cloud API
- User-provided stack requirement.
- Flexible model choice through `.env` (`OLLAMA_MODEL`).
- JSON-oriented prompt contract improves intent parsing reliability.

### TTS: macOS native `say`
- No external TTS dependency.
- Works natively on Apple Silicon and easy to benchmark.

## 3) Prompt Design and Versioning

Prompt file: `src/prompts/intent-system.ts`

Version metadata: `src/storage/prompt-versions.ts`

Design principles:
- strict JSON output contract
- fixed intent enum
- confidence and extracted entities included
- explicit unknown-intent fallback behavior

Versioning approach:
- each prompt update increments version metadata
- changelog notes capture what changed and why

## 4) Memory and Session Behavior

- Session created via `POST /api/session`
- Full message history stored in-memory per session
- Customer name is extracted and persisted for follow-up turns
- Session clear via `POST /api/session/end` removes history and entities

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
- outputs min/max/avg/p95 across recorded turns

## 6) Validation and Testing

Implemented tests:
- unit tests for session memory behavior
- unit tests for action simulation behavior
- integration test for full `VoicePipeline` execution with mocked dependencies

Acceptance points covered:
- required intent families supported in action layer
- fallback path covered
- name recall in-session covered
- session clear behavior covered

## 7) Known Limitations and Improvements

Current limitations:
- session memory is in-process only (resets on restart)
- no real backend integration for policy/claim/appointment systems
- no streaming STT/LLM/TTS pipeline yet

Suggested next improvements:
- add persistent cross-session memory (SQLite)
- add request tracing IDs for distributed debugging
- support German intents and bilingual response policies
- implement real telephony adapters (Twilio/SIP)
