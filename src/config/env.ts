import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  OLLAMA_API_URL: z.string().url(),
  OLLAMA_API_KEY: z.string().min(1),
  OLLAMA_MODEL: z.string().default("llama3.1"),
  WHISPER_MODEL: z.string().default("base.en"),
  WHISPER_LANGUAGE: z.string().default("en"),
  WHISPER_BINARY: z.string().default("whisper"),
  TTS_VOICE: z.string().default("Samantha")
});

export const env = schema.parse(process.env);
