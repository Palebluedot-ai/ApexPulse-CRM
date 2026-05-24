import type { NewParty } from "@/server/db/schema";

export interface PartyLastContactInput {
  eventId: string;
  summary: string;
  contactAt: Date;
  followupStatus?: "up_to_date" | "due_soon" | "overdue" | "unknown";
  updatedAt?: Date;
}

export type PartyLastContactUpdate = Pick<
  NewParty,
  | "lastContactAt"
  | "lastContactSummary"
  | "lastContactEventId"
  | "followupStatus"
  | "updatedAt"
>;

export function buildPartyLastContactUpdate(
  input: PartyLastContactInput,
): PartyLastContactUpdate {
  const summary = input.summary.trim();
  if (!summary) {
    throw new Error("Last contact summary is required");
  }

  return {
    lastContactAt: input.contactAt,
    lastContactSummary: summary,
    lastContactEventId: input.eventId,
    followupStatus: input.followupStatus ?? "up_to_date",
    updatedAt: input.updatedAt ?? new Date(),
  };
}
