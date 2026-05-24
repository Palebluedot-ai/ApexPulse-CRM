import { describe, expect, it } from "vitest";
import {
  buildConfirmReviewUpdate,
  buildEditReviewUpdate,
  buildSkipReviewUpdate,
} from "./review-queue";

describe("review queue", () => {
  it("confirms a pending event without refreshing the customer yet", () => {
    const reviewedAt = new Date("2026-05-24T21:20:00+08:00");

    expect(
      buildConfirmReviewUpdate({
        partyId: "11111111-1111-1111-1111-111111111111",
        summary: "刘总关心 OTC 出入金流程，下周要继续跟进。",
        extractedFields: { nextAction: "下周跟进" },
        occurredAt: new Date("2026-05-24T10:30:00+08:00"),
        reviewedByUserId: "22222222-2222-2222-2222-222222222222",
        reviewedAt,
      }),
    ).toEqual({
      partyId: "11111111-1111-1111-1111-111111111111",
      aiSummary: "刘总关心 OTC 出入金流程，下周要继续跟进。",
      extractedFieldsJson: { nextAction: "下周跟进" },
      occurredAt: new Date("2026-05-24T10:30:00+08:00"),
      reviewStatus: "confirmed",
      reviewedByUserId: "22222222-2222-2222-2222-222222222222",
      updatedAt: reviewedAt,
    });
  });

  it("keeps edited extracted fields pending until the user confirms", () => {
    const editedAt = new Date("2026-05-24T21:25:00+08:00");

    expect(
      buildEditReviewUpdate({
        summary: "截图里对方问了 OTC 费率。",
        extractedFields: { topic: "fee" },
        editedAt,
      }),
    ).toEqual({
      aiSummary: "截图里对方问了 OTC 费率。",
      extractedFieldsJson: { topic: "fee" },
      reviewStatus: "pending_review",
      updatedAt: editedAt,
    });
  });

  it("skips an event without deleting original evidence", () => {
    const skippedAt = new Date("2026-05-24T21:30:00+08:00");

    expect(
      buildSkipReviewUpdate({
        reviewedByUserId: "22222222-2222-2222-2222-222222222222",
        skippedAt,
      }),
    ).toEqual({
      reviewStatus: "skipped",
      reviewedByUserId: "22222222-2222-2222-2222-222222222222",
      updatedAt: skippedAt,
    });
  });

  it("rejects blank summaries when confirming or editing", () => {
    expect(() =>
      buildConfirmReviewUpdate({
        summary: " ",
        extractedFields: {},
      }),
    ).toThrow("Review summary is required");

    expect(() =>
      buildEditReviewUpdate({
        summary: "",
        extractedFields: {},
      }),
    ).toThrow("Review summary is required");
  });
});
