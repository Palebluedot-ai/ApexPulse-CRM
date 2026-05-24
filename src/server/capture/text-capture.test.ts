import { describe, expect, it } from "vitest";
import { buildTextCaptureEvent } from "./text-capture";

describe("text capture", () => {
  it("keeps the original note and sends it to review first", () => {
    const capturedAt = new Date("2026-05-24T20:45:00+08:00");

    expect(
      buildTextCaptureEvent({
        rawText: "  今天在展会认识刘总，后续要发开户材料  ",
        capturedAt,
      }),
    ).toEqual({
      sourceChannel: "pwa",
      contentType: "text",
      rawText: "今天在展会认识刘总，后续要发开户材料",
      extractedFieldsJson: {},
      reviewStatus: "pending_review",
      capturedAt,
    });
  });

  it("rejects empty text notes before touching the database", () => {
    expect(() => buildTextCaptureEvent({ rawText: "   " })).toThrow(
      "Text note is required",
    );
  });

  it("preserves an optional occurred_at when the user is backfilling history", () => {
    const occurredAt = new Date("2026-05-20T10:00:00+08:00");

    expect(
      buildTextCaptureEvent({
        rawText: "补录：上周和刘总聊过开户材料",
        occurredAt,
      }).occurredAt,
    ).toBe(occurredAt);
  });
});
