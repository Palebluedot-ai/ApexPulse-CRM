"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";

interface PreviewState {
  url: string;
  name: string;
}

export function CaptureLabClient() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function handleFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview.url);

    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }

    setPreview({
      url: URL.createObjectURL(file),
      name: file.name,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-[rgba(31,28,23,0.08)] bg-[rgba(255,253,247,0.88)] p-6 shadow-[0_28px_90px_rgba(31,28,23,0.08)] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--tea)]">
            Capture Lab
          </p>
          <h1 className="mt-3 font-(family-name:--font-serif-display) text-3xl font-black leading-none text-[var(--ink)] sm:text-5xl">
            上传客户截图
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
            先把入口收干净：一张图，一个动作。这里仍然只做本地预览，不写入 CRM。
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-[rgba(31,28,23,0.1)] bg-white px-5 text-sm font-black text-[var(--tea-deep)] shadow-[0_10px_28px_rgba(31,28,23,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(56,112,95,0.3)]"
          href="/capture"
        >
          回到正式录入页
        </Link>
      </header>

      <section className="mx-auto w-full max-w-2xl">
        <article className="overflow-hidden rounded-[2rem] border border-[rgba(31,28,23,0.08)] bg-[#fffdf8] p-5 shadow-[0_30px_90px_rgba(31,28,23,0.12)] sm:p-6">
          <HiddenImageInput inputRef={inputRef} onFile={handleFile} />

          <button
            aria-label="选择一张客户截图"
            className="group flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[1.75rem] border border-[rgba(31,28,23,0.08)] bg-[linear-gradient(180deg,#fffefa_0%,#f5f1e7_100%)] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(56,112,95,0.26)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_24px_70px_rgba(56,112,95,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tea)] sm:aspect-video"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <span className="relative flex size-24 items-center justify-center rounded-full bg-[#315f52] shadow-[0_18px_44px_rgba(49,95,82,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] transition duration-300 group-hover:scale-[1.03] sm:size-28">
              <span className="absolute h-10 w-[3px] rounded-full bg-[#fffdf8] sm:h-12" />
              <span className="absolute h-[3px] w-10 rounded-full bg-[#fffdf8] sm:w-12" />
            </span>
            <span className="mt-6 text-2xl font-black text-[var(--ink)]">
              选择截图
            </span>
            <span className="mt-2 max-w-xs text-sm leading-6 text-[var(--ink-soft)]">
              微信聊天、名片、展会线索都可以先放进来。
            </span>
          </button>

          <ImagePreview preview={preview} />

          {preview ? (
            <div className="mt-5 space-y-3">
              <textarea
                className="min-h-24 w-full rounded-[1.35rem] border border-[rgba(31,28,23,0.1)] bg-white p-4 text-base leading-7 text-[var(--ink)] outline-none transition focus:border-[var(--tea)] focus:ring-4 focus:ring-[rgba(56,112,95,0.12)]"
                placeholder="可选备注：这张截图对应哪个客户、哪次沟通？"
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <p className="rounded-[1.25rem] bg-[rgba(56,112,95,0.08)] px-4 py-3 text-sm leading-6 text-[var(--tea-deep)]">
                  预览没问题后，去正式录入页上传并进入待确认。
                </p>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--tea)] px-6 text-sm font-black text-white shadow-[0_16px_36px_rgba(56,112,95,0.24)] transition duration-200 hover:-translate-y-0.5"
                  href="/capture"
                >
                  进入正式录入页
                </Link>
              </div>
            </div>
          ) : null}
        </article>
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
      onChange={(event) => {
        onFile(event.target.files?.[0] ?? null);
        event.target.value = "";
      }}
      ref={inputRef}
      type="file"
    />
  );
}

function ImagePreview({ preview }: { preview: PreviewState | null }) {
  if (!preview) return null;

  return (
    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[rgba(31,28,23,0.1)] bg-white shadow-[0_18px_54px_rgba(31,28,23,0.08)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`本地预览：${preview.name}`}
        className="max-h-[26rem] w-full object-contain"
        src={preview.url}
      />
      <p className="border-t border-[rgba(31,28,23,0.08)] px-4 py-3 text-sm font-bold text-[var(--ink-soft)]">
        本地预览：{preview.name}
      </p>
    </div>
  );
}
