import { nanoid } from "nanoid";
import type { ActionResult, IntentResult, SessionState } from "../types/index.js";

export class ActionService {
  run(intentResult: IntentResult, session: SessionState): ActionResult {
    const language = intentResult.responseLanguage ?? session.entities.preferredLanguage ?? "en";
    const namePrefix = session.entities.customerName ? `${session.entities.customerName}, ` : "";
    const returningPrefix =
      session.entities.isReturningCustomer && session.entities.customerName
        ? language === "de"
          ? `Willkommen zurueck ${session.entities.customerName}. `
          : `Welcome back ${session.entities.customerName}. `
        : "";

    const policyPromptFallback =
      language === "de"
        ? `${namePrefix}bitte nennen Sie Ihre Policenummer, damit ich den Status pruefen kann.`
        : `${namePrefix}please provide your policy ID to check your policy status.`;

    if (intentResult.intent === "policy_enquiry") {
      const providedPolicyId = intentResult.extractedEntities.policyId?.trim();

      if (!providedPolicyId) {
        return {
          type: "policy_enquiry",
          status: "success",
          data: {
            needsPolicyId: "true"
          },
          message: intentResult.replyDraft || policyPromptFallback
        };
      }

      const policyId = providedPolicyId;
      return {
        type: "policy_enquiry",
        status: "success",
        data: {
          policyId,
          policyStatus: "Active",
          renewalDate: "2026-12-31"
        },
        message:
          language === "de"
            ? `${returningPrefix}${namePrefix}Ihre Police ${policyId} ist aktiv und das naechste Verlaengerungsdatum ist der 31.12.2026.`
            : `${returningPrefix}${namePrefix}your policy ${policyId} is active and your next renewal date is 2026-12-31.`
      };
    }

    if (intentResult.intent === "report_claim") {
      const claimId = `CLM-${nanoid(8).toUpperCase()}`;
      const claimType = intentResult.extractedEntities.claimType ?? "general damage";
      return {
        type: "report_claim",
        status: "success",
        data: {
          claimId,
          claimType,
          claimStatus: "Submitted"
        },
        message:
          language === "de"
            ? `${returningPrefix}${namePrefix}Ihre Schadenmeldung fuer ${claimType} wurde mit der ID ${claimId} erstellt.`
            : `${returningPrefix}${namePrefix}your ${claimType} claim has been created with ID ${claimId}.`
      };
    }

    if (intentResult.intent === "schedule_appointment") {
      const appointmentDate = intentResult.extractedEntities.appointmentDate ?? "next available slot";
      const action = intentResult.extractedEntities.appointmentAction ?? "schedule";
      if (action === "cancel") {
        return {
          type: "schedule_appointment",
          status: "success",
          data: {
            appointmentAction: "cancel",
            appointmentDate
          },
          message:
            language === "de"
              ? `${returningPrefix}${namePrefix}Ihr Termin wurde storniert.`
              : `${returningPrefix}${namePrefix}your appointment has been cancelled.`
        };
      }

      return {
        type: "schedule_appointment",
        status: "success",
        data: {
          appointmentAction: "schedule",
          appointmentDate
        },
        message:
          language === "de"
            ? `${returningPrefix}${namePrefix}Ihr Termin ist fuer ${appointmentDate} eingeplant.`
            : `${returningPrefix}${namePrefix}your appointment is scheduled for ${appointmentDate}.`
      };
    }

    return {
      type: "unknown_intent",
      status: "fallback",
      data: {},
      message:
        language === "de"
          ? "Ich kann beim Policenstatus, bei Schadenmeldungen oder bei Terminplanung helfen. Bitte waehlen Sie eines davon."
          : "I can help with policy status enquiries, claim reports, or scheduling and cancelling appointments. Please pick one of these."
    };
  }
}
