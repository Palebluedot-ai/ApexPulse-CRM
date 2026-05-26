import { describe, expect, it } from "vitest";
import {
  buildCustomerSelectOptions,
  buildReviewQueueViewItems,
  filterReviewQueueViewItems,
} from "./review-page-model";
import type { Attachment, Event, Party } from "@/server/db/schema";

const pendingEvent: Event = {
  id: "11111111-1111-1111-1111-111111111111",
  partyId: null,
  sourceChannel: "pwa",
  contentType: "image",
  rawText: "这是今天跟刘总的微信截图",
  aiSummary: "刘总想下周了解 OTC 出入金流程。",
  extractedFieldsJson: { nextAction: "下周继续跟进" },
  reviewStatus: "pending_review",
  occurredAt: null,
  capturedAt: new Date("2026-05-26T10:00:00+08:00"),
  createdByUserId: null,
  reviewedByUserId: null,
  createdAt: new Date("2026-05-26T10:00:01+08:00"),
  updatedAt: new Date("2026-05-26T10:00:01+08:00"),
};

const attachment: Attachment = {
  id: "22222222-2222-2222-2222-222222222222",
  eventId: pendingEvent.id,
  storageKey: "uploads/demo.png",
  fileName: "demo.png",
  mimeType: "image/png",
  fileSize: 180_000,
  width: 1170,
  height: 2532,
  createdAt: new Date("2026-05-26T10:00:01+08:00"),
};

const party: Party = {
  id: "33333333-3333-3333-3333-333333333333",
  displayName: "刘总",
  companyName: "Demo Capital",
  handlesJson: {},
  referralSourceTag: "Token2049 展会",
  statusLabel: null,
  tags: ["OTC"],
  profileSummary: null,
  lastContactAt: null,
  lastContactSummary: null,
  lastContactEventId: null,
  nextFollowupAt: null,
  followupStatus: "unknown",
  ownerUserId: null,
  createdByUserId: null,
  reviewedByUserId: null,
  updatedByUserId: null,
  createdAt: new Date("2026-05-26T09:00:00+08:00"),
  updatedAt: new Date("2026-05-26T09:00:00+08:00"),
};

describe("review page model", () => {
  it("builds serializable review queue view items with original evidence", () => {
    expect(
      buildReviewQueueViewItems([
        { event: pendingEvent, attachments: [attachment] },
      ]),
    ).toEqual([
      {
        id: pendingEvent.id,
        contentType: "image",
        sourceChannel: "pwa",
        rawText: "这是今天跟刘总的微信截图",
        summary: "刘总想下周了解 OTC 出入金流程。",
        extractedFieldsText: '{\n  "nextAction": "下周继续跟进"\n}',
        capturedAt: "2026-05-26T02:00:00.000Z",
        attachments: [
          {
            id: attachment.id,
            fileName: "demo.png",
            mimeType: "image/png",
            storageKey: "uploads/demo.png",
          },
        ],
      },
    ]);
  });

  it("builds customer select options with company context", () => {
    expect(buildCustomerSelectOptions([party])).toEqual([
      {
        id: party.id,
        label: "刘总 · Demo Capital",
      },
    ]);
  });

  it("filters review items by query and content type for batch processing", () => {
    const items = buildReviewQueueViewItems([
      { event: pendingEvent, attachments: [attachment] },
      {
        event: {
          ...pendingEvent,
          id: "44444444-4444-4444-4444-444444444444",
          contentType: "text",
          rawText: "Telegram 文字备注：客户关心费率",
          aiSummary: "客户关心 OTC 费率。",
        },
        attachments: [],
      },
    ]);

    expect(
      filterReviewQueueViewItems(items, {
        query: "费率",
        contentType: "text",
      }).map((item) => item.id),
    ).toEqual(["44444444-4444-4444-4444-444444444444"]);
  });
});
