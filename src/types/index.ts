export type IntentType =
  | "policy_enquiry"
  | "report_claim"
  | "schedule_appointment"
  | "unknown_intent";

export interface PromptVersion {
  version: string;
  updatedAt: string;
  notes: string;
}

export interface SessionEntityMemory {
  customerName?: string;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SessionState {
  id: string;
  messages: Message[];
  entities: SessionEntityMemory;
  createdAt: string;
  updatedAt: string;
}

export interface TurnRequest {
  sessionId: string;
  audioPath: string;
}

export interface LatencyMetrics {
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  totalMs: number;
}

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  extractedEntities: {
    customerName?: string;
    policyId?: string;
    claimType?: string;
    appointmentDate?: string;
    appointmentAction?: "schedule" | "cancel";
  };
  replyDraft: string;
  reason?: string;
}

export interface ActionResult {
  type: IntentType;
  status: "success" | "fallback";
  data: Record<string, string>;
  message: string;
}

export interface TurnResult {
  sessionId: string;
  transcript: string;
  intent: IntentResult;
  action: ActionResult;
  assistantResponse: string;
  tts: {
    outputPath: string;
  };
  latency: LatencyMetrics;
}
