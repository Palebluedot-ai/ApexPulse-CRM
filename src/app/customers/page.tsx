import Link from "next/link";
import { createDb } from "@/server/db";
import {
  buildCustomerDashboardStats,
  filterCustomerListItems,
  listCustomerListItems,
  sortCustomerListItems,
  type CustomerFollowupFilter,
  type CustomerListItem,
  type CustomerSort,
} from "@/server/customers/customer-dashboard";

export const dynamic = "force-dynamic";

const followupFilters: Array<{
  label: string;
  value: CustomerFollowupFilter;
}> = [
  { label: "全部", value: "all" },
  { label: "逾期", value: "overdue" },
  { label: "临近", value: "due_soon" },
  { label: "健康", value: "up_to_date" },
  { label: "沉睡", value: "unknown" },
];

const sortOptions: Array<{ label: string; value: CustomerSort }> = [
  { label: "按该跟进程度", value: "attention" },
  { label: "按上次跟进时间", value: "last_contact_desc" },
  { label: "按下次跟进时间", value: "next_followup_asc" },
  { label: "按客户名", value: "name_asc" },
];

const dotClasses: Record<CustomerListItem["followupStatus"], string> = {
  overdue: "bg-[var(--red-status)]",
  due_soon: "bg-[var(--gold)]",
  up_to_date: "bg-[#5d9b7c]",
  unknown: "bg-[#cbc2af]",
};

function lastContactLabel(customer: CustomerListItem, now: Date): {
  text: string;
  alarming: boolean;
} {
  const dayMs = 86400000;

  if (customer.followupStatus === "overdue" && customer.nextFollowupAt) {
    const days = Math.max(
      1,
      Math.floor((now.getTime() - customer.nextFollowupAt.getTime()) / dayMs),
    );
    return { text: `逾期 ${days} 天`, alarming: true };
  }

  if (!customer.lastContactAt) {
    return { text: "还没有确认沟通", alarming: false };
  }

  const days = Math.floor(
    (now.getTime() - customer.lastContactAt.getTime()) / dayMs,
  );
  if (days <= 0) return { text: "今天沟通过", alarming: false };
  if (days >= 21) return { text: `${days} 天无动静`, alarming: false };
  return { text: `${days} 天前沟通`, alarming: false };
}

function searchParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseFollowupFilter(value: string): CustomerFollowupFilter {
  return followupFilters.some((filter) => filter.value === value)
    ? (value as CustomerFollowupFilter)
    : "all";
}

function parseSort(value: string): CustomerSort {
  return sortOptions.some((option) => option.value === value)
    ? (value as CustomerSort)
    : "attention";
}

function customerFilterHref(input: {
  query: string;
  sort: CustomerSort;
  followupStatus: CustomerFollowupFilter;
}): string {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.followupStatus !== "all") params.set("status", input.followupStatus);
  if (input.sort !== "attention") params.set("sort", input.sort);
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
    const now = new Date();

    const filterCounts: Partial<Record<CustomerFollowupFilter, number>> = {
      all: stats.total,
      overdue: stats.overdue,
      due_soon: stats.dueSoon,
      unknown: stats.unknown,
    };

    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-[var(--font-serif-display)] text-3xl font-bold sm:text-4xl">
            客户
          </h1>
          <p className="text-xs text-[var(--ink-soft)]">
            <span className="mr-3">
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--red-status)]" />
              逾期
            </span>
            <span className="mr-3">
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--gold)]" />
              临近
            </span>
            <span className="mr-3">
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#5d9b7c]" />
              健康
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#cbc2af]" />
              沉睡
            </span>
          </p>
        </header>

        <form
          action="/customers"
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <input
            className="min-h-11 min-w-0 flex-1 rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 text-sm outline-none focus:border-[var(--tea)]"
            defaultValue={query}
            name="q"
            placeholder="⌕ 搜客户名 / 公司 / 需求 / 标签"
          />
          <select
            className="min-h-11 rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-3 text-sm font-semibold outline-none focus:border-[var(--tea)]"
            defaultValue={sort}
            name="sort"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {followupStatus !== "all" ? (
            <input name="status" type="hidden" value={followupStatus} />
          ) : null}
          <button
            className="min-h-11 rounded-full bg-[var(--tea)] px-5 text-sm font-bold text-[#fdfbf4]"
            type="submit"
          >
            搜索
          </button>
        </form>

        <div className="mb-5 inline-flex flex-wrap gap-1 rounded-full bg-[var(--paper-deep)] p-1 text-sm">
          {followupFilters.map((filter) => {
            const active = followupStatus === filter.value;
            const count = filterCounts[filter.value];
            return (
              <Link
                className={
                  active
                    ? "rounded-full bg-[var(--card)] px-4 py-1.5 font-bold shadow-[0_2px_8px_rgba(57,47,32,0.1)]"
                    : "rounded-full px-4 py-1.5 font-medium text-[var(--ink-soft)]"
                }
                href={customerFilterHref({
                  query,
                  sort,
                  followupStatus: filter.value,
                })}
                key={filter.value}
              >
                {filter.label}
                {typeof count === "number" ? ` ${count}` : ""}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          {visibleCustomers.map((customer) => {
            const contact = lastContactLabel(customer, now);
            const sleeping = customer.followupStatus === "unknown";
            return (
              <Link
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] px-4 py-3 text-sm transition hover:-translate-y-px hover:shadow-[0_14px_40px_rgba(57,47,32,0.1)] sm:grid-cols-[auto_1.2fr_1fr_1.4fr] ${sleeping ? "opacity-60" : ""}`}
                href={`/customers/${customer.id}`}
                key={customer.id}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${dotClasses[customer.followupStatus]}`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">
                    {customer.displayName}
                  </span>
                  <span className="block truncate text-xs text-[var(--ink-soft)]">
                    {customer.companyName ?? "未记录公司"}
                    {customer.referralSourceTag
                      ? ` · ${customer.referralSourceTag}`
                      : ""}
                  </span>
                </span>
                <span
                  className={
                    contact.alarming
                      ? "whitespace-nowrap text-xs font-bold text-[var(--red-status)]"
                      : "whitespace-nowrap text-xs text-[var(--ink-soft)]"
                  }
                >
                  {contact.text}
                </span>
                <span className="col-span-3 truncate text-xs text-[var(--ink-soft)] sm:col-span-1">
                  <span className="mr-1 font-semibold">下一步</span>
                  {customer.lastContactSummary ?? "—— 没有计划"}
                </span>
              </Link>
            );
          })}
        </div>

        {visibleCustomers.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] p-6 text-sm text-[var(--ink-soft)]">
            没有匹配的客户。可以清空搜索或切回“全部”。
          </div>
        ) : null}
      </main>
    );
  } finally {
    await client.end();
  }
}
