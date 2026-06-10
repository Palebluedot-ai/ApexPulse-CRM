export type TaskUrgency = "overdue" | "today" | "this_week" | "later" | "none";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function classifyTaskUrgency(
  dueAt: Date | string | null,
  now: Date,
): TaskUrgency {
  if (!dueAt) return "none";

  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const dayStart = startOfDay(now);
  const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(dayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (due < dayStart) return "overdue";
  if (due < nextDayStart) return "today";
  if (due < weekEnd) return "this_week";
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
  const completedDayStart = startOfDay(completed);
  const nowDayStart = startOfDay(now);
  const daysSince = Math.floor(
    (nowDayStart.getTime() - completedDayStart.getTime()) / 86400000,
  );

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
