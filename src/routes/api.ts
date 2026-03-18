import path from "node:path";
import express from "express";
import multer from "multer";
import { z } from "zod";
import type { VoicePipeline } from "../orchestrators/voice-pipeline.js";
import type { SessionMemoryService } from "../services/session-memory.js";
import type { LatencyLogger } from "../services/latency-logger.js";
import { paths } from "../utils/fs.js";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paths.uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".wav";
      cb(null, `upload-${Date.now()}${ext}`);
    }
  })
});

const turnBodySchema = z.object({
  sessionId: z.string().min(1)
});

export function buildApiRouter(
  pipeline: VoicePipeline,
  memory: SessionMemoryService,
  latencyLogger: LatencyLogger
): express.Router {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.post("/session", (_req, res) => {
    const session = memory.createSession();
    res.status(201).json({ sessionId: session.id, session });
  });

  router.get("/session", (_req, res) => {
    res.json({ sessions: memory.listSessions() });
  });

  router.post("/session/end", express.json(), (req, res) => {
    const parsed = z.object({ sessionId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    memory.clearSession(parsed.data.sessionId);
    res.json({ cleared: true, sessionId: parsed.data.sessionId });
  });

  router.post("/turn", upload.single("audio"), async (req, res) => {
    const parsed = turnBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    if (!req.file?.path) {
      res.status(400).json({ error: "audio file is required" });
      return;
    }

    try {
      const result = await pipeline.runTurn({
        sessionId: parsed.data.sessionId,
        audioPath: req.file.path
      });

      const relAudio = path.relative(process.cwd(), result.tts.outputPath);
      res.json({
        ...result,
        tts: {
          outputPath: relAudio,
          streamUrl: `/audio/${path.basename(result.tts.outputPath)}`
        },
        logs: {
          latencyPath: path.relative(process.cwd(), latencyLogger.path())
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
