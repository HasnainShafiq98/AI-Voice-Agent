import fs from "node:fs";
import path from "node:path";
import type { LatencyMetrics } from "../types/index.js";
import { paths } from "../utils/fs.js";

const latencyLogPath = path.join(paths.logsDir, "latency.ndjson");

export interface LatencyEvent {
  sessionId: string;
  timestamp: string;
  intent: string;
  metrics: LatencyMetrics;
}

export class LatencyLogger {
  log(event: LatencyEvent): void {
    fs.appendFileSync(latencyLogPath, `${JSON.stringify(event)}\n`, "utf8");
  }

  path(): string {
    return latencyLogPath;
  }
}
