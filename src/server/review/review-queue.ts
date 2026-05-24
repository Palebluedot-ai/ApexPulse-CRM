import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  attachments,
  events,
  parties,
  type Attachment,
  type Event,
  type NewEvent,
} from "@/server/db/schema";
import {
  buildPartyLastContactUpdate,
  type PartyLastContactInput,
} from "./confirm-effects";

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;
type ReviewStatus = "pending_review" | "confirmed" | "skipped";
type ReviewEventUpdate = Partial<NewEvent> & {
  reviewStatus: ReviewStatus;
  updatedAt: Date;
};

export interface ConfirmReviewInput {
  partyId?: string;
  summary: string;
  extractedFields: Record<string, unknown>;
  occurredAt?: Date;
  followupStatus?: PartyLastContactInput["followupStatus"];
  reviewedByUserId?: string;
  reviewedAt?: Date;
}

export interface EditReviewInput {
  summary: string;
  extractedFields: Record<string, unknown>;
  editedAt?: Date;
}

export interface SkipReviewInput {
  reviewedByUserId?: string;
  skippedAt?: Date;
}

export interface PendingReviewItem {
  event: Event;
  attachments: Attachment[];
}

function requireSummary(summary: string): string {
  const normalized = summary.trim();
  if (!normalized) {
    throw new Error("Review summary is required");
  }

  return normalized;
}

function requireEventId(eventId: string): string {
  const normalized = eventId.trim();
  if (!normalized) {
    throw new Error("Event id is required");
  }

  return normalized;
}

export function buildConfirmReviewUpdate(
  input: ConfirmReviewInput,
): ReviewEventUpdate {
  const update: ReviewEventUpdate = {
    aiSummary: requireSummary(input.summary),
    extractedFieldsJson: input.extractedFields,
    reviewStatus: "confirmed",
    updatedAt: input.reviewedAt ?? new Date(),
  };

  if (input.partyId) update.partyId = input.partyId;
  if (input.occurredAt) update.occurredAt = input.occurredAt;
  if (input.reviewedByUserId) update.reviewedByUserId = input.reviewedByUserId;

  return update;
}

export function buildEditReviewUpdate(
  input: EditReviewInput,
): ReviewEventUpdate {
  return {
    aiSummary: requireSummary(input.summary),
    extractedFieldsJson: input.extractedFields,
    reviewStatus: "pending_review",
    updatedAt: input.editedAt ?? new Date(),
  };
}

export function buildSkipReviewUpdate(input: SkipReviewInput): ReviewEventUpdate {
  const update: ReviewEventUpdate = {
    reviewStatus: "skipped",
    updatedAt: input.skippedAt ?? new Date(),
  };

  if (input.reviewedByUserId) update.reviewedByUserId = input.reviewedByUserId;

  return update;
}

export async function listPendingReviewItems(
  db: Db,
  limit = 50,
): Promise<PendingReviewItem[]> {
  const rows = await db
    .select({
      event: events,
      attachment: attachments,
    })
    .from(events)
    .leftJoin(attachments, eq(attachments.eventId, events.id))
    .where(eq(events.reviewStatus, "pending_review"))
    .orderBy(desc(events.capturedAt))
    .limit(limit);

  const items = new Map<string, PendingReviewItem>();

  for (const row of rows) {
    const existing = items.get(row.event.id);
    if (existing) {
      if (row.attachment) existing.attachments.push(row.attachment);
      continue;
    }

    items.set(row.event.id, {
      event: row.event,
      attachments: row.attachment ? [row.attachment] : [],
    });
  }

  return Array.from(items.values());
}

export async function confirmReviewEvent(
  db: Db,
  input: ConfirmReviewInput & { eventId: string },
) {
  const event = await db.transaction(async (tx) => {
    const [confirmedEvent] = await tx
      .update(events)
      .set(buildConfirmReviewUpdate(input))
      .where(
        and(
          eq(events.id, requireEventId(input.eventId)),
          eq(events.reviewStatus, "pending_review"),
        ),
      )
      .returning();

    if (!confirmedEvent) return undefined;

    if (confirmedEvent.partyId) {
      await tx
        .update(parties)
        .set(
          buildPartyLastContactUpdate({
            eventId: confirmedEvent.id,
            summary: confirmedEvent.aiSummary ?? input.summary,
            contactAt: confirmedEvent.occurredAt ?? confirmedEvent.capturedAt,
            followupStatus: input.followupStatus,
          }),
        )
        .where(eq(parties.id, confirmedEvent.partyId));
    }

    return confirmedEvent;
  });

  if (!event) throw new Error("Pending review event not found");

  return event;
}

export async function editReviewEvent(
  db: Db,
  input: EditReviewInput & { eventId: string },
) {
  const [event] = await db
    .update(events)
    .set(buildEditReviewUpdate(input))
    .where(
      and(
        eq(events.id, requireEventId(input.eventId)),
        eq(events.reviewStatus, "pending_review"),
      ),
    )
    .returning();

  if (!event) throw new Error("Pending review event not found");

  return event;
}

export async function skipReviewEvent(
  db: Db,
  input: SkipReviewInput & { eventId: string },
) {
  const [event] = await db
    .update(events)
    .set(buildSkipReviewUpdate(input))
    .where(
      and(
        eq(events.id, requireEventId(input.eventId)),
        eq(events.reviewStatus, "pending_review"),
      ),
    )
    .returning();

  if (!event) throw new Error("Pending review event not found");

  return event;
}
