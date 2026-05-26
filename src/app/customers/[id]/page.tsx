import Link from "next/link";
import { notFound } from "next/navigation";
import { createDb } from "@/server/db";
import { getCustomerFirstScreen } from "@/server/customers/customer-dashboard";

export const dynamic = "force-dynamic";

const followupLabels = {
  up_to_date: "已跟进",
  due_soon: "即将跟进",
  overdue: "已逾期",
  unknown: "未分层",
};

const taskTypeLabels = {
  commitment: "承诺",
  reminder: "提醒",
  followup: "跟进",
};

const urgencyStyles = {
  overdue: "bg-[#b42318] text-white",
  due_soon: "bg-[var(--accent)] text-white",
  healthy: "bg-[#254f3c] text-white",
  missing: "bg-[#8a5a18] text-white",
};

function formatDateTime(date: Date | null): string {
  if (!date) return "暂无记录";
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, db } = createDb();

  try {
    const firstScreen = await getCustomerFirstScreen(db, id);
    if (!firstScreen) notFound();

    const { actionPanel, customer, latestCommunication, openTasks } =
      firstScreen;

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            className="text-sm font-semibold text-[var(--accent-strong)]"
            href="/customers"
          >
            ← 返回客户列表
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
              href="/capture"
            >
              新增录入
            </Link>
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
              href="/review"
            >
              待确认
            </Link>
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
              href="/tasks"
            >
              任务
            </Link>
          </div>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,240,0.86)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-4 w-fit rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]">
                  {followupLabels[customer.followupStatus]}
                </p>
                <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
                  {customer.displayName}
                </h1>
                <p className="mt-3 text-lg text-[var(--muted)]">
                  {customer.companyName ?? "未记录公司"}
                </p>
              </div>
              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${urgencyStyles[actionPanel.urgency]}`}
              >
                {actionPanel.headline}
              </span>
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-[var(--foreground)] p-5 text-[var(--panel)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d6c5a7]">
                下一步
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
                {actionPanel.nextTask?.description ??
                  "先补一条明确的跟进任务。"}
              </h2>
              <p className="mt-3 leading-7 text-[#d6c5a7]">
                {actionPanel.reason}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d6c5a7]">
                    下次跟进
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatDateTime(actionPanel.nextFollowupAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d6c5a7]">
                    未完成任务
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {actionPanel.openTaskCount} 条
                  </p>
                </div>
              </div>
              <Link
                className="mt-5 inline-flex rounded-full bg-[var(--panel)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                href="/tasks"
              >
                {actionPanel.primaryActionLabel}
              </Link>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <dt className="font-semibold text-[var(--muted)]">来源</dt>
                <dd className="mt-1 text-base">
                  {customer.referralSourceTag ?? "未记录"}
                </dd>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <dt className="font-semibold text-[var(--muted)]">最新沟通</dt>
                <dd className="mt-1 text-base">
                  {formatDateTime(customer.lastContactAt)}
                </dd>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <dt className="font-semibold text-[var(--muted)]">状态标签</dt>
                <dd className="mt-1 text-base">
                  {customer.statusLabel ?? "未记录"}
                </dd>
              </div>
            </dl>

            {customer.profileSummary ? (
              <p className="mt-5 rounded-2xl border border-[var(--line)] bg-white/55 p-4 leading-7 text-[var(--muted)]">
                {customer.profileSummary}
              </p>
            ) : null}

            {customer.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span
                    className="rounded-full border border-[var(--line)] bg-white/50 px-3 py-1 text-sm"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="grid gap-5">
            <article className="rounded-[2rem] bg-[var(--foreground)] p-6 text-[var(--panel)] shadow-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d6c5a7]">
                最新沟通卡片
              </p>

              {latestCommunication ? (
                <div className="mt-6 space-y-5">
                  <div>
                    <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.03em]">
                      {latestCommunication.summary}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#d6c5a7]">
                      {formatDateTime(
                        latestCommunication.occurredAt ??
                          latestCommunication.capturedAt,
                      )}{" "}
                      · {latestCommunication.contentType} ·{" "}
                      {latestCommunication.sourceChannel}
                    </p>
                  </div>

                  {latestCommunication.rawText ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d6c5a7]">
                        原始备注
                      </p>
                      <p className="mt-2 leading-7">
                        {latestCommunication.rawText}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d6c5a7]">
                      原始证据
                    </p>
                    {latestCommunication.attachments.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {latestCommunication.attachments.map((attachment) => (
                          <li
                            className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm"
                            key={attachment.id}
                          >
                            {attachment.fileName} · {attachment.mimeType}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[#d6c5a7]">
                        这条沟通没有附件，但事件原文仍然保留。
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <p className="text-lg font-semibold">还没有确认过的沟通。</p>
                  <p className="mt-2 text-sm leading-6 text-[#d6c5a7]">
                    后续从截图或文字备注进入 review 队列，确认后这里会显示第一张最新沟通卡片。
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,240,0.86)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--accent-strong)]">
                    Open Tasks
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">未完成任务</h2>
                </div>
                <Link
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                  href="/tasks"
                >
                  管理任务
                </Link>
              </div>
              {openTasks.length > 0 ? (
                <ul className="mt-5 grid gap-3">
                  {openTasks.map((task) => (
                    <li
                      className="rounded-2xl border border-[var(--line)] bg-white/55 p-4"
                      key={task.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                          {taskTypeLabels[task.taskType]}
                        </span>
                        <span className="text-sm font-semibold text-[var(--muted)]">
                          {formatDateTime(task.dueAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-lg font-semibold">
                        {task.description}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 rounded-2xl border border-[var(--line)] bg-white/55 p-4 text-[var(--muted)]">
                  当前没有未完成任务。对于未分层客户，建议先补一条明确下一步。
                </p>
              )}
            </article>
          </section>
        </section>
      </main>
    );
  } finally {
    await client.end();
  }
}
