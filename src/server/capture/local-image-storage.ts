import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { randomUUID } from "node:crypto";

export interface LocalImageStorageInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt?: Date;
  uniqueId?: string;
}

export interface LocalImageStoragePlan {
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
}

const localAttachmentRoot = join(process.cwd(), "data", "attachments");

function requireImageMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized.startsWith("image/")) {
    throw new Error("Image mime type is required");
  }

  return normalized;
}

function requirePositiveFileSize(fileSize: number): number {
  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    throw new Error("Positive file size is required");
  }

  return fileSize;
}

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .replace(/\.\.+/g, "")
    .replace(/[\\/]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  if (!sanitized) throw new Error("File name is required");

  return sanitized;
}

function compactIsoDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(".", "");
}

export function buildLocalImageStoragePlan(
  input: LocalImageStorageInput,
): LocalImageStoragePlan {
  const uploadedAt = input.uploadedAt ?? new Date();
  const year = String(uploadedAt.getUTCFullYear());
  const month = String(uploadedAt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(uploadedAt.getUTCDate()).padStart(2, "0");
  const uniqueId = input.uniqueId ?? randomUUID();
  const fileName = sanitizeFileName(input.fileName);

  return {
    fileName,
    mimeType: requireImageMimeType(input.mimeType),
    fileSize: requirePositiveFileSize(input.fileSize),
    storageKey: [
      "local-images",
      year,
      month,
      day,
      `${compactIsoDate(uploadedAt)}-${uniqueId}-${fileName}`,
    ].join("/"),
  };
}

export function localAttachmentPath(storageKey: string): string {
  const normalizedKey = normalize(storageKey).replaceAll("\\", "/");
  const invalidKey =
    normalizedKey.startsWith("..") ||
    normalizedKey.startsWith("/") ||
    !normalizedKey.startsWith("local-images/");

  if (invalidKey) throw new Error("Invalid local storage key");

  const fullPath = join(localAttachmentRoot, normalizedKey);
  const normalizedRoot = `${normalize(localAttachmentRoot)}${sep}`;

  if (!normalize(fullPath).startsWith(normalizedRoot)) {
    throw new Error("Invalid local storage key");
  }

  return fullPath;
}

export async function writeLocalAttachment(
  storageKey: string,
  bytes: Buffer,
): Promise<void> {
  const targetPath = localAttachmentPath(storageKey);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);
}
