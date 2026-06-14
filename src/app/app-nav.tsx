"use client";

import { useEffect, useState, type ReactNode } from "react";
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

// 统一的内联 SVG 图标:同一套 24x24 描边风格,currentColor 跟随文字色,
// 避免 unicode 字形被系统渲染成彩色 emoji / 粗细不一致。
function Icon({
  children,
  className,
  strokeWidth = 2,
}: {
  children: ReactNode;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Icon>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect height="4" rx="1" width="8" x="8" y="2" />
      <path d="m9 14 2 2 4-4" />
    </Icon>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m3 7 2 2 4-4M3 17l2 2 4-4" />
      <path d="M13 6h8M13 12h8M13 18h8" />
    </Icon>
  );
}

function PlusIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      <path d="M5 12h14M12 5v14" />
    </Icon>
  );
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
              className="flex items-center gap-1.5 rounded-full bg-[var(--tea)] px-5 py-2 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_16px_rgba(47,93,80,0.28)]"
              href="/capture"
            >
              <PlusIcon className="h-4 w-4" strokeWidth={2.75} />
              录入
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
          icon={<SunIcon className="h-[22px] w-[22px]" />}
          label="今日"
        />
        <TabItem
          active={isActive(pathname, "/customers")}
          href="/customers"
          icon={<UsersIcon className="h-[22px] w-[22px]" />}
          label="客户"
        />
        <Link
          aria-label="录入"
          className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--paper)] bg-[var(--tea)] text-white shadow-[0_10px_24px_rgba(47,93,80,0.4)]"
          href="/capture"
        >
          <PlusIcon className="h-8 w-8" strokeWidth={3} />
        </Link>
        <TabItem
          active={isActive(pathname, "/review")}
          badgeCount={pendingCount}
          href="/review"
          icon={<ReviewIcon className="h-[22px] w-[22px]" />}
          label="待确认"
        />
        <TabItem
          active={isActive(pathname, "/tasks")}
          href="/tasks"
          icon={<TasksIcon className="h-[22px] w-[22px]" />}
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
  icon: ReactNode;
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
      {icon}
      {label}
    </Link>
  );
}
