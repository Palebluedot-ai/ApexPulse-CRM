import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  attachments,
  events,
  parties,
  tasks,
  type Attachment,
  type Event,
  type NewEvent,
} from "@/server/db/schema";
import {
  buildAutoFollowupTaskFromReviewFields,
  buildNewPartyFromReviewFields,
  buildPartyLastContactUpdate,
  parseNextFollowupAt,
  type PartyLastContactInput,
} from "./confirm-effects";
import type { ReviewNaturalFields } from "@/lib/review-form";

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
  naturalFields?: ReviewNaturalFields;
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
  currentUserId: string,
  limit = 50,
): Promise<PendingReviewItem[]> {
  const rows = await db
    .select({
      event: events,
      attachment: attachments,
    })
    .from(events)
    .leftJoin(attachments, eq(attachments.eventId, events.id))
    .where(
      and(
        eq(events.reviewStatus, "pending_review"),
        eq(events.createdByUserId, currentUserId),
      ),
    )
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
  input: ConfirmReviewInput & { eventId: string; currentUserId: string },
) {
  const event = await db.transaction(async (tx) => {
    const [pendingEvent] = await tx
      .select()
      .from(events)
      .where(
        and(
          eq(events.id, requireEventId(input.eventId)),
          eq(events.reviewStatus, "pending_review"),
          eq(events.createdByUserId, input.currentUserId),
        ),
      )
      .limit(1);

    if (!pendingEvent) return undefined;

    const contactAt =
      input.occurredAt ?? pendingEvent.occurredAt ?? pendingEvent.capturedAt;
    const nextFollowupAt = parseNextFollowupAt(
      input.naturalFields?.nextFollowupAt,
    );
    let partyId = input.partyId;

    if (!partyId && input.naturalFields) {
      const newParty = buildNewPartyFromReviewFields({
        eventId: pendingEvent.id,
        summary: input.summary,
        naturalFields: input.naturalFields,
        contactAt,
        nextFollowupAt,
        followupStatus: input.followupStatus,
        createdByUserId: input.reviewedByUserId,
        reviewedByUserId: input.reviewedByUserId,
        updatedAt: input.reviewedAt,
      });

      if (newParty) {
        const [party] = await tx.insert(parties).values(newParty).returning();
        partyId = party.id;
      }
    }

    const [confirmedEvent] = await tx
      .update(events)
      .set(
        buildConfirmReviewUpdate({
          ...input,
          partyId,
          occurredAt: input.occurredAt,
        }),
      )
      .where(
        and(
          eq(events.id, requireEventId(input.eventId)),
          eq(events.reviewStatus, "pending_review"),
          eq(events.createdByUserId, input.currentUserId),
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
            nextFollowupAt,
            followupStatus: input.followupStatus,
          }),
        )
        .where(eq(parties.id, confirmedEvent.partyId));

      if (input.naturalFields) {
        const task = buildAutoFollowupTaskFromReviewFields({
          partyId: confirmedEvent.partyId,
          sourceEventId: confirmedEvent.id,
          naturalFields: input.naturalFields,
          dueAt: nextFollowupAt,
          createdByUserId: input.reviewedByUserId,
        });

        if (task) {
          await tx.insert(tasks).values(task);
        }
      }
    }

    return confirmedEvent;
  });

  if (!event) throw new Error("Pending review event not found");

  return event;
}

export async function editReviewEvent(
  db: Db,
  input: EditReviewInput & { eventId: string; currentUserId: string },
) {
  const [event] = await db
    .update(events)
    .set(buildEditReviewUpdate(input))
    .where(
      and(
        eq(events.id, requireEventId(input.eventId)),
        eq(events.reviewStatus, "pending_review"),
        eq(events.createdByUserId, input.currentUserId),
      ),
    )
    .returning();

  if (!event) throw new Error("Pending review event not found");

  return event;
}

export async function skipReviewEvent(
  db: Db,
  input: SkipReviewInput & { eventId: string; currentUserId: string },
) {
  const [event] = await db
    .update(events)
    .set(buildSkipReviewUpdate(input))
    .where(
      and(
        eq(events.id, requireEventId(input.eventId)),
        eq(events.reviewStatus, "pending_review"),
        eq(events.createdByUserId, input.currentUserId),
      ),
    )
    .returning();

  if (!event) throw new Error("Pending review event not found");

  return event;
}
