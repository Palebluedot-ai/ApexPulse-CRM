import { describe, expect, it } from "vitest";
import { buildPartyLastContactUpdate } from "./confirm-effects";

describe("confirm effects", () => {
  it("refreshes the customer's latest communication fields from a confirmed event", () => {
    const contactAt = new Date("2026-05-24T11:00:00+08:00");
    const updatedAt = new Date("2026-05-24T21:40:00+08:00");

    expect(
      buildPartyLastContactUpdate({
        eventId: "33333333-3333-3333-3333-333333333333",
        summary: "确认后的沟通摘要：客户要下周继续跟进。",
        contactAt,
        updatedAt,
      }),
    ).toEqual({
      lastContactAt: contactAt,
      lastContactSummary: "确认后的沟通摘要：客户要下周继续跟进。",
      lastContactEventId: "33333333-3333-3333-3333-333333333333",
      followupStatus: "up_to_date",
      updatedAt,
    });
  });

  it("allows explicit follow-up status when the review flow already knows it", () => {
    expect(
      buildPartyLastContactUpdate({
        eventId: "33333333-3333-3333-3333-333333333333",
        summary: "客户已经约好明天继续聊。",
        contactAt: new Date("2026-05-24T11:00:00+08:00"),
        followupStatus: "due_soon",
      }),
    ).toMatchObject({
      followupStatus: "due_soon",
    });
  });

  it("rejects blank summary before touching the customer row", () => {
    expect(() =>
      buildPartyLastContactUpdate({
        eventId: "33333333-3333-3333-3333-333333333333",
        summary: " ",
        contactAt: new Date("2026-05-24T11:00:00+08:00"),
      }),
    ).toThrow("Last contact summary is required");
  });
});
