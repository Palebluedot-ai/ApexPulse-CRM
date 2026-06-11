"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const desktopNavItems = [
  { href: "/", label: "今日" },
  { href: "/review", label: "待确认", badge: true },
  { href: "/customers", label: "客户" },
  { href: "/tasks", label: "任务" },
  { href: "/reports/weekly", label: "周报" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 rounded-full bg-[var(--persimmon-deep)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (pathname === "/login") return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/review/pending-count");
        if (!response.ok) return;
        const payload = (await response.json()) as { count?: number };
        if (!cancelled && typeof payload.count === "number") {
          setPendingCount(payload.count);
        }
      } catch {
        // ignore; badge is best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname === "/login") return null;

  return (
    <>
      {/* 桌面顶导航 */}
      <header className="sticky top-0 z-20 hidden border-b border-[var(--line-soft)] bg-[rgba(250,244,232,0.88)] px-8 py-3 backdrop-blur-xl lg:block">
        <nav className="mx-auto flex max-w-5xl items-center gap-6">
          <Link
            className="mr-2 font-(family-name:--font-serif-display) text-lg font-black"
            href="/"
          >
            OTC·CRM
          </Link>
          {desktopNavItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                className={
                  active
                    ? "border-b-2 border-[var(--tea)] pb-0.5 text-sm font-bold"
                    : "text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
                {item.badge ? <Badge count={pendingCount} /> : null}
              </Link>
            );
          })}
          <div className="ml-auto flex items-center gap-3">
            <Link
              className="rounded-full bg-[var(--tea)] px-5 py-2 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_16px_rgba(47,93,80,0.28)]"
              href="/capture"
            >
              ＋ 录入
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
                type="submit"
              >
                退出
              </button>
            </form>
          </div>
        </nav>
      </header>

      {/* 手机底部 Tab 栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-around border-t border-[var(--line-soft)] bg-[var(--card)] px-1.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <TabItem
          active={pathname === "/"}
          href="/"
          icon="☀"
          label="今日"
        />
        <TabItem
          active={isActive(pathname, "/customers")}
          href="/customers"
          icon="◎"
          label="客户"
        />
        <Link
          aria-label="录入"
          className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--paper)] bg-[var(--tea)] text-2xl text-white shadow-[0_10px_24px_rgba(47,93,80,0.4)]"
          href="/capture"
        >
          ＋
        </Link>
        <TabItem
          active={isActive(pathname, "/review")}
          badgeCount={pendingCount}
          href="/review"
          icon="☑"
          label="待确认"
        />
        <TabItem
          active={isActive(pathname, "/tasks")}
          href="/tasks"
          icon="≣"
          label="任务"
        />
      </nav>
    </>
  );
}

function TabItem({
  href,
  icon,
  label,
  active,
  badgeCount = 0,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      className={
        active
          ? "relative flex w-14 flex-col items-center gap-0.5 text-[11px] font-bold text-[var(--tea)]"
          : "relative flex w-14 flex-col items-center gap-0.5 text-[11px] text-[var(--ink-soft)]"
      }
      href={href}
    >
      {badgeCount > 0 ? (
        <span className="absolute -top-1 right-1 rounded-full bg-[var(--persimmon-deep)] px-1.5 text-[9px] font-bold leading-4 text-white">
          {badgeCount}
        </span>
      ) : null}
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </Link>
  );
}
