import { env } from "../config/env.js";
import type { Message } from "../types/index.js";
import { safeJsonParse } from "../utils/json.js";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

export class LlmService {
  async chat(messages: Message[]): Promise<string> {
    const response = await fetch(`${env.OLLAMA_API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OLLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages,
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const content = payload.message?.content;
    if (!content) {
      throw new Error("LLM response missing message.content");
    }

    const json = safeJsonParse<Record<string, unknown>>(content);
    if (!json) {
      return content;
    }
    return JSON.stringify(json);
  }
}
