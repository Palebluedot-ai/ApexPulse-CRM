import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createTestDb,
  seedTask,
  seedUser,
  type TestDb,
} from "@/server/db/test-db";
import { completeTask, listTasks, reopenTask } from "./task-workflow";

let ctx: TestDb;

beforeEach(async () => {
  ctx = await createTestDb();
});

afterEach(async () => {
  await ctx.close();
});

test("listTasks only returns tasks created by the given user", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  await seedTask(ctx.db, {
    description: "alice task",
    createdByUserId: alice.id,
  });
  await seedTask(ctx.db, { description: "bob task", createdByUserId: bob.id });

  const aliceTasks = await listTasks(ctx.db, alice.id);

  expect(aliceTasks.map((task) => task.description)).toEqual(["alice task"]);
});

test("completeTask refuses to complete another user's task", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const task = await seedTask(ctx.db, { createdByUserId: alice.id });

  await expect(
    completeTask(ctx.db, {
      taskId: task.id,
      currentUserId: bob.id,
      completedByUserId: bob.id,
    }),
  ).rejects.toThrow("Task not found");

  const done = await completeTask(ctx.db, {
    taskId: task.id,
    currentUserId: alice.id,
    completedByUserId: alice.id,
  });
  expect(done.status).toBe("done");
});

test("reopenTask refuses to reopen another user's task", async () => {
  const alice = await seedUser(ctx.db);
  const bob = await seedUser(ctx.db);
  const task = await seedTask(ctx.db, {
    createdByUserId: alice.id,
    status: "done",
  });

  await expect(
    reopenTask(ctx.db, { taskId: task.id, currentUserId: bob.id }),
  ).rejects.toThrow("Task not found");

  const reopened = await reopenTask(ctx.db, {
    taskId: task.id,
    currentUserId: alice.id,
  });
  expect(reopened.status).toBe("open");
});
