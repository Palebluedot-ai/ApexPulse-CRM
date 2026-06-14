import { and, asc, eq, gte, lt, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  events,
  parties,
  tasks,
  type Event,
  type Task,
} from "@/server/db/schema";

type Db = PostgresJsDatabase<typeof import("@/server/db/schema")>;

const hongKongOffsetMs = 8 * 60 * 60 * 1000;
const oneDayMs = 24 * 60 * 60 * 1000;
const oneWeekMs = 7 * oneDayMs;

export interface WeekRange {
  start: Date;
  end: Date;
}

export interface WeeklyReportPartyRow {
  id: string;
  displayName: string;
  companyName: string | null;
  createdAt: Date;
}

export interface WeeklyReportEventRow {
  id: string;
  partyId: string | null;
  partyName: string | null;
  companyName: string | null;
  summary: string | null;
  reviewStatus: Event["reviewStatus"];
  occurredAt: Date | null;
  capturedAt: Date;
}

export interface WeeklyReportTaskRow {
  id: string;
  partyId: string | null;
  partyName: string | null;
  taskType: Task["taskType"];
  description: string;
  dueAt: Date | null;
  status: Task["status"];
  completedAt: Date | null;
}

export interface WeeklyTouchedCustomer {
  partyId: string | null;
  partyName: string;
  companyName: string | null;
  latestEventId: string;
  latestSummary: string;
  latestContactAt: Date;
  weeklyEventCount: number;
}

export interface WeeklyReportSummary {
  newCustomerCount: number;
  confirmedEventCount: number;
  completedTaskCount: number;
  openTodoCount: number;
  touchedCustomerCount: number;
}

export interface WeeklyReport {
  weekRange: WeekRange;
  summary: WeeklyReportSummary;
  touchedCustomers: WeeklyTouchedCustomer[];
  completedTasks: WeeklyReportTaskRow[];
  openTodos: WeeklyReportTaskRow[];
}

export interface StalledCustomer {
  partyId: string;
  partyName: string;
  openTaskCount: number;
  nextTaskDescription: string;
}

/** 失速信号：本周 0 次确认沟通且有未完成任务的客户。 */
export function buildStalledCustomers(report: WeeklyReport): StalledCustomer[] {
  const touchedPartyIds = new Set(
    report.touchedCustomers
      .map((customer) => customer.partyId)
      .filter(Boolean),
  );

  const byParty = new Map<string, StalledCustomer>();
  for (const task of report.openTodos) {
    if (!task.partyId || touchedPartyIds.has(task.partyId)) continue;

    const existing = byParty.get(task.partyId);
    if (existing) {
      existing.openTaskCount += 1;
    } else {
      byParty.set(task.partyId, {
        partyId: task.partyId,
        partyName: task.partyName ?? "未命名客户",
        openTaskCount: 1,
        nextTaskDescription: task.description,
      });
    }
  }

  return Array.from(byParty.values());
}

function inRange(date: Date, range: WeekRange): boolean {
  return date >= range.start && date < range.end;
}

function eventContactAt(event: WeeklyReportEventRow): Date {
  return event.occurredAt ?? event.capturedAt;
}

function eventSummary(event: WeeklyReportEventRow): string {
  return event.summary?.trim() || "暂无沟通摘要";
}

function taskDateValue(task: WeeklyReportTaskRow): number {
  return task.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function getHongKongWeekRange(referenceDate = new Date()): WeekRange {
  const localDate = new Date(referenceDate.getTime() + hongKongOffsetMs);
  const day = localDate.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const startLocalMs =
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate() - mondayOffset,
      0,
      0,
      0,
      0,
    ) - hongKongOffsetMs;

  return {
    start: new Date(startLocalMs),
    end: new Date(startLocalMs + oneWeekMs),
  };
}

export function buildWeeklyReport(input: {
  referenceDate?: Date;
  parties: WeeklyReportPartyRow[];
  events: WeeklyReportEventRow[];
  tasks: WeeklyReportTaskRow[];
}): WeeklyReport {
  const weekRange = getHongKongWeekRange(input.referenceDate);
  const newCustomers = input.parties.filter((party) =>
    inRange(party.createdAt, weekRange),
  );
  const weeklyConfirmedEvents = input.events
    .filter((event) => event.reviewStatus === "confirmed")
    .filter((event) => inRange(eventContactAt(event), weekRange));
  const completedTasks = input.tasks
    .filter((task) => task.status === "done" && task.completedAt != null)
    .filter((task) => inRange(task.completedAt as Date, weekRange))
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  const openTodos = input.tasks
    .filter((task) => task.status === "open")
    .filter((task) => !task.dueAt || task.dueAt < weekRange.end)
    .sort((a, b) => taskDateValue(a) - taskDateValue(b));
  const touchedCustomersByParty = new Map<string, WeeklyTouchedCustomer>();

  for (const event of weeklyConfirmedEvents) {
    const key = event.partyId ?? `event:${event.id}`;
    const contactAt = eventContactAt(event);
    const existing = touchedCustomersByParty.get(key);

    if (!existing) {
      touchedCustomersByParty.set(key, {
        partyId: event.partyId,
        partyName: event.partyName ?? "未绑定客户",
        companyName: event.companyName,
        latestEventId: event.id,
        latestSummary: eventSummary(event),
        latestContactAt: contactAt,
        weeklyEventCount: 1,
      });
      continue;
    }

    existing.weeklyEventCount += 1;
    if (contactAt > existing.latestContactAt) {
      existing.latestEventId = event.id;
      existing.latestSummary = eventSummary(event);
      existing.latestContactAt = contactAt;
    }
  }

  const touchedCustomers = Array.from(touchedCustomersByParty.values()).sort(
    (a, b) => b.latestContactAt.getTime() - a.latestContactAt.getTime(),
  );

  return {
    weekRange,
    summary: {
      newCustomerCount: newCustomers.length,
      confirmedEventCount: weeklyConfirmedEvents.length,
      completedTaskCount: completedTasks.length,
      openTodoCount: openTodos.length,
      touchedCustomerCount: touchedCustomers.length,
    },
    touchedCustomers,
    completedTasks,
    openTodos,
  };
}

export async function getWeeklyReport(
  db: Db,
  currentUserId: string,
  referenceDate = new Date(),
): Promise<WeeklyReport> {
  const weekRange = getHongKongWeekRange(referenceDate);
  const [partyRows, eventRows, taskRows] = await Promise.all([
    db
      .select({
        id: parties.id,
        displayName: parties.displayName,
        companyName: parties.companyName,
        createdAt: parties.createdAt,
      })
      .from(parties)
      .where(
        and(
          eq(parties.createdByUserId, currentUserId),
          gte(parties.createdAt, weekRange.start),
          lt(parties.createdAt, weekRange.end),
        ),
      ),
    db
      .select({
        id: events.id,
        partyId: events.partyId,
        partyName: parties.displayName,
        companyName: parties.companyName,
        summary: events.aiSummary,
        reviewStatus: events.reviewStatus,
        occurredAt: events.occurredAt,
        capturedAt: events.capturedAt,
      })
      .from(events)
      .leftJoin(parties, eq(parties.id, events.partyId))
      .where(
        and(
          eq(events.reviewStatus, "confirmed"),
          eq(events.createdByUserId, currentUserId),
        ),
      )
      .orderBy(asc(events.capturedAt)),
    db
      .select({
        id: tasks.id,
        partyId: tasks.partyId,
        partyName: parties.displayName,
        taskType: tasks.taskType,
        description: tasks.description,
        dueAt: tasks.dueAt,
        status: tasks.status,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(parties, eq(parties.id, tasks.partyId))
      .where(
        and(
          eq(tasks.createdByUserId, currentUserId),
          or(
            eq(tasks.status, "open"),
            and(
              eq(tasks.status, "done"),
              gte(tasks.completedAt, weekRange.start),
              lt(tasks.completedAt, weekRange.end),
            ),
          ),
        ),
      )
      .orderBy(asc(tasks.status), asc(tasks.dueAt), asc(tasks.createdAt)),
  ]);

  return buildWeeklyReport({
    referenceDate,
    parties: partyRows,
    events: eventRows,
    tasks: taskRows,
  });
}
