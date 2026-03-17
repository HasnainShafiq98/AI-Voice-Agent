import { z } from "zod";
import { INTENT_SYSTEM_PROMPT } from "../prompts/intent-system.js";
import type { IntentResult, Message } from "../types/index.js";
import { safeJsonParse } from "../utils/json.js";
import { LlmService } from "./llm-service.js";

const intentSchema = z.object({
  intent: z
    .enum(["policy_enquiry", "report_claim", "schedule_appointment", "unknown_intent"])
    .default("unknown_intent"),
  confidence: z.number().min(0).max(1).default(0.2),
  extractedEntities: z
    .object({
      customerName: z.string().nullable().optional(),
      policyId: z.string().nullable().optional(),
      claimType: z.string().nullable().optional(),
      appointmentDate: z.string().nullable().optional(),
      appointmentAction: z.enum(["schedule", "cancel"]).nullable().optional()
    })
    .default({}),
  replyDraft: z.string().default("I can help with policy enquiries, claims, or appointments."),
  reason: z.string().optional()
});

export class IntentService {
  constructor(private readonly llmService: LlmService) {}

  async detectIntent(input: string, history: Message[]): Promise<IntentResult> {
    const messages: Message[] = [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user", content: input }
    ];

    const raw = await this.llmService.chat(messages);
    const parsed = safeJsonParse<unknown>(raw);
    const validated = intentSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        intent: "unknown_intent",
        confidence: 0,
        extractedEntities: {},
        replyDraft:
          "I can help with policy status, reporting a claim, or scheduling/canceling an appointment. Which one do you need?",
        reason: "Invalid model JSON output"
      };
    }

    const out = validated.data;

    if (out.intent === "unknown_intent" || out.confidence < 0.35) {
      return {
        intent: "unknown_intent",
        confidence: out.confidence,
        extractedEntities: {
          customerName: out.extractedEntities.customerName ?? undefined,
          policyId: out.extractedEntities.policyId ?? undefined,
          claimType: out.extractedEntities.claimType ?? undefined,
          appointmentDate: out.extractedEntities.appointmentDate ?? undefined,
          appointmentAction: out.extractedEntities.appointmentAction ?? undefined
        },
        replyDraft:
          "I can help with policy status, starting a claim report, or scheduling/canceling an appointment. Please tell me which one you want.",
        reason: out.reason
      };
    }

    return {
      intent: out.intent,
      confidence: out.confidence,
      extractedEntities: {
        customerName: out.extractedEntities.customerName ?? undefined,
        policyId: out.extractedEntities.policyId ?? undefined,
        claimType: out.extractedEntities.claimType ?? undefined,
        appointmentDate: out.extractedEntities.appointmentDate ?? undefined,
        appointmentAction: out.extractedEntities.appointmentAction ?? undefined
      },
      replyDraft: out.replyDraft,
      reason: out.reason
    };
  }
}
