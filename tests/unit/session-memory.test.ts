import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ActionResult, IntentResult } from "../../src/types/index.js";
import { SessionMemoryService } from "../../src/services/session-memory.js";

describe("SessionMemoryService", () => {
  it("stores and updates customer name across turns", () => {
    const memory = new SessionMemoryService();
    const session = memory.createSession();

    memory.appendMessages(session.id, [{ role: "user", content: "Hi" }]);
    memory.setCustomerName(session.id, "Alex");

    const current = memory.getSession(session.id);
    expect(current.entities.customerName).toBe("Alex");
    expect(current.messages).toHaveLength(1);
  });

  it("clears context when session ends", () => {
    const memory = new SessionMemoryService();
    const session = memory.createSession();

    memory.clearSession(session.id);

    expect(() => memory.getSession(session.id)).toThrow(/Session not found/);
  });

  it("persists and reloads customer profile across service instances", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-test-"));
    const storePath = path.join(tempDir, "customer-memory.json");

    const first = new SessionMemoryService(storePath);
    const firstSession = first.createSession();
    first.setCustomerName(firstSession.id, "Maria", "de");

    const intent: IntentResult = {
      intent: "policy_enquiry",
      responseLanguage: "de",
      confidence: 0.91,
      extractedEntities: { customerName: "Maria", policyId: "POL-7788" },
      replyDraft: "Bitte nennen Sie Ihre Policenummer."
    };

    const action: ActionResult = {
      type: "policy_enquiry",
      status: "success",
      data: {
        policyId: "POL-7788",
        policyStatus: "Active",
        renewalDate: "2026-12-31"
      },
      message: "Ihre Police POL-7788 ist aktiv."
    };

    first.recordTurn(firstSession.id, intent, action);

    const second = new SessionMemoryService(storePath);
    const secondSession = second.createSession();
    second.setCustomerName(secondSession.id, "Maria");

    const hydrated = second.getSession(secondSession.id);
    expect(hydrated.entities.isReturningCustomer).toBe(true);
    expect(hydrated.entities.preferredLanguage).toBe("de");
    expect(hydrated.entities.lastPolicyId).toBe("POL-7788");

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
