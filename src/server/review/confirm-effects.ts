import type { ReviewNaturalFields } from "@/lib/review-form";
import type { NewParty, NewTask } from "@/server/db/schema";

export interface PartyLastContactInput {
  eventId: string;
  summary: string;
  contactAt: Date;
  nextFollowupAt?: Date;
  followupStatus?: "up_to_date" | "due_soon" | "overdue" | "unknown";
  updatedAt?: Date;
}

export type PartyLastContactUpdate = Pick<
  NewParty,
  "lastContactAt" | "lastContactSummary" | "lastContactEventId" | "followupStatus" | "updatedAt"
> &
  Partial<Pick<NewParty, "nextFollowupAt">>;

export interface NewPartyFromReviewInput {
  eventId: string;
  summary: string;
  naturalFields: ReviewNaturalFields;
  contactAt: Date;
  nextFollowupAt?: Date;
  followupStatus?: PartyLastContactInput["followupStatus"];
  ownerUserId?: string;
  createdByUserId?: string;
  reviewedByUserId?: string;
  updatedAt?: Date;
}

export interface AutoFollowupTaskFromReviewInput {
  partyId?: string;
  sourceEventId: string;
  naturalFields: ReviewNaturalFields;
  dueAt?: Date;
  createdByUserId?: string;
}

function trimOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function parseNextFollowupAt(value: string | undefined): Date | undefined {
  const normalized = trimOptional(value);
  if (!normalized) return undefined;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildPartyLastContactUpdate(
  input: PartyLastContactInput,
): PartyLastContactUpdate {
  const summary = input.summary.trim();
  if (!summary) {
    throw new Error("Last contact summary is required");
  }

  const update: PartyLastContactUpdate = {
    lastContactAt: input.contactAt,
    lastContactSummary: summary,
    lastContactEventId: input.eventId,
    followupStatus: input.followupStatus ?? "up_to_date",
    updatedAt: input.updatedAt ?? new Date(),
  };

  if (input.nextFollowupAt) update.nextFollowupAt = input.nextFollowupAt;

  return update;
}

export function buildNewPartyFromReviewFields(
  input: NewPartyFromReviewInput,
): NewParty | undefined {
  const displayName = trimOptional(input.naturalFields.customerName);
  if (!displayName) return undefined;

  const lastContact = buildPartyLastContactUpdate({
    eventId: input.eventId,
    summary: input.summary,
    contactAt: input.contactAt,
    nextFollowupAt: input.nextFollowupAt,
    followupStatus: input.followupStatus,
    updatedAt: input.updatedAt,
  });

  return {
    displayName,
    companyName: trimOptional(input.naturalFields.companyName),
    referralSourceTag: trimOptional(input.naturalFields.sourceTag),
    profileSummary: trimOptional(input.naturalFields.needSummary),
    ...lastContact,
    ownerUserId: input.ownerUserId ?? input.createdByUserId,
    createdByUserId: input.createdByUserId,
    reviewedByUserId: input.reviewedByUserId,
    updatedByUserId: input.reviewedByUserId,
  };
}

export function buildAutoFollowupTaskFromReviewFields(
  input: AutoFollowupTaskFromReviewInput,
): NewTask | undefined {
  const description = trimOptional(input.naturalFields.nextAction);
  if (!input.partyId || !description) return undefined;

  return {
    partyId: input.partyId,
    sourceEventId: input.sourceEventId,
    taskType: "followup",
    description,
    dueAt: input.dueAt,
    status: "open",
    createdByUserId: input.createdByUserId,
  };
}
