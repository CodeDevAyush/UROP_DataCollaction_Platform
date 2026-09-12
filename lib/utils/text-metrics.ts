/**
 * Text metrics shared by client (live counters) and server (authoritative
 * recomputation on submit — never trust client-supplied counts for
 * validation decisions).
 */

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countCharacters(text: string): number {
  return text.length;
}

export interface TextMetrics {
  wordCount: number;
  characterCount: number;
}

export function computeTextMetrics(text: string): TextMetrics {
  return { wordCount: countWords(text), characterCount: countCharacters(text) };
}
