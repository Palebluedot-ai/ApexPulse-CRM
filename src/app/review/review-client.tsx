"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  CustomerSelectOption,
  ReviewQueueViewItem,
} from "@/server/review/review-page-model";

interface ReviewClientProps {
  customers: CustomerSelectOption[];
  initialItems: ReviewQueueViewItem[];
}

type ActionState = Record<string, string>;

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "操作失败",
    );
  }

  return payload;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReviewClient({ customers, initialItems }: ReviewClientProps) {
  const [items, setItems] = useState(initialItems);
  const [actionState, setActionState] = useState<ActionState>({});

  function setMessage(eventId: string, message: string) {
    setActionState((current) => ({ ...current, [eventId]: message }));
  }

  async function edit(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await postJson("/api/review/edit", {
        eventId: itemId,
        summary: String(form.get("summary") ?? ""),
        extractedFields: JSON.parse(String(form.get("extractedFields") ?? "{}")),
      });
      setMessage(itemId, "已保存修改，仍在待确认队列。");
    } catch (error) {
      setMessage(itemId, error instanceof Error ? error.message : "保存失败");
    }
  }

  async function skip(itemId: string) {
    try {
      await postJson("/api/review/skip", { eventId: itemId });
      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      setMessage(itemId, error instanceof Error ? error.message : "跳过失败");
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await postJson("/api/review/confirm", {
        eventId: itemId,
        partyId: String(form.get("partyId") ?? "") || undefined,
        summary: String(form.get("summary") ?? ""),
        extractedFields: JSON.parse(String(form.get("extractedFields") ?? "{}")),
        followupStatus: String(form.get("followupStatus") ?? "") || undefined,
      });
      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      setMessage(itemId, error instanceof Error ? error.message : "确认失败");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
            M1.1 · 待确认队列
          </p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            待确认
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            处理截图、文字备注和名片照片进入正式客户记录前的最后一步。
          </p>
        </div>
        <Link
          className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
          href="/capture"
        >
          新增录入
        </Link>
      </header>

      {items.length === 0 ? (
        <section className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]">
          <h2 className="text-2xl font-semibold">没有待确认记录。</h2>
          <p className="mt-2 text-[var(--muted)]">
            可以先去新增录入，创建一条 pending review 事件。
          </p>
        </section>
      ) : (
        <section className="grid gap-5">
          {items.map((item) => (
            <article
              className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-5 shadow-[0_24px_80px_rgba(25,23,20,0.1)]"
              key={item.id}
            >
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                      {item.contentType}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                      {formatDate(item.capturedAt)}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold">{item.summary}</h2>
                  {item.rawText ? (
                    <p className="mt-3 rounded-2xl border border-[var(--line)] bg-white/55 p-4 leading-7">
                      {item.rawText}
                    </p>
                  ) : null}
                  <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                    <p className="text-sm font-semibold text-[var(--muted)]">
                      原始证据
                    </p>
                    {item.attachments.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {item.attachments.map((attachment) => (
                          <li key={attachment.id}>
                            {attachment.fileName} · {attachment.mimeType}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        无附件，原始文字仍然保留。
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <form
                    className="rounded-2xl border border-[var(--line)] bg-white/55 p-4"
                    onSubmit={(event) => edit(event, item.id)}
                  >
                    <p className="font-semibold">编辑待确认字段</p>
                    <input
                      className="mt-3 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                      defaultValue={item.summary}
                      name="summary"
                      placeholder="摘要"
                    />
                    <textarea
                      className="mt-3 min-h-28 w-full rounded-xl border border-[var(--line)] bg-white p-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
                      defaultValue={item.extractedFieldsText}
                      name="extractedFields"
                    />
                    <button
                      className="mt-3 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                      type="submit"
                    >
                      保存修改
                    </button>
                  </form>

                  <form
                    className="rounded-2xl border border-[var(--line)] bg-white/55 p-4"
                    onSubmit={(event) => confirm(event, item.id)}
                  >
                    <p className="font-semibold">确认入库</p>
                    <select
                      className="mt-3 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                      name="partyId"
                    >
                      <option value="">不绑定客户</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="mt-3 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                      defaultValue={item.summary}
                      name="summary"
                      placeholder="确认摘要"
                    />
                    <textarea
                      className="mt-3 min-h-28 w-full rounded-xl border border-[var(--line)] bg-white p-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
                      defaultValue={item.extractedFieldsText}
                      name="extractedFields"
                    />
                    <select
                      className="mt-3 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                      name="followupStatus"
                    >
                      <option value="">默认 up_to_date</option>
                      <option value="up_to_date">已跟进</option>
                      <option value="due_soon">即将跟进</option>
                      <option value="overdue">已逾期</option>
                      <option value="unknown">未分层</option>
                    </select>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                        type="submit"
                      >
                        确认
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                        onClick={() => void skip(item.id)}
                        type="button"
                      >
                        跳过
                      </button>
                    </div>
                  </form>

                  {actionState[item.id] ? (
                    <p className="text-sm font-semibold text-[var(--accent-strong)]">
                      {actionState[item.id]}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
