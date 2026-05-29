import { describe, expect, it } from "vitest";
import {
  buildWeeklyReport,
  getHongKongWeekRange,
  type WeeklyReportEventRow,
  type WeeklyReportPartyRow,
  type WeeklyReportTaskRow,
} from "./weekly-report";

const thisWeekReference = new Date("2026-05-29T12:00:00+08:00");

function party(input: Partial<WeeklyReportPartyRow>): WeeklyReportPartyRow {
  return {
    id: "party-1",
    displayName: "刘总",
    companyName: "Demo Capital",
    createdAt: new Date("2026-05-29T09:00:00+08:00"),
    ...input,
  };
}

function event(input: Partial<WeeklyReportEventRow>): WeeklyReportEventRow {
  return {
    id: "event-1",
    partyId: "party-1",
    partyName: "刘总",
    companyName: "Demo Capital",
    summary: "刘总确认下周继续跟进 OTC 出入金。",
    reviewStatus: "confirmed",
    occurredAt: new Date("2026-05-29T10:00:00+08:00"),
    capturedAt: new Date("2026-05-29T10:05:00+08:00"),
    ...input,
  };
}

function task(input: Partial<WeeklyReportTaskRow>): WeeklyReportTaskRow {
  return {
    id: "task-1",
    partyId: "party-1",
    partyName: "刘总",
    taskType: "followup",
    description: "整理报价并约电话",
    dueAt: new Date("2026-05-30T10:00:00+08:00"),
    status: "open",
    completedAt: null,
    ...input,
  };
}

describe("weekly report", () => {
  it("calculates the Hong Kong work week from Monday to next Monday", () => {
    expect(getHongKongWeekRange(thisWeekReference)).toEqual({
      start: new Date("2026-05-25T00:00:00+08:00"),
      end: new Date("2026-06-01T00:00:00+08:00"),
    });
  });

  it("aggregates only this week's new customers, confirmed events, and completed tasks", () => {
    const report = buildWeeklyReport({
      referenceDate: thisWeekReference,
      parties: [
        party({ id: "new-this-week" }),
        party({
          id: "old-party",
          createdAt: new Date("2026-05-20T09:00:00+08:00"),
        }),
      ],
      events: [
        event({ id: "confirmed-this-week" }),
        event({
          id: "pending-this-week",
          reviewStatus: "pending_review",
        }),
        event({
          id: "confirmed-last-week",
          occurredAt: new Date("2026-05-20T10:00:00+08:00"),
          capturedAt: new Date("2026-05-20T10:05:00+08:00"),
        }),
      ],
      tasks: [
        task({
          id: "completed-this-week",
          status: "done",
          completedAt: new Date("2026-05-28T16:00:00+08:00"),
        }),
        task({
          id: "completed-last-week",
          status: "done",
          completedAt: new Date("2026-05-20T16:00:00+08:00"),
        }),
      ],
    });

    expect(report.summary).toEqual({
      newCustomerCount: 1,
      confirmedEventCount: 1,
      completedTaskCount: 1,
      openTodoCount: 0,
      touchedCustomerCount: 1,
    });
  });

  it("builds a touched customer list with the latest weekly communication", () => {
    const report = buildWeeklyReport({
      referenceDate: thisWeekReference,
      parties: [],
      events: [
        event({
          id: "older",
          summary: "较早一次沟通",
          occurredAt: new Date("2026-05-27T10:00:00+08:00"),
        }),
        event({
          id: "newer",
          summary: "最新一次沟通",
          occurredAt: new Date("2026-05-29T10:00:00+08:00"),
        }),
      ],
      tasks: [],
    });

    expect(report.touchedCustomers).toEqual([
      {
        partyId: "party-1",
        partyName: "刘总",
        companyName: "Demo Capital",
        latestEventId: "newer",
        latestSummary: "最新一次沟通",
        latestContactAt: new Date("2026-05-29T10:00:00+08:00"),
        weeklyEventCount: 2,
      },
    ]);
  });

  it("keeps open todos that are due by the end of this week or have no due date", () => {
    const report = buildWeeklyReport({
      referenceDate: thisWeekReference,
      parties: [],
      events: [],
      tasks: [
        task({ id: "due-this-week" }),
        task({ id: "no-due-date", dueAt: null }),
        task({
          id: "future-task",
          dueAt: new Date("2026-06-08T10:00:00+08:00"),
        }),
        task({
          id: "already-done",
          status: "done",
          completedAt: new Date("2026-05-28T16:00:00+08:00"),
        }),
      ],
    });

    expect(report.openTodos.map((item) => item.id)).toEqual([
      "due-this-week",
      "no-due-date",
    ]);
    expect(report.summary.openTodoCount).toBe(2);
  });
});
