import { describe, expect, it } from "vitest";
import {
  buildReviewNaturalFields,
  mergeReviewNaturalFields,
  parseReviewExtractedFieldsText,
} from "./review-form";

describe("review form helpers", () => {
  it("parses blank extracted fields as an empty object", () => {
    expect(parseReviewExtractedFieldsText("   ")).toEqual({
      ok: true,
      value: {},
    });
  });

  it("parses valid extracted fields JSON objects", () => {
    expect(parseReviewExtractedFieldsText('{ "nextAction": "下周跟进" }')).toEqual(
      {
        ok: true,
        value: { nextAction: "下周跟进" },
      },
    );
  });

  it("rejects invalid JSON with a human readable message", () => {
    expect(parseReviewExtractedFieldsText("{ bad json")).toEqual({
      ok: false,
      message: "结构化字段不是合法 JSON，请先修正再保存。",
    });
  });

  it("rejects JSON arrays because extracted fields must be an object", () => {
    expect(parseReviewExtractedFieldsText("[]")).toEqual({
      ok: false,
      message: "结构化字段必须是 JSON object，例如 { \"nextAction\": \"下周跟进\" }。",
    });
  });

  it("builds natural review fields from canonical and legacy extracted keys", () => {
    expect(
      buildReviewNaturalFields({
        name: "刘总",
        company: "Demo Capital",
        referralSourceTag: "Token2049",
        requirement: "想了解 OTC 费率",
        nextStep: "下周发报价",
        nextFollowupDate: "2026-06-01",
      }),
    ).toEqual({
      customerName: "刘总",
      companyName: "Demo Capital",
      sourceTag: "Token2049",
      needSummary: "想了解 OTC 费率",
      nextAction: "下周发报价",
      nextFollowupAt: "2026-06-01",
    });
  });

  it("merges natural fields back into extracted fields without keeping blank values", () => {
    expect(
      mergeReviewNaturalFields(
        {
          confidence: "medium",
          customerName: "旧客户",
          topic: "fee",
        },
        {
          customerName: " 刘总 ",
          companyName: "Demo Capital",
          sourceTag: "",
          needSummary: "想了解 OTC 费率",
          nextAction: "下周发报价",
          nextFollowupAt: "2026-06-01T09:00",
        },
      ),
    ).toEqual({
      confidence: "medium",
      topic: "fee",
      customerName: "刘总",
      companyName: "Demo Capital",
      needSummary: "想了解 OTC 费率",
      nextAction: "下周发报价",
      nextFollowupAt: "2026-06-01T09:00",
    });
  });
});
