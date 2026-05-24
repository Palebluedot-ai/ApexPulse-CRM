import Link from "next/link";
import { createDb } from "@/server/db";
import { listCustomerListItems } from "@/server/customers/customer-dashboard";

export const dynamic = "force-dynamic";

const followupLabels = {
  up_to_date: "已跟进",
  due_soon: "即将跟进",
  overdue: "已逾期",
  unknown: "未分层",
};

function formatDate(date: Date | null): string {
  if (!date) return "暂无记录";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CustomersPage() {
  const { client, db } = createDb();

  try {
    const customers = await listCustomerListItems(db);

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
              M1 · 客户跟进驾驶舱
            </p>
            <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              客户列表
            </h1>
          </div>
          <Link
            className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
            href="/"
          >
            返回首页
          </Link>
        </header>

        <section className="grid gap-4">
          {customers.map((customer) => (
            <Link
              className="group rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-5 shadow-[0_18px_54px_rgba(25,23,20,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(25,23,20,0.13)]"
              href={`/customers/${customer.id}`}
              key={customer.id}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">
                      {customer.displayName}
                    </h2>
                    <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                      {followupLabels[customer.followupStatus]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {customer.companyName ?? "未记录公司"} ·{" "}
                    {customer.referralSourceTag ?? "未记录来源"}
                  </p>
                  <p className="mt-4 max-w-3xl text-lg leading-8">
                    {customer.lastContactSummary ?? "还没有确认过的沟通摘要。"}
                  </p>
                </div>

                <div className="shrink-0 rounded-2xl border border-[var(--line)] bg-white/55 p-4 md:w-56">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    最新沟通
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatDate(customer.lastContactAt)}
                  </p>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    下次跟进：{formatDate(customer.nextFollowupAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    );
  } finally {
    await client.end();
  }
}
