import { describe, expect, it } from "vitest";
import {
  buildReviewAiFields,
  buildReviewNaturalFields,
  mergeReviewAiFields,
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

  it("builds AI review fields from extracted fields", () => {
    expect(
      buildReviewAiFields({
        phone: " 13424285333 ",
        email: "demo@example.com",
        telegram: "@demo",
        wechatAlias: "demo_wechat",
        leadQuality: "warm",
        confidence: "high",
        actionRequired: true,
        evidenceNotes: "截图里主动询问开户手续。",
      }),
    ).toEqual({
      phone: "13424285333",
      email: "demo@example.com",
      telegram: "@demo",
      wechatAlias: "demo_wechat",
      leadQuality: "warm",
      confidence: "high",
      actionRequired: true,
      evidenceNotes: "截图里主动询问开户手续。",
    });
  });

  it("normalizes unknown AI select values instead of trusting model output", () => {
    expect(
      buildReviewAiFields({
        leadQuality: "maybe",
        confidence: 75,
        actionRequired: "true",
      }),
    ).toMatchObject({
      leadQuality: "unknown",
      confidence: "unknown",
      actionRequired: true,
    });
  });

  it("merges AI review fields back into extracted fields without keeping blank values", () => {
    expect(
      mergeReviewAiFields(
        {
          customerName: "刘总",
          phone: "old-phone",
          leadQuality: "cold",
          evidenceNotes: "旧备注",
        },
        {
          phone: " 13424285333 ",
          email: "",
          telegram: "@demo",
          wechatAlias: "",
          leadQuality: "warm",
          confidence: "medium",
          actionRequired: false,
          evidenceNotes: "截图里问开户手续。",
        },
      ),
    ).toEqual({
      customerName: "刘总",
      phone: "13424285333",
      telegram: "@demo",
      leadQuality: "warm",
      confidence: "medium",
      actionRequired: false,
      evidenceNotes: "截图里问开户手续。",
    });
  });
});
