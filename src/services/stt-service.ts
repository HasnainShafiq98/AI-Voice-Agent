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

export class SttService {
  async transcribe(audioPath: string): Promise<string> {
    const outputDir = paths.outputsDir;
    const base = path.basename(audioPath, path.extname(audioPath));

    await execFileAsync(env.WHISPER_BINARY, [
      audioPath,
      "--model",
      env.WHISPER_MODEL,
      "--language",
      env.WHISPER_LANGUAGE,
      "--output_format",
      "json",
      "--output_dir",
      outputDir
    ]);

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
