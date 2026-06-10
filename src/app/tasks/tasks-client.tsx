"use client";

import { useState, type FormEvent } from "react";
import type {
  TaskCustomerOption,
  TaskPageItem,
} from "@/server/tasks/task-page-model";
import {
  completedRetentionDaysLeft,
  groupTasksByUrgency,
} from "@/lib/task-grouping";

interface TasksClientProps {
  customers: TaskCustomerOption[];
  initialTasks: TaskPageItem[];
}

type TaskType = TaskPageItem["taskType"];
type Message = { tone: "success" | "error"; text: string };

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "操作失败",
    );
  }

  return payload;
}

function formatDue(dueAt: string | null, now: Date): string {
  if (!dueAt) return "无截止时间";
  const due = new Date(dueAt);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due < dayStart) {
    const days = Math.ceil((dayStart.getTime() - due.getTime()) / 86400000);
    return `逾期 ${days} 天`;
  }
  if (due.getTime() - dayStart.getTime() < 86400000) {
    return `今天 ${new Intl.DateTimeFormat("zh-HK", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(due)}`;
  }
  return new Intl.DateTimeFormat("zh-HK", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  }).format(due);
}

function toTaskPageItem(
  task: Record<string, unknown>,
  customers: TaskCustomerOption[],
): TaskPageItem {
  const partyId = typeof task.partyId === "string" ? task.partyId : null;
  const customer = partyId
    ? customers.find((option) => option.id === partyId)
    : undefined;

  return {
    id: String(task.id),
    partyId,
    partyName: customer?.label ?? null,
    sourceEventId:
      typeof task.sourceEventId === "string" ? task.sourceEventId : null,
    taskType: (typeof task.taskType === "string"
      ? task.taskType
      : "followup") as TaskType,
    description: String(task.description ?? ""),
    dueAt: typeof task.dueAt === "string" ? task.dueAt : null,
    status: task.status === "done" ? "done" : "open",
    completedAt:
      typeof task.completedAt === "string" ? task.completedAt : null,
  };
}

export function TasksClient({ customers, initialTasks }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [message, setMessage] = useState<Message | null>(null);
  const now = new Date();

  const openTasks = tasks.filter((task) => task.status === "open");
  const groups = groupTasksByUrgency(openTasks, (task) => task.dueAt, now);
  const doneTasks = tasks
    .filter(
      (task) =>
        task.status === "done" &&
        completedRetentionDaysLeft(task.completedAt, now) > 0,
    )
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? 0).getTime() -
        new Date(a.completedAt ?? 0).getTime(),
    );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const description = String(form.get("description") ?? "").trim();

    if (!description) {
      setMessage({ tone: "error", text: "任务描述不能为空。" });
      return;
    }

    const partyLabel = String(form.get("partyLabel") ?? "").trim();
    const party = customers.find((option) => option.label === partyLabel);

    try {
      const payload = await postJson("/api/tasks", {
        partyId: party?.id || undefined,
        taskType: "followup",
        description,
        dueAt: String(form.get("dueAt") ?? "") || undefined,
      });
      const task =
        typeof payload.task === "object" && payload.task !== null
          ? toTaskPageItem(payload.task as Record<string, unknown>, customers)
          : null;

      if (task) {
        setTasks((current) => [task, ...current]);
      }
      setMessage(null);
      formElement.reset();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "创建失败",
      });
    }
  }

  async function toggle(task: TaskPageItem) {
    const completing = task.status === "open";
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: completing ? "done" : "open",
              completedAt: completing ? new Date().toISOString() : null,
            }
          : item,
      ),
    );

    try {
      await postJson(
        completing ? "/api/tasks/complete" : "/api/tasks/reopen",
        { taskId: task.id },
      );
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: task.status,
                completedAt: task.completedAt,
              }
            : item,
        ),
      );
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "操作失败",
      });
    }
  }

  function TaskRow({ task, done = false }: { task: TaskPageItem; done?: boolean }) {
    const dueLabel = done
      ? `完成于 ${formatDue(task.completedAt, now)} · 还展示 ${completedRetentionDaysLeft(task.completedAt, now)} 天`
      : formatDue(task.dueAt, now);
    const overdue =
      !done && task.dueAt
        ? new Date(task.dueAt) <
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        : false;

    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] px-4 py-3 text-sm ${done ? "opacity-50" : ""}`}
      >
        <input
          aria-label={done ? "恢复任务" : "完成任务"}
          checked={done}
          className="h-5 w-5 flex-none accent-[var(--tea)]"
          onChange={() => void toggle(task)}
          type="checkbox"
        />
        <span className="min-w-0 flex-1">
          <span className={done ? "line-through" : ""}>{task.description}</span>
          {task.partyName ? (
            <span className="ml-2 rounded-full bg-[var(--paper-deep)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--ink-soft)]">
              {task.partyName}
            </span>
          ) : null}
        </span>
        <span
          className={
            overdue
              ? "whitespace-nowrap text-xs font-bold text-[var(--red-status)]"
              : "whitespace-nowrap text-xs text-[var(--ink-soft)]"
          }
        >
          {dueLabel}
        </span>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <h1 className="font-[var(--font-serif-display)] text-3xl font-bold sm:text-4xl">
        任务
      </h1>

      <form
        className="mt-5 flex flex-wrap items-center gap-2"
        onSubmit={create}
      >
        <input
          className="min-h-11 min-w-0 basis-full rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 text-sm outline-none focus:border-[var(--tea)] sm:flex-[2] sm:basis-52"
          name="description"
          placeholder="任务内容，例如 周五给刘总发材料清单"
          required
        />
        <input
          className="min-h-11 min-w-0 flex-1 basis-[40%] rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 text-sm outline-none focus:border-[var(--tea)] sm:basis-32"
          list="task-customers"
          name="partyLabel"
          placeholder="客户（可留空）"
        />
        <datalist id="task-customers">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.label} />
          ))}
        </datalist>
        <input
          className="min-h-11 min-w-0 flex-1 basis-[40%] rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-3 text-sm outline-none focus:border-[var(--tea)] sm:basis-auto sm:flex-none"
          name="dueAt"
          type="datetime-local"
        />
        <button
          className="min-h-11 flex-none rounded-full bg-[var(--tea)] px-6 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_16px_rgba(47,93,80,0.28)]"
          type="submit"
        >
          添加
        </button>
      </form>
      {message ? (
        <p
          className={
            message.tone === "error"
              ? "mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
              : "mt-3 rounded-xl border border-[var(--line-soft)] bg-[var(--ok-bg)] p-3 text-sm font-semibold text-[var(--tea-deep)]"
          }
        >
          {message.text}
        </p>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-bold tracking-widest text-[var(--red-status)]">
          逾期 / 今天{" "}
          <span className="font-[var(--font-numerals)] text-sm">
            {groups.urgent.length}
          </span>
        </h2>
        <div className="flex flex-col gap-2">
          {groups.urgent.length > 0 ? (
            groups.urgent.map((task) => <TaskRow key={task.id} task={task} />)
          ) : (
            <p className="rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink-soft)]">
              没有逾期或今天到期的任务 ✓
            </p>
          )}
        </div>
      </section>

      {groups.thisWeek.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-[var(--ink-soft)]">
            本周
          </h2>
          <div className="flex flex-col gap-2">
            {groups.thisWeek.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : null}

      {groups.later.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-[var(--ink-soft)]">
            以后 / 未排期
          </h2>
          <div className="flex flex-col gap-2">
            {groups.later.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : null}

      {doneTasks.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-[var(--ink-soft)]">
            已完成{" "}
            <span className="font-normal normal-case tracking-normal">
              · 保留 3 天后自动从列表清掉（记录仍在客户时间线）
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {doneTasks.map((task) => (
              <TaskRow done key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
