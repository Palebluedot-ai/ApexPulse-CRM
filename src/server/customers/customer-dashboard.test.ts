import { describe, expect, it } from "vitest";
import {
  buildCustomerListItem,
  buildLatestCommunicationCard,
} from "./customer-dashboard";
import type { Attachment, Event, Party } from "@/server/db/schema";

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
});
