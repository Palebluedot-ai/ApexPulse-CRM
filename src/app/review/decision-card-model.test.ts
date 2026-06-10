import { describe, expect, it } from "vitest";
import type { ReviewQueueViewItem } from "@/server/review/review-page-model";
import {
  awaitingAutoExtraction,
  buildBindPrediction,
  buildCardTitle,
  buildDecisionKeyFields,
} from "./decision-card-model";

function makeItem(
  overrides: Partial<ReviewQueueViewItem> = {},
): ReviewQueueViewItem {
  return {
    id: "evt-1",
    contentType: "image",
    sourceChannel: "manual_upload",
    rawText: null,
    summary: "默认摘要",
    isTestRecord: false,
    extractedFields: {},
    naturalFields: {
      customerName: "",
      companyName: "",
      sourceTag: "",
      needSummary: "",
      nextAction: "",
      nextFollowupAt: "",
    },
    aiFields: {
      phone: "",
      email: "",
      telegram: "",
      wechatAlias: "",
      leadQuality: "unknown",
      confidence: "unknown",
      actionRequired: false,
      evidenceNotes: "",
    },
    extractedFieldsText: "{}",
    capturedAt: "2026-06-10T08:00:00.000Z",
    attachments: [],
    ...overrides,
  };
}

describe("buildCardTitle", () => {
  it("prefers extracted customer name", () => {
    const item = makeItem();
    item.naturalFields.customerName = "Florian";
    expect(buildCardTitle(item)).toBe("Florian");
  });

  it("falls back to 未识别客户 when name missing", () => {
    expect(buildCardTitle(makeItem())).toBe("未识别客户");
  });
});

describe("buildDecisionKeyFields", () => {
  it("returns up to three non-empty fields in priority order", () => {
    const item = makeItem();
    item.naturalFields.needSummary = "offramp 10M USD/月";
    item.naturalFields.nextAction = "下周约开户";
    item.naturalFields.sourceTag = "HashKey 活动";
    item.naturalFields.nextFollowupAt = "2026-06-17";
    expect(buildDecisionKeyFields(item)).toEqual([
      { label: "需求", value: "offramp 10M USD/月" },
      { label: "下一步", value: "下周约开户" },
      { label: "来源", value: "HashKey 活动" },
    ]);
  });

  it("skips empty fields and keeps later ones", () => {
    const item = makeItem();
    item.naturalFields.nextAction = "发材料";
    item.naturalFields.nextFollowupAt = "2026-06-13";
    expect(buildDecisionKeyFields(item)).toEqual([
      { label: "下一步", value: "发材料" },
      { label: "跟进", value: "2026-06-13" },
    ]);
  });

  it("returns empty array when nothing extracted", () => {
    expect(buildDecisionKeyFields(makeItem())).toEqual([]);
  });
});

describe("buildBindPrediction", () => {
  const customers = [
    { id: "c-1", label: "刘总 · BVI 主体" },
    { id: "c-2", label: "陈总 · 矿机贸易" },
  ];

  it("describes binding to selected existing customer", () => {
    expect(buildBindPrediction(makeItem(), "c-1", customers)).toBe(
      "✓ 绑定已有客户 刘总 · BVI 主体",
    );
  });

  it("describes creating new customer with extracted name", () => {
    const item = makeItem();
    item.naturalFields.customerName = "Florian";
    expect(buildBindPrediction(item, "", customers)).toBe(
      "⊕ 将新建客户 Florian",
    );
  });

  it("falls back when no name extracted", () => {
    expect(buildBindPrediction(makeItem(), "", customers)).toBe(
      "⊕ 将新建客户（名称待确认）",
    );
  });
});

describe("awaitingAutoExtraction", () => {
  it("is true for raw text without extraction source", () => {
    const item = makeItem({ rawText: "今天认识了刘总" });
    expect(awaitingAutoExtraction(item)).toBe(true);
  });

  it("is true for previewable image without extraction source", () => {
    const item = makeItem({
      attachments: [
        {
          id: "att-1",
          fileName: "a.png",
          mimeType: "image/png",
          storageKey: "local/a.png",
          previewUrl: "/api/attachments/att-1",
          canPreviewInline: true,
          unavailableReason: null,
        },
      ],
    });
    expect(awaitingAutoExtraction(item)).toBe(true);
  });

  it("is false once aiExtractionSource is set", () => {
    const item = makeItem({
      rawText: "有内容",
      extractedFields: { aiExtractionSource: "text_api" },
    });
    expect(awaitingAutoExtraction(item)).toBe(false);
  });

  it("is false when there is nothing to extract", () => {
    expect(awaitingAutoExtraction(makeItem())).toBe(false);
  });
});
