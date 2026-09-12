import { z } from "zod";

// Client-supplied writing-process metadata. All counts are aggregate,
// non-negative integers — no raw keystroke content is ever sent.
export const processMetadataSchema = z.object({
  startedAt: z.string().datetime().nullable(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 6),
  keystrokeCount: z.number().int().min(0),
  backspaceCount: z.number().int().min(0),
  pasteAttempts: z.number().int().min(0),
  cutAttempts: z.number().int().min(0),
  dropAttempts: z.number().int().min(0),
  focusLossCount: z.number().int().min(0),
});
export type ProcessMetadata = z.infer<typeof processMetadataSchema>;

export const consentSchema = z.object({
  readUnderstood: z.literal(true),
  voluntaryAgree: z.literal(true),
  understandAnalysis: z.literal(true),
  understandAiTasks: z.literal(true),
  consentVersion: z.string().min(1),
});

// Free-text/select fields are optional and the form always sends a string
// (possibly ""), never omits the key — so these must accept "" rather than
// require min(1), which would (and did) reject an intentionally blank field.
export const profileSchema = z.object({
  academicYear: z.string().max(100).optional().default(""),
  program: z.string().max(200).optional().default(""),
  branch: z.string().max(200).optional().default(""),
  ageGroup: z.string().max(50).optional().default(""),
  primaryLanguage: z.string().max(100).optional().default(""),
  otherLanguages: z.array(z.string().max(100)).max(10).optional().default([]),
  aiUsageFrequency: z.string().max(100).optional().default(""),
  aiToolsUsed: z.array(z.string().max(100)).max(10).optional().default([]),
  aiPrimaryUse: z.string().max(300).optional().default(""),
});

export const attestationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("independent") }),
  z.object({ type: z.literal("assisted"), note: z.string().min(1).max(2000) }),
]);

export const formalSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  text: z.string().min(1).max(20000),
  metadata: processMetadataSchema,
  attestation: attestationSchema,
});

export const casualSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  scenarioNumber: z.number().int().min(1),
  text: z.string().min(1).max(5000),
  metadata: processMetadataSchema,
  attestation: attestationSchema,
});

export const aiPromptSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  studentPrompt: z.string().min(1).max(5000),
  aiTool: z.string().min(1).max(50),
  aiMode: z.enum(["controlled", "natural"]),
  metadata: processMetadataSchema,
});

export const aiOutputSubmissionSchema = z.object({
  interactionId: z.string().uuid(),
  aiOutput: z.string().min(1).max(50000),
  wasEdited: z.boolean(),
  editedOutput: z.string().max(50000).optional().nullable(),
  modelName: z.string().max(100).optional(),
});

export const draftSaveSchema = z.object({
  step: z.string().min(1).max(200),
  text: z.string().max(50000),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});
