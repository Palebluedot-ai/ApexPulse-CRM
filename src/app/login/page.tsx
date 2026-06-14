type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "invalid";
  const next = params?.next ?? "/";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-10 sm:px-8">
      <section className="grid w-full gap-6 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,250,240,0.86)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.12)] md:grid-cols-[1fr_0.9fr] md:p-10">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <p className="mb-5 w-fit rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--tea-deep)]">
              M1.14 · local password
            </p>
            <h1 className="font-(family-name:--font-display) text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
              先确认是谁在使用。
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
              第一版只做本地登录验证。它不是复杂权限系统，只负责让录入、确认和任务操作都能落到当前用户身上。
            </p>
          </div>
          <p className="rounded-2xl border border-[var(--line)] bg-white/55 p-4 text-sm leading-6 text-[var(--muted)]">
            本地默认账号来自 seed：chao.local@example.com。开发默认密码是
            local-dev-password；之后可以用 .env 改掉。
          </p>
        </div>

        <form
          action="/api/auth/login"
          className="rounded-[1.5rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 text-[var(--ink)] shadow-[0_14px_40px_rgba(57,47,32,0.08)]"
          method="post"
        >
          <input name="next" type="hidden" value={next} />
          <label className="grid gap-2 text-sm font-semibold">
            邮箱
            <input
              className="min-h-12 rounded-2xl border border-[var(--line-soft)] bg-white px-4 text-base text-[var(--ink)] outline-none focus:border-[var(--tea)]"
              defaultValue="chao.local@example.com"
              name="email"
              type="email"
            />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-semibold">
            密码
            <input
              className="min-h-12 rounded-2xl border border-[var(--line-soft)] bg-white px-4 text-base text-[var(--ink)] outline-none focus:border-[var(--tea)]"
              name="password"
              placeholder="local-dev-password"
              type="password"
            />
          </label>
          {hasError ? (
            <p className="mt-4 rounded-2xl border border-[var(--red-status)]/30 bg-[#fdeee9] p-3 text-sm text-[var(--red-status)]">
              邮箱或密码不对。先确认本地 seed 用户和 .env 配置。
            </p>
          ) : null}
          <button
            className="mt-5 w-full rounded-full bg-[var(--tea)] px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(31,157,107,0.28)]"
            type="submit"
          >
            登录
          </button>
        </form>
      </section>
    </main>
  );
}
