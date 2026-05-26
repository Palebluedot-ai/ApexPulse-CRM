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

export interface CustomerDashboardStats {
  total: number;
  dueSoon: number;
  overdue: number;
  unknown: number;
}

export type CustomerFollowupFilter =
  | "all"
  | "up_to_date"
  | "due_soon"
  | "overdue"
  | "unknown";

export type CustomerSort =
  | "last_contact_desc"
  | "next_followup_asc"
  | "name_asc";

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

export function buildCustomerDashboardStats(
  customers: CustomerListItem[],
): CustomerDashboardStats {
  return {
    total: customers.length,
    dueSoon: customers.filter((customer) => customer.followupStatus === "due_soon")
      .length,
    overdue: customers.filter((customer) => customer.followupStatus === "overdue")
      .length,
    unknown: customers.filter((customer) => customer.followupStatus === "unknown")
      .length,
  };
}

function includesQuery(customer: CustomerListItem, query: string): boolean {
  const haystack = [
    customer.displayName,
    customer.companyName,
    customer.referralSourceTag,
    customer.statusLabel,
    customer.lastContactSummary,
    ...customer.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function filterCustomerListItems(
  customers: CustomerListItem[],
  filters: {
    query?: string;
    followupStatus?: CustomerFollowupFilter;
  },
): CustomerListItem[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const followupStatus = filters.followupStatus ?? "all";

  return customers.filter((customer) => {
    const matchesQuery = query ? includesQuery(customer, query) : true;
    const matchesStatus =
      followupStatus === "all" || customer.followupStatus === followupStatus;

    return matchesQuery && matchesStatus;
  });
}

function dateValue(date: Date | null, nullFallback: number): number {
  return date ? date.getTime() : nullFallback;
}

export function sortCustomerListItems(
  customers: CustomerListItem[],
  sort: CustomerSort,
): CustomerListItem[] {
  return [...customers].sort((a, b) => {
    if (sort === "name_asc") {
      return a.displayName.localeCompare(b.displayName, "zh-HK");
    }

    if (sort === "next_followup_asc") {
      return (
        dateValue(a.nextFollowupAt, Number.POSITIVE_INFINITY) -
        dateValue(b.nextFollowupAt, Number.POSITIVE_INFINITY)
      );
    }

    return (
      dateValue(b.lastContactAt, Number.NEGATIVE_INFINITY) -
      dateValue(a.lastContactAt, Number.NEGATIVE_INFINITY)
    );
  });
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
