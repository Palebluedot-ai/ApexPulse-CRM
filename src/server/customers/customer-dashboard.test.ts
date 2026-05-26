import { describe, expect, it } from "vitest";
import {
  buildCustomerActionPanel,
  buildCustomerMorningBrief,
  buildCustomerDashboardStats,
  buildCustomerListItem,
  buildLatestCommunicationCard,
  filterCustomerListItems,
  sortCustomerListItems,
} from "./customer-dashboard";
import type { Attachment, Event, Party, Task } from "@/server/db/schema";

const baseParty: Party = {
  id: "11111111-1111-1111-1111-111111111111",
  displayName: "刘总",
  companyName: "Blue Harbor Capital",
  handlesJson: { telegram: "@liuzong" },
  referralSourceTag: "conference",
  statusLabel: "active lead",
  tags: ["OTC", "HK"],
  profileSummary: "展会认识，关心 OTC 出入金流程。",
  lastContactAt: new Date("2026-05-24T12:00:00+08:00"),
  lastContactSummary: "刘总确认下周继续跟进。",
  lastContactEventId: "22222222-2222-2222-2222-222222222222",
  nextFollowupAt: new Date("2026-05-31T12:00:00+08:00"),
  followupStatus: "due_soon",
  ownerUserId: null,
  createdByUserId: null,
  reviewedByUserId: null,
  updatedByUserId: null,
  createdAt: new Date("2026-05-24T09:00:00+08:00"),
  updatedAt: new Date("2026-05-24T12:05:00+08:00"),
};

const latestEvent: Event = {
  id: "22222222-2222-2222-2222-222222222222",
  partyId: baseParty.id,
  sourceChannel: "pwa",
  contentType: "image",
  rawText: "微信截图备注",
  aiSummary: "确认后的摘要",
  extractedFieldsJson: { nextAction: "下周继续跟进" },
  reviewStatus: "confirmed",
  occurredAt: new Date("2026-05-24T11:00:00+08:00"),
  capturedAt: new Date("2026-05-24T12:00:00+08:00"),
  createdByUserId: null,
  reviewedByUserId: null,
  createdAt: new Date("2026-05-24T12:00:00+08:00"),
  updatedAt: new Date("2026-05-24T12:05:00+08:00"),
};

const attachment: Attachment = {
  id: "33333333-3333-3333-3333-333333333333",
  eventId: latestEvent.id,
  storageKey: "uploads/demo-screenshot.png",
  fileName: "demo-screenshot.png",
  mimeType: "image/png",
  fileSize: 180_000,
  width: 1170,
  height: 2532,
  createdAt: new Date("2026-05-24T12:00:00+08:00"),
};

const openTask: Task = {
  id: "44444444-4444-4444-4444-444444444444",
  partyId: baseParty.id,
  sourceEventId: latestEvent.id,
  taskType: "followup",
  description: "下周继续跟进刘总 OTC 出入金流程。",
  dueAt: new Date("2026-05-31T12:00:00+08:00"),
  status: "open",
  createdByUserId: null,
  completedByUserId: null,
  completedAt: null,
  createdAt: new Date("2026-05-24T12:00:00+08:00"),
  updatedAt: new Date("2026-05-24T12:00:00+08:00"),
};

describe("customer dashboard", () => {
  it("builds customer list items around follow-up state and latest communication", () => {
    expect(buildCustomerListItem(baseParty)).toEqual({
      id: baseParty.id,
      displayName: "刘总",
      companyName: "Blue Harbor Capital",
      referralSourceTag: "conference",
      statusLabel: "active lead",
      tags: ["OTC", "HK"],
      followupStatus: "due_soon",
      lastContactAt: baseParty.lastContactAt,
      lastContactSummary: "刘总确认下周继续跟进。",
      nextFollowupAt: baseParty.nextFollowupAt,
    });
  });

  it("builds the first-screen latest communication card with original evidence", () => {
    expect(
      buildLatestCommunicationCard({
        party: baseParty,
        event: latestEvent,
        attachments: [attachment],
      }),
    ).toEqual({
      eventId: latestEvent.id,
      summary: "刘总确认下周继续跟进。",
      rawText: "微信截图备注",
      contentType: "image",
      sourceChannel: "pwa",
      occurredAt: latestEvent.occurredAt,
      capturedAt: latestEvent.capturedAt,
      reviewStatus: "confirmed",
      extractedFields: { nextAction: "下周继续跟进" },
      attachments: [
        {
          id: attachment.id,
          fileName: "demo-screenshot.png",
          mimeType: "image/png",
          storageKey: "uploads/demo-screenshot.png",
          width: 1170,
          height: 2532,
        },
      ],
    });
  });

  it("falls back to event summary when the customer summary is missing", () => {
    expect(
      buildLatestCommunicationCard({
        party: { ...baseParty, lastContactSummary: null },
        event: latestEvent,
        attachments: [],
      })?.summary,
    ).toBe("确认后的摘要");
  });

  it("returns no latest communication card when no latest event exists", () => {
    expect(
      buildLatestCommunicationCard({
        party: { ...baseParty, lastContactEventId: null },
        event: null,
        attachments: [],
      }),
    ).toBeNull();
  });

  it("builds a first-screen action panel from follow-up state and open tasks", () => {
    expect(
      buildCustomerActionPanel({
        customer: buildCustomerListItem(baseParty),
        openTasks: [openTask],
      }),
    ).toEqual({
      headline: "近期要跟进",
      urgency: "due_soon",
      reason: "这个客户已经有明确的下一次跟进时间，不要让它自然沉睡。",
      primaryActionLabel: "处理下一步",
      nextFollowupAt: baseParty.nextFollowupAt,
      openTaskCount: 1,
      nextTask: {
        id: openTask.id,
        description: "下周继续跟进刘总 OTC 出入金流程。",
        dueAt: openTask.dueAt,
        taskType: "followup",
      },
    });
  });

  it("keeps unknown customers visible as missing follow-up plans", () => {
    expect(
      buildCustomerActionPanel({
        customer: buildCustomerListItem({
          ...baseParty,
          followupStatus: "unknown",
          nextFollowupAt: null,
        }),
        openTasks: [],
      }),
    ).toMatchObject({
      headline: "还没有跟进计划",
      urgency: "missing",
      primaryActionLabel: "补一条任务",
      openTaskCount: 0,
      nextTask: null,
    });
  });

  it("builds a morning brief for the customer detail first screen", () => {
    expect(
      buildCustomerMorningBrief({
        customer: buildCustomerListItem(baseParty),
        latestCommunication: buildLatestCommunicationCard({
          party: baseParty,
          event: latestEvent,
          attachments: [attachment],
        }),
        actionPanel: buildCustomerActionPanel({
          customer: buildCustomerListItem(baseParty),
          openTasks: [openTask],
        }),
      }),
    ).toEqual([
      "最近沟通：刘总确认下周继续跟进。",
      "下一步：下周继续跟进刘总 OTC 出入金流程。",
      "风险提示：这个客户已经有明确的下一次跟进时间，不要让它自然沉睡。",
    ]);
  });

  it("builds dashboard stats for compact customer scanning", () => {
    expect(
      buildCustomerDashboardStats([
        buildCustomerListItem(baseParty),
        buildCustomerListItem({
          ...baseParty,
          id: "44444444-4444-4444-4444-444444444444",
          displayName: "陈总",
          followupStatus: "overdue",
        }),
        buildCustomerListItem({
          ...baseParty,
          id: "55555555-5555-5555-5555-555555555555",
          displayName: "Stan",
          followupStatus: "unknown",
        }),
      ]),
    ).toEqual({
      total: 3,
      dueSoon: 1,
      overdue: 1,
      unknown: 1,
    });
  });

  it("filters customers by search text and follow-up status", () => {
    const customers = [
      buildCustomerListItem(baseParty),
      buildCustomerListItem({
        ...baseParty,
        id: "44444444-4444-4444-4444-444444444444",
        displayName: "陈总",
        companyName: "Amber Fund",
        followupStatus: "overdue",
        tags: ["VIP"],
      }),
    ];

    expect(
      filterCustomerListItems(customers, {
        query: "amber",
        followupStatus: "overdue",
      }).map((customer) => customer.displayName),
    ).toEqual(["陈总"]);
  });

  it("sorts customers for dashboard scanning", () => {
    const older = buildCustomerListItem({
      ...baseParty,
      id: "44444444-4444-4444-4444-444444444444",
      displayName: "A 客户",
      lastContactAt: new Date("2026-05-20T12:00:00+08:00"),
      nextFollowupAt: new Date("2026-05-29T12:00:00+08:00"),
    });
    const newer = buildCustomerListItem({
      ...baseParty,
      id: "55555555-5555-5555-5555-555555555555",
      displayName: "B 客户",
      lastContactAt: new Date("2026-05-25T12:00:00+08:00"),
      nextFollowupAt: new Date("2026-05-27T12:00:00+08:00"),
    });

    expect(
      sortCustomerListItems([older, newer], "last_contact_desc").map(
        (customer) => customer.displayName,
      ),
    ).toEqual(["B 客户", "A 客户"]);

    expect(
      sortCustomerListItems([older, newer], "next_followup_asc").map(
        (customer) => customer.displayName,
      ),
    ).toEqual(["B 客户", "A 客户"]);
  });
});
