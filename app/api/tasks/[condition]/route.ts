import { NextResponse } from "next/server";
import { withApiErrorHandling, jsonError } from "@/lib/api/response";
import { requireCurrentSession } from "@/lib/auth/participant-session";
import { getOrAssignTasks } from "@/lib/study/assignment";
import type { TaskCondition } from "@/types/database";

const VALID_CONDITIONS: TaskCondition[] = ["formal", "casual", "ai"];

export const GET = withApiErrorHandling(async (_req: Request, ctx: { params: Promise<{ condition: string }> }) => {
  const { condition } = await ctx.params;
  if (!VALID_CONDITIONS.includes(condition as TaskCondition)) {
    return jsonError("Unknown condition.", 400);
  }
  const session = await requireCurrentSession();

  const tasks = await getOrAssignTasks(session.id, session.participant_id, session.study_phase, condition as TaskCondition);

  if (tasks.length === 0) {
    return jsonError(
      `No active ${condition} tasks are configured for study phase "${session.study_phase}". Ask the researcher to add tasks in the admin question bank.`,
      404
    );
  }

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      taskCode: t.task_code,
      title: t.title,
      scenario: t.scenario,
      instructions: t.instructions,
      minimumWords: t.minimum_words,
      maximumWords: t.maximum_words,
      minimumDurationSeconds: t.minimum_duration_seconds,
      maximumDurationSeconds: t.maximum_duration_seconds,
    })),
  });
});
