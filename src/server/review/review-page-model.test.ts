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
  extractedFieldsJson: {
    customerName: "刘总",
    companyName: "Demo Capital",
    sourceTag: "Token2049",
    needSummary: "了解 OTC 出入金流程",
    nextAction: "下周继续跟进",
    nextFollowupAt: "2026-06-01T09:00",
    phone: "13424285333",
    email: "demo@example.com",
    telegram: "@demo",
    wechatAlias: "demo_wechat",
    leadQuality: "warm",
    confidence: "high",
    actionRequired: true,
    evidenceNotes: "截图里主动询问开户手续。",
  },
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
        isTestRecord: false,
        extractedFields: {
          customerName: "刘总",
          companyName: "Demo Capital",
          sourceTag: "Token2049",
          needSummary: "了解 OTC 出入金流程",
          nextAction: "下周继续跟进",
          nextFollowupAt: "2026-06-01T09:00",
          phone: "13424285333",
          email: "demo@example.com",
          telegram: "@demo",
          wechatAlias: "demo_wechat",
          leadQuality: "warm",
          confidence: "high",
          actionRequired: true,
          evidenceNotes: "截图里主动询问开户手续。",
        },
        naturalFields: {
          customerName: "刘总",
          companyName: "Demo Capital",
          sourceTag: "Token2049",
          needSummary: "了解 OTC 出入金流程",
          nextAction: "下周继续跟进",
          nextFollowupAt: "2026-06-01T09:00",
        },
        aiFields: {
          phone: "13424285333",
          email: "demo@example.com",
          telegram: "@demo",
          wechatAlias: "demo_wechat",
          leadQuality: "warm",
          confidence: "high",
          actionRequired: true,
          evidenceNotes: "截图里主动询问开户手续。",
        },
        extractedFieldsText:
          '{\n  "customerName": "刘总",\n  "companyName": "Demo Capital",\n  "sourceTag": "Token2049",\n  "needSummary": "了解 OTC 出入金流程",\n  "nextAction": "下周继续跟进",\n  "nextFollowupAt": "2026-06-01T09:00",\n  "phone": "13424285333",\n  "email": "demo@example.com",\n  "telegram": "@demo",\n  "wechatAlias": "demo_wechat",\n  "leadQuality": "warm",\n  "confidence": "high",\n  "actionRequired": true,\n  "evidenceNotes": "截图里主动询问开户手续。"\n}',
        capturedAt: "2026-05-26T02:00:00.000Z",
        attachments: [
          {
            id: attachment.id,
            fileName: "demo.png",
            mimeType: "image/png",
            previewUrl: null,
            canPreviewInline: false,
            unavailableReason: "这份附件不是本地图片，暂时只能保留文件记录。",
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

  it("marks obvious dogfood and demo records as test records", () => {
    const [dogfoodItem, demoAttachmentItem] = buildReviewQueueViewItems([
      {
        event: {
          ...pendingEvent,
          id: "55555555-5555-5555-5555-555555555555",
          rawText: "M1.18 dogfood：32x32 demo image",
          aiSummary: "M1.18 dogfood：32x32 demo image",
        },
        attachments: [],
      },
      {
        event: {
          ...pendingEvent,
          id: "66666666-6666-6666-6666-666666666666",
          rawText: "普通截图",
          aiSummary: "普通截图",
        },
        attachments: [
          {
            ...attachment,
            fileName: "m118-demo-32.png",
            storageKey: "local-images/2026/05/29/m118-demo-32.png",
          },
        ],
      },
    ]);

    expect(dogfoodItem?.isTestRecord).toBe(true);
    expect(demoAttachmentItem?.isTestRecord).toBe(true);
  });

  it("hides test records by default while keeping them accessible", () => {
    const realEvent = pendingEvent;
    const testEvent = {
      ...pendingEvent,
      id: "55555555-5555-5555-5555-555555555555",
      rawText: "M1.18 dogfood：32x32 demo image",
      aiSummary: "M1.18 dogfood：32x32 demo image",
    };
    const items = buildReviewQueueViewItems([
      { event: realEvent, attachments: [] },
      { event: testEvent, attachments: [] },
    ]);

    expect(
      filterReviewQueueViewItems(items, {
        recordScope: "real",
      }).map((item) => item.id),
    ).toEqual([realEvent.id]);
    expect(
      filterReviewQueueViewItems(items, {
        recordScope: "test",
      }).map((item) => item.id),
    ).toEqual([testEvent.id]);
    expect(
      filterReviewQueueViewItems(items, {
        recordScope: "all",
      }).map((item) => item.id),
    ).toEqual([realEvent.id, testEvent.id]);
  });

  it("exposes preview urls only for locally stored attachments", () => {
    const [item] = buildReviewQueueViewItems([
      {
        event: pendingEvent,
        attachments: [
          {
            ...attachment,
            storageKey: "local-images/2026/05/29/demo.png",
          },
        ],
      },
    ]);

    expect(item?.attachments[0]?.previewUrl).toBe(
      `/api/attachments/${attachment.id}`,
    );
    expect(item?.attachments[0]?.canPreviewInline).toBe(true);
    expect(item?.attachments[0]?.unavailableReason).toBeNull();
  });

  it("marks non-local attachments as evidence records without inline preview", () => {
    const [item] = buildReviewQueueViewItems([
      {
        event: pendingEvent,
        attachments: [
          {
            ...attachment,
            storageKey: "legacy/demo.png",
          },
        ],
      },
    ]);

    expect(item?.attachments[0]).toMatchObject({
      previewUrl: null,
      canPreviewInline: false,
      unavailableReason: "这份附件不是本地图片，暂时只能保留文件记录。",
    });
  });
});
