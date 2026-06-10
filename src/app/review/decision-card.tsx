"use client";

import { useState, type FormEvent } from "react";
import type {
  CustomerSelectOption,
  ReviewQueueViewItem,
} from "@/server/review/review-page-model";
import {
  awaitingAutoExtraction,
  buildBindPrediction,
  buildCardTitle,
  buildDecisionKeyFields,
  buildHeatBadge,
} from "./decision-card-model";

const contentTypeLabels: Record<string, string> = {
  image: "截图",
  text: "文字",
  card_photo: "名片照片",
};

const heatToneClasses = {
  hot: "bg-[rgba(212,98,42,0.12)] text-[var(--persimmon)]",
  warm: "bg-[rgba(185,138,47,0.13)] text-[var(--gold)]",
  cold: "bg-[var(--paper-deep)] text-[var(--ink-soft)]",
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Thumbnail({ item }: { item: ReviewQueueViewItem }) {
  const preview = item.attachments.find(
    (attachment) => attachment.canPreviewInline && attachment.previewUrl,
  );

  if (preview?.previewUrl) {
    return (
      <a
        className="block h-[74px] w-[74px] flex-none overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--paper-deep)]"
        href={preview.previewUrl}
        rel="noreferrer"
        target="_blank"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`证据缩略图：${preview.fileName}`}
          className="h-full w-full object-cover"
          src={preview.previewUrl}
        />
      </a>
    );
  }

  return (
    <div className="flex h-[74px] w-[74px] flex-none items-center justify-center rounded-2xl border border-[var(--line-soft)] bg-[var(--paper-deep)] font-[var(--font-serif-display)] text-2xl text-[var(--ink-soft)]">
      文
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 outline-none focus:border-[var(--tea)]";
const textareaClass =
  "min-h-20 w-full rounded-xl border border-[var(--line-soft)] bg-white p-3 outline-none focus:border-[var(--tea)]";

export interface DecisionCardProps {
  item: ReviewQueueViewItem;
  customers: CustomerSelectOption[];
  expanded: boolean;
  extracting: boolean;
  message?: { tone: "success" | "error"; message: string };
  onToggleExpanded: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSkip: () => void;
  onRetryExtract: () => void;
}

export function DecisionCard({
  item,
  customers,
  expanded,
  extracting,
  message,
  onToggleExpanded,
  onSubmit,
  onSkip,
  onRetryExtract,
}: DecisionCardProps) {
  const [partyId, setPartyId] = useState("");

  if (awaitingAutoExtraction(item)) {
    return (
      <article className="rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
        <div className="flex gap-4">
          <Thumbnail item={item} />
          <div className="flex-1">
            <p className="font-[var(--font-serif-display)] text-lg font-semibold text-[var(--ink-soft)]">
              {contentTypeLabels[item.contentType] ?? item.contentType} ·{" "}
              {formatDate(item.capturedAt)}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--gold)]">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
              AI 正在提取，几秒后字段自动出现
            </p>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-3/4 rounded-full bg-[var(--paper-deep)] [animation:shimmer_1.6s_ease-in-out_infinite]" />
              <div className="h-3 w-1/2 rounded-full bg-[var(--paper-deep)] [animation:shimmer_1.6s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-[var(--paper-deep)] pt-3">
          <button
            className="rounded-full border border-[var(--tea)] bg-white px-4 py-2 text-sm font-semibold text-[var(--tea-deep)] disabled:opacity-60"
            disabled={extracting}
            onClick={onRetryExtract}
            type="button"
          >
            {extracting ? "提取中…" : "立即提取"}
          </button>
          <button
            className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--ink-soft)]"
            onClick={onSkip}
            type="button"
          >
            跳过
          </button>
        </div>
        {message ? <CardMessage message={message} /> : null}
      </article>
    );
  }

  const heat = buildHeatBadge(item);
  const keyFields = buildDecisionKeyFields(item);

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
      <form onSubmit={onSubmit}>
        <div className="flex gap-4 p-5 pb-3">
          <Thumbnail item={item} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-[var(--font-serif-display)] text-xl font-bold">
                {buildCardTitle(item)}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${heatToneClasses[heat.tone]}`}
              >
                {heat.label}
              </span>
              <span className="text-xs text-[var(--ink-soft)]">
                {contentTypeLabels[item.contentType] ?? item.contentType} ·{" "}
                {formatDate(item.capturedAt)}
                {item.isTestRecord ? " · 测试记录" : ""}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-6">{item.summary}</p>
            {keyFields.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {keyFields.map((field) => (
                  <span key={field.label}>
                    <span className="mr-1 text-[var(--ink-soft)]">
                      {field.label}
                    </span>
                    {field.value}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-dashed border-[rgba(47,93,80,0.35)] bg-[var(--ok-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--tea-deep)]"
              onClick={onToggleExpanded}
              type="button"
            >
              {buildBindPrediction(item, partyId, customers)}
              <span className="opacity-70">改 ▾</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-[var(--paper-deep)] px-5 py-3">
          <button
            className="rounded-full bg-[var(--tea)] px-5 py-2.5 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_18px_rgba(47,93,80,0.3)]"
            id={`confirm-${item.id}`}
            name="intent"
            type="submit"
            value="confirm"
          >
            ✓ 确认入库
          </button>
          <button
            className="rounded-full border border-[var(--line-soft)] bg-white px-5 py-2.5 text-sm font-bold"
            onClick={onToggleExpanded}
            type="button"
          >
            ✎ 修改
          </button>
          <button
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--ink-soft)]"
            onClick={onSkip}
            type="button"
          >
            跳过
          </button>
        </div>

        <div
          className={
            expanded
              ? "border-t border-dashed border-[var(--line-soft)] bg-[rgba(243,234,216,0.45)] p-5"
              : "hidden"
          }
        >
          <p className="text-sm font-semibold">修改字段（确认前 AI 只是预填）</p>
          <select
            className={`mt-3 ${inputClass}`}
            name="partyId"
            onChange={(event) => setPartyId(event.target.value)}
            value={partyId}
          >
            <option value="">新客户 / 暂不匹配现有客户</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
          <input
            className={`mt-3 ${inputClass}`}
            defaultValue={item.summary}
            name="summary"
            placeholder="这条沟通的可读摘要"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              className={inputClass}
              defaultValue={item.naturalFields.customerName}
              name="customerName"
              placeholder="客户名，例如 刘总"
            />
            <input
              className={inputClass}
              defaultValue={item.naturalFields.companyName}
              name="companyName"
              placeholder="公司，例如 Demo Capital"
            />
            <input
              className={inputClass}
              defaultValue={item.naturalFields.sourceTag}
              name="sourceTag"
              placeholder="来源，例如 Token2049"
            />
            <input
              className={inputClass}
              defaultValue={item.naturalFields.nextFollowupAt}
              name="nextFollowupAt"
              placeholder="下次跟进，例如 2026-06-17 09:00"
            />
          </div>
          <textarea
            className={`mt-3 ${textareaClass}`}
            defaultValue={item.naturalFields.needSummary}
            name="needSummary"
            placeholder="需求"
          />
          <textarea
            className={`mt-3 ${textareaClass}`}
            defaultValue={item.naturalFields.nextAction}
            name="nextAction"
            placeholder="下一步"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              className={inputClass}
              defaultValue={item.aiFields.phone}
              name="phone"
              placeholder="电话"
            />
            <input
              className={inputClass}
              defaultValue={item.aiFields.email}
              name="email"
              placeholder="邮箱"
            />
            <input
              className={inputClass}
              defaultValue={item.aiFields.telegram}
              name="telegram"
              placeholder="Telegram"
            />
            <input
              className={inputClass}
              defaultValue={item.aiFields.wechatAlias}
              name="wechatAlias"
              placeholder="微信号 / 微信备注"
            />
            <select
              className={inputClass}
              defaultValue={item.aiFields.leadQuality}
              name="leadQuality"
            >
              <option value="unknown">未判断</option>
              <option value="hot">高意向</option>
              <option value="warm">可跟进</option>
              <option value="cold">低意向</option>
              <option value="not_a_lead">非线索</option>
            </select>
            <select
              className={inputClass}
              defaultValue={item.aiFields.confidence}
              name="confidence"
            >
              <option value="unknown">置信度未知</option>
              <option value="high">高置信</option>
              <option value="medium">中置信</option>
              <option value="low">低置信</option>
            </select>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input
              defaultChecked={item.aiFields.actionRequired}
              name="actionRequired"
              type="checkbox"
            />
            需要我方继续动作
          </label>
          <textarea
            className={`mt-3 ${textareaClass}`}
            defaultValue={item.aiFields.evidenceNotes}
            name="evidenceNotes"
            placeholder="AI 判断依据"
          />
          <select className={`mt-3 ${inputClass}`} name="followupStatus">
            <option value="">默认：已跟进</option>
            <option value="up_to_date">已跟进</option>
            <option value="due_soon">即将跟进</option>
            <option value="overdue">已逾期</option>
            <option value="unknown">未分层</option>
          </select>
          {item.rawText ? (
            <p className="mt-3 rounded-xl border border-[var(--line-soft)] bg-white/70 p-3 text-sm leading-6 text-[var(--ink-soft)]">
              原文：{item.rawText}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full border border-[var(--line-soft)] bg-white px-4 py-2 text-sm font-semibold"
              name="intent"
              type="submit"
              value="edit"
            >
              只保存字段
            </button>
            <button
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--ink-soft)]"
              onClick={onToggleExpanded}
              type="button"
            >
              收起
            </button>
          </div>
        </div>
      </form>
      {message ? <CardMessage message={message} /> : null}
    </article>
  );
}

function CardMessage({
  message,
}: {
  message: { tone: "success" | "error"; message: string };
}) {
  return (
    <p
      className={
        message.tone === "error"
          ? "mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
          : "mx-5 mb-4 rounded-xl border border-[var(--line-soft)] bg-[var(--ok-bg)] p-3 text-sm font-semibold text-[var(--tea-deep)]"
      }
    >
      {message.message}
    </p>
  );
}
