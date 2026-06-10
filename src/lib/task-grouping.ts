export type TaskUrgency = "overdue" | "today" | "this_week" | "later" | "none";

const CRM_TIME_ZONE = "Asia/Hong_Kong";
const hongKongDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function crmDayIndex(date: Date): number {
  const parts = hongKongDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function classifyTaskUrgency(
  dueAt: Date | string | null,
  now: Date,
): TaskUrgency {
  if (!dueAt) return "none";

  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diffDays = crmDayIndex(due) - crmDayIndex(now);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays < 7) return "this_week";
  return "later";
}

/**
 * 已完成任务在列表里保留 3 天（按完成当天起算的自然日）。
 * 返回剩余可见天数；0 = 不再显示。数据库不删，仅列表过滤。
 */
export function completedRetentionDaysLeft(
  completedAt: Date | string | null,
  now: Date,
  retentionDays = 3,
): number {
  if (!completedAt) return 0;

  const completed =
    typeof completedAt === "string" ? new Date(completedAt) : completedAt;
  const daysSince = crmDayIndex(now) - crmDayIndex(completed);

  return Math.max(0, retentionDays - daysSince);
}

export interface TaskUrgencyGroups<T> {
  urgent: T[]; // 逾期 + 今天
  thisWeek: T[];
  later: T[]; // 以后 + 无截止时间
}

export function groupTasksByUrgency<T>(
  tasks: T[],
  getDueAt: (task: T) => Date | string | null,
  now: Date,
): TaskUrgencyGroups<T> {
  const groups: TaskUrgencyGroups<T> = { urgent: [], thisWeek: [], later: [] };

  for (const task of tasks) {
    const urgency = classifyTaskUrgency(getDueAt(task), now);
    if (urgency === "overdue" || urgency === "today") groups.urgent.push(task);
    else if (urgency === "this_week") groups.thisWeek.push(task);
    else groups.later.push(task);
  }

  const byDueAsc = (a: T, b: T) => {
    const dueA = getDueAt(a);
    const dueB = getDueAt(b);
    if (!dueA) return 1;
    if (!dueB) return -1;
    return new Date(dueA).getTime() - new Date(dueB).getTime();
  };

  groups.urgent.sort(byDueAsc);
  groups.thisWeek.sort(byDueAsc);
  groups.later.sort(byDueAsc);

  return groups;
}
