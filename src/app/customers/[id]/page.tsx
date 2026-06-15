import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createDb } from "@/server/db";
import {
  getCustomerFirstScreen,
  listCustomerTimeline,
} from "@/server/customers/customer-dashboard";
import {
  buildReviewAiFields,
  buildReviewNaturalFields,
} from "@/lib/review-form";
import { classifyTaskUrgency } from "@/lib/task-grouping";
import {
  CustomerTimeline,
  CustomerTodos,
  type DoneTodoView,
  type TimelineEntryView,
  type TodoView,
} from "./detail-client";

export const dynamic = "force-dynamic";

const contentTypeLabels: Record<string, string> = {
  image: "截图",
  text: "文字备注",
  card_photo: "名片照片",
};

const alertStyles = {
  overdue:
    "border-[rgba(194,69,45,0.3)] bg-[rgba(194,69,45,0.06)] text-[var(--red-status)]",
  due_soon:
    "border-[rgba(185,138,47,0.35)] bg-[rgba(185,138,47,0.08)] text-[var(--gold)]",
  missing:
    "border-[var(--line-soft)] bg-[var(--paper-deep)] text-[var(--ink-soft)]",
  healthy: "border-[rgba(47,93,80,0.3)] bg-[var(--ok-bg)] text-[var(--tea-deep)]",
};

function formatDateTime(date: Date | null): string {
  if (!date) return "未设置";
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("zh-HK", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client, db } = createDb();

  try {
    const currentUser = await requireCurrentUser(db);
    const [firstScreen, timeline] = await Promise.all([
      getCustomerFirstScreen(db, id, currentUser.id),
      listCustomerTimeline(db, id, currentUser.id),
    ]);
    if (!firstScreen) notFound();

    const { actionPanel, customer, morningBrief, openTasks, recentDoneTasks } =
      firstScreen;
    const now = new Date();

    const timelineViews: TimelineEntryView[] = timeline.map((entry) => {
      const naturalFields = buildReviewNaturalFields(entry.extractedFields);
      const aiFields = buildReviewAiFields(entry.extractedFields);
      const happenedAt = entry.occurredAt ?? entry.capturedAt;
      return {
        eventId: entry.eventId,
        dateLabel: formatDay(happenedAt),
        summary: entry.summary,
        metaLabel: `${contentTypeLabels[entry.contentType] ?? entry.contentType} · ${formatDateTime(happenedAt)}`,
        rawText: entry.rawText,
        thumbnailUrl:
          entry.attachments.find((attachment) => attachment.previewUrl)
            ?.previewUrl ?? null,
        analysis: {
          topic: naturalFields.needSummary || null,
          advice: naturalFields.nextAction || null,
          evidence: aiFields.evidenceNotes || null,
        },
      };
    });

    const todoViews: TodoView[] = openTasks.map((task) => ({
      id: task.id,
      description: task.description,
      dueLabel: task.dueAt ? formatDateTime(task.dueAt) : null,
      overdue: classifyTaskUrgency(task.dueAt, now) === "overdue",
    }));
    const doneTodoViews: DoneTodoView[] = recentDoneTasks.map((task) => ({
      id: task.id,
      description: task.description,
      completedLabel: task.completedAt ? formatDay(task.completedAt) : "",
    }));

    const card =
      "rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 shadow-[0_14px_40px_rgba(57,47,32,0.08)]";

    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8">
        <Link
          className="text-sm font-semibold text-[var(--ink-soft)] hover:text-[var(--tea)]"
          href="/customers"
        >
          ← 返回客户
        </Link>

        <header className="mt-3">
          <h1 className="font-(family-name:--font-serif-display) text-3xl font-bold sm:text-4xl">
            {customer.displayName}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            {customer.companyName ?? "未记录公司"}
            {customer.referralSourceTag
              ? ` · ${customer.referralSourceTag}`
              : " · 未记录来源"}
            {customer.statusLabel ? ` · ${customer.statusLabel}` : ""}
          </p>
        </header>

        <div
          className={`mt-4 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-3.5 ${alertStyles[actionPanel.urgency]}`}
        >
          <div className="min-w-0 flex-1">
            <p className="font-(family-name:--font-serif-display) text-[17px] font-bold">
              {actionPanel.headline}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              {actionPanel.nextTask
                ? actionPanel.nextTask.description
                : actionPanel.reason}
              {actionPanel.nextFollowupAt
                ? ` · 下次跟进 ${formatDateTime(actionPanel.nextFollowupAt)}`
                : ""}
            </p>
          </div>
          <Link
            className="rounded-full bg-[var(--tea)] px-5 py-2.5 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_16px_rgba(47,93,80,0.28)]"
            href="/tasks"
          >
            {actionPanel.primaryActionLabel}
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className={card}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">沟通时间线</h2>
              <span className="rounded-full border border-[var(--line-soft)] px-2.5 py-0.5 text-xs text-[var(--ink-soft)]">
                {timelineViews.length} 条
              </span>
            </div>
            <CustomerTimeline entries={timelineViews} />
          </section>

          <div className="flex flex-col gap-4">
            <CustomerTodos doneTodos={doneTodoViews} openTodos={todoViews} />

            <section className="rounded-[1.4rem] border border-[var(--line-soft)] bg-gradient-to-r from-[#fff8ea] to-[#fdf2dd] p-5 text-[13px] leading-relaxed shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
              <p className="font-bold text-[var(--tea-deep)]">Morning Brief</p>
              <ul className="mt-2 space-y-1.5">
                {morningBrief.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>

            {customer.profileSummary || customer.tags.length > 0 ? (
              <section className={card}>
                {customer.profileSummary ? (
                  <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
                    {customer.profileSummary}
                  </p>
                ) : null}
                {customer.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {customer.tags.map((tag) => (
                      <span
                        className="rounded-full border border-[var(--line-soft)] bg-[var(--paper)] px-2.5 py-0.5 text-xs text-[var(--ink-soft)]"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      </main>
    );
  } finally {
    await client.end();
  }
}
