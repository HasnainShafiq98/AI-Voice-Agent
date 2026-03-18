export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find and extract JSON object/array from text
    const cleaned = value.trim();
    let start = cleaned.indexOf('{');
    if (start === -1) start = cleaned.indexOf('[');
    if (start === -1) return null;

    let end = cleaned.lastIndexOf('}');
    if (end === -1) end = cleaned.lastIndexOf(']');
    if (end === -1 || end < start) return null;

    const extracted = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(extracted) as T;
    } catch {
      return null;
    }
  }
}
