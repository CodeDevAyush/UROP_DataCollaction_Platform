import { describe, it, expect } from "vitest";
import { countWords, countCharacters, computeTextMetrics } from "@/lib/utils/text-metrics";

describe("countWords", () => {
  it("returns 0 for empty or whitespace-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\t  ")).toBe(0);
  });

  it("counts words separated by varied whitespace", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  hello   world  \n foo")).toBe(3);
  });

  it("counts a single word", () => {
    expect(countWords("word")).toBe(1);
  });

  it("counts code-mixed / multilingual text by whitespace, not script", () => {
    // "naan tomorrow varen" — Tanglish-style code-mixing should count as 3 words.
    expect(countWords("naan tomorrow varen")).toBe(3);
    // Devanagari + Latin mixed in one line.
    expect(countWords("मैं fine हूं")).toBe(3);
  });
});

describe("countCharacters", () => {
  it("counts raw character length including emoji/punctuation", () => {
    expect(countCharacters("hi!")).toBe(3);
    expect(countCharacters("")).toBe(0);
  });
});

describe("computeTextMetrics", () => {
  it("combines word and character counts", () => {
    expect(computeTextMetrics("hello world")).toEqual({ wordCount: 2, characterCount: 11 });
  });
});
