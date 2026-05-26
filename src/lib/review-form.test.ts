import { describe, expect, it } from "vitest";
import { parseReviewExtractedFieldsText } from "./review-form";

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
});
