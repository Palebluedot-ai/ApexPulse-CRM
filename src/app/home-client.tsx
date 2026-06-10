"use client";

import { useState } from "react";
import Link from "next/link";
import type { TaskPageItem } from "@/server/tasks/task-page-model";

export interface HomeWeekStats {
  touchedCustomers: number;
  newCustomers: number;
  overdueCustomers: number;
}

interface HomeClientProps {
  dateHeading: string;
  subline: string;
  urgentTasks: TaskPageItem[];
  weekTasks: TaskPageItem[];
  pendingCount: number;
  weekStats: HomeWeekStats;
}

function formatDue(dueAt: string | null, now: Date): string {
  if (!dueAt) return "";
  const due = new Date(dueAt);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due < dayStart) {
    const days = Math.ceil((dayStart.getTime() - due.getTime()) / 86400000);
    return `逾期 ${days} 天`;
  }
  if (due.getTime() - dayStart.getTime() < 86400000) return "今天";
  return new Intl.DateTimeFormat("zh-HK", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(due);
}

export function HomeClient({
  dateHeading,
  subline,
  urgentTasks,
  weekTasks,
  pendingCount,
  weekStats,
}: HomeClientProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const now = new Date();

  async function complete(taskId: string) {
    setDoneIds((current) => new Set(current).add(taskId));
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setDoneIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }

  function TaskRow({ task, tone }: { task: TaskPageItem; tone: "urgent" | "week" }) {
    const done = doneIds.has(task.id);
    const dueLabel = formatDue(task.dueAt, now);
    return (
      <div className="flex items-center gap-3 border-b border-dashed border-[var(--line-soft)] py-2.5 text-sm last:border-0">
        <input
          aria-label="完成任务"
          checked={done}
          className="h-5 w-5 flex-none accent-[var(--tea)]"
          onChange={() => void complete(task.id)}
          type="checkbox"
        />
        <span className={done ? "line-through opacity-50" : ""}>
          {task.partyName ? <b className="mr-1">{task.partyName}</b> : null}
          {task.description}
        </span>
        <span
          className={
            tone === "urgent"
              ? "ml-auto whitespace-nowrap text-xs font-bold text-[var(--red-status)]"
              : "ml-auto whitespace-nowrap text-xs text-[var(--ink-soft)]"
          }
        >
          {dueLabel}
        </span>
      </div>
    );
  }

  const card =
    "rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 shadow-[0_14px_40px_rgba(57,47,32,0.08)]";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <h1 className="font-[var(--font-serif-display)] text-3xl font-bold sm:text-4xl">
        {dateHeading}
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{subline}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <section className={`${card} border-l-4 border-l-[var(--red-status)]`}>
          <h2 className="text-[15px] font-bold">需要先处理</h2>
          {urgentTasks.length > 0 ? (
            urgentTasks.map((task) => (
              <TaskRow key={task.id} task={task} tone="urgent" />
            ))
          ) : (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              没有逾期或今天到期的任务 ✓
            </p>
          )}
          {weekTasks.length > 0 ? (
            <>
              <h2 className="mt-4 text-[13px] font-bold text-[var(--ink-soft)]">
                本周
              </h2>
              {weekTasks.map((task) => (
                <TaskRow key={task.id} task={task} tone="week" />
              ))}
            </>
          ) : null}
        </section>

        <div className="flex flex-col gap-4">
          <Link
            className="flex items-center gap-4 rounded-[1.4rem] border border-[var(--line-soft)] bg-gradient-to-r from-[#fff8ea] to-[#fdf2dd] p-5 text-sm font-bold shadow-[0_14px_40px_rgba(57,47,32,0.08)]"
            href="/review"
          >
            <span className="font-[var(--font-numerals)] text-3xl text-[var(--persimmon)]">
              {pendingCount}
            </span>
            <span>
              条待确认
              <br />
              <span className="text-xs font-normal text-[var(--ink-soft)]">
                {pendingCount > 0 ? "点击进入轻审查" : "队列已清空"}
              </span>
            </span>
            <span className="ml-auto text-lg text-[var(--tea)]">→</span>
          </Link>

          <section className={card}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-bold text-[var(--ink-soft)]">
                本周
              </h2>
              <Link
                className="text-xs font-bold text-[var(--tea)]"
                href="/reports/weekly"
              >
                看周报 →
              </Link>
            </div>
            <div className="mt-3 flex justify-around text-center">
              <div>
                <p className="font-[var(--font-numerals)] text-3xl font-bold text-[var(--tea-deep)]">
                  {weekStats.touchedCustomers}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">触达客户</p>
              </div>
              <div>
                <p className="font-[var(--font-numerals)] text-3xl font-bold text-[var(--tea-deep)]">
                  {weekStats.newCustomers}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">新客户</p>
              </div>
              <div>
                <p className="font-[var(--font-numerals)] text-3xl font-bold text-[var(--persimmon)]">
                  {weekStats.overdueCustomers}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">逾期</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
