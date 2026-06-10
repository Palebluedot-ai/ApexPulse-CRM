import { describe, expect, it } from "vitest";
import { shouldAutoExtract } from "./auto-extract";

describe("shouldAutoExtract", () => {
  it("extracts pending events without prior AI extraction", () => {
    expect(
      shouldAutoExtract({
        reviewStatus: "pending_review",
        extractedFieldsJson: {},
      }),
    ).toBe(true);
  });

  it("skips events that already have an AI extraction", () => {
    expect(
      shouldAutoExtract({
        reviewStatus: "pending_review",
        extractedFieldsJson: { aiExtractionSource: "vision_api" },
      }),
    ).toBe(false);
  });

  it("skips events that are no longer pending review", () => {
    expect(
      shouldAutoExtract({
        reviewStatus: "confirmed",
        extractedFieldsJson: {},
      }),
    ).toBe(false);
  });
});
