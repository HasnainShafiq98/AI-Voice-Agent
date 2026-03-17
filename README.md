# AI Voice Agent (TypeScript, Apple Silicon)

End-to-end insurance support voice agent for:
- policy status enquiry
- claim reporting
- appointment scheduling/cancellation

Pipeline: `audio -> local Whisper STT -> Ollama Cloud LLM intent/action -> macOS say TTS`.

## Prerequisites

- Apple Silicon Mac (M-series)
- Node.js 20+
- Python Whisper CLI installed and available as `whisper`
- macOS `say` command available (native)
- Ollama Cloud API URL and API key

## Apple Silicon Proof

Captured on this implementation environment:

```bash
$ uname -m
arm64

$ sw_vers
ProductName:    macOS
ProductVersion: 26.2
BuildVersion:   25C56

$ node -v
v24.5.0
```

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` with your Ollama Cloud values.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## API

- `POST /api/session` create session
- `GET /api/session` list active sessions
- `POST /api/turn` multipart form-data:
  - `sessionId` string
  - `audio` file
- `POST /api/session/end` clear context
- `GET /api/health` health check

## Testing

```bash
npm run typecheck
npm test
```

## Latency Logging

Turn latency is appended to `logs/latency.ndjson` with:
- `sttMs`
- `llmMs`
- `ttsMs`
- `totalMs`

Generate summary:

```bash
npm run latency:summary
```

## Prompt Versioning

- Prompt templates live in `src/prompts/`
- Version metadata lives in `src/storage/prompt-versions.ts`

## Known Limitations

- Whisper CLI must be preinstalled and can vary by machine setup.
- Business actions are simulated, not connected to real insurance systems.
- LLM output quality depends on provider/model behavior.
- UI is intentionally minimal for case-study demo purposes.
