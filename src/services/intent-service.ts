import { z } from "zod";
import { INTENT_SYSTEM_PROMPT } from "../prompts/intent-system.js";
import type { IntentResult, Message, ResponseLanguage } from "../types/index.js";
import { safeJsonParse } from "../utils/json.js";
import { LlmService } from "./llm-service.js";

const intentSchema = z.object({
  intent: z
    .enum(["policy_enquiry", "report_claim", "schedule_appointment", "unknown_intent"])
    .default("unknown_intent"),
  responseLanguage: z.enum(["en", "de"]).optional(),
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

function detectLanguage(input: string): ResponseLanguage {
  const lower = input.toLowerCase();
  const germanSignals = [
    "hallo",
    "guten",
    "versicherung",
    "schaden",
    "termin",
    "stornieren",
    "absagen",
    "police",
    "ich moechte",
    "bitte"
  ];

  return germanSignals.some((token) => lower.includes(token)) ? "de" : "en";
}

function fallbackReply(language: ResponseLanguage): string {
  if (language === "de") {
    return "Ich kann beim Policenstatus, bei Schadenmeldungen oder bei Terminplanung helfen. Wobei kann ich helfen?";
  }

  return "I can help with policy status, reporting a claim, or scheduling/canceling an appointment. Which one do you need?";
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function detectHeuristicIntent(input: string): {
  intent: IntentResult["intent"];
  appointmentAction?: "schedule" | "cancel";
} | null {
  const lower = input.toLowerCase();

  const schedulePatterns = [
    /\bappointment\b/,
    /\bschedule\b/,
    /\bbook\b/,
    /\btermin\b/,
    /\bvereinbar\w*/,
    /\beinplan\w*/
  ];
  const cancelPatterns = [/\bcancel\b/, /\breschedule\b/, /\bstornier\w*/i, /\babsag\w*/i];

  if (hasAny(lower, schedulePatterns) || hasAny(lower, cancelPatterns)) {
    return {
      intent: "schedule_appointment",
      appointmentAction: hasAny(lower, cancelPatterns) ? "cancel" : "schedule"
    };
  }

  const claimPatterns = [
    /\bclaim\b/,
    /\bdamage\b/,
    /\breport\b/,
    /\bschaden\b/,
    /\banspruch\b/,
    /\bmeldung\b/
  ];
  if (hasAny(lower, claimPatterns)) {
    return { intent: "report_claim" };
  }

  const policyPatterns = [
    /\bpolicy\b/,
    /\bcoverage\b/,
    /\brenewal\b/,
    /\bversicherung\w*/,
    /\bpolic\w*/,
    /\bdeckung\w*/
  ];
  if (hasAny(lower, policyPatterns)) {
    return { intent: "policy_enquiry" };
  }

  return null;
}

function buildHeuristicReply(
  intent: IntentResult["intent"],
  language: ResponseLanguage,
  appointmentAction?: "schedule" | "cancel"
): string {
  if (intent === "schedule_appointment") {
    if (appointmentAction === "cancel") {
      return language === "de"
        ? "Gern. Ich kann Ihren Termin stornieren. Bitte nennen Sie Datum oder Referenz."
        : "Sure. I can cancel your appointment. Please share the date or reference.";
    }

    return language === "de"
      ? "Gern. Ich kann einen Termin fuer Sie einplanen. Bitte nennen Sie Ihr bevorzugtes Datum."
      : "Sure. I can schedule an appointment for you. Please share your preferred date.";
  }

  if (intent === "report_claim") {
    return language === "de"
      ? "Ich kann Ihre Schadenmeldung starten. Bitte beschreiben Sie den Vorfall kurz."
      : "I can help start your claim report. Please briefly describe the incident.";
  }

  if (intent === "policy_enquiry") {
    return language === "de"
      ? "Ich kann Ihren Policenstatus pruefen. Bitte nennen Sie Ihre Policenummer."
      : "I can check your policy status. Please provide your policy ID.";
  }

  return fallbackReply(language);
}

export class IntentService {
  constructor(private readonly llmService: LlmService) {}

  async detectIntent(input: string, history: Message[]): Promise<IntentResult> {
    const detectedLanguage = detectLanguage(input);
    const heuristic = detectHeuristicIntent(input);

    const messages: Message[] = [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user", content: input }
    ];

    const raw = await this.llmService.chat(messages);
    const parsed = safeJsonParse<unknown>(raw);
    const validated = intentSchema.safeParse(parsed);

    if (!validated.success) {
      if (heuristic) {
        return {
          intent: heuristic.intent,
          responseLanguage: detectedLanguage,
          confidence: 0.76,
          extractedEntities: {
            appointmentAction: heuristic.appointmentAction
          },
          replyDraft: buildHeuristicReply(
            heuristic.intent,
            detectedLanguage,
            heuristic.appointmentAction
          ),
          reason: "Heuristic fallback applied after invalid model JSON output"
        };
      }

      return {
        intent: "unknown_intent",
        responseLanguage: detectedLanguage,
        confidence: 0,
        extractedEntities: {},
        replyDraft: fallbackReply(detectedLanguage),
        reason: "Invalid model JSON output"
      };
    }

    const out = validated.data;
    const responseLanguage = out.responseLanguage ?? detectedLanguage;

    if ((out.intent === "unknown_intent" || out.confidence < 0.35) && heuristic) {
      return {
        intent: heuristic.intent,
        responseLanguage,
        confidence: Math.max(0.76, out.confidence),
        extractedEntities: {
          customerName: out.extractedEntities.customerName ?? undefined,
          policyId: out.extractedEntities.policyId ?? undefined,
          claimType: out.extractedEntities.claimType ?? undefined,
          appointmentDate: out.extractedEntities.appointmentDate ?? undefined,
          appointmentAction:
            heuristic.appointmentAction ?? out.extractedEntities.appointmentAction ?? undefined
        },
        replyDraft: buildHeuristicReply(heuristic.intent, responseLanguage, heuristic.appointmentAction),
        reason: "Heuristic fallback applied after unknown/low-confidence model intent"
      };
    }

    if (out.intent === "unknown_intent" || out.confidence < 0.35) {
      return {
        intent: "unknown_intent",
        responseLanguage,
        confidence: out.confidence,
        extractedEntities: {
          customerName: out.extractedEntities.customerName ?? undefined,
          policyId: out.extractedEntities.policyId ?? undefined,
          claimType: out.extractedEntities.claimType ?? undefined,
          appointmentDate: out.extractedEntities.appointmentDate ?? undefined,
          appointmentAction: out.extractedEntities.appointmentAction ?? undefined
        },
        replyDraft: fallbackReply(responseLanguage),
        reason: out.reason
      };
    }

    return {
      intent: out.intent,
      responseLanguage,
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
