import { and, asc, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  attachments,
  events,
  parties,
  tasks,
  type Attachment,
  type Event,
  type Party,
  type Task,
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
  | "attention"
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

export interface CustomerActionTask {
  id: string;
  description: string;
  dueAt: Date | null;
  taskType: Task["taskType"];
}

export interface CustomerActionPanel {
  headline: string;
  urgency: "overdue" | "due_soon" | "healthy" | "missing";
  reason: string;
  primaryActionLabel: string;
  nextFollowupAt: Date | null;
  openTaskCount: number;
  nextTask: CustomerActionTask | null;
}

export interface CustomerFirstScreen {
  customer: CustomerListItem & {
    handles: Party["handlesJson"];
    profileSummary: string | null;
  };
  latestCommunication: LatestCommunicationCard | null;
  actionPanel: CustomerActionPanel;
  morningBrief: string[];
  openTasks: CustomerActionTask[];
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

const attentionRank: Record<CustomerListItem["followupStatus"], number> = {
  overdue: 0,
  due_soon: 1,
  up_to_date: 2,
  unknown: 3,
};

export function sortCustomerListItems(
  customers: CustomerListItem[],
  sort: CustomerSort,
): CustomerListItem[] {
  return [...customers].sort((a, b) => {
    if (sort === "attention") {
      const rankDiff =
        attentionRank[a.followupStatus] - attentionRank[b.followupStatus];
      if (rankDiff !== 0) return rankDiff;

      const followupDiff =
        dateValue(a.nextFollowupAt, Number.POSITIVE_INFINITY) -
        dateValue(b.nextFollowupAt, Number.POSITIVE_INFINITY);
      if (followupDiff !== 0) return followupDiff;

      return (
        dateValue(b.lastContactAt, Number.NEGATIVE_INFINITY) -
        dateValue(a.lastContactAt, Number.NEGATIVE_INFINITY)
      );
    }

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

function buildActionTask(task: Task): CustomerActionTask {
  return {
    id: task.id,
    description: task.description,
    dueAt: task.dueAt,
    taskType: task.taskType,
  };
}

export function buildCustomerActionPanel(input: {
  customer: CustomerListItem;
  openTasks: Task[];
}): CustomerActionPanel {
  const sortedOpenTasks = [...input.openTasks].sort(
    (a, b) =>
      dateValue(a.dueAt, Number.POSITIVE_INFINITY) -
      dateValue(b.dueAt, Number.POSITIVE_INFINITY),
  );
  const nextTask = sortedOpenTasks[0] ? buildActionTask(sortedOpenTasks[0]) : null;

  if (input.customer.followupStatus === "overdue") {
    return {
      headline: "已经逾期",
      urgency: "overdue",
      reason: "这个客户已经越过预期跟进时间，需要优先处理。",
      primaryActionLabel: "今天处理",
      nextFollowupAt: input.customer.nextFollowupAt,
      openTaskCount: input.openTasks.length,
      nextTask,
    };
  }

  if (input.customer.followupStatus === "due_soon") {
    return {
      headline: "近期要跟进",
      urgency: "due_soon",
      reason: "这个客户已经有明确的下一次跟进时间，不要让它自然沉睡。",
      primaryActionLabel: "处理下一步",
      nextFollowupAt: input.customer.nextFollowupAt,
      openTaskCount: input.openTasks.length,
      nextTask,
    };
  }

  if (input.customer.followupStatus === "unknown") {
    return {
      headline: "还没有跟进计划",
      urgency: "missing",
      reason: "这个客户还没有明确分层或下一步，最好补一条可执行任务。",
      primaryActionLabel: "补一条任务",
      nextFollowupAt: input.customer.nextFollowupAt,
      openTaskCount: input.openTasks.length,
      nextTask,
    };
  }

  return {
    headline: "状态健康",
    urgency: "healthy",
    reason: "这个客户当前没有紧急跟进信号，保持节奏即可。",
    primaryActionLabel: "记录新进展",
    nextFollowupAt: input.customer.nextFollowupAt,
    openTaskCount: input.openTasks.length,
    nextTask,
  };
}

export function buildCustomerMorningBrief(input: {
  customer: CustomerListItem;
  latestCommunication: LatestCommunicationCard | null;
  actionPanel: CustomerActionPanel;
}): string[] {
  const latestLine = input.latestCommunication
    ? `最近沟通：${input.latestCommunication.summary}`
    : "最近沟通：还没有确认过的沟通。";
  const nextLine = input.actionPanel.nextTask
    ? `下一步：${input.actionPanel.nextTask.description}`
    : "下一步：先补一条明确的跟进任务。";

  return [latestLine, nextLine, `风险提示：${input.actionPanel.reason}`];
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
  const openTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.partyId, customerId), eq(tasks.status, "open")))
    .orderBy(asc(tasks.dueAt), asc(tasks.createdAt));
  const customer = {
    ...buildCustomerListItem(party),
    handles: party.handlesJson,
    profileSummary: party.profileSummary,
  };

  const latestCommunication = buildLatestCommunicationCard({
    party,
    event: latestEvent ?? null,
    attachments: latestAttachments,
  });
  const actionPanel = buildCustomerActionPanel({
    customer,
    openTasks,
  });

  return {
    customer,
    latestCommunication,
    actionPanel,
    morningBrief: buildCustomerMorningBrief({
      customer,
      latestCommunication,
      actionPanel,
    }),
    openTasks: openTasks.map(buildActionTask),
  };
}
