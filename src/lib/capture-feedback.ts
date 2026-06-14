export interface ImageUploadResult {
  eventId: string;
  fileName: string;
}

export function buildImageUploadSuccessMessage(input: {
  eventId: string;
  uploadedCount: number;
}): string {
  return `已创建待确认事件：${input.eventId}。本轮已送入待确认 ${input.uploadedCount} 张图片。你可以继续上传下一张，或去待确认处理。`;
}

export function appendImageUploadResult(
  current: ImageUploadResult[],
  next: ImageUploadResult,
): ImageUploadResult[] {
  return [...current, next];
}

// Vercel functions reject request bodies larger than ~4.5MB with a non-JSON 413
// before our handler runs. Guard below that with headroom so the user gets a
// readable message instead of a silent platform error.
export const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;

export function buildOversizeImageMessage(bytes: number): string {
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `图片太大（${mb} MB），超过上传上限 4 MB，请压缩或截取后再上传。`;
}

// On iOS Safari, response.json() on a non-JSON error body throws a cryptic
// "The string did not match the expected pattern.". Callers must parse defensively
// and fall back to this to surface the real failure.
export function buildUploadFailureMessage(
  status: number,
  serverError?: unknown,
): string {
  if (typeof serverError === "string" && serverError.length > 0) {
    return serverError;
  }
  if (status === 413) {
    return "图片太大，超过服务器上传上限（约 4 MB），请压缩或截取后再上传。";
  }
  return `上传失败（HTTP ${status}），请稍后重试。`;
}
