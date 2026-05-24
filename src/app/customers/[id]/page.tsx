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

    const { customer, latestCommunication } = firstScreen;

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <nav className="mb-6">
          <Link
            className="text-sm font-semibold text-[var(--accent-strong)]"
            href="/customers"
          >
            ← 返回客户列表
          </Link>
        </nav>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
            <p className="mb-4 w-fit rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]">
              {followupLabels[customer.followupStatus]}
            </p>
            <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em]">
              {customer.displayName}
            </h1>
            <p className="mt-3 text-lg text-[var(--muted)]">
              {customer.companyName ?? "未记录公司"}
            </p>

            <dl className="mt-8 grid gap-4 text-sm">
              <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <dt className="font-semibold text-[var(--muted)]">来源</dt>
                <dd className="mt-1 text-lg">
                  {customer.referralSourceTag ?? "未记录"}
                </dd>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <dt className="font-semibold text-[var(--muted)]">最新沟通</dt>
                <dd className="mt-1 text-lg">
                  {formatDateTime(customer.lastContactAt)}
                </dd>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <dt className="font-semibold text-[var(--muted)]">下次跟进</dt>
                <dd className="mt-1 text-lg">
                  {formatDateTime(customer.nextFollowupAt)}
                </dd>
              </div>
            </dl>

            {customer.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
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
          </aside>

          <section className="rounded-[1.8rem] bg-[var(--foreground)] p-6 text-[var(--panel)] shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d6c5a7]">
              最新沟通卡片
            </p>

            {latestCommunication ? (
              <article className="mt-6 space-y-5">
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
                    <p className="mt-2 leading-7">{latestCommunication.rawText}</p>
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
              </article>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-lg font-semibold">还没有确认过的沟通。</p>
                <p className="mt-2 text-sm leading-6 text-[#d6c5a7]">
                  后续从截图或文字备注进入 review 队列，确认后这里会显示第一张最新沟通卡片。
                </p>
              </div>
            )}
          </section>
        </section>
      </main>
    );
  } finally {
    await client.end();
  }
}
