import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { paths } from "../utils/fs.js";

const execFileAsync = promisify(execFile);

function normalizeForSpeech(text: string): string {
  // Spell out structured IDs like POL-OCTGIB so TTS pronounces each character clearly.
  return text.replace(/\b([A-Z]{2,5})-([A-Z0-9]{3,})\b/g, (_match, prefix, suffix) => {
    const left = String(prefix).split("").join(" ");
    const right = String(suffix).split("").join(" ");
    return `${left} dash ${right}`;
  });
}

export class TtsService {
  async synthesize(text: string): Promise<string> {
    const fileName = `speech-${Date.now()}-${nanoid(4)}`;
    const aiffPath = path.join(paths.outputsDir, `${fileName}.aiff`);
    const mp3Path = path.join(paths.outputsDir, `${fileName}.mp3`);
    const spokenText = normalizeForSpeech(text);

    // Generate AIFF from text
    await execFileAsync("say", ["-v", env.TTS_VOICE, "-o", aiffPath, spokenText]);

    // Convert AIFF to MP3 for browser compatibility (suppress ffmpeg logs)
    await execFileAsync("ffmpeg", [
      "-loglevel", "error",
      "-i", aiffPath,
      "-b:a", "192k",
      "-q:a", "4",
      mp3Path
    ]);

    return mp3Path;
  }
}
