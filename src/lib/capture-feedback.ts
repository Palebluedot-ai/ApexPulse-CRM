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
