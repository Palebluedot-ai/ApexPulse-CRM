import Link from "next/link";
import { createDb } from "@/server/db";
import {
  buildCustomerDashboardStats,
  filterCustomerListItems,
  listCustomerListItems,
  sortCustomerListItems,
  type CustomerFollowupFilter,
  type CustomerSort,
} from "@/server/customers/customer-dashboard";

export const dynamic = "force-dynamic";

const followupLabels = {
  up_to_date: "已跟进",
  due_soon: "即将跟进",
  overdue: "已逾期",
  unknown: "未分层",
};

const followupFilters: Array<{
  label: string;
  value: CustomerFollowupFilter;
}> = [
  { label: "全部", value: "all" },
  { label: "最近跟进", value: "up_to_date" },
  { label: "即将跟进", value: "due_soon" },
  { label: "已逾期", value: "overdue" },
  { label: "未分层", value: "unknown" },
];

const sortOptions: Array<{ label: string; value: CustomerSort }> = [
  { label: "按上次跟进时间", value: "last_contact_desc" },
  { label: "按下次跟进时间", value: "next_followup_asc" },
  { label: "按客户名", value: "name_asc" },
];

function formatDate(date: Date | null): string {
  if (!date) return "暂无记录";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function searchParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseFollowupFilter(value: string): CustomerFollowupFilter {
  return followupFilters.some((filter) => filter.value === value)
    ? (value as CustomerFollowupFilter)
    : "all";
}

function parseSort(value: string): CustomerSort {
  return sortOptions.some((option) => option.value === value)
    ? (value as CustomerSort)
    : "last_contact_desc";
}

function customerFilterHref(input: {
  query: string;
  sort: CustomerSort;
  followupStatus: CustomerFollowupFilter;
}): string {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.followupStatus !== "all") params.set("status", input.followupStatus);
  if (input.sort !== "last_contact_desc") params.set("sort", input.sort);
  const queryString = params.toString();

  return queryString ? `/customers?${queryString}` : "/customers";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = searchParam(resolvedSearchParams.q).trim();
  const followupStatus = parseFollowupFilter(
    searchParam(resolvedSearchParams.status),
  );
  const sort = parseSort(searchParam(resolvedSearchParams.sort));
  const { client, db } = createDb();

  try {
    const customers = await listCustomerListItems(db);
    const stats = buildCustomerDashboardStats(customers);
    const visibleCustomers = sortCustomerListItems(
      filterCustomerListItems(customers, { query, followupStatus }),
      sort,
    );

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/58 p-4 shadow-[0_12px_40px_rgba(25,23,20,0.06)]">
            <p className="text-4xl font-semibold tracking-[-0.04em]">
              {stats.total}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              客户 / 临时客户
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/58 p-4 shadow-[0_12px_40px_rgba(25,23,20,0.06)]">
            <p className="text-4xl font-semibold tracking-[-0.04em]">
              {stats.dueSoon}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              即将跟进
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/58 p-4 shadow-[0_12px_40px_rgba(25,23,20,0.06)]">
            <p className="text-4xl font-semibold tracking-[-0.04em]">
              {stats.overdue}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              已逾期
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/58 p-4 shadow-[0_12px_40px_rgba(25,23,20,0.06)]">
            <p className="text-4xl font-semibold tracking-[-0.04em]">
              {stats.unknown}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              未分层
            </p>
          </div>
        </section>

        <section className="mb-5 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-4 shadow-[0_18px_54px_rgba(25,23,20,0.08)]">
          <form className="grid gap-3 lg:grid-cols-[1fr_16rem_auto]" action="/customers">
            <input
              className="min-h-12 rounded-2xl border border-[var(--line)] bg-white/65 px-4 text-base outline-none focus:border-[var(--accent)]"
              defaultValue={query}
              name="q"
              placeholder="搜索客户 / 公司 / 来源 / 标签 / 摘要"
            />
            <select
              className="min-h-12 rounded-2xl border border-[var(--line)] bg-white/65 px-4 text-base font-semibold outline-none focus:border-[var(--accent)]"
              defaultValue={sort}
              name="sort"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="min-h-12 rounded-2xl bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--panel)]"
              type="submit"
            >
              搜索 / 排序
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {followupFilters.map((filter) => {
              const active = followupStatus === filter.value;

              return (
                <Link
                  className={
                    active
                      ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                      : "rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--muted)]"
                  }
                  href={customerFilterHref({
                    query,
                    sort,
                    followupStatus: filter.value,
                  })}
                  key={filter.value}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCustomers.map((customer) => (
            <Link
              className="group min-h-56 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-5 shadow-[0_18px_54px_rgba(25,23,20,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(25,23,20,0.13)]"
              href={`/customers/${customer.id}`}
              key={customer.id}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-semibold">
                      {customer.displayName}
                    </h2>
                    <p className="mt-2 line-clamp-1 text-sm text-[var(--muted)]">
                      {customer.companyName ?? "未记录公司"} ·{" "}
                      {customer.referralSourceTag ?? "未记录来源"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                    {followupLabels[customer.followupStatus]}
                  </span>
                </div>

                <p className="mt-4 line-clamp-3 text-base leading-7">
                  {customer.lastContactSummary ?? "还没有确认过的沟通摘要。"}
                </p>

                <div className="mt-auto pt-5">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-3">
                      <p className="font-semibold text-[var(--muted)]">
                        最新沟通
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatDate(customer.lastContactAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-3">
                      <p className="font-semibold text-[var(--muted)]">
                        下次跟进
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatDate(customer.nextFollowupAt)}
                      </p>
                    </div>
                  </div>

                  {customer.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {customer.tags.slice(0, 3).map((tag) => (
                        <span
                          className="rounded-full border border-[var(--line)] bg-white/55 px-2.5 py-1 text-xs font-semibold text-[var(--muted)]"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </section>

        {visibleCustomers.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-white/58 p-6 text-[var(--muted)]">
            没有匹配的客户。可以清空搜索或切回“全部”。
          </div>
        ) : null}
      </main>
    );
  } finally {
    await client.end();
  }
}
