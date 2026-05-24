import { describe, expect, it } from "vitest";
import {
  buildCompleteTaskUpdate,
  buildCreateTaskInput,
  buildReopenTaskUpdate,
} from "./task-workflow";

describe("task workflow", () => {
  it("creates an open follow-up task from confirmed customer work", () => {
    const dueAt = new Date("2026-05-26T10:00:00+08:00");

    expect(
      buildCreateTaskInput({
        partyId: "11111111-1111-1111-1111-111111111111",
        sourceEventId: "22222222-2222-2222-2222-222222222222",
        taskType: "followup",
        description: "下周继续跟进刘总 OTC 出入金流程。",
        dueAt,
        createdByUserId: "33333333-3333-3333-3333-333333333333",
      }),
    ).toEqual({
      partyId: "11111111-1111-1111-1111-111111111111",
      sourceEventId: "22222222-2222-2222-2222-222222222222",
      taskType: "followup",
      description: "下周继续跟进刘总 OTC 出入金流程。",
      dueAt,
      status: "open",
      createdByUserId: "33333333-3333-3333-3333-333333333333",
    });
  });

  it("marks a task as done with completion metadata", () => {
    const completedAt = new Date("2026-05-25T11:00:00+08:00");

    expect(
      buildCompleteTaskUpdate({
        completedAt,
        completedByUserId: "33333333-3333-3333-3333-333333333333",
      }),
    ).toEqual({
      status: "done",
      completedAt,
      completedByUserId: "33333333-3333-3333-3333-333333333333",
      updatedAt: completedAt,
    });
  });

  it("reopens a completed task without losing the task itself", () => {
    const reopenedAt = new Date("2026-05-25T12:00:00+08:00");

    expect(buildReopenTaskUpdate({ reopenedAt })).toEqual({
      status: "open",
      completedAt: null,
      completedByUserId: null,
      updatedAt: reopenedAt,
    });
  });

  it("rejects blank task descriptions before touching the database", () => {
    expect(() =>
      buildCreateTaskInput({
        taskType: "followup",
        description: " ",
      }),
    ).toThrow("Task description is required");
  });
});
