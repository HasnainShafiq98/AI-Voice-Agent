import { ActionService } from "../actions/action-service.js";
import type { TurnRequest, TurnResult } from "../types/index.js";
import { measureAsync } from "../utils/timer.js";
import { IntentService } from "../services/intent-service.js";
import { LatencyLogger } from "../services/latency-logger.js";
import { SessionMemoryService } from "../services/session-memory.js";
import { SttService } from "../services/stt-service.js";
import { TtsService } from "../services/tts-service.js";

export class VoicePipeline {
  constructor(
    private readonly stt: SttService,
    private readonly intentService: IntentService,
    private readonly actionService: ActionService,
    private readonly tts: TtsService,
    private readonly memory: SessionMemoryService,
    private readonly latencyLogger: LatencyLogger
  ) {}

  async runTurn(request: TurnRequest): Promise<TurnResult> {
    const overallStart = performance.now();
    const session = this.memory.getSession(request.sessionId);

    const sttTimed = await measureAsync(async () => this.stt.transcribe(request.audioPath));
    const transcript = sttTimed.value;

    const llmTimed = await measureAsync(async () =>
      this.intentService.detectIntent(transcript, session.messages)
    );
    const intent = llmTimed.value;

    if (intent.extractedEntities.customerName) {
      this.memory.setCustomerName(request.sessionId, intent.extractedEntities.customerName);
    }

    const action = this.actionService.run(intent, this.memory.getSession(request.sessionId));

    this.memory.appendMessages(request.sessionId, [
      { role: "user", content: transcript },
      { role: "assistant", content: action.message }
    ]);

    const ttsTimed = await measureAsync(async () => this.tts.synthesize(action.message));

    const latency = {
      sttMs: sttTimed.ms,
      llmMs: llmTimed.ms,
      ttsMs: ttsTimed.ms,
      totalMs: Math.round(performance.now() - overallStart)
    };

    this.latencyLogger.log({
      sessionId: request.sessionId,
      timestamp: new Date().toISOString(),
      intent: intent.intent,
      metrics: latency
    });

    return {
      sessionId: request.sessionId,
      transcript,
      intent,
      action,
      assistantResponse: action.message,
      tts: { outputPath: ttsTimed.value },
      latency
    };
  }
}
