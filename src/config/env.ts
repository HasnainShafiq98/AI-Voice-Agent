import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  OLLAMA_API_URL: z.string().url(),
  OLLAMA_API_KEY: z.string().min(1),
  OLLAMA_MODEL: z.string().default("llama3.1"),
  WHISPER_MODEL: z.string().default("base"),
  WHISPER_LANGUAGE: z.string().default("auto"),
  WHISPER_BINARY: z.string().default("whisper"),
  TTS_VOICE: z.string().default("Samantha"),
  TTS_VOICE_DE: z.string().default("Anna")
});

export const env = schema.parse(process.env);
