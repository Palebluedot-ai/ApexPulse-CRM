"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/capture", label: "录入" },
  { href: "/review", label: "待确认" },
  { href: "/customers", label: "客户" },
  { href: "/tasks", label: "任务" },
  { href: "/reports/weekly", label: "周报" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(244,239,229,0.86)] px-4 py-3 backdrop-blur-xl sm:px-8">
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link className="flex w-fit flex-col" href="/">
          <span className="text-sm font-semibold text-[var(--accent-strong)]">
            OTC CRM
          </span>
          <span className="text-xs text-[var(--muted)]">
            local-first dogfood
          </span>
        </Link>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                className={
                  active
                    ? "shrink-0 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                    : "shrink-0 rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          {isLoginPage ? null : (
            <form action="/api/auth/logout" method="post">
              <button
                className="shrink-0 rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
                type="submit"
              >
                退出
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
