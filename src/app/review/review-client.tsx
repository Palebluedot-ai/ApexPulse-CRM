"use client";

import {
  useDeferredValue,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import type {
  CustomerSelectOption,
  ReviewContentTypeFilter,
  ReviewQueueViewItem,
  ReviewRecordScopeFilter,
} from "@/server/review/review-page-model";
import { filterReviewQueueViewItems } from "@/server/review/review-page-model";
import {
  mergeReviewAiFields,
  mergeReviewNaturalFields,
  type ReviewAiFields,
  type ReviewNaturalFields,
} from "@/lib/review-form";
import { awaitingAutoExtraction } from "./decision-card-model";
import { DecisionCard } from "./decision-card";

interface ReviewClientProps {
  customers: CustomerSelectOption[];
  initialItems: ReviewQueueViewItem[];
}

type ActionState = Record<
  string,
  { tone: "success" | "error"; message: string }
>;

interface VisionExtractResponse {
  eventId: string;
  summary: string;
  extractedFields: Record<string, unknown>;
  naturalFields: ReviewNaturalFields;
  aiFields: ReviewAiFields;
}

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

function aiFieldsFromForm(form: FormData): ReviewAiFields {
  return {
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
    telegram: String(form.get("telegram") ?? ""),
    wechatAlias: String(form.get("wechatAlias") ?? ""),
    leadQuality: String(
      form.get("leadQuality") ?? "unknown",
    ) as ReviewAiFields["leadQuality"],
    confidence: String(
      form.get("confidence") ?? "unknown",
    ) as ReviewAiFields["confidence"],
    actionRequired: form.get("actionRequired") === "on",
    evidenceNotes: String(form.get("evidenceNotes") ?? ""),
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
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [doneCount, setDoneCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [contentType, setContentType] =
    useState<ReviewContentTypeFilter>("all");
  const [recordScope, setRecordScope] =
    useState<ReviewRecordScopeFilter>("real");
  const deferredQuery = useDeferredValue(query);

  const visibleItems = filterReviewQueueViewItems(items, {
    query: deferredQuery,
    contentType,
    recordScope,
  });
  const sessionTotal = doneCount + visibleItems.length;
  const topItem = visibleItems[0];

  // 4s 轮询：提取完成后自动回填（沿用 M1.24A 逻辑）
  useEffect(() => {
    if (!items.some(awaitingAutoExtraction)) return;

    const timer = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch("/api/review/pending");
          if (!response.ok) return;

          const payload = (await response.json()) as {
            viewItems?: ReviewQueueViewItem[];
          };
          const freshById = new Map(
            (payload.viewItems ?? []).map((viewItem) => [
              viewItem.id,
              viewItem,
            ]),
          );

          setItems((current) =>
            current.map((item) => {
              const fresh = freshById.get(item.id);
              return awaitingAutoExtraction(item) &&
                fresh?.extractedFields.aiExtractionSource
                ? fresh
                : item;
            }),
          );
        } catch {
          // network hiccup: keep polling
        }
      })();
    }, 4000);

    return () => clearInterval(timer);
  }, [items]);

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

  function toggleExpanded(itemId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
    setDoneCount((current) => current + 1);
  }

  async function submitCard(
    event: FormEvent<HTMLFormElement>,
    item: ReviewQueueViewItem,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const intent = submitIntent(event);
    const extractedFields = mergeReviewAiFields(
      mergeReviewNaturalFields(
        item.extractedFields,
        naturalFieldsFromForm(form),
      ),
      aiFieldsFromForm(form),
    );

    try {
      if (intent === "confirm") {
        await postJson("/api/review/confirm", {
          eventId: item.id,
          partyId: String(form.get("partyId") ?? "") || undefined,
          summary: String(form.get("summary") ?? ""),
          extractedFields,
          naturalFields: naturalFieldsFromForm(form),
          followupStatus: String(form.get("followupStatus") ?? "") || undefined,
        });
        removeItem(item.id);
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
      removeItem(itemId);
    } catch (error) {
      setMessage(
        itemId,
        error instanceof Error ? error.message : "跳过失败",
        "error",
      );
    }
  }

  async function extractWithAi(item: ReviewQueueViewItem) {
    setExtractingIds((current) => new Set(current).add(item.id));

    try {
      const payload = (await postJson("/api/review/vision-extract", {
        eventId: item.id,
      })) as unknown as VisionExtractResponse;

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                summary: payload.summary,
                extractedFields: payload.extractedFields,
                extractedFieldsText: JSON.stringify(
                  payload.extractedFields,
                  null,
                  2,
                ),
                naturalFields: payload.naturalFields,
                aiFields: payload.aiFields,
              }
            : currentItem,
        ),
      );
      setMessage(item.id, "AI 已回填字段，检查后确认入库。");
    } catch (error) {
      setMessage(
        item.id,
        error instanceof Error ? error.message : "AI 提取失败",
        "error",
      );
    } finally {
      setExtractingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  // 键盘流：Y 确认 / E 修改 / S 跳过，永远作用于队首卡
  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      if (!topItem || awaitingAutoExtraction(topItem)) return;

      const key = event.key.toLowerCase();
      if (key === "y") {
        document
          .getElementById(`confirm-${topItem.id}`)
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      } else if (key === "e") {
        toggleExpanded(topItem.id);
      } else if (key === "s") {
        void skip(topItem.id);
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  function renderCard(item: ReviewQueueViewItem) {
    return (
      <DecisionCard
        customers={customers}
        expanded={expandedIds.has(item.id)}
        extracting={extractingIds.has(item.id)}
        item={item}
        key={`${item.id}:${item.summary}:${JSON.stringify(item.naturalFields)}`}
        message={actionState[item.id]}
        onRetryExtract={() => void extractWithAi(item)}
        onSkip={() => void skip(item.id)}
        onSubmit={(event) => void submitCard(event, item)}
        onToggleExpanded={() => toggleExpanded(item.id)}
      />
    );
  }

  const emptyQueue = (
    <section className="rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-8 text-center shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
      <p className="font-(family-name:--font-serif-display) text-3xl font-bold text-[var(--tea-deep)]">
        队列已清空 ✓
      </p>
      <p className="mt-2 text-[var(--ink-soft)]">
        {doneCount > 0 ? `本轮处理了 ${doneCount} 条。` : "没有待确认记录。"}{" "}
        <Link
          className="font-semibold text-[var(--tea)] underline"
          href="/capture"
        >
          去录入
        </Link>
      </p>
    </section>
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-serif-display) text-4xl font-bold tracking-[-0.02em]">
            待确认 <span className="text-[var(--tea)]">·</span> 轻审查
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            AI 已自动提取并预归类，扫一眼 → 确认。改和跳过是例外。
            <span className="ml-3 hidden lg:inline">
              <kbd className="rounded-md border border-[var(--line-soft)] bg-[var(--card)] px-1.5 font-(family-name:--font-numerals)">
                Y
              </kbd>{" "}
              确认{" "}
              <kbd className="rounded-md border border-[var(--line-soft)] bg-[var(--card)] px-1.5 font-(family-name:--font-numerals)">
                E
              </kbd>{" "}
              修改{" "}
              <kbd className="rounded-md border border-[var(--line-soft)] bg-[var(--card)] px-1.5 font-(family-name:--font-numerals)">
                S
              </kbd>{" "}
              跳过
            </span>
          </p>
        </div>
        <div className="flex items-stretch gap-2.5">
          <button
            className="rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--ink-soft)]"
            onClick={() => setShowFilters((current) => !current)}
            type="button"
          >
            ⚲ 筛选{showFilters ? " ▴" : ""}
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 py-1.5">
            <span className="font-(family-name:--font-numerals) text-xl font-bold leading-none text-[var(--persimmon)]">
              {visibleItems.length}
            </span>
            <span className="text-[13px] text-[var(--ink-soft)]">
              条待确认
            </span>
          </div>
        </div>
      </header>

      {showFilters ? (
        <div className="mb-5 grid gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] p-4 lg:grid-cols-[1fr_11rem_11rem]">
          <input
            className="min-h-11 min-w-0 rounded-xl border border-[var(--line-soft)] bg-white px-4 outline-none focus:border-[var(--tea)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索摘要、原始备注、附件名"
            value={query}
          />
          <select
            className="min-h-11 min-w-0 max-w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 font-semibold outline-none focus:border-[var(--tea)]"
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
          <select
            className="min-h-11 min-w-0 max-w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 font-semibold outline-none focus:border-[var(--tea)]"
            onChange={(event) =>
              setRecordScope(event.target.value as ReviewRecordScopeFilter)
            }
            value={recordScope}
          >
            <option value="real">真实记录</option>
            <option value="test">测试记录</option>
            <option value="all">全部记录</option>
          </select>
        </div>
      ) : null}

      {/* 手机：聚焦模式，一屏一卡 + 进度条 */}
      <div className="lg:hidden">
        {sessionTotal > 0 ? (
          <div className="mb-4">
            <p className="mb-1.5 text-sm font-semibold text-[var(--ink-soft)]">
              <span className="font-(family-name:--font-numerals) text-[var(--tea-deep)]">
                {Math.min(doneCount + 1, sessionTotal)} / {sessionTotal}
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--paper-deep)]">
              <div
                className="h-full rounded-full bg-[var(--tea)] transition-all"
                style={{
                  width: `${sessionTotal ? (doneCount / sessionTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        {topItem ? renderCard(topItem) : emptyQueue}
      </div>

      {/* 桌面：决策卡流 */}
      <div className="hidden lg:grid lg:gap-5">
        {visibleItems.length === 0 ? emptyQueue : visibleItems.map(renderCard)}
      </div>
    </main>
  );
}
