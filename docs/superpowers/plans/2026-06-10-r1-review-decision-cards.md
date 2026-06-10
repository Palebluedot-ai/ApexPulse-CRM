# R1 待确认页决策卡重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 /review 从"编辑表单海"重构成决策卡流：桌面折叠卡 + Y/E/S 键盘流 + 提取中骨架屏；手机聚焦模式一屏一卡 + 进度条。

**Architecture:** API 层（confirm/edit/skip/pending/vision-extract）零改动。纯前端重构：`review-client.tsx` 拆成 orchestrator + `DecisionCard` 组件，卡片展示逻辑抽成纯函数（vitest 可测）。设计 token 加进 `globals.css`（新增不删旧，避免波及其他页）。视觉规范见 `context/32_全站UI重设计_设计稿与实施计划.md` §3，交互稿 `mockups/review-redesign.html`。

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4（CSS 变量 token）, Vitest（纯函数测试，项目无组件测试库，组件靠 `pnpm check` + 手动验证）。

**关键背景（实现者必读）：**
- `ReviewQueueViewItem`（`src/server/review/review-page-model.ts:11`）是卡片数据源：`naturalFields`（customerName/companyName/sourceTag/needSummary/nextAction/nextFollowupAt 全 string）、`aiFields`（leadQuality/confidence 枚举等）、`attachments[].canPreviewInline/previewUrl`、`extractedFields.aiExtractionSource`（有值=AI 提取完成）。
- 红线：AI 只预填，人点"确认入库"才调 `/api/review/confirm`。
- 已有 4s 轮询 `/api/review/pending` 自动刷新提取结果——保留原逻辑。
- 表单技巧：editor 区域用 CSS `hidden` 折叠（非条件渲染），FormData 永远完整，折叠态点确认也能提交全部字段。
- 命令：`pnpm test`（vitest）、`pnpm check`（lint+types+tests 全绿才算过）、`pnpm dev`。

---

### Task 1: 设计 token + 字体

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: globals.css 追加 R1 token（不动旧变量）**

在 `:root` 块末尾（`--font-sans` 行后）追加：

```css
  /* R1 redesign tokens (context/32 §3) */
  --paper: #faf4e8;
  --paper-deep: #f3ead8;
  --card: #fffdf7;
  --ink: #1f1c17;
  --ink-soft: #6b6357;
  --line-soft: #e4d9c3;
  --tea: #2f5d50;
  --tea-deep: #234739;
  --persimmon: #d4622a;
  --gold: #b98a2f;
  --red-status: #c2452d;
  --ok-bg: #e9f2ec;
  --font-serif-display: "Noto Serif SC", "Iowan Old Style", serif;
  --font-numerals: "Fraunces", serif;
```

并在文件末尾追加 shimmer 动画：

```css
@keyframes shimmer {
  0% { opacity: 0.45; }
  50% { opacity: 1; }
  100% { opacity: 0.45; }
}
```

- [ ] **Step 2: layout.tsx 加 Google Fonts link**

`<html>` 内加 `<head>`（Next App Router 允许手写 head 标签放 link）：

```tsx
    <html lang="zh-HK">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,720&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
```

注：不用 next/font——CJK 字体 next/font 构建期全量下载过重，CDN link 跟 mockup 行为一致。Mac mini 内网部署时客户端可达 Google Fonts，失败也只是回退系统字体。

- [ ] **Step 3: 验证**

Run: `pnpm check`
Expected: 全绿（纯样式追加，124 tests 不受影响）

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(review): add R1 design tokens and display fonts"
```

---

### Task 2: 决策卡纯函数模型（TDD）

**Files:**
- Create: `src/app/review/decision-card-model.ts`
- Create: `src/app/review/decision-card-model.test.ts`

- [ ] **Step 1: 写失败测试**

`src/app/review/decision-card-model.test.ts` 全文：

```ts
import { describe, expect, it } from "vitest";
import type { ReviewQueueViewItem } from "@/server/review/review-page-model";
import {
  awaitingAutoExtraction,
  buildBindPrediction,
  buildCardTitle,
  buildDecisionKeyFields,
  buildHeatBadge,
} from "./decision-card-model";

function makeItem(
  overrides: Partial<ReviewQueueViewItem> = {},
): ReviewQueueViewItem {
  return {
    id: "evt-1",
    contentType: "image",
    sourceChannel: "manual_upload",
    rawText: null,
    summary: "默认摘要",
    isTestRecord: false,
    extractedFields: {},
    naturalFields: {
      customerName: "",
      companyName: "",
      sourceTag: "",
      needSummary: "",
      nextAction: "",
      nextFollowupAt: "",
    },
    aiFields: {
      phone: "",
      email: "",
      telegram: "",
      wechatAlias: "",
      leadQuality: "unknown",
      confidence: "unknown",
      actionRequired: false,
      evidenceNotes: "",
    },
    extractedFieldsText: "{}",
    capturedAt: "2026-06-10T08:00:00.000Z",
    attachments: [],
    ...overrides,
  };
}

describe("buildHeatBadge", () => {
  it("maps hot + high confidence to HOT · 高置信", () => {
    const item = makeItem();
    item.aiFields.leadQuality = "hot";
    item.aiFields.confidence = "high";
    expect(buildHeatBadge(item)).toEqual({
      label: "HOT · 高置信",
      tone: "hot",
    });
  });

  it("maps warm without confidence to WARM only", () => {
    const item = makeItem();
    item.aiFields.leadQuality = "warm";
    expect(buildHeatBadge(item)).toEqual({ label: "WARM", tone: "warm" });
  });

  it("maps unknown lead quality to 待判断 cold tone", () => {
    expect(buildHeatBadge(makeItem())).toEqual({
      label: "待判断",
      tone: "cold",
    });
  });

  it("maps not_a_lead to 非线索", () => {
    const item = makeItem();
    item.aiFields.leadQuality = "not_a_lead";
    expect(buildHeatBadge(item)).toEqual({ label: "非线索", tone: "cold" });
  });
});

describe("buildCardTitle", () => {
  it("prefers extracted customer name", () => {
    const item = makeItem();
    item.naturalFields.customerName = "Florian";
    expect(buildCardTitle(item)).toBe("Florian");
  });

  it("falls back to 未识别客户 when name missing", () => {
    expect(buildCardTitle(makeItem())).toBe("未识别客户");
  });
});

describe("buildDecisionKeyFields", () => {
  it("returns up to three non-empty fields in priority order", () => {
    const item = makeItem();
    item.naturalFields.needSummary = "offramp 10M USD/月";
    item.naturalFields.nextAction = "下周约开户";
    item.naturalFields.sourceTag = "HashKey 活动";
    item.naturalFields.nextFollowupAt = "2026-06-17";
    expect(buildDecisionKeyFields(item)).toEqual([
      { label: "需求", value: "offramp 10M USD/月" },
      { label: "下一步", value: "下周约开户" },
      { label: "来源", value: "HashKey 活动" },
    ]);
  });

  it("skips empty fields and keeps later ones", () => {
    const item = makeItem();
    item.naturalFields.nextAction = "发材料";
    item.naturalFields.nextFollowupAt = "2026-06-13";
    expect(buildDecisionKeyFields(item)).toEqual([
      { label: "下一步", value: "发材料" },
      { label: "跟进", value: "2026-06-13" },
    ]);
  });

  it("returns empty array when nothing extracted", () => {
    expect(buildDecisionKeyFields(makeItem())).toEqual([]);
  });
});

describe("buildBindPrediction", () => {
  const customers = [
    { id: "c-1", label: "刘总 · BVI 主体" },
    { id: "c-2", label: "陈总 · 矿机贸易" },
  ];

  it("describes binding to selected existing customer", () => {
    expect(buildBindPrediction(makeItem(), "c-1", customers)).toBe(
      "✓ 绑定已有客户 刘总 · BVI 主体",
    );
  });

  it("describes creating new customer with extracted name", () => {
    const item = makeItem();
    item.naturalFields.customerName = "Florian";
    expect(buildBindPrediction(item, "", customers)).toBe(
      "⊕ 将新建客户 Florian",
    );
  });

  it("falls back when no name extracted", () => {
    expect(buildBindPrediction(makeItem(), "", customers)).toBe(
      "⊕ 将新建客户（名称待确认）",
    );
  });
});

describe("awaitingAutoExtraction", () => {
  it("is true for raw text without extraction source", () => {
    const item = makeItem({ rawText: "今天认识了刘总" });
    expect(awaitingAutoExtraction(item)).toBe(true);
  });

  it("is true for previewable image without extraction source", () => {
    const item = makeItem({
      attachments: [
        {
          id: "att-1",
          fileName: "a.png",
          mimeType: "image/png",
          storageKey: "local/a.png",
          previewUrl: "/api/attachments/att-1",
          canPreviewInline: true,
          unavailableReason: null,
        },
      ],
    });
    expect(awaitingAutoExtraction(item)).toBe(true);
  });

  it("is false once aiExtractionSource is set", () => {
    const item = makeItem({
      rawText: "有内容",
      extractedFields: { aiExtractionSource: "text_api" },
    });
    expect(awaitingAutoExtraction(item)).toBe(false);
  });

  it("is false when there is nothing to extract", () => {
    expect(awaitingAutoExtraction(makeItem())).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/app/review/decision-card-model.test.ts`
Expected: FAIL — `Cannot find module './decision-card-model'`

- [ ] **Step 3: 实现**

`src/app/review/decision-card-model.ts` 全文：

```ts
import type {
  CustomerSelectOption,
  ReviewQueueViewItem,
} from "@/server/review/review-page-model";

export interface HeatBadge {
  label: string;
  tone: "hot" | "warm" | "cold";
}

const leadQualityBadges: Record<
  ReviewQueueViewItem["aiFields"]["leadQuality"],
  { label: string; tone: HeatBadge["tone"] }
> = {
  hot: { label: "HOT", tone: "hot" },
  warm: { label: "WARM", tone: "warm" },
  cold: { label: "COLD", tone: "cold" },
  not_a_lead: { label: "非线索", tone: "cold" },
  unknown: { label: "待判断", tone: "cold" },
};

const confidenceSuffixes: Record<
  ReviewQueueViewItem["aiFields"]["confidence"],
  string
> = {
  high: " · 高置信",
  medium: " · 中置信",
  low: " · 低置信",
  unknown: "",
};

export function buildHeatBadge(item: ReviewQueueViewItem): HeatBadge {
  const badge = leadQualityBadges[item.aiFields.leadQuality];
  return {
    label: `${badge.label}${confidenceSuffixes[item.aiFields.confidence]}`,
    tone: badge.tone,
  };
}

export function buildCardTitle(item: ReviewQueueViewItem): string {
  return item.naturalFields.customerName.trim() || "未识别客户";
}

export interface DecisionKeyField {
  label: string;
  value: string;
}

const keyFieldOrder = [
  { label: "需求", key: "needSummary" },
  { label: "下一步", key: "nextAction" },
  { label: "来源", key: "sourceTag" },
  { label: "跟进", key: "nextFollowupAt" },
] as const;

export function buildDecisionKeyFields(
  item: ReviewQueueViewItem,
): DecisionKeyField[] {
  return keyFieldOrder
    .map(({ label, key }) => ({
      label,
      value: item.naturalFields[key].trim(),
    }))
    .filter((field) => field.value)
    .slice(0, 3);
}

export function buildBindPrediction(
  item: ReviewQueueViewItem,
  selectedPartyId: string,
  customers: CustomerSelectOption[],
): string {
  if (selectedPartyId) {
    const customer = customers.find((option) => option.id === selectedPartyId);
    if (customer) return `✓ 绑定已有客户 ${customer.label}`;
  }

  const name = item.naturalFields.customerName.trim();
  return name ? `⊕ 将新建客户 ${name}` : "⊕ 将新建客户（名称待确认）";
}

export function awaitingAutoExtraction(item: ReviewQueueViewItem): boolean {
  if (item.extractedFields.aiExtractionSource) return false;
  return (
    Boolean(item.rawText?.trim()) ||
    item.attachments.some((attachment) => attachment.canPreviewInline)
  );
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/app/review/decision-card-model.test.ts`
Expected: PASS（15 tests）

- [ ] **Step 5: Commit**

```bash
git add src/app/review/decision-card-model.ts src/app/review/decision-card-model.test.ts
git commit -m "feat(review): add decision card pure model helpers"
```

---

### Task 3: DecisionCard 组件

**Files:**
- Create: `src/app/review/decision-card.tsx`

折叠态 7 元素：缩略图、客户名、热度 chip、摘要、≤3 关键字段、绑定预判、操作按钮。editor 区域 CSS `hidden` 折叠（FormData 始终完整）。提取中渲染骨架屏变体。

- [ ] **Step 1: 写组件**

`src/app/review/decision-card.tsx` 全文：

```tsx
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
```

- [ ] **Step 2: 验证编译**

Run: `pnpm check`
Expected: 全绿（组件尚未被引用，lint 不报 unused export）

- [ ] **Step 3: Commit**

```bash
git add src/app/review/decision-card.tsx
git commit -m "feat(review): add DecisionCard component with collapsed/editor/skeleton states"
```

---

### Task 4: 重写 review-client orchestrator（桌面卡流 + 手机聚焦 + 键盘 + 筛选折叠）

**Files:**
- Modify: `src/app/review/review-client.tsx`（整文件重写）

保留：4s 轮询、edit/skip/extractWithAi 处理器语义、filter 函数调用。
新增：expandedIds、doneCount 进度、Y/E/S 键盘、筛选折叠、手机 `lg:hidden` 聚焦模式。
删除：旧巨型表单 JSX、`hasAiSignal`、`awaitingAutoExtraction`（改从 model import）。

- [ ] **Step 1: 重写文件**

`src/app/review/review-client.tsx` 全文：

```tsx
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
      <p className="font-[var(--font-serif-display)] text-3xl font-bold text-[var(--tea-deep)]">
        队列已清空 ✓
      </p>
      <p className="mt-2 text-[var(--ink-soft)]">
        {doneCount > 0
          ? `本轮处理了 ${doneCount} 条。`
          : "没有待确认记录。"}{" "}
        <Link className="font-semibold text-[var(--tea)] underline" href="/capture">
          去录入
        </Link>
      </p>
    </section>
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-serif-display)] text-4xl font-bold tracking-[-0.02em]">
            待确认 <span className="text-[var(--tea)]">·</span> 轻审查
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            AI 已自动提取并预归类，扫一眼 → 确认。改和跳过是例外。
            <span className="ml-3 hidden lg:inline">
              <kbd className="rounded-md border border-[var(--line-soft)] bg-[var(--card)] px-1.5 font-[var(--font-numerals)]">
                Y
              </kbd>{" "}
              确认{" "}
              <kbd className="rounded-md border border-[var(--line-soft)] bg-[var(--card)] px-1.5 font-[var(--font-numerals)]">
                E
              </kbd>{" "}
              修改{" "}
              <kbd className="rounded-md border border-[var(--line-soft)] bg-[var(--card)] px-1.5 font-[var(--font-numerals)]">
                S
              </kbd>{" "}
              跳过
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--ink-soft)]"
            onClick={() => setShowFilters((current) => !current)}
            type="button"
          >
            ⚲ 筛选{showFilters ? " ▴" : ""}
          </button>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] px-4 py-2">
            <span className="font-[var(--font-numerals)] text-2xl font-bold text-[var(--persimmon)]">
              {visibleItems.length}
            </span>
            <span className="text-xs leading-tight text-[var(--ink-soft)]">
              条待确认
            </span>
          </div>
        </div>
      </header>

      {showFilters ? (
        <div className="mb-5 grid gap-3 rounded-2xl border border-[var(--line-soft)] bg-[var(--card)] p-4 lg:grid-cols-[1fr_11rem_11rem]">
          <input
            className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-white px-4 outline-none focus:border-[var(--tea)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索摘要、原始备注、附件名"
            value={query}
          />
          <select
            className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-white px-3 font-semibold outline-none focus:border-[var(--tea)]"
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
            className="min-h-11 rounded-xl border border-[var(--line-soft)] bg-white px-3 font-semibold outline-none focus:border-[var(--tea)]"
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
              <span className="font-[var(--font-numerals)] text-[var(--tea-deep)]">
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
```

- [ ] **Step 2: 编译 + 全量测试**

Run: `pnpm check`
Expected: 全绿。若 lint 报 `skip`/`toggleExpanded` 在 useEffect 前使用——函数声明有提升，function 声明不报；如报 react-hooks/exhaustive-deps，键盘 effect 故意无依赖数组（每次渲染重绑最新闭包），加 `// eslint-disable-next-line react-hooks/exhaustive-deps` 不需要（无 deps 数组不触发该规则）。

- [ ] **Step 3: 手动验证（dev server）**

```bash
pkill -f "next dev"; (pnpm dev > logs/dev.log 2>&1 &)
```

打开 http://localhost:3000/review，核对清单：
1. 卡片折叠态只有：缩略图/客户名/热度/摘要/≤3字段/绑定预判/三按钮。
2. 点"✎ 修改"展开完整表单，"收起"折回；折叠态直接点"✓ 确认入库"能成功入库（FormData 完整）。
3. 录入一条新文字备注 → 回到 /review 出现骨架屏卡（spinner + shimmer）→ ~10s 内自动变成完整决策卡（轮询生效）。
4. 键盘：不聚焦输入框时按 S → 队首卡跳过；按 E → 队首展开；按 Y → 队首确认入库。
5. 浏览器窗口缩到 <1024px：只显示一张卡 + 顶部进度条；确认后下一张自动顶上，进度条前进。
6. "⚲ 筛选"点开/收起正常，搜索和类型/范围筛选生效。
7. 清空队列后显示"队列已清空 ✓ 本轮处理了 N 条"。

- [ ] **Step 4: Commit**

```bash
git add src/app/review/review-client.tsx
git commit -m "feat(review): rebuild review page as decision card flow with focus mode and keyboard shortcuts"
```

---

### Task 5: 收尾——死代码清理 + 全量检查 + PR

**Files:**
- Verify: `src/server/review/review-page-model.ts`（`buildReviewQueueScopeSummary` 仍被 page/API 引用与否）

- [ ] **Step 1: 检查死代码**

Run: `grep -rn "buildReviewQueueScopeSummary\|hasAiSignal" src/`
Expected: `buildReviewQueueScopeSummary` 只剩 review-page-model.ts 定义 + 它的 test。决定：**保留**（有测试覆盖的导出模型函数，R2 首页可能复用；不在本 PR 删）。`hasAiSignal` 应无任何匹配（已随旧 client 删除）。

- [ ] **Step 2: 全量检查**

Run: `pnpm check`
Expected: 全绿，测试数 ≥ 139（124 + 15 新增）

- [ ] **Step 3: 开 PR + merge**

```bash
git push -u origin feat/r1-review-decision-cards
gh pr create --title "feat: R1 review page decision cards + mobile focus mode" --body "<按本计划改动摘要>"
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Self-Review 结果

- **Spec 覆盖**：context/32 §4③ 七要素折叠卡 ✓、修改才展开 ✓、Y/E/S ✓、提示只页头一次 ✓、骨架屏 ✓、手机聚焦+进度条+自动滑入 ✓、AI 只预填红线（沿用 confirm API）✓、重试按钮只在提取缺失时出现（骨架屏内"立即提取"）✓。绑定自动匹配是后置 AI 项，本计划用"新建/手选"预判文案，符合 §7 后置列表。
- **占位符扫描**：无 TBD/TODO；全部代码完整成文。
- **类型一致性**：`buildHeatBadge/buildCardTitle/buildDecisionKeyFields/buildBindPrediction/awaitingAutoExtraction` 签名在 Task 2 定义、Task 3/4 引用一致；`DecisionCardProps` 与 Task 4 `renderCard` 传参一致；`confirm-${item.id}` id 与键盘 effect 一致。
