"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";

type VariantId = "plus" | "stack" | "concierge";

interface PreviewState {
  variant: VariantId;
  url: string;
  name: string;
}

const variants = [
  {
    id: "plus" as const,
    name: "A. 极简加号",
    intent: "16:9 证据投入口，首屏只有一个明确上传动作。",
  },
  {
    id: "stack" as const,
    name: "B. 连续上传",
    intent: "适合展会后一次补多张截图，强调队列和节奏。",
  },
  {
    id: "concierge" as const,
    name: "C. 证据入口",
    intent: "更像一个销售助理入口，解释更充分，但信息也更多。",
  },
];

export function CaptureLabClient() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [activeVariant, setActiveVariant] = useState<VariantId>("plus");
  const plusInputRef = useRef<HTMLInputElement>(null);
  const stackInputRef = useRef<HTMLInputElement>(null);
  const conciergeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function pickFile(variant: VariantId) {
    if (variant === "plus") plusInputRef.current?.click();
    if (variant === "stack") stackInputRef.current?.click();
    if (variant === "concierge") conciergeInputRef.current?.click();
  }

  function handleFile(variant: VariantId, file: File | null) {
    if (preview) URL.revokeObjectURL(preview.url);

    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }

    setActiveVariant(variant);
    setPreview({
      variant,
      url: URL.createObjectURL(file),
      name: file.name,
    });
  }

  function previewFor(variant: VariantId) {
    return preview?.variant === variant ? preview : null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-7 rounded-[2rem] border border-[var(--line-soft)] bg-[rgba(255,253,247,0.86)] p-6 shadow-[0_24px_80px_rgba(31,28,23,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--tea)]">
              Capture Lab
            </p>
            <h1 className="mt-3 font-(family-name:--font-serif-display) text-3xl font-black text-[var(--ink)] sm:text-5xl">
              上传入口临时设计板
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ink-soft)]">
              这个页面只用于选方向：可以本地预览图片，但不会上传、不会写数据库、不会进入待确认队列。
            </p>
          </div>
          <Link
            className="inline-flex w-fit rounded-full border border-[var(--line-soft)] bg-white px-5 py-3 text-sm font-bold text-[var(--tea-deep)]"
            href="/capture"
          >
            回到正式录入页
          </Link>
        </div>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {variants.map((variant) => (
          <button
            className={
              activeVariant === variant.id
                ? "rounded-[1.4rem] border border-[var(--tea)] bg-[var(--ok-bg)] p-4 text-left shadow-[0_14px_36px_rgba(56,112,95,0.16)]"
                : "rounded-[1.4rem] border border-[var(--line-soft)] bg-white/70 p-4 text-left"
            }
            key={variant.id}
            onClick={() => setActiveVariant(variant.id)}
            type="button"
          >
            <span className="block text-base font-black text-[var(--ink)]">
              {variant.name}
            </span>
            <span className="mt-1 block text-sm leading-6 text-[var(--ink-soft)]">
              {variant.intent}
            </span>
          </button>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <PlusVariant
          inputRef={plusInputRef}
          onFile={(file) => handleFile("plus", file)}
          onPick={() => pickFile("plus")}
          preview={previewFor("plus")}
        />
        <StackVariant
          inputRef={stackInputRef}
          onFile={(file) => handleFile("stack", file)}
          onPick={() => pickFile("stack")}
          preview={previewFor("stack")}
        />
        <ConciergeVariant
          inputRef={conciergeInputRef}
          onFile={(file) => handleFile("concierge", file)}
          onPick={() => pickFile("concierge")}
          preview={previewFor("concierge")}
        />
      </section>
    </main>
  );
}

function HiddenImageInput({
  inputRef,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
}) {
  return (
    <input
      accept="image/*"
      className="sr-only"
      onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      ref={inputRef}
      type="file"
    />
  );
}

function ImagePreview({ preview }: { preview: PreviewState | null }) {
  if (!preview) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-[var(--line-soft)] bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`本地预览：${preview.name}`}
        className="max-h-64 w-full object-contain"
        src={preview.url}
      />
      <p className="border-t border-[var(--line-soft)] px-4 py-3 text-sm font-bold text-[var(--ink-soft)]">
        本地预览：{preview.name}
      </p>
    </div>
  );
}

function PlusVariant({
  inputRef,
  onFile,
  onPick,
  preview,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
  onPick: () => void;
  preview: PreviewState | null;
}) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-[rgba(56,112,95,0.18)] bg-[linear-gradient(180deg,#fffdf7_0%,#f6efe2_100%)] p-5 shadow-[0_26px_80px_rgba(31,28,23,0.12)]">
      <HiddenImageInput inputRef={inputRef} onFile={onFile} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--tea)]">方案 A</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">
            证据投入口
          </h2>
        </div>
        <span className="rounded-full border border-[rgba(56,112,95,0.18)] bg-white/65 px-3 py-1 text-xs font-black text-[var(--tea-deep)]">
          16:9
        </span>
      </div>
      <p className="mt-3 max-w-72 text-sm leading-6 text-[var(--ink-soft)]">
        上传一张截图，AI 先整理，你确认后入库。
      </p>
      <button
        aria-label="上传一张截图"
        className="group relative mt-6 aspect-video w-full overflow-hidden rounded-[2rem] border border-[rgba(56,112,95,0.2)] bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.96)_0%,rgba(242,247,239,0.94)_36%,rgba(221,235,224,0.92)_100%)] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_22px_60px_rgba(56,112,95,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_28px_72px_rgba(56,112,95,0.22)]"
        onClick={onPick}
        type="button"
      >
        <span className="pointer-events-none absolute inset-x-7 top-5 h-px bg-[linear-gradient(90deg,transparent,rgba(56,112,95,0.24),transparent)]" />
        <span className="pointer-events-none absolute -left-12 top-8 size-28 rounded-full bg-[rgba(201,145,92,0.12)] blur-2xl" />
        <span className="pointer-events-none absolute -right-10 bottom-2 size-32 rounded-full bg-[rgba(56,112,95,0.16)] blur-2xl" />
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),transparent_46%,rgba(56,112,95,0.08))]" />

        <span className="relative flex h-full flex-col items-center justify-center">
          <span className="relative flex size-24 items-center justify-center rounded-full bg-[linear-gradient(145deg,#1f4f43,#3f8a71)] shadow-[0_18px_42px_rgba(31,79,67,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] transition duration-300 group-hover:scale-[1.04]">
            <span className="absolute inset-[-0.55rem] rounded-full border border-[rgba(56,112,95,0.16)]" />
            <span className="absolute h-12 w-1 rounded-full bg-[#fffdf7]" />
            <span className="absolute h-1 w-12 rounded-full bg-[#fffdf7]" />
          </span>
          <span className="mt-5 text-xl font-black text-[var(--ink)]">
            上传截图
          </span>
          <span className="mt-2 max-w-56 text-sm leading-6 text-[var(--ink-soft)]">
            微信聊天、名片、展会线索都可以先丢进来
          </span>
        </span>
      </button>
      <ImagePreview preview={preview} />
      {preview ? (
        <div className="mt-4 space-y-3">
          <textarea
            className="min-h-24 w-full rounded-[1.3rem] border border-[rgba(56,112,95,0.18)] bg-white/82 p-4 text-sm leading-6 outline-none focus:border-[var(--tea)]"
            placeholder="可选备注：这张截图是什么场景？"
          />
          <button
            className="min-h-11 w-full rounded-full bg-[var(--tea)] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(56,112,95,0.22)]"
            type="button"
          >
            上传到待确认
          </button>
        </div>
      ) : null}
    </article>
  );
}

function StackVariant({
  inputRef,
  onFile,
  onPick,
  preview,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
  onPick: () => void;
  preview: PreviewState | null;
}) {
  return (
    <article className="rounded-[2rem] border border-[var(--line-soft)] bg-[#11100e] p-5 text-[#fffaf0] shadow-[0_24px_70px_rgba(17,16,14,0.24)]">
      <HiddenImageInput inputRef={inputRef} onFile={onFile} />
      <p className="text-sm font-bold text-[#c9b68f]">方案 B</p>
      <h2 className="mt-2 text-2xl font-black">连续补截图</h2>
      <p className="mt-2 text-sm leading-6 text-[#c9c0ae]">
        适合一次整理多段微信记录。每张图进入一条待确认。
      </p>
      <button
        className="mt-6 w-full rounded-[1.8rem] border border-[#3f3b33] bg-[#1c1a17] p-4 text-left"
        onClick={onPick}
        type="button"
      >
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#fffaf0] text-4xl font-light text-[#11100e]">
            +
          </span>
          <span>
            <span className="block text-lg font-black">加入一张截图</span>
            <span className="mt-1 block text-sm leading-6 text-[#c9c0ae]">
              选完可以继续加下一张，也可以去待确认页处理
            </span>
          </span>
        </div>
      </button>
      <div className="mt-4 rounded-[1.5rem] border border-[#3f3b33] bg-[#191815] p-4">
        <p className="text-sm font-black text-[#fffaf0]">本轮队列</p>
        <div className="mt-3 grid gap-2">
          {preview ? (
            <div className="rounded-2xl bg-[#27231d] p-3 text-sm text-[#fffaf0]">
              1. {preview.name}
              <span className="mt-1 block text-[#c9c0ae]">
                等待上传到待确认
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#4b463d] p-3 text-sm text-[#c9c0ae]">
              还没有图片。点上方加号开始。
            </div>
          )}
        </div>
      </div>
      <ImagePreview preview={preview} />
      {preview ? (
        <button
          className="mt-4 min-h-11 w-full rounded-full bg-[#fffaf0] px-5 text-sm font-black text-[#11100e]"
          type="button"
        >
          上传本轮截图
        </button>
      ) : null}
    </article>
  );
}

function ConciergeVariant({
  inputRef,
  onFile,
  onPick,
  preview,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
  onPick: () => void;
  preview: PreviewState | null;
}) {
  return (
    <article className="rounded-[2rem] border border-[var(--line-soft)] bg-[linear-gradient(180deg,#fffdf7,#f2ead9)] p-5 shadow-[0_24px_70px_rgba(31,28,23,0.1)]">
      <HiddenImageInput inputRef={inputRef} onFile={onFile} />
      <p className="text-sm font-bold text-[var(--persimmon-deep)]">方案 C</p>
      <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">
        交给销售助理
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
        把聊天证据交给系统，它先整理线索，你只负责确认。
      </p>
      <div className="mt-6 rounded-[1.8rem] border border-[var(--line-soft)] bg-white/82 p-4">
        <div className="flex gap-3">
          <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--persimmon)] text-xl font-light text-white">
            +
          </span>
          <div>
            <h3 className="text-lg font-black text-[var(--ink)]">
              添加一份客户证据
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
              最推荐上传微信截图。没有截图时，也可以后续用文字补录。
            </p>
          </div>
        </div>
        <button
          className="mt-5 min-h-11 w-full rounded-full bg-[var(--persimmon)] px-5 text-sm font-black text-white"
          onClick={onPick}
          type="button"
        >
          选择截图
        </button>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-[var(--ink-soft)]">
        <p className="rounded-2xl bg-white/72 px-4 py-3">
          1. AI 提取客户、公司、需求和下一步
        </p>
        <p className="rounded-2xl bg-white/72 px-4 py-3">
          2. 你确认后才写入 CRM
        </p>
        <p className="rounded-2xl bg-white/72 px-4 py-3">
          3. 系统自动生成跟进任务
        </p>
      </div>
      <ImagePreview preview={preview} />
      {preview ? (
        <button
          className="mt-4 min-h-11 w-full rounded-full bg-[var(--ink)] px-5 text-sm font-black text-white"
          type="button"
        >
          让 AI 先整理
        </button>
      ) : null}
    </article>
  );
}
