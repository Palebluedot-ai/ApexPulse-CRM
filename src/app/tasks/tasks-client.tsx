"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  TaskCustomerOption,
  TaskPageItem,
} from "@/server/tasks/task-page-model";

interface TasksClientProps {
  customers: TaskCustomerOption[];
  initialTasks: TaskPageItem[];
}

type TaskType = TaskPageItem["taskType"];
type Message = { tone: "success" | "error"; text: string };

const taskTypeLabels = {
  commitment: "承诺事项",
  reminder: "提醒",
  followup: "跟进",
};

const statusLabels = {
  open: "待完成",
  done: "已完成",
};

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

function formatDate(date: string | null): string {
  if (!date) return "无截止时间";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const description = String(form.get("description") ?? "").trim();

    if (!description) {
      setMessage({ tone: "error", text: "任务描述不能为空。" });
      return;
    }

    try {
      const payload = await postJson("/api/tasks", {
        partyId: String(form.get("partyId") ?? "") || undefined,
        taskType: String(form.get("taskType") ?? "followup"),
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
      setMessage({ tone: "success", text: "任务已创建。" });
      formElement.reset();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "创建失败",
      });
    }
  }

  async function complete(taskId: string) {
    try {
      await postJson("/api/tasks/complete", { taskId });
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: "done",
                completedAt: new Date().toISOString(),
              }
            : task,
        ),
      );
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "完成失败",
      });
    }
  }

  async function reopen(taskId: string) {
    try {
      await postJson("/api/tasks/reopen", { taskId });
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, status: "open", completedAt: null }
            : task,
        ),
      );
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "恢复失败",
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
            M1.4 · 任务入口
          </p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            跟进任务
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            任务页现在可以创建、展示、完成和恢复任务。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
            href="/customers"
          >
            客户列表
          </Link>
          <Link
            className="w-fit rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
            href="/capture"
          >
            新增录入
          </Link>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.22fr_0.78fr]">
        <section className="grid gap-4">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <article
                className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-5 shadow-[0_18px_54px_rgba(25,23,20,0.08)]"
                key={task.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                        {statusLabels[task.status]}
                      </span>
                      <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1 text-xs font-semibold">
                        {taskTypeLabels[task.taskType]}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold">
                      {task.description}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {task.partyName ?? "未绑定客户"}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-[var(--line)] bg-white/55 p-4 md:w-60">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      截止时间
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatDate(task.dueAt)}
                    </p>
                    {task.completedAt ? (
                      <p className="mt-3 text-sm text-[var(--muted)]">
                        完成于：{formatDate(task.completedAt)}
                      </p>
                    ) : null}
                    <button
                      className="mt-4 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                      onClick={() =>
                        task.status === "open"
                          ? void complete(task.id)
                          : void reopen(task.id)
                      }
                      type="button"
                    >
                      {task.status === "open" ? "标记完成" : "恢复任务"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-6">
              <h2 className="text-2xl font-semibold">当前没有任务。</h2>
              <p className="mt-2 text-[var(--muted)]">
                可以先创建一条跟进任务，让客户详情页的“下一步”有内容。
              </p>
            </div>
          )}
        </section>

        <form
          className="h-fit rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.86)] p-5 shadow-[0_18px_54px_rgba(25,23,20,0.08)]"
          onSubmit={create}
        >
          <h2 className="text-2xl font-semibold">创建任务</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            保留手动创建，但不抢主视觉；主要任务列表放左边。
          </p>
          <div className="mt-4 grid gap-3">
            <select
              className="min-h-11 rounded-2xl border border-[var(--line)] bg-white/65 px-4 outline-none focus:border-[var(--accent)]"
              name="partyId"
            >
              <option value="">不绑定客户</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.label}
                </option>
              ))}
            </select>
            <select
              className="min-h-11 rounded-2xl border border-[var(--line)] bg-white/65 px-4 outline-none focus:border-[var(--accent)]"
              defaultValue="followup"
              name="taskType"
            >
              <option value="followup">跟进</option>
              <option value="reminder">提醒</option>
              <option value="commitment">承诺事项</option>
            </select>
            <textarea
              className="min-h-24 rounded-2xl border border-[var(--line)] bg-white/65 p-4 leading-7 outline-none focus:border-[var(--accent)]"
              name="description"
              placeholder="例如：明天发开户材料清单。"
              required
            />
            <input
              className="min-h-11 rounded-2xl border border-[var(--line)] bg-white/65 px-4 outline-none focus:border-[var(--accent)]"
              name="dueAt"
              type="datetime-local"
            />
          </div>
          <button
            className="mt-4 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
            type="submit"
          >
            创建任务
          </button>
          {message ? (
            <p
              className={
                message.tone === "error"
                  ? "mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                  : "mt-4 rounded-2xl border border-[var(--line)] bg-white/55 p-3 text-sm font-semibold text-[var(--accent-strong)]"
              }
            >
              {message.text}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
