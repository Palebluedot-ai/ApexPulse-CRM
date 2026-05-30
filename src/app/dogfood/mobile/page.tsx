import { headers } from "next/headers";
import Link from "next/link";
import { buildMobileDogfoodModel } from "@/server/dogfood/mobile-dogfood";

export const dynamic = "force-dynamic";

export default async function MobileDogfoodPage() {
  const requestHeaders = await headers();
  const model = buildMobileDogfoodModel({
    host: requestHeaders.get("host"),
    protocol: requestHeaders.get("x-forwarded-proto"),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
            C1 · 手机端上线冲刺
          </p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            手机 Dogfood
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            这页只服务一件事：让你拿手机跑通真实微信截图闭环，不用翻文档或聊天记录。
          </p>
        </div>
        <Link
          className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
          href="/capture"
        >
          开始上传
        </Link>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
          <h2 className="text-2xl font-semibold">手机打开这个地址</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {model.accessHint}
          </p>
          <p className="mt-5 break-all rounded-2xl border border-[var(--line)] bg-white/70 p-4 font-mono text-sm font-semibold text-[var(--accent-strong)]">
            {model.currentBaseUrl}
          </p>
          {model.mobileWarning ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
              {model.mobileWarning}
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            如果手机打不开，不要用 localhost。手机上的 localhost 是手机自己，不是 Mac。
          </p>
        </div>

        <div className="rounded-[1.8rem] border border-[var(--line)] bg-[var(--foreground)] p-6 text-[var(--panel)] shadow-[0_24px_80px_rgba(25,23,20,0.16)]">
          <h2 className="text-2xl font-semibold">上线前先确认</h2>
          <ul className="mt-5 grid gap-3">
            {model.checks.map((check) => (
              <li
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-semibold leading-6"
                key={check}
              >
                {check}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-5 rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
        <h2 className="text-2xl font-semibold">第一轮只跑 1 张截图</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {model.goldenPath.map((step, index) => (
            <div
              className="rounded-2xl border border-[var(--line)] bg-white/60 p-4"
              key={step}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-base font-semibold leading-7">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
            href="/capture"
          >
            去上传截图
          </Link>
          <Link
            className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
            href="/review"
          >
            去待确认
          </Link>
          <Link
            className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
            href="/reports/weekly"
          >
            看周报
          </Link>
        </div>
      </section>
    </main>
  );
}
