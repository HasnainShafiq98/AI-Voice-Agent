import fs from "node:fs";
import path from "node:path";
import { paths } from "../utils/fs.js";

interface EventRecord {
  metrics: {
    sttMs: number;
    llmMs: number;
    ttsMs: number;
    totalMs: number;
  };
}

function summarize(values: number[]): { min: number; max: number; avg: number; p95: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const p95Index = Math.min(sorted.length - 1, Math.floor(0.95 * (sorted.length - 1)));
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p95: sorted[p95Index]
  };
}

const file = path.join(paths.logsDir, "latency.ndjson");
if (!fs.existsSync(file)) {
  console.log("No latency log found.");
  process.exit(0);
}

const records = fs
  .readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as EventRecord);

if (records.length === 0) {
  console.log("No latency events found.");
  process.exit(0);
}

const stt = summarize(records.map((r) => r.metrics.sttMs));
const llm = summarize(records.map((r) => r.metrics.llmMs));
const tts = summarize(records.map((r) => r.metrics.ttsMs));
const total = summarize(records.map((r) => r.metrics.totalMs));

console.log(JSON.stringify({ sampleSize: records.length, stt, llm, tts, total }, null, 2));
