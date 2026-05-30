import Link from "next/link";

const loopSteps = [
  "保留原始证据",
  "进入待确认队列",
  "确认后写入客户时间线",
  "刷新跟进状态",
  "生成或补充任务",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <section className="grid flex-1 gap-8 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,240,0.78)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.12)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-10">
        <div className="flex flex-col justify-between gap-12">
          <div>
            <p className="mb-5 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
              PWA-first · local-first · review-first
            </p>
            <h1 className="max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-[var(--foreground)] sm:text-7xl">
              把每一次会面和聊天，都变成下一次跟进。
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              第一版只服务一个核心问题：展会、Telegram、WhatsApp
              里认识的人，不再因为没有记录和提醒而沉睡。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
              href="/capture"
            >
              新增录入
            </Link>
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
              href="/review"
            >
              待确认
            </Link>
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
              href="/customers"
            >
              客户列表
            </Link>
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
              href="/tasks"
            >
              跟进任务
            </Link>
            <Link
              className="rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
              href="/dogfood/mobile"
            >
              手机测试
            </Link>
          </div>
        </div>

        <aside className="rounded-[1.5rem] bg-[var(--foreground)] p-5 text-[var(--panel)] shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d6c5a7]">
            M1 Loop
          </p>
          <div className="mt-6 space-y-4">
            {loopSteps.map((step, index) => (
              <div
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                key={step}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-base font-medium leading-7">{step}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
