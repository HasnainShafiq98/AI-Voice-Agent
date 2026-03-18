import type { PromptVersion } from "../types/index.js";

export const PROMPT_VERSIONS: PromptVersion[] = [
  {
    version: "v1.0",
    updatedAt: "2026-03-17",
    notes:
      "Initial release with JSON intent contract, fallback behavior, and entity extraction for policy/claim/appointment flows."
  },
  {
    version: "v1.1",
    updatedAt: "2026-03-18",
    notes:
      "Enhanced prompt clarity with explicit JSON-only output requirement, concrete example, and stricter formatting rules. Improved JSON parser to extract from markdown blocks. Better suited for models like ministral-3:14b."
  },
  {
    version: "v1.2",
    updatedAt: "2026-03-18",
    notes:
      "Added responseLanguage to the intent contract so downstream action and TTS layers can produce localized English/German responses consistently."
  }
];
