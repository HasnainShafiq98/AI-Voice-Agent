import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { paths } from "../utils/fs.js";

const execFileAsync = promisify(execFile);

export class TtsService {
  async synthesize(text: string): Promise<string> {
    const fileName = `speech-${Date.now()}-${nanoid(4)}.aiff`;
    const outputPath = path.join(paths.outputsDir, fileName);

    await execFileAsync("say", ["-v", env.TTS_VOICE, "-o", outputPath, text]);

    return outputPath;
  }
}
