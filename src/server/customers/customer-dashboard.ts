import { asc, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  attachments,
  events,
  parties,
  type Attachment,
  type Event,
  type Party,
} from "@/server/db/schema";

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;

export interface CustomerListItem {
  id: string;
  displayName: string;
  companyName: string | null;
  referralSourceTag: string | null;
  statusLabel: string | null;
  tags: string[];
  followupStatus: Party["followupStatus"];
  lastContactAt: Date | null;
  lastContactSummary: string | null;
  nextFollowupAt: Date | null;
}

export interface LatestCommunicationCard {
  eventId: string;
  summary: string;
  rawText: string | null;
  contentType: Event["contentType"];
  sourceChannel: Event["sourceChannel"];
  occurredAt: Date | null;
  capturedAt: Date;
  reviewStatus: Event["reviewStatus"];
  extractedFields: Record<string, unknown>;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    storageKey: string;
    width: number | null;
    height: number | null;
  }>;
}

export interface CustomerFirstScreen {
  customer: CustomerListItem & {
    handles: Party["handlesJson"];
    profileSummary: string | null;
  };
  latestCommunication: LatestCommunicationCard | null;
}

export function buildCustomerListItem(party: Party): CustomerListItem {
  return {
    id: party.id,
    displayName: party.displayName,
    companyName: party.companyName,
    referralSourceTag: party.referralSourceTag,
    statusLabel: party.statusLabel,
    tags: party.tags,
    followupStatus: party.followupStatus,
    lastContactAt: party.lastContactAt,
    lastContactSummary: party.lastContactSummary,
    nextFollowupAt: party.nextFollowupAt,
  };
}

export function buildLatestCommunicationCard(input: {
  party: Party;
  event: Event | null;
  attachments: Attachment[];
}): LatestCommunicationCard | null {
  if (!input.party.lastContactEventId || !input.event) {
    return null;
  }

  return {
    eventId: input.event.id,
    summary:
      input.party.lastContactSummary ??
      input.event.aiSummary ??
      input.event.rawText ??
      "暂无沟通摘要",
    rawText: input.event.rawText,
    contentType: input.event.contentType,
    sourceChannel: input.event.sourceChannel,
    occurredAt: input.event.occurredAt,
    capturedAt: input.event.capturedAt,
    reviewStatus: input.event.reviewStatus,
    extractedFields: input.event.extractedFieldsJson,
    attachments: input.attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      storageKey: attachment.storageKey,
      width: attachment.width,
      height: attachment.height,
    })),
  };
}

export async function listCustomerListItems(db: Db): Promise<CustomerListItem[]> {
  const rows = await db
    .select()
    .from(parties)
    .orderBy(desc(parties.lastContactAt), asc(parties.displayName));

  return rows.map(buildCustomerListItem);
}

export async function getCustomerFirstScreen(
  db: Db,
  customerId: string,
): Promise<CustomerFirstScreen | null> {
  const [party] = await db
    .select()
    .from(parties)
    .where(eq(parties.id, customerId))
    .limit(1);

  if (!party) return null;

  const [latestEvent] = party.lastContactEventId
    ? await db
        .select()
        .from(events)
        .where(eq(events.id, party.lastContactEventId))
        .limit(1)
    : [];

  const latestAttachments = latestEvent
    ? await db
        .select()
        .from(attachments)
        .where(eq(attachments.eventId, latestEvent.id))
    : [];

  return {
    customer: {
      ...buildCustomerListItem(party),
      handles: party.handlesJson,
      profileSummary: party.profileSummary,
    },
    latestCommunication: buildLatestCommunicationCard({
      party,
      event: latestEvent ?? null,
      attachments: latestAttachments,
    }),
  };
}
