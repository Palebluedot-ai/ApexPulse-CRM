"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

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
  const [textState, setTextState] = useState<SubmissionState>({
    status: "idle",
    message: "文字备注会保存为 pending review 事件。",
  });
  const [imageState, setImageState] = useState<SubmissionState>({
    status: "idle",
    message: "当前是本地占位上传：文件不会真正上传，只会保存文件名和备注到待确认队列。",
  });

  async function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const result = await postJson("/api/capture/text", {
        rawText: String(form.get("rawText") ?? ""),
      });
      setTextState({
        status: "success",
        message: `已创建待确认事件：${String(result.id)}`,
      });
      event.currentTarget.reset();
    } catch (error) {
      setTextState({
        status: "error",
        message: error instanceof Error ? error.message : "提交失败",
      });
    }
  }

  async function submitImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      const result = await postJson("/api/capture/image", {
        storageKey: `local-placeholder/${Date.now()}-${imageFile.name}`,
        fileName: imageFile.name,
        mimeType: imageFile.type,
        fileSize: imageFile.size,
        note: String(form.get("note") ?? ""),
      });
      setImageState({
        status: "success",
        message: `已创建待确认事件：${String(result.eventId)}`,
      });
      event.currentTarget.reset();
    } catch (error) {
      setImageState({
        status: "error",
        message: error instanceof Error ? error.message : "提交失败",
      });
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 w-fit rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
            M1.1 · 录入入口
          </p>
          <h1 className="font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            新增录入
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            第一版先把原始内容送进待确认队列。真实文件上传和 OCR 后面再接。
          </p>
        </div>
        <Link
          className="w-fit rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
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
            className="mt-4 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
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
            这里现在是产品占位版：你像真实上传一样选择图片，但文件本体暂时不会上传；系统只保存文件名、大小、类型和备注，后面再接真实文件存储和 OCR。
          </p>
          <div className="mt-5 grid gap-3">
            <label className="rounded-2xl border border-dashed border-[var(--accent)] bg-white/65 p-5">
              <span className="block text-sm font-semibold text-[var(--accent-strong)]">
                选择图片
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                未来这里会是真实上传；当前先用文件信息模拟完整入口。
              </span>
              <input
                accept="image/*"
                className="mt-4 w-full text-sm"
                name="imageFile"
                required
                type="file"
              />
            </label>
            <textarea
              className="min-h-28 rounded-2xl border border-[var(--line)] bg-white/65 p-4 leading-7 outline-none focus:border-[var(--accent)]"
              name="note"
              placeholder="补充备注：这张截图是什么、跟谁有关、下一步是什么"
            />
          </div>
          <button
            className="mt-4 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--panel)]"
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
        </form>
      </section>
    </main>
  );
}
