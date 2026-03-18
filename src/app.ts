import cors from "cors";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { ActionService } from "./actions/action-service.js";
import { buildApiRouter } from "./routes/api.js";
import { IntentService } from "./services/intent-service.js";
import { LatencyLogger } from "./services/latency-logger.js";
import { LlmService } from "./services/llm-service.js";
import { SessionMemoryService } from "./services/session-memory.js";
import { SttService } from "./services/stt-service.js";
import { TtsService } from "./services/tts-service.js";
import { ensureDirectories, paths } from "./utils/fs.js";
import { VoicePipeline } from "./orchestrators/voice-pipeline.js";

export function createApp(): express.Express {
  ensureDirectories();

  const app = express();

  const memory = new SessionMemoryService();
  const latencyLogger = new LatencyLogger();
  const llm = new LlmService();
  const intentService = new IntentService(llm);
  const stt = new SttService();
  const tts = new TtsService();
  const actions = new ActionService();
  const pipeline = new VoicePipeline(stt, intentService, actions, tts, memory, latencyLogger);

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "src/public")));

  // Serve audio files from outputs directory
  app.get("/audio/:file", (req, res) => {
    const target = path.join(paths.outputsDir, path.basename(req.params.file));
    if (!fs.existsSync(target)) {
      res.status(404).json({ error: "audio not found" });
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const contentType = ext === ".mp3" ? "audio/mpeg" : "audio/aiff";
    res.setHeader("Content-Type", contentType);
    res.sendFile(target);
  });

  app.use("/api", buildApiRouter(pipeline, memory, latencyLogger));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(process.cwd(), "src/public/index.html"));
  });

  return app;
}
