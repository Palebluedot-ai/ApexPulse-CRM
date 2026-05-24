import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  parties,
  tasks,
  type NewTask,
  type Task,
} from "@/server/db/schema";

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;
type TaskStatus = "open" | "done";
type TaskType = "commitment" | "reminder" | "followup";
type TaskUpdate = Partial<NewTask> & {
  status: TaskStatus;
  updatedAt: Date;
};

export interface CreateTaskInput {
  partyId?: string;
  sourceEventId?: string;
  taskType: TaskType;
  description: string;
  dueAt?: Date;
  createdByUserId?: string;
}

export interface CompleteTaskInput {
  completedAt?: Date;
  completedByUserId?: string;
}

export interface ReopenTaskInput {
  reopenedAt?: Date;
}

export interface TaskListItem {
  id: string;
  partyId: string | null;
  partyName: string | null;
  sourceEventId: string | null;
  taskType: Task["taskType"];
  description: string;
  dueAt: Date | null;
  status: Task["status"];
  completedAt: Date | null;
}

function requireTaskId(taskId: string): string {
  const normalized = taskId.trim();
  if (!normalized) {
    throw new Error("Task id is required");
  }

  return normalized;
}

export function buildCreateTaskInput(input: CreateTaskInput): NewTask {
  const description = input.description.trim();
  if (!description) {
    throw new Error("Task description is required");
  }

  return {
    partyId: input.partyId,
    sourceEventId: input.sourceEventId,
    taskType: input.taskType,
    description,
    dueAt: input.dueAt,
    status: "open",
    createdByUserId: input.createdByUserId,
  };
}

export function buildCompleteTaskUpdate(input: CompleteTaskInput): TaskUpdate {
  const completedAt = input.completedAt ?? new Date();

  return {
    status: "done",
    completedAt,
    completedByUserId: input.completedByUserId,
    updatedAt: completedAt,
  };
}

export function buildReopenTaskUpdate(input: ReopenTaskInput): TaskUpdate {
  return {
    status: "open",
    completedAt: null,
    completedByUserId: null,
    updatedAt: input.reopenedAt ?? new Date(),
  };
}

export async function createTask(db: Db, input: CreateTaskInput) {
  const [task] = await db
    .insert(tasks)
    .values(buildCreateTaskInput(input))
    .returning();

  return task;
}

export async function listTasks(db: Db): Promise<TaskListItem[]> {
  const rows = await db
    .select({
      task: tasks,
      partyName: parties.displayName,
    })
    .from(tasks)
    .leftJoin(parties, eq(parties.id, tasks.partyId))
    .orderBy(asc(tasks.status), asc(tasks.dueAt), asc(tasks.createdAt));

  return rows.map((row) => ({
    id: row.task.id,
    partyId: row.task.partyId,
    partyName: row.partyName,
    sourceEventId: row.task.sourceEventId,
    taskType: row.task.taskType,
    description: row.task.description,
    dueAt: row.task.dueAt,
    status: row.task.status,
    completedAt: row.task.completedAt,
  }));
}

export async function completeTask(
  db: Db,
  input: CompleteTaskInput & { taskId: string },
) {
  const [task] = await db
    .update(tasks)
    .set(buildCompleteTaskUpdate(input))
    .where(eq(tasks.id, requireTaskId(input.taskId)))
    .returning();

  if (!task) throw new Error("Task not found");

  return task;
}

export async function reopenTask(
  db: Db,
  input: ReopenTaskInput & { taskId: string },
) {
  const [task] = await db
    .update(tasks)
    .set(buildReopenTaskUpdate(input))
    .where(eq(tasks.id, requireTaskId(input.taskId)))
    .returning();

  if (!task) throw new Error("Task not found");

  return task;
}
