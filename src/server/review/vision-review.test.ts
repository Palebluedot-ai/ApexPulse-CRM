import { describe, expect, it } from "vitest";
import { buildVisionReviewPatch } from "./vision-review";

describe("vision review patch", () => {
  it("merges vision extraction into existing review fields without confirming", () => {
    expect(
      buildVisionReviewPatch({
        currentSummary: "原摘要",
        rawText: "原备注",
        existingFields: { topic: "fee", customerName: "旧名字" },
        extraction: {
          summary: "客户想了解 OTC 费率。",
          naturalFields: {
            customerName: "刘总",
            companyName: "Demo Capital",
            sourceTag: "",
            needSummary: "想了解费率",
            nextAction: "发报价",
            nextFollowupAt: "",
          },
          contactFields: {
            phone: "",
            email: "",
            telegram: "",
            wechatAlias: "",
          },
          crmHints: {
            actionRequired: true,
            confidence: "high",
            evidenceNotes: "截图里问了 OTC 费率。",
            leadQuality: "warm",
          },
        },
      }),
    ).toEqual({
      summary: "客户想了解 OTC 费率。",
      extractedFields: {
        topic: "fee",
        customerName: "刘总",
        companyName: "Demo Capital",
        needSummary: "想了解费率",
        nextAction: "发报价",
        actionRequired: true,
        aiExtractionSource: "vision_api",
        confidence: "high",
        evidenceNotes: "截图里问了 OTC 费率。",
        leadQuality: "warm",
      },
    });
  });

  it("falls back to the current summary when provider summary is blank", () => {
    expect(
      buildVisionReviewPatch({
        currentSummary: "原摘要",
        rawText: "原备注",
        existingFields: {},
        extraction: {
          summary: "",
          naturalFields: {
            customerName: "",
            companyName: "",
            sourceTag: "",
            needSummary: "",
            nextAction: "",
            nextFollowupAt: "",
          },
          contactFields: {
            phone: "",
            email: "",
            telegram: "",
            wechatAlias: "",
          },
          crmHints: {
            actionRequired: false,
            confidence: "unknown",
            evidenceNotes: "",
            leadQuality: "unknown",
          },
        },
      }).summary,
    ).toBe("原摘要");
  });
});
