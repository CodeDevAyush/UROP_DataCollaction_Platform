import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/utils/csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header row from the first row's keys", () => {
    const csv = toCsv([{ a: 1, b: "x" }]);
    expect(csv.split("\n")[0]).toBe("a,b");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ text: 'has, a comma and "quotes" and\nnewline' }]);
    const dataLine = csv.split("\n").slice(1).join("\n");
    expect(dataLine).toBe('"has, a comma and ""quotes"" and\nnewline"');
  });

  it("never silently alters raw text content (only wraps/escapes)", () => {
    const raw = "naan tomorrow varen, aiyo!";
    const csv = toCsv([{ raw_text: raw }]);
    // Since it contains a comma, it must be quoted, but the inner text is untouched.
    expect(csv).toContain(raw);
  });

  it("renders null/undefined as empty cells", () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv.split("\n")[1]).toBe(",,0");
  });
});
