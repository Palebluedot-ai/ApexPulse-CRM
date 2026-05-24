import { NextResponse } from "next/server";
import { createDb } from "@/server/db";
import { createTask, listTasks } from "@/server/tasks/task-workflow";

const taskTypeValues = ["commitment", "reminder", "followup"] as const;
type TaskType = (typeof taskTypeValues)[number];

function taskTypeOrDefault(value: unknown): TaskType {
  if (typeof value !== "string") return "followup";
  return taskTypeValues.includes(value as TaskType)
    ? (value as TaskType)
    : "followup";
}

function dateOrUndefined(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET() {
  const { client, db } = createDb();

  try {
    const items = await listTasks(db);
    return NextResponse.json({ items });
  } finally {
    await client.end();
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { client, db } = createDb();

  try {
    const task = await createTask(db, {
      partyId: typeof body.partyId === "string" ? body.partyId : undefined,
      sourceEventId:
        typeof body.sourceEventId === "string" ? body.sourceEventId : undefined,
      taskType: taskTypeOrDefault(body.taskType),
      description:
        typeof body.description === "string" ? body.description : "",
      dueAt: dateOrUndefined(body.dueAt),
      createdByUserId:
        typeof body.createdByUserId === "string"
          ? body.createdByUserId
          : undefined,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Task description is required") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  } finally {
    await client.end();
  }
}
