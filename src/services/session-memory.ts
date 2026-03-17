import { nanoid } from "nanoid";
import type { Message, SessionState } from "../types/index.js";

export class SessionMemoryService {
  private readonly sessions = new Map<string, SessionState>();

  createSession(): SessionState {
    const now = new Date().toISOString();
    const session: SessionState = {
      id: nanoid(12),
      messages: [],
      entities: {},
      createdAt: now,
      updatedAt: now
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  appendMessages(sessionId: string, messages: Message[]): SessionState {
    const session = this.getSession(sessionId);
    session.messages.push(...messages);
    session.updatedAt = new Date().toISOString();
    return session;
  }

  setCustomerName(sessionId: string, customerName: string): SessionState {
    const session = this.getSession(sessionId);
    session.entities.customerName = customerName;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  listSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}
