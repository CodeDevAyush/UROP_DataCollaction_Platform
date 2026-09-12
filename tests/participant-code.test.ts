import { describe, it, expect } from "vitest";
import { generateParticipantCode, generateSessionCode } from "@/lib/utils/participant-code";

describe("generateParticipantCode", () => {
  it("matches the SRM-XXXXX format with an unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateParticipantCode();
      expect(code).toMatch(/^SRM-[A-HJ-NP-Z2-9]{5}$/);
      // Never uses visually ambiguous characters.
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("does not expose an internal database id", () => {
    const code = generateParticipantCode();
    expect(code).not.toMatch(/-[0-9a-f]{8}-[0-9a-f]{4}-/i); // not a UUID shape
  });
});

describe("generateSessionCode", () => {
  it("matches the SESS-XXXXXXXX format", () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^SESS-[A-HJ-NP-Z2-9]{8}$/);
  });
});
