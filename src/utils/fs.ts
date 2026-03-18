import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

export const paths = {
  uploadsDir: path.join(root, "uploads"),
  outputsDir: path.join(root, "outputs"),
  logsDir: path.join(root, "logs"),
  dataDir: path.join(root, "data")
};

export function ensureDirectories(): void {
  for (const dir of Object.values(paths)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
