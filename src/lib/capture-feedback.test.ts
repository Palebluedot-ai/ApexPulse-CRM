import { describe, expect, it } from "vitest";
import {
  appendImageUploadResult,
  buildImageUploadSuccessMessage,
  buildOversizeImageMessage,
  buildUploadFailureMessage,
} from "./capture-feedback";

describe("capture feedback", () => {
  it("builds a clear next-step message after one image enters review", () => {
    expect(
      buildImageUploadSuccessMessage({
        eventId: "event-1",
        uploadedCount: 1,
      }),
    ).toBe(
      "已创建待确认事件：event-1。本轮已送入待确认 1 张图片。你可以继续上传下一张，或去待确认处理。",
    );
  });

  it("appends each uploaded image as one pending review item", () => {
    expect(
      appendImageUploadResult(
        [
          {
            eventId: "event-1",
            fileName: "wechat-1.png",
          },
        ],
        {
          eventId: "event-2",
          fileName: "wechat-2.png",
        },
      ),
    ).toEqual([
      {
        eventId: "event-1",
        fileName: "wechat-1.png",
      },
      {
        eventId: "event-2",
        fileName: "wechat-2.png",
      },
    ]);
  });
});

describe("upload failure messaging", () => {
  it("surfaces the server-provided error when the body is valid JSON", () => {
    expect(buildUploadFailureMessage(400, "Image file is required")).toBe(
      "Image file is required",
    );
  });

  it("maps a 413 with no JSON body to an oversize hint", () => {
    expect(buildUploadFailureMessage(413)).toContain("4 MB");
  });

  it("falls back to the HTTP status for unknown non-JSON failures", () => {
    expect(buildUploadFailureMessage(500)).toBe(
      "上传失败（HTTP 500），请稍后重试。",
    );
  });

  it("reports the file size and the limit when an image is too large", () => {
    const message = buildOversizeImageMessage(6 * 1024 * 1024);
    expect(message).toContain("6.0 MB");
    expect(message).toContain("4 MB");
  });
});
