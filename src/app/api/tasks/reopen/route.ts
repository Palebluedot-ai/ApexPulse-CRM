import { NextResponse } from "next/server";
import { createDb } from "@/server/db";
import { reopenTask } from "@/server/tasks/task-workflow";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { client, db } = createDb();

  try {
    const task = await reopenTask(db, {
      taskId: typeof body.taskId === "string" ? body.taskId : "",
    });

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof Error) {
      const badRequestMessages = new Set(["Task id is required", "Task not found"]);

      if (badRequestMessages.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    throw error;
  } finally {
    await client.end();
  }
}
