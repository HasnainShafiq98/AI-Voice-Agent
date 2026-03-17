import { describe, expect, it } from "vitest";
import { ActionService } from "../../src/actions/action-service.js";
import type { IntentResult, SessionState } from "../../src/types/index.js";

function buildSession(name?: string): SessionState {
  return {
    id: "s1",
    messages: [],
    entities: { customerName: name },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildIntent(intent: IntentResult["intent"]): IntentResult {
  return {
    intent,
    confidence: 0.9,
    extractedEntities: {},
    replyDraft: "draft"
  };
}

describe("ActionService", () => {
  const service = new ActionService();

  it("handles policy enquiry", () => {
    const result = service.run(buildIntent("policy_enquiry"), buildSession("Sam"));
    expect(result.status).toBe("success");
    expect(result.data.policyStatus).toBe("Active");
    expect(result.message).toContain("Sam");
  });

  it("handles claim report", () => {
    const intent = buildIntent("report_claim");
    intent.extractedEntities.claimType = "windshield damage";

    const result = service.run(intent, buildSession());
    expect(result.status).toBe("success");
    expect(result.data.claimType).toBe("windshield damage");
  });

  it("falls back for unknown intent", () => {
    const result = service.run(buildIntent("unknown_intent"), buildSession());
    expect(result.status).toBe("fallback");
  });
});
