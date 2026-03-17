import { describe, expect, it } from "vitest";
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
});
