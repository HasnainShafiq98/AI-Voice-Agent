import { nanoid } from "nanoid";
import type { ActionResult, IntentResult, SessionState } from "../types/index.js";

export class ActionService {
  run(intentResult: IntentResult, session: SessionState): ActionResult {
    const namePrefix = session.entities.customerName ? `${session.entities.customerName}, ` : "";

    if (intentResult.intent === "policy_enquiry") {
      const providedPolicyId = intentResult.extractedEntities.policyId?.trim();

      if (!providedPolicyId) {
        return {
          type: "policy_enquiry",
          status: "success",
          data: {
            needsPolicyId: "true"
          },
          message:
            intentResult.replyDraft ||
            `${namePrefix}please provide your policy ID to check your policy status.`
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
        message: `${namePrefix}your policy ${policyId} is active and your next renewal date is 2026-12-31.`
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
        message: `${namePrefix}your ${claimType} claim has been created with ID ${claimId}.`
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
          message: `${namePrefix}your appointment has been cancelled.`
        };
      }

      return {
        type: "schedule_appointment",
        status: "success",
        data: {
          appointmentAction: "schedule",
          appointmentDate
        },
        message: `${namePrefix}your appointment is scheduled for ${appointmentDate}.`
      };
    }

    return {
      type: "unknown_intent",
      status: "fallback",
      data: {},
      message:
        "I can help with policy status enquiries, claim reports, or scheduling and cancelling appointments. Please pick one of these."
    };
  }
}
