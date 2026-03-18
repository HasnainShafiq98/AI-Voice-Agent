import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import type { ResponseLanguage } from "../types/index.js";
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

async function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-b:a",
    "192k",
    "-q:a",
    "4",
    outputPath
  ]);
}

export class TtsService {
  async synthesize(text: string, language: ResponseLanguage = "en"): Promise<string> {
    const fileName = `speech-${Date.now()}-${nanoid(4)}`;
    const aiffPath = path.join(paths.outputsDir, `${fileName}.aiff`);
    const wavPath = path.join(paths.outputsDir, `${fileName}.wav`);
    const mp3Path = path.join(paths.outputsDir, `${fileName}.mp3`);
    const spokenText = normalizeForSpeech(text);
    const requestedVoice = language === "de" ? env.TTS_VOICE_DE : env.TTS_VOICE;

    // Prefer macOS native `say`; fall back to `espeak` for Linux containers.
    try {
      await execFileAsync("say", ["-v", requestedVoice, "-o", aiffPath, spokenText]);
      await convertToMp3(aiffPath, mp3Path);
    } catch {
      try {
        const espeakVoice = language === "de" ? "de" : "en";
        await execFileAsync("espeak", ["-v", espeakVoice, "-w", wavPath, spokenText]);
        await convertToMp3(wavPath, mp3Path);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`TTS failed: macOS say unavailable and espeak fallback failed: ${message}`);
      }
    }

    return mp3Path;
  }
}
