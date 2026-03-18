import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { env } from "../config/env.js";
import { paths } from "../utils/fs.js";
import { safeJsonParse } from "../utils/json.js";

const execFileAsync = promisify(execFile);

interface WhisperOutput {
  text: string;
}

function resolveWhisperConfig(): { model: string; language: string | null } {
  const configuredModel = env.WHISPER_MODEL.trim();
  const configuredLanguage = env.WHISPER_LANGUAGE.trim().toLowerCase();
  const isAutoLanguage = configuredLanguage === "auto" || configuredLanguage === "detect";

  const requestedLanguage = isAutoLanguage ? null : configuredLanguage;
  const needsMultilingualModel =
    configuredModel.endsWith(".en") && requestedLanguage !== "en";

  const effectiveModel = needsMultilingualModel
    ? configuredModel.replace(/\.en$/, "")
    : configuredModel;

  return { model: effectiveModel, language: requestedLanguage };
}

export class SttService {
  async transcribe(audioPath: string): Promise<string> {
    const outputDir = paths.outputsDir;
    const base = path.basename(audioPath, path.extname(audioPath));
    const { model, language } = resolveWhisperConfig();

    const whisperArgs = [
      audioPath,
      "--model",
      model,
      "--output_format",
      "json",
      "--output_dir",
      outputDir
    ];

    if (language) {
      whisperArgs.push("--language", language);
    }

    await execFileAsync(env.WHISPER_BINARY, whisperArgs);

    const jsonPath = path.join(outputDir, `${base}.json`);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Whisper output missing: ${jsonPath}`);
    }

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = safeJsonParse<WhisperOutput>(raw);
    if (!parsed?.text) {
      throw new Error("Unable to parse Whisper transcription output");
    }

    return parsed.text.trim();
  }
}
