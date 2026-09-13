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

// All profile questions are mandatory in the UI (the client blocks
// submission and shows exactly which fields are missing before this is
// ever called) — required here too as defense-in-depth, never trusting the
// client alone. academicYear/ageGroup/aiUsageFrequency are <select>s that
// always carry a real default value, so min(1) on them is just a guard
// against a malformed request, not something a participant can trigger.
export const profileSchema = z.object({
  academicYear: z.string().min(1).max(100),
  program: z.string().min(1).max(200),
  branch: z.string().min(1).max(200),
  ageGroup: z.string().min(1).max(50),
  primaryLanguage: z.string().min(1).max(100),
  otherLanguages: z.array(z.string().max(100)).min(1).max(10),
  aiUsageFrequency: z.string().min(1).max(100),
  aiToolsUsed: z.array(z.string().max(100)).min(1).max(10),
  aiPrimaryUse: z.string().min(1).max(300),
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
