"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type {
  CustomerSelectOption,
  ReviewQueueViewItem,
} from "@/server/review/review-page-model";
import {
  awaitingAutoExtraction,
  buildBindPrediction,
  buildCardTitle,
  buildDecisionKeyFields,
} from "./decision-card-model";

const contentTypeLabels: Record<string, string> = {
  image: "截图",
  text: "文字",
  card_photo: "名片照片",
};

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
    <div className="flex h-[74px] w-[74px] flex-none items-center justify-center rounded-2xl border border-[var(--line-soft)] bg-[var(--paper-deep)] font-(family-name:--font-serif-display) text-2xl text-[var(--ink-soft)]">
      文
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--line-soft)] bg-white px-3 outline-none focus:border-[var(--tea)]";
const textareaClass =
  "min-h-20 w-full rounded-xl border border-[var(--line-soft)] bg-white p-3 outline-none focus:border-[var(--tea)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

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
  const [partyQuery, setPartyQuery] = useState("");
  const matchedCustomer = customers.find(
    (option) => option.label === partyQuery,
  );
  const partyId = matchedCustomer?.id ?? "";

  if (awaitingAutoExtraction(item)) {
    return (
      <article className="rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] p-5 shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
        <div className="flex gap-4">
          <Thumbnail item={item} />
          <div className="flex-1">
            <p className="font-(family-name:--font-serif-display) text-lg font-semibold text-[var(--ink-soft)]">
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

  const keyFields = buildDecisionKeyFields(item);

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-[var(--line-soft)] bg-[var(--card)] shadow-[0_14px_40px_rgba(57,47,32,0.08)]">
      <form onSubmit={onSubmit}>
        <div className="flex gap-4 p-5 pb-3">
          <Thumbnail item={item} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-(family-name:--font-serif-display) text-xl font-bold">
                {buildCardTitle(item)}
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
            <p className="mt-2 text-xs font-semibold text-[var(--tea-deep)]">
              {buildBindPrediction(item, partyId, customers)}
            </p>
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
          {/* 热度/置信不在这里改（卡片 chip 已显示），隐藏字段保留原值防止确认时丢失 */}
          <input
            name="leadQuality"
            type="hidden"
            value={item.aiFields.leadQuality}
          />
          <input
            name="confidence"
            type="hidden"
            value={item.aiFields.confidence}
          />
          <input name="partyId" type="hidden" value={partyId} />
          <div className="mt-3">
            <Field label="绑定客户（输入名字搜索；留空 = 新建客户）">
              <input
                className={inputClass}
                list={`customers-${item.id}`}
                onChange={(event) => setPartyQuery(event.target.value)}
                placeholder="例如 刘总"
                value={partyQuery}
              />
            </Field>
            <datalist id={`customers-${item.id}`}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.label} />
              ))}
            </datalist>
          </div>
          <div className="mt-3">
            <Field label="摘要">
              <input
                className={inputClass}
                defaultValue={item.summary}
                name="summary"
                placeholder="这条沟通的可读摘要"
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="客户名">
              <input
                className={inputClass}
                defaultValue={item.naturalFields.customerName}
                name="customerName"
                placeholder="例如 刘总"
              />
            </Field>
            <Field label="公司">
              <input
                className={inputClass}
                defaultValue={item.naturalFields.companyName}
                name="companyName"
                placeholder="例如 Demo Capital"
              />
            </Field>
            <Field label="来源">
              <input
                className={inputClass}
                defaultValue={item.naturalFields.sourceTag}
                name="sourceTag"
                placeholder="例如 Token2049"
              />
            </Field>
            <Field label="下次跟进">
              <input
                className={inputClass}
                defaultValue={item.naturalFields.nextFollowupAt}
                name="nextFollowupAt"
                placeholder="例如 2026-06-17 09:00"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="需求">
              <textarea
                className={textareaClass}
                defaultValue={item.naturalFields.needSummary}
                name="needSummary"
                placeholder="例如 想了解 OTC 费率和出入金流程"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="下一步">
              <textarea
                className={textareaClass}
                defaultValue={item.naturalFields.nextAction}
                name="nextAction"
                placeholder="例如 下周发报价并约一次电话"
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="电话">
              <input
                className={inputClass}
                defaultValue={item.aiFields.phone}
                name="phone"
              />
            </Field>
            <Field label="邮箱">
              <input
                className={inputClass}
                defaultValue={item.aiFields.email}
                name="email"
              />
            </Field>
            <Field label="Telegram">
              <input
                className={inputClass}
                defaultValue={item.aiFields.telegram}
                name="telegram"
              />
            </Field>
            <Field label="微信号 / 微信备注">
              <input
                className={inputClass}
                defaultValue={item.aiFields.wechatAlias}
                name="wechatAlias"
              />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input
              defaultChecked={item.aiFields.actionRequired}
              name="actionRequired"
              type="checkbox"
            />
            需要我方继续动作
          </label>
          <div className="mt-3">
            <Field label="AI 判断依据">
              <textarea
                className={textareaClass}
                defaultValue={item.aiFields.evidenceNotes}
                name="evidenceNotes"
              />
            </Field>
          </div>
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
