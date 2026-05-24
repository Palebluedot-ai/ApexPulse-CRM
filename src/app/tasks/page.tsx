import Link from "next/link";
import { createDb } from "@/server/db";
import { listTasks } from "@/server/tasks/task-workflow";

export const dynamic = "force-dynamic";

const taskTypeLabels = {
  commitment: "承诺事项",
  reminder: "提醒",
  followup: "跟进",
};

const statusLabels = {
  open: "待完成",
  done: "已完成",
};

function formatDate(date: Date | null): string {
  if (!date) return "无截止时间";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function TasksPage() {
  const { client, db } = createDb();

  try {
    const tasks = await listTasks(db);

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
              M1 · 任务闭环
            </p>
            <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              跟进任务
            </h1>
          </div>
          <Link
            className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
            href="/customers"
          >
            返回客户列表
          </Link>
        </header>

        <section className="grid gap-4">
          {tasks.map((task) => (
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

                <div className="shrink-0 rounded-2xl border border-[var(--line)] bg-white/55 p-4 md:w-56">
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
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  } finally {
    await client.end();
  }
}
