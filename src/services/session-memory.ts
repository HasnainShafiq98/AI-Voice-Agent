import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import type {
  ActionResult,
  CustomerProfile,
  IntentResult,
  Message,
  ResponseLanguage,
  SessionState
} from "../types/index.js";
import { paths } from "../utils/fs.js";

const customerMemoryPath = path.join(paths.dataDir, "customer-memory.json");

function normalizeCustomerKey(name: string): string {
  return name.trim().toLowerCase();
}

export class SessionMemoryService {
  private readonly sessions = new Map<string, SessionState>();
  private readonly customerProfiles = new Map<string, CustomerProfile>();

  constructor(private readonly profilePath: string = customerMemoryPath) {
    fs.mkdirSync(path.dirname(this.profilePath), { recursive: true });
    this.loadProfiles();
  }

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

  setCustomerName(
    sessionId: string,
    customerName: string,
    preferredLanguage?: ResponseLanguage
  ): SessionState {
    const cleanName = customerName.trim();
    const session = this.getSession(sessionId);
    const existingProfile = this.customerProfiles.get(normalizeCustomerKey(cleanName));

    session.entities.customerName = cleanName;
    session.entities.isReturningCustomer = Boolean(existingProfile);

    if (existingProfile?.lastPolicyId) {
      session.entities.lastPolicyId = existingProfile.lastPolicyId;
    }

    if (preferredLanguage) {
      session.entities.preferredLanguage = preferredLanguage;
    } else if (existingProfile?.preferredLanguage) {
      session.entities.preferredLanguage = existingProfile.preferredLanguage;
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  setPreferredLanguage(sessionId: string, language: ResponseLanguage): SessionState {
    const session = this.getSession(sessionId);
    session.entities.preferredLanguage = language;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  recordTurn(sessionId: string, intent: IntentResult, action: ActionResult): void {
    const session = this.getSession(sessionId);
    const customerName = session.entities.customerName?.trim();
    if (!customerName) {
      return;
    }

    const key = normalizeCustomerKey(customerName);
    const now = new Date().toISOString();
    const existing = this.customerProfiles.get(key);

    const preferredLanguage =
      intent.responseLanguage ?? session.entities.preferredLanguage ?? existing?.preferredLanguage ?? "en";

    const profile: CustomerProfile = {
      customerName,
      preferredLanguage,
      turnCount: (existing?.turnCount ?? 0) + 1,
      lastIntent: intent.intent,
      lastPolicyId: action.data.policyId ?? intent.extractedEntities.policyId ?? existing?.lastPolicyId,
      updatedAt: now
    };

    this.customerProfiles.set(key, profile);
    this.persistProfiles();
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  listSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  listCustomerProfiles(): CustomerProfile[] {
    return Array.from(this.customerProfiles.values()).sort((a, b) =>
      a.customerName.localeCompare(b.customerName)
    );
  }

  private loadProfiles(): void {
    if (!fs.existsSync(this.profilePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.profilePath, "utf8");
      const parsed = JSON.parse(raw) as CustomerProfile[];
      if (!Array.isArray(parsed)) {
        return;
      }

      for (const profile of parsed) {
        if (!profile?.customerName) {
          continue;
        }
        this.customerProfiles.set(normalizeCustomerKey(profile.customerName), profile);
      }
    } catch {
      // Keep startup resilient if the JSON file is missing or malformed.
    }
  }

  private persistProfiles(): void {
    const serialized = JSON.stringify(this.listCustomerProfiles(), null, 2);
    fs.writeFileSync(this.profilePath, `${serialized}\n`, "utf8");
  }
}
