import Link from "next/link";
import { createDb } from "@/server/db";
import { getWeeklyReport, type WeeklyReportTaskRow } from "@/server/reports/weekly-report";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date | null): string {
  if (!date) return "未设置时间";

  return new Intl.DateTimeFormat("zh-HK", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function taskOwner(task: WeeklyReportTaskRow): string {
  return task.partyName ?? "未绑定客户";
}

export default async function WeeklyReportPage() {
  const { client, db } = createDb();

  try {
    const report = await getWeeklyReport(db);
    const cards = [
      { label: "本周新增客户", value: report.summary.newCustomerCount },
      { label: "本周确认沟通", value: report.summary.confirmedEventCount },
      { label: "本周完成任务", value: report.summary.completedTaskCount },
      { label: "当前待办", value: report.summary.openTodoCount },
    ];

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
              M1.15 · Weekly Report
            </p>
            <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              本周复盘
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              {formatDate(report.weekRange.start)} 至{" "}
              {formatDate(new Date(report.weekRange.end.getTime() - 1))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
              href="/tasks"
            >
              去任务页
            </Link>
            <Link
              className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
              href="/capture"
            >
              新增录入
            </Link>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              className="rounded-[1.35rem] border border-[var(--line)] bg-white/58 p-4 shadow-[0_12px_40px_rgba(25,23,20,0.06)]"
              key={card.label}
            >
              <p className="text-4xl font-semibold tracking-[-0.04em]">
                {card.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                {card.label}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--accent-strong)]">
                  本周跟进客户
                </p>
                <h2 className="mt-1 text-3xl font-semibold">
                  {report.summary.touchedCustomerCount} 个客户有确认沟通
                </h2>
              </div>
              <Link
                className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                href="/customers"
              >
                客户列表
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {report.touchedCustomers.length > 0 ? (
                report.touchedCustomers.map((customer) => (
                  <div
                    className="rounded-2xl border border-[var(--line)] bg-white/60 p-4"
                    key={`${customer.partyId ?? customer.latestEventId}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xl font-semibold">
                          {customer.partyName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {customer.companyName ?? "未记录公司"} · 本周{" "}
                          {customer.weeklyEventCount} 次确认沟通
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                        {formatDateTime(customer.latestContactAt)}
                      </span>
                    </div>
                    <p className="mt-3 leading-7">{customer.latestSummary}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-[var(--muted)]">
                  本周还没有 confirmed 沟通。先从录入和待确认开始。
                </p>
              )}
            </div>
          </article>

          <div className="grid gap-5">
            <article className="rounded-[2rem] bg-[var(--foreground)] p-6 text-[var(--panel)] shadow-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d6c5a7]">
                本周 To-do
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                还剩 {report.openTodos.length} 件事
              </h2>
              <div className="mt-5 grid gap-3">
                {report.openTodos.length > 0 ? (
                  report.openTodos.map((task) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                      key={task.id}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d6c5a7]">
                        {taskOwner(task)} · {formatDateTime(task.dueAt)}
                      </p>
                      <p className="mt-2 text-lg font-semibold leading-7">
                        {task.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-[#d6c5a7]">
                    本周没有需要处理的 open task。
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
              <p className="text-sm font-semibold text-[var(--accent-strong)]">
                本周已完成
              </p>
              <h2 className="mt-1 text-3xl font-semibold">
                {report.completedTasks.length} 个任务已完成
              </h2>
              <div className="mt-5 grid gap-3">
                {report.completedTasks.length > 0 ? (
                  report.completedTasks.map((task) => (
                    <div
                      className="rounded-2xl border border-[var(--line)] bg-white/60 p-4"
                      key={task.id}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {taskOwner(task)} · {formatDateTime(task.completedAt)}
                      </p>
                      <p className="mt-2 leading-7">{task.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-[var(--line)] bg-white/60 p-4 text-[var(--muted)]">
                    本周还没有完成任务。
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  } finally {
    await client.end();
  }
}
