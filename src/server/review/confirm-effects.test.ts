import { describe, expect, it } from "vitest";
import {
  buildAutoFollowupTaskFromReviewFields,
  buildNewPartyFromReviewFields,
  buildPartyLastContactUpdate,
  parseNextFollowupAt,
} from "./confirm-effects";

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
    const nextFollowupAt = new Date("2026-06-01T09:00:00+08:00");

    expect(
      buildPartyLastContactUpdate({
        eventId: "33333333-3333-3333-3333-333333333333",
        summary: "客户已经约好明天继续聊。",
        contactAt: new Date("2026-05-24T11:00:00+08:00"),
        nextFollowupAt,
        followupStatus: "due_soon",
      }),
    ).toMatchObject({
      followupStatus: "due_soon",
      nextFollowupAt,
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

  it("builds a new customer from confirmed review natural fields", () => {
    const contactAt = new Date("2026-05-29T15:00:00+08:00");
    const nextFollowupAt = new Date("2026-06-03T10:00:00+08:00");
    const updatedAt = new Date("2026-05-29T15:05:00+08:00");

    expect(
      buildNewPartyFromReviewFields({
        eventId: "33333333-3333-3333-3333-333333333333",
        summary: "陈总想了解 OTC 费率和出入金流程。",
        naturalFields: {
          customerName: " 陈总 ",
          companyName: "Demo Trading",
          sourceTag: "Token2049",
          needSummary: "想了解 OTC 费率和出入金流程",
          nextAction: "下周发报价并约电话",
          nextFollowupAt: "2026-06-03T10:00:00+08:00",
        },
        contactAt,
        nextFollowupAt,
        followupStatus: "due_soon",
        createdByUserId: "11111111-1111-1111-1111-111111111111",
        reviewedByUserId: "22222222-2222-2222-2222-222222222222",
        updatedAt,
      }),
    ).toEqual({
      displayName: "陈总",
      companyName: "Demo Trading",
      referralSourceTag: "Token2049",
      profileSummary: "想了解 OTC 费率和出入金流程",
      lastContactAt: contactAt,
      lastContactSummary: "陈总想了解 OTC 费率和出入金流程。",
      lastContactEventId: "33333333-3333-3333-3333-333333333333",
      nextFollowupAt,
      followupStatus: "due_soon",
      ownerUserId: "11111111-1111-1111-1111-111111111111",
      createdByUserId: "11111111-1111-1111-1111-111111111111",
      reviewedByUserId: "22222222-2222-2222-2222-222222222222",
      updatedByUserId: "22222222-2222-2222-2222-222222222222",
      updatedAt,
    });
  });

  it("does not build a new customer when the review has no customer name", () => {
    expect(
      buildNewPartyFromReviewFields({
        eventId: "33333333-3333-3333-3333-333333333333",
        summary: "只确认一条未归属事件。",
        naturalFields: {
          customerName: " ",
          companyName: "Demo Trading",
          sourceTag: "Token2049",
          needSummary: "想了解 OTC 费率",
          nextAction: "",
          nextFollowupAt: "",
        },
        contactAt: new Date("2026-05-29T15:00:00+08:00"),
      }),
    ).toBeUndefined();
  });

  it("builds an automatic follow-up task from next action and due date", () => {
    const dueAt = new Date("2026-06-03T10:00:00+08:00");

    expect(
      buildAutoFollowupTaskFromReviewFields({
        partyId: "11111111-1111-1111-1111-111111111111",
        sourceEventId: "33333333-3333-3333-3333-333333333333",
        naturalFields: {
          customerName: "陈总",
          companyName: "Demo Trading",
          sourceTag: "Token2049",
          needSummary: "想了解 OTC 费率",
          nextAction: " 下周发报价并约电话 ",
          nextFollowupAt: "2026-06-03T10:00:00+08:00",
        },
        dueAt,
        createdByUserId: "22222222-2222-2222-2222-222222222222",
      }),
    ).toEqual({
      partyId: "11111111-1111-1111-1111-111111111111",
      sourceEventId: "33333333-3333-3333-3333-333333333333",
      taskType: "followup",
      description: "下周发报价并约电话",
      dueAt,
      status: "open",
      createdByUserId: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("does not build an automatic task without a final customer or next action", () => {
    const naturalFields = {
      customerName: "陈总",
      companyName: "",
      sourceTag: "",
      needSummary: "",
      nextAction: "",
      nextFollowupAt: "",
    };

    expect(
      buildAutoFollowupTaskFromReviewFields({
        partyId: undefined,
        sourceEventId: "33333333-3333-3333-3333-333333333333",
        naturalFields: { ...naturalFields, nextAction: "下周跟进" },
      }),
    ).toBeUndefined();

    expect(
      buildAutoFollowupTaskFromReviewFields({
        partyId: "11111111-1111-1111-1111-111111111111",
        sourceEventId: "33333333-3333-3333-3333-333333333333",
        naturalFields,
      }),
    ).toBeUndefined();
  });

  it("parses valid next follow-up dates and ignores invalid dates", () => {
    expect(parseNextFollowupAt("2026-06-03T10:00:00+08:00")).toEqual(
      new Date("2026-06-03T10:00:00+08:00"),
    );
    expect(parseNextFollowupAt("not a date")).toBeUndefined();
    expect(parseNextFollowupAt(" ")).toBeUndefined();
  });
});
