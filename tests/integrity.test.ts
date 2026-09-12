import { describe, it, expect } from "vitest";
import { computeIntegrityFlag } from "@/lib/utils/integrity";

describe("computeIntegrityFlag", () => {
  it("returns green when no paste/cut/drop events occurred", () => {
    expect(computeIntegrityFlag({ pasteAttempts: 0, cutAttempts: 0, dropAttempts: 0 })).toBe("green");
  });

  it("returns yellow for one or two events", () => {
    expect(computeIntegrityFlag({ pasteAttempts: 1, cutAttempts: 0, dropAttempts: 0 })).toBe("yellow");
    expect(computeIntegrityFlag({ pasteAttempts: 1, cutAttempts: 1, dropAttempts: 0 })).toBe("yellow");
  });

  it("returns red for three or more events", () => {
    expect(computeIntegrityFlag({ pasteAttempts: 2, cutAttempts: 1, dropAttempts: 0 })).toBe("red");
    expect(computeIntegrityFlag({ pasteAttempts: 5, cutAttempts: 0, dropAttempts: 0 })).toBe("red");
  });

  it("is a triage signal only — never claims certainty (documentation check)", () => {
    // This test exists to keep the contract explicit: the flag is a count-based
    // heuristic, not a verdict. See docs/ETHICS_DATA_HANDLING.md.
    expect(computeIntegrityFlag({ pasteAttempts: 0, cutAttempts: 0, dropAttempts: 0 })).not.toBe("red");
  });
});
