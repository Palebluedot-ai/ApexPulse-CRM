"use client";

import { useState } from "react";

export interface TodoView {
  id: string;
  description: string;
  dueLabel: string | null;
  overdue: boolean;
}

export interface DoneTodoView {
  id: string;
  description: string;
  completedLabel: string;
}

export function CustomerTodos({
  openTodos,
  doneTodos,
}: {
  openTodos: TodoView[];
  doneTodos: DoneTodoView[];
}) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);

  async function complete(taskId: string) {
    setCompletedIds((current) => new Set(current).add(taskId));
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!response.ok) throw new Error();
    } catch {
      setCompletedIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }

  const remaining = openTodos.filter((todo) => !completedIds.has(todo.id));
  const justCompleted = openTodos.filter((todo) => completedIds.has(todo.id));
  const doneCount = doneTodos.length + justCompleted.length;

  return (
    <section className="rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
      <h2 className="text-sm font-bold">
        待办{" "}
        <span className="font-(family-name:--font-numerals) text-[var(--persimmon)]">
          {remaining.length}
        </span>
      </h2>
      {remaining.length > 0 ? (
        remaining.map((todo) => (
          <div
            className="flex items-center gap-2.5 border-b border-dashed border-[var(--line-soft)] py-2.5 text-sm last:border-0"
            key={todo.id}
          >
            <input
              aria-label="完成待办"
              checked={false}
              className="h-[18px] w-[18px] flex-none accent-[var(--tea)]"
              onChange={() => void complete(todo.id)}
              type="checkbox"
            />
            <span>
              {todo.description}{" "}
              {todo.overdue ? (
                <b className="text-xs text-[var(--red-status)]">逾期</b>
              ) : todo.dueLabel ? (
                <span className="text-xs text-[var(--ink-soft)]">
                  {todo.dueLabel}
                </span>
              ) : null}
            </span>
          </div>
        ))
      ) : (
        <p className="py-2.5 text-sm text-[var(--ink-soft)]">
          没有未完成待办 ✓
        </p>
      )}
      {doneCount > 0 ? (
        <>
          <button
            className="pt-2 text-xs font-bold text-[var(--ink-soft)] hover:text-[var(--tea)]"
            onClick={() => setShowDone((current) => !current)}
            type="button"
          >
            {showDone ? "▾" : "▸"} 已完成 {doneCount} 条
          </button>
          {showDone ? (
            <div>
              {justCompleted.map((todo) => (
                <p
                  className="flex items-center gap-2.5 py-1.5 text-sm opacity-50"
                  key={todo.id}
                >
                  <span className="flex-none">✓</span>
                  <span className="line-through">{todo.description}</span>
                </p>
              ))}
              {doneTodos.map((todo) => (
                <p
                  className="flex items-center gap-2.5 py-1.5 text-sm opacity-50"
                  key={todo.id}
                >
                  <span className="flex-none">✓</span>
                  <span className="line-through">{todo.description}</span>
                  <span className="ml-auto text-xs">{todo.completedLabel}</span>
                </p>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export interface TimelineEntryView {
  eventId: string;
  dateLabel: string;
  summary: string;
  metaLabel: string;
  rawText: string | null;
  thumbnailUrl: string | null;
  analysis: {
    topic: string | null;
    advice: string | null;
    evidence: string | null;
  };
}

function hasAnalysis(entry: TimelineEntryView): boolean {
  return Boolean(
    entry.analysis.topic || entry.analysis.advice || entry.analysis.evidence,
  );
}

export function CustomerTimeline({
  entries,
}: {
  entries: TimelineEntryView[];
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(eventId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  if (entries.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--ink-soft)]">
        还没有确认过的沟通。从录入 → 待确认 → 确认入库后，这里会出现时间线。
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-col">
      {entries.map((entry) => {
        const expanded = expandedIds.has(entry.eventId);
        const expandable = hasAnalysis(entry) || Boolean(entry.rawText);
        return (
          <div
            className="flex gap-3 border-b border-dashed border-[var(--line-soft)] py-3 text-sm last:border-0"
            key={entry.eventId}
          >
            <span className="w-12 flex-none pt-0.5 font-(family-name:--font-numerals) text-xs text-[var(--ink-soft)]">
              {entry.dateLabel}
            </span>
            {entry.thumbnailUrl ? (
              <a
                className="block h-9 w-9 flex-none overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--paper-deep)]"
                href={entry.thumbnailUrl}
                rel="noreferrer"
                target="_blank"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="证据缩略图"
                  className="h-full w-full object-cover"
                  src={entry.thumbnailUrl}
                />
              </a>
            ) : (
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[var(--line-soft)] bg-[var(--paper-deep)] text-xs text-[var(--ink-soft)]">
                文
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="leading-6">{entry.summary}</p>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                {entry.metaLabel}
                {expandable ? (
                  <button
                    className="ml-2 font-bold text-[var(--tea)]"
                    onClick={() => toggle(entry.eventId)}
                    type="button"
                  >
                    {expanded ? "▾ 收起分析" : "▸ 展开 AI 分析"}
                  </button>
                ) : null}
              </p>
              {expanded ? (
                <div className="mt-2 rounded-xl border border-[var(--line-soft)] bg-[var(--paper)] p-3 text-[13px] leading-relaxed">
                  {entry.analysis.topic ? (
                    <span className="mb-1.5 inline-block rounded-full bg-[var(--ok-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--tea-deep)]">
                      {entry.analysis.topic}
                    </span>
                  ) : null}
                  {entry.analysis.evidence ? (
                    <p>{entry.analysis.evidence}</p>
                  ) : null}
                  {entry.analysis.advice ? (
                    <p>
                      <span className="text-[var(--ink-soft)]">跟进建议：</span>
                      {entry.analysis.advice}
                    </p>
                  ) : null}
                  {entry.rawText ? (
                    <p className="mt-2 border-t border-dashed border-[var(--line-soft)] pt-2 text-[var(--ink-soft)]">
                      原文：{entry.rawText}
                    </p>
                  ) : null}
                  {entry.thumbnailUrl ? (
                    <a
                      className="mt-2 block text-xs font-bold text-[var(--tea)]"
                      href={entry.thumbnailUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      ▸ 查看原始截图
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
