import { describe, expect, it } from "vitest";
import { ActionService } from "../../src/actions/action-service.js";
import { VoicePipeline } from "../../src/orchestrators/voice-pipeline.js";
import { LatencyLogger } from "../../src/services/latency-logger.js";
import { SessionMemoryService } from "../../src/services/session-memory.js";
import type { IntentResult, Message } from "../../src/types/index.js";

class StubSttService {
  constructor(private readonly text: string) {}
  async transcribe(): Promise<string> {
    return this.text;
  }
}

class StubIntentService {
  constructor(private readonly intent: IntentResult) {}
  async detectIntent(_input: string, _history: Message[]): Promise<IntentResult> {
    return this.intent;
  }
}

class StubTtsService {
  async synthesize(_text: string): Promise<string> {
    return "outputs/fake.aiff";
  }
}

describe("VoicePipeline integration", () => {
  it("runs end-to-end and stores name in session memory", async () => {
    const memory = new SessionMemoryService();
    const session = memory.createSession();
    const logger = new LatencyLogger();

    const intent: IntentResult = {
      intent: "policy_enquiry",
      confidence: 0.95,
      extractedEntities: { customerName: "Maria", policyId: "POL-1122" },
      replyDraft: "I can check this for you"
    };

    const pipeline = new VoicePipeline(
      new StubSttService("My name is Maria. What is my policy status?") as never,
      new StubIntentService(intent) as never,
      new ActionService(),
      new StubTtsService() as never,
      memory,
      logger
    );

    const result = await pipeline.runTurn({
      sessionId: session.id,
      audioPath: "uploads/test.wav"
    });

    expect(result.intent.intent).toBe("policy_enquiry");
    expect(result.action.status).toBe("success");
    expect(result.tts.outputPath).toBe("outputs/fake.aiff");

    const updated = memory.getSession(session.id);
    expect(updated.entities.customerName).toBe("Maria");
    expect(updated.messages.length).toBe(2);
  });

  it("clears context after session end", async () => {
    const memory = new SessionMemoryService();
    const session = memory.createSession();
    memory.setCustomerName(session.id, "Chris");

    memory.clearSession(session.id);

    expect(() => memory.getSession(session.id)).toThrow(/Session not found/);
  });
});
