"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  appendImageUploadResult,
  buildImageUploadSuccessMessage,
  type ImageUploadResult,
} from "@/lib/capture-feedback";

type SubmissionState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "提交失败",
    );
  }

  return payload;
}

export function CaptureClient() {
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [imageUploadResults, setImageUploadResults] = useState<
    ImageUploadResult[]
  >([]);
  const [textState, setTextState] = useState<SubmissionState>({
    status: "idle",
    message: "文字备注会保存为 pending review 事件。",
  });
  const [imageState, setImageState] = useState<SubmissionState>({
    status: "idle",
    message: "图片会保存到本机 data/attachments/，并进入待确认队列。",
  });

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview.url);
      }
    };
  }, [selectedImagePreview]);

  async function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const result = await postJson("/api/capture/text", {
        rawText: String(form.get("rawText") ?? ""),
      });
      setTextState({
        status: "success",
        message: `已创建待确认事件：${String(result.id)}`,
      });
      formElement.reset();
    } catch (error) {
      setTextState({
        status: "error",
        message: error instanceof Error ? error.message : "提交失败",
      });
    }
  }

  async function submitImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const imageFile = form.get("imageFile");

    if (!(imageFile instanceof File) || !imageFile.name) {
      setImageState({
        status: "error",
        message: "请先选择一张截图或名片照片。",
      });
      return;
    }

    if (!imageFile.type.startsWith("image/")) {
      setImageState({
        status: "error",
        message: "当前只支持图片文件。",
      });
      return;
    }

    try {
      const response = await fetch("/api/capture/image", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string" ? result.error : "提交失败",
        );
      }

      const eventId = String(result.eventId);
      const uploadedCount = imageUploadResults.length + 1;
      setImageUploadResults((current) =>
        appendImageUploadResult(current, {
          eventId,
          fileName: imageFile.name,
        }),
      );
      setImageState({
        status: "success",
        message: buildImageUploadSuccessMessage({
          eventId,
          uploadedCount,
        }),
      });
      setSelectedImagePreview(null);
      formElement.reset();
    } catch (error) {
      setImageState({
        status: "error",
        message: error instanceof Error ? error.message : "提交失败",
      });
    }
  }

  function continueUploadingImage() {
    setImageState({
      status: "idle",
      message: "继续选择下一张截图。每张图片都会单独进入待确认队列。",
    });
    imageFileInputRef.current?.click();
  }

  function selectImagePreview(file: File | null) {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview.url);
    }

    if (!file || !file.type.startsWith("image/")) {
      setSelectedImagePreview(null);
      return;
    }

    setSelectedImagePreview({
      url: URL.createObjectURL(file),
      name: file.name,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-(family-name:--font-serif-display) text-3xl font-bold sm:text-4xl">
            录入
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
            截图和文字备注提交后 AI 自动提取，去待确认页轻审查入库。
          </p>
        </div>
        <Link
          className="w-fit rounded-full border border-[var(--line-soft)] bg-[var(--card)] px-5 py-3 text-sm font-bold text-[var(--tea-deep)]"
          href="/review"
        >
          去待确认
        </Link>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <form
          className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]"
          onSubmit={submitText}
        >
          <h2 className="text-2xl font-semibold">文字备注</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            用于记录展会补录、Telegram/WhatsApp 摘要、电话后的手动备注。
          </p>
          <textarea
            className="mt-5 min-h-52 w-full rounded-2xl border border-[var(--line)] bg-white/65 p-4 text-base leading-7 outline-none focus:border-[var(--accent)]"
            name="rawText"
            placeholder="例如：今天在 Token2049 认识刘总，他想下周了解 OTC 出入金流程。"
            required
          />
          <button
            className="mt-4 rounded-full bg-[var(--tea)] px-5 py-3 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_16px_rgba(47,93,80,0.28)]"
            type="submit"
          >
            保存为待确认
          </button>
          <p
            className={
              textState.status === "error"
                ? "mt-4 text-sm font-semibold text-red-700"
                : "mt-4 text-sm font-semibold text-[var(--accent-strong)]"
            }
          >
            {textState.message}
          </p>
        </form>

        <form
          className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,250,240,0.82)] p-6 shadow-[0_24px_80px_rgba(25,23,20,0.1)]"
          onSubmit={submitImage}
        >
          <h2 className="text-2xl font-semibold">上传截图 / 名片照片</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            当前已经是真实本地上传：图片会保存到本机项目的 data/attachments/，系统会保留文件记录并送入待确认队列。一张图对应一条待确认记录，避免批量误入库。
          </p>
          <div className="mt-5 grid gap-3">
            <label className="rounded-2xl border border-dashed border-[var(--accent)] bg-white/65 p-5">
              <span className="block text-sm font-semibold text-[var(--accent-strong)]">
                选择图片
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                当前支持截图和名片照片。先不接 OCR，下一步在 Review 里人工确认字段。
              </span>
              <input
                accept="image/*"
                className="mt-4 w-full text-sm"
                name="imageFile"
                onChange={(event) =>
                  selectImagePreview(event.target.files?.[0] ?? null)
                }
                ref={imageFileInputRef}
                required
                type="file"
              />
            </label>
            {selectedImagePreview ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/65">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`待上传预览：${selectedImagePreview.name}`}
                  className="max-h-80 w-full object-contain"
                  src={selectedImagePreview.url}
                />
                <p className="border-t border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--muted)]">
                  已选择：{selectedImagePreview.name}
                </p>
              </div>
            ) : null}
            <textarea
              className="min-h-28 rounded-2xl border border-[var(--line)] bg-white/65 p-4 leading-7 outline-none focus:border-[var(--accent)]"
              name="note"
              placeholder="补充备注：这张截图是什么、跟谁有关、下一步是什么"
            />
          </div>
          <button
            className="mt-4 rounded-full bg-[var(--tea)] px-5 py-3 text-sm font-bold text-[#fdfbf4] shadow-[0_6px_16px_rgba(47,93,80,0.28)]"
            type="submit"
          >
            保存图片证据
          </button>
          <p
            className={
              imageState.status === "error"
                ? "mt-4 text-sm font-semibold text-red-700"
                : "mt-4 text-sm font-semibold text-[var(--accent-strong)]"
            }
          >
            {imageState.message}
          </p>
          {imageState.status === "success" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
                onClick={continueUploadingImage}
                type="button"
              >
                继续上传下一张
              </button>
              <Link
                className="inline-flex rounded-full bg-[var(--tea)] px-4 py-2 text-sm font-bold text-[#fdfbf4]"
                href="/review"
              >
                去待确认处理
              </Link>
            </div>
          ) : null}
          {imageUploadResults.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white/55 p-4">
              <p className="text-sm font-semibold text-[var(--accent-strong)]">
                本轮已送入待确认 {imageUploadResults.length} 张
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {imageUploadResults.map((item, index) => (
                  <li
                    className="rounded-xl border border-[var(--line)] bg-white/60 px-3 py-2"
                    key={item.eventId}
                  >
                    第 {index + 1} 张：{item.fileName}
                    <span className="mt-1 block break-all text-xs">
                      待确认事件：{item.eventId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
