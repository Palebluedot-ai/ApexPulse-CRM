import { describe, expect, it } from "vitest";
import {
  buildTaskCustomerOptions,
  buildTaskPageItems,
} from "./task-page-model";
import type { CustomerListItem } from "@/server/customers/customer-dashboard";
import type { TaskListItem } from "./task-workflow";

const task: TaskListItem = {
  id: "11111111-1111-1111-1111-111111111111",
  partyId: "22222222-2222-2222-2222-222222222222",
  partyName: "刘总",
  sourceEventId: null,
  taskType: "followup",
  description: "明天继续跟进 OTC 出入金流程。",
  dueAt: new Date("2026-05-27T10:00:00+08:00"),
  status: "open",
  completedAt: null,
};

const customer: CustomerListItem = {
  id: "22222222-2222-2222-2222-222222222222",
  displayName: "刘总",
  companyName: "Demo Capital",
  referralSourceTag: "Token2049",
  statusLabel: "新线索",
  tags: ["OTC"],
  followupStatus: "due_soon",
  lastContactAt: null,
  lastContactSummary: null,
  nextFollowupAt: null,
};

describe("task page model", () => {
  it("serializes task dates for the client page", () => {
    expect(buildTaskPageItems([task])).toEqual([
      {
        id: task.id,
        partyId: task.partyId,
        partyName: "刘总",
        sourceEventId: null,
        taskType: "followup",
        description: "明天继续跟进 OTC 出入金流程。",
        dueAt: "2026-05-27T02:00:00.000Z",
        status: "open",
        completedAt: null,
      },
    ]);
  });

  it("builds customer options with company context", () => {
    expect(buildTaskCustomerOptions([customer])).toEqual([
      {
        id: customer.id,
        label: "刘总 · Demo Capital",
      },
    ]);
  });
});
