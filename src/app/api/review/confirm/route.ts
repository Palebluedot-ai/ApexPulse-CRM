import { NextResponse } from "next/server";
import {
  isUnauthorizedError,
  requireCurrentUser,
} from "@/server/auth/current-user";
import { createDb } from "@/server/db";
import { confirmReviewEvent } from "@/server/review/review-queue";
import type { ReviewNaturalFields } from "@/lib/review-form";

const followupStatusValues = [
  "up_to_date",
  "due_soon",
  "overdue",
  "unknown",
] as const;

type FollowupStatus = (typeof followupStatusValues)[number];

function followupStatusOrUndefined(
  value: unknown,
): FollowupStatus | undefined {
  if (typeof value !== "string") return undefined;
  return followupStatusValues.includes(value as FollowupStatus)
    ? (value as FollowupStatus)
    : undefined;
}

function dateOrUndefined(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function naturalFieldsOrUndefined(
  value: unknown,
): ReviewNaturalFields | undefined {
  if (typeof value !== "object" || value == null || Array.isArray(value)) {
    return undefined;
  }

  const fields = value as Record<string, unknown>;

  return {
    customerName:
      typeof fields.customerName === "string" ? fields.customerName : "",
    companyName:
      typeof fields.companyName === "string" ? fields.companyName : "",
    sourceTag: typeof fields.sourceTag === "string" ? fields.sourceTag : "",
    needSummary:
      typeof fields.needSummary === "string" ? fields.needSummary : "",
    nextAction:
      typeof fields.nextAction === "string" ? fields.nextAction : "",
    nextFollowupAt:
      typeof fields.nextFollowupAt === "string" ? fields.nextFollowupAt : "",
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const event = await confirmReviewEvent(db, {
      eventId: typeof body.eventId === "string" ? body.eventId : "",
      partyId: typeof body.partyId === "string" ? body.partyId : undefined,
      summary: typeof body.summary === "string" ? body.summary : "",
      extractedFields:
        typeof body.extractedFields === "object" && body.extractedFields != null
          ? (body.extractedFields as Record<string, unknown>)
          : {},
      naturalFields: naturalFieldsOrUndefined(body.naturalFields),
      occurredAt: dateOrUndefined(body.occurredAt),
      followupStatus: followupStatusOrUndefined(body.followupStatus),
      reviewedByUserId: currentUser.id,
      currentUserId: currentUser.id,
    });

    return NextResponse.json({ event });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (error instanceof Error) {
      const badRequestMessages = new Set([
        "Event id is required",
        "Review summary is required",
        "Pending review event not found",
      ]);

      if (badRequestMessages.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    throw error;
  } finally {
    await client.end();
  }
}
