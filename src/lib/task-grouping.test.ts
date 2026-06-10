import { describe, expect, it } from "vitest";
import { classifyTaskUrgency, groupTasksByUrgency } from "./task-grouping";

const now = new Date("2026-06-10T06:00:00+08:00"); // 周三

describe("classifyTaskUrgency", () => {
  it("classifies past due dates as overdue", () => {
    expect(classifyTaskUrgency(new Date("2026-06-08T10:00:00+08:00"), now)).toBe(
      "overdue",
    );
  });

  it("classifies later the same day as today", () => {
    expect(classifyTaskUrgency(new Date("2026-06-10T18:00:00+08:00"), now)).toBe(
      "today",
    );
  });

  it("classifies earlier the same day as today, not overdue", () => {
    expect(classifyTaskUrgency(new Date("2026-06-10T01:00:00+08:00"), now)).toBe(
      "today",
    );
  });

  it("classifies within next 7 days as this_week", () => {
    expect(classifyTaskUrgency(new Date("2026-06-13T09:00:00+08:00"), now)).toBe(
      "this_week",
    );
  });

  it("classifies beyond 7 days as later", () => {
    expect(classifyTaskUrgency(new Date("2026-06-25T09:00:00+08:00"), now)).toBe(
      "later",
    );
  });

  it("classifies missing due date as none", () => {
    expect(classifyTaskUrgency(null, now)).toBe("none");
  });
});

describe("groupTasksByUrgency", () => {
  const tasks = [
    { id: "a", dueAt: "2026-06-08T10:00:00+08:00" },
    { id: "b", dueAt: "2026-06-10T18:00:00+08:00" },
    { id: "c", dueAt: "2026-06-13T09:00:00+08:00" },
    { id: "d", dueAt: "2026-06-25T09:00:00+08:00" },
    { id: "e", dueAt: null },
  ];

  it("groups overdue and today together as urgent", () => {
    const groups = groupTasksByUrgency(tasks, (task) => task.dueAt, now);
    expect(groups.urgent.map((task) => task.id)).toEqual(["a", "b"]);
    expect(groups.thisWeek.map((task) => task.id)).toEqual(["c"]);
    expect(groups.later.map((task) => task.id)).toEqual(["d", "e"]);
  });

  it("sorts urgent group by due date ascending", () => {
    const shuffled = [tasks[1], tasks[0]];
    const groups = groupTasksByUrgency(shuffled, (task) => task.dueAt, now);
    expect(groups.urgent.map((task) => task.id)).toEqual(["a", "b"]);
  });
});
