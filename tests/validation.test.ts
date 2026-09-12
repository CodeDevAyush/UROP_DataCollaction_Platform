import { describe, it, expect } from "vitest";
import {
  profileSchema,
  attestationSchema,
  formalSubmissionSchema,
  aiPromptSubmissionSchema,
  processMetadataSchema,
} from "@/lib/validation";

const validMetadata = {
  startedAt: new Date().toISOString(),
  durationSeconds: 30,
  keystrokeCount: 50,
  backspaceCount: 2,
  pasteAttempts: 0,
  cutAttempts: 0,
  dropAttempts: 0,
  focusLossCount: 0,
};

describe("profileSchema", () => {
  it("accepts explicit empty strings for unfilled optional fields (regression test)", () => {
    // The profile form always sends every key, using "" for "prefer not to
    // say" rather than omitting the key. An earlier version of this schema
    // used `.min(1)` on these fields, which rejected "" as invalid even
    // though the field is optional — this broke profile submission
    // end-to-end. Guard against that regressing.
    const result = profileSchema.safeParse({
      academicYear: "",
      program: "",
      branch: "",
      ageGroup: "",
      primaryLanguage: "",
      otherLanguages: [],
      aiUsageFrequency: "",
      aiToolsUsed: [],
      aiPrimaryUse: "",
    });
    expect(result.success).toBe(true);
  });

  it("still accepts filled-in values", () => {
    const result = profileSchema.safeParse({
      academicYear: "3rd year",
      primaryLanguage: "Tamil",
      otherLanguages: ["English", "Hindi"],
    });
    expect(result.success).toBe(true);
  });
});

describe("attestationSchema", () => {
  it("accepts an independent attestation with no note", () => {
    expect(attestationSchema.safeParse({ type: "independent" }).success).toBe(true);
  });

  it("requires a non-empty note when assisted", () => {
    expect(attestationSchema.safeParse({ type: "assisted", note: "" }).success).toBe(false);
    expect(attestationSchema.safeParse({ type: "assisted", note: "Used Grammarly" }).success).toBe(true);
  });
});

describe("formalSubmissionSchema", () => {
  it("does not reject text based on language, slang, or code-mixing", () => {
    const result = formalSubmissionSchema.safeParse({
      taskId: "123e4567-e89b-12d3-a456-426614174000",
      text: "naan intha topic pathi konjam yosikkiren, but also I think adhu correct dhaan honestly",
      metadata: validMetadata,
      attestation: { type: "independent" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty response", () => {
    const result = formalSubmissionSchema.safeParse({
      taskId: "123e4567-e89b-12d3-a456-426614174000",
      text: "",
      metadata: validMetadata,
      attestation: { type: "independent" },
    });
    expect(result.success).toBe(false);
  });
});

describe("aiPromptSubmissionSchema", () => {
  it("does not enforce a maximum word count at the schema level (word count is UI guidance only)", () => {
    const longPrompt = "word ".repeat(500).trim();
    const result = aiPromptSubmissionSchema.safeParse({
      taskId: "123e4567-e89b-12d3-a456-426614174000",
      studentPrompt: longPrompt,
      aiTool: "ChatGPT",
      aiMode: "natural",
      metadata: validMetadata,
    });
    expect(result.success).toBe(true);
  });
});

describe("processMetadataSchema", () => {
  it("rejects negative counts", () => {
    const result = processMetadataSchema.safeParse({ ...validMetadata, pasteAttempts: -1 });
    expect(result.success).toBe(false);
  });
});
