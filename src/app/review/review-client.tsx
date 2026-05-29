"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  CustomerSelectOption,
  ReviewContentTypeFilter,
  ReviewQueueViewItem,
} from "@/server/review/review-page-model";
import { filterReviewQueueViewItems } from "@/server/review/review-page-model";
import {
  mergeReviewNaturalFields,
  type ReviewNaturalFields,
} from "@/lib/review-form";

interface ReviewClientProps {
  customers: CustomerSelectOption[];
  initialItems: ReviewQueueViewItem[];
}

type ActionState = Record<
  string,
  { tone: "success" | "error"; message: string }
>;

const contentTypeLabels: Record<string, string> = {
  image: "截图",
  text: "文字",
  card_photo: "名片照片",
};

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

function naturalFieldsFromForm(form: FormData): ReviewNaturalFields {
  return {
    customerName: String(form.get("customerName") ?? ""),
    companyName: String(form.get("companyName") ?? ""),
    sourceTag: String(form.get("sourceTag") ?? ""),
    needSummary: String(form.get("needSummary") ?? ""),
    nextAction: String(form.get("nextAction") ?? ""),
    nextFollowupAt: String(form.get("nextFollowupAt") ?? ""),
  };
}

function submitIntent(event: FormEvent<HTMLFormElement>): "confirm" | "edit" {
  const nativeEvent = event.nativeEvent as SubmitEvent;
  const submitter = nativeEvent.submitter;

  return submitter instanceof HTMLButtonElement && submitter.value === "confirm"
    ? "confirm"
    : "edit";
}

export function ReviewClient({ customers, initialItems }: ReviewClientProps) {
  const [items, setItems] = useState(initialItems);
  const [actionState, setActionState] = useState<ActionState>({});
  const [query, setQuery] = useState("");
  const [contentType, setContentType] =
    useState<ReviewContentTypeFilter>("all");
  const deferredQuery = useDeferredValue(query);
  const visibleItems = filterReviewQueueViewItems(items, {
    query: deferredQuery,
    contentType,
  });

  function setMessage(
    eventId: string,
    message: string,
    tone: "success" | "error" = "success",
  ) {
    setActionState((current) => ({
      ...current,
      [eventId]: { tone, message },
    }));
  }

  async function edit(
    event: FormEvent<HTMLFormElement>,
    item: ReviewQueueViewItem,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const intent = submitIntent(event);
    const extractedFields = mergeReviewNaturalFields(
      item.extractedFields,
      naturalFieldsFromForm(form),
    );

    try {
      if (intent === "confirm") {
        await postJson("/api/review/confirm", {
          eventId: item.id,
          partyId: String(form.get("partyId") ?? "") || undefined,
          summary: String(form.get("summary") ?? ""),
          extractedFields,
          followupStatus:
            String(form.get("followupStatus") ?? "") || undefined,
        });
        setItems((current) =>
          current.filter((currentItem) => currentItem.id !== item.id),
        );
        return;
      }

      await postJson("/api/review/edit", {
        eventId: item.id,
        summary: String(form.get("summary") ?? ""),
        extractedFields,
      });
      setMessage(item.id, "已保存字段，仍在待确认队列。");
    } catch (error) {
      setMessage(
        item.id,
        error instanceof Error ? error.message : "操作失败",
        "error",
      );
    }
  }

  async function skip(itemId: string) {
    try {
      await postJson("/api/review/skip", { eventId: itemId });
      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      setMessage(
        itemId,
        error instanceof Error ? error.message : "跳过失败",
        "error",
      );
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
        <div className="flex flex-wrap gap-2">
          <Link
            className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
            href="/capture"
          >
            新增录入
          </Link>
          <Link
            className="w-fit rounded-full border border-[var(--line)] bg-white/55 px-5 py-3 text-sm font-semibold text-[var(--accent-strong)]"
            href="/customers"
          >
            客户列表
          </Link>
        </div>
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
          <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/55 p-4">
            <p className="font-semibold">
              当前还有 {items.length} 条待确认记录。
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              建议从上往下处理：先保存必要修改，再确认入库；不值得处理的记录可以跳过，但原始证据不会被删除。
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_14rem]">
              <input
                className="min-h-11 rounded-2xl border border-[var(--line)] bg-white/65 px-4 outline-none focus:border-[var(--accent)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索摘要、原始备注、附件名、结构化字段"
                value={query}
              />
              <select
                className="min-h-11 rounded-2xl border border-[var(--line)] bg-white/65 px-4 font-semibold outline-none focus:border-[var(--accent)]"
                onChange={(event) =>
                  setContentType(event.target.value as ReviewContentTypeFilter)
                }
                value={contentType}
              >
                <option value="all">全部类型</option>
                <option value="image">只看截图</option>
                <option value="text">只看文字</option>
                <option value="card_photo">只看名片照片</option>
              </select>
            </div>
            {visibleItems.length !== items.length ? (
              <p className="mt-3 text-sm font-semibold text-[var(--accent-strong)]">
                当前筛出 {visibleItems.length} 条，完整队列还有 {items.length} 条。
              </p>
            ) : null}
          </div>
          {visibleItems.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6">
              <h2 className="text-2xl font-semibold">没有匹配的待确认记录。</h2>
              <p className="mt-2 text-[var(--muted)]">
                可以清空搜索或切回全部类型。
              </p>
            </div>
          ) : null}
          {visibleItems.map((item, index) => (
            <article
              className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-5 shadow-[0_24px_80px_rgba(25,23,20,0.1)]"
              key={item.id}
            >
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs font-semibold text-[var(--panel)]">
                      第 {index + 1} 条
                    </span>
                    <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
                      {contentTypeLabels[item.contentType] ?? item.contentType}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                      {item.sourceChannel}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                      {formatDate(item.capturedAt)}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-white/55 px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                      附件 {item.attachments.length}
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
                    onSubmit={(event) => edit(event, item)}
                  >
                    <p className="font-semibold">确认业务字段</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      这里确认人能读懂、后续能跟进的字段；不会让你看 JSON。
                    </p>
                    <select
                      className="mt-3 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                      name="partyId"
                    >
                      <option value="">新客户 / 暂不匹配现有客户</option>
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
                      placeholder="这条沟通的可读摘要"
                    />
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        className="min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                        defaultValue={item.naturalFields.customerName}
                        name="customerName"
                        placeholder="客户名，例如 刘总"
                      />
                      <input
                        className="min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                        defaultValue={item.naturalFields.companyName}
                        name="companyName"
                        placeholder="公司，例如 Demo Capital"
                      />
                      <input
                        className="min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                        defaultValue={item.naturalFields.sourceTag}
                        name="sourceTag"
                        placeholder="来源，例如 Token2049"
                      />
                      <input
                        className="min-h-11 rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                        defaultValue={item.naturalFields.nextFollowupAt}
                        name="nextFollowupAt"
                        placeholder="下次跟进，例如 2026-06-01 09:00"
                      />
                    </div>
                    <textarea
                      className="mt-3 min-h-20 w-full rounded-xl border border-[var(--line)] bg-white p-3 outline-none focus:border-[var(--accent)]"
                      defaultValue={item.naturalFields.needSummary}
                      name="needSummary"
                      placeholder="需求，例如 想了解 OTC 费率和出入金流程"
                    />
                    <textarea
                      className="mt-3 min-h-20 w-full rounded-xl border border-[var(--line)] bg-white p-3 outline-none focus:border-[var(--accent)]"
                      defaultValue={item.naturalFields.nextAction}
                      name="nextAction"
                      placeholder="下一步，例如 下周发报价并约一次电话"
                    />
                    <select
                      className="mt-3 min-h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--accent)]"
                      name="followupStatus"
                    >
                      <option value="">默认：已跟进</option>
                      <option value="up_to_date">已跟进</option>
                      <option value="due_soon">即将跟进</option>
                      <option value="overdue">已逾期</option>
                      <option value="unknown">未分层</option>
                    </select>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      空字段不会强行写入；未展示的底层字段会保留，避免丢信息。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--panel)]"
                        name="intent"
                        type="submit"
                        value="confirm"
                      >
                        确认入库
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                        name="intent"
                        type="submit"
                        value="edit"
                      >
                        只保存字段
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
                    <p
                      className={
                        actionState[item.id].tone === "error"
                          ? "rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                          : "rounded-2xl border border-[var(--line)] bg-white/55 p-3 text-sm font-semibold text-[var(--accent-strong)]"
                      }
                    >
                      {actionState[item.id].message}
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
