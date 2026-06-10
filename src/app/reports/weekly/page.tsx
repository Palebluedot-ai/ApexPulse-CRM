import Link from "next/link";
import { createDb } from "@/server/db";
import {
  buildStalledCustomers,
  getWeeklyReport,
} from "@/server/reports/weekly-report";

export const dynamic = "force-dynamic";

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("zh-HK", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function formatDateTime(date: Date | null): string {
  if (!date) return "未设置时间";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function weekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - start.getTime()) / 86400000 + 1) / 7);
}

export default async function WeeklyReportPage() {
  const { client, db } = createDb();

  try {
    const report = await getWeeklyReport(db);
    const stalled = buildStalledCustomers(report);
    const weekEnd = new Date(report.weekRange.end.getTime() - 1);

    const stats = [
      { label: "触达客户", value: report.summary.touchedCustomerCount },
      { label: "完成任务", value: report.summary.completedTaskCount },
      { label: "新增客户", value: report.summary.newCustomerCount },
      {
        label: "遗留待办",
        value: report.summary.openTodoCount,
        warn: true,
      },
    ];

    const card =
      "rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 shadow-[0_14px_40px_rgba(57,47,32,0.08)]";

    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="font-[var(--font-serif-display)] text-3xl font-bold sm:text-4xl">
          周报
          <span className="mt-1 block font-[var(--font-numerals)] text-base font-medium text-[var(--ink-soft)] sm:ml-3 sm:mt-0 sm:inline sm:text-lg">
            {formatDay(report.weekRange.start)} – {formatDay(weekEnd)} · 第{" "}
            {weekNumber(weekEnd)} 周
          </span>
        </h1>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              className="rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] px-2 py-4 text-center shadow-[0_8px_24px_rgba(57,47,32,0.06)]"
              key={stat.label}
            >
              <p
                className={`font-[var(--font-numerals)] text-3xl font-bold ${stat.warn ? "text-[var(--persimmon)]" : "text-[var(--tea-deep)]"}`}
              >
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {stalled.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-[rgba(194,69,45,0.3)] bg-[rgba(194,69,45,0.05)] px-5 py-4">
            <p className="text-sm font-bold text-[var(--red-status)]">
              ⚠ 失速信号 · 本周 0 次沟通且有欠账
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {stalled.map((customer) => (
                <Link
                  className="flex flex-wrap items-baseline gap-2 text-sm hover:text-[var(--tea)]"
                  href={`/customers/${customer.partyId}`}
                  key={customer.partyId}
                >
                  <b>{customer.partyName}</b>
                  <span className="text-xs text-[var(--ink-soft)]">
                    {customer.nextTaskDescription} · 欠 {customer.openTaskCount}{" "}
                    件事 →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={card}>
            <h2 className="text-sm font-bold">本周触达</h2>
            {report.touchedCustomers.length > 0 ? (
              <div className="mt-1 flex flex-col">
                {report.touchedCustomers.map((customer) => (
                  <div
                    className="border-b border-dashed border-[var(--line-soft)] py-2.5 text-sm last:border-0"
                    key={customer.partyId ?? customer.latestEventId}
                  >
                    <p>
                      <b>{customer.partyName}</b>
                      <span className="ml-2 text-xs text-[var(--ink-soft)]">
                        {customer.companyName ?? "未记录公司"} ·{" "}
                        {customer.weeklyEventCount} 次沟通 ·{" "}
                        {formatDateTime(customer.latestContactAt)}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">
                      {customer.latestSummary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-soft)]">
                本周还没有确认沟通。先从录入和待确认开始。
              </p>
            )}
          </section>

          <div className="flex flex-col gap-4">
            <section className={card}>
              <h2 className="text-sm font-bold">
                遗留待办{" "}
                <span className="font-[var(--font-numerals)] text-[var(--persimmon)]">
                  {report.openTodos.length}
                </span>
              </h2>
              {report.openTodos.length > 0 ? (
                <div className="mt-1 flex flex-col">
                  {report.openTodos.map((task) => (
                    <p
                      className="border-b border-dashed border-[var(--line-soft)] py-2 text-sm last:border-0"
                      key={task.id}
                    >
                      {task.description}
                      <span className="ml-2 text-xs text-[var(--ink-soft)]">
                        {task.partyName ?? "未绑定客户"} ·{" "}
                        {formatDateTime(task.dueAt)}
                      </span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  本周没有遗留待办 ✓
                </p>
              )}
              <Link
                className="mt-3 inline-block text-xs font-bold text-[var(--tea)]"
                href="/tasks"
              >
                去任务页处理 →
              </Link>
            </section>

            <section className={card}>
              <h2 className="text-sm font-bold">
                本周已完成{" "}
                <span className="font-[var(--font-numerals)] text-[var(--tea-deep)]">
                  {report.completedTasks.length}
                </span>
              </h2>
              {report.completedTasks.length > 0 ? (
                <div className="mt-1 flex flex-col">
                  {report.completedTasks.map((task) => (
                    <p
                      className="border-b border-dashed border-[var(--line-soft)] py-2 text-sm text-[var(--ink-soft)] last:border-0"
                      key={task.id}
                    >
                      <span className="line-through">{task.description}</span>
                      <span className="ml-2 text-xs">
                        {task.partyName ?? "未绑定客户"} ·{" "}
                        {formatDateTime(task.completedAt)}
                      </span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  本周还没有完成任务。
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
