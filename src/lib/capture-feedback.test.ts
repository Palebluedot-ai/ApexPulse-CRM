import { describe, expect, it } from "vitest";
import {
  appendImageUploadResult,
  buildImageUploadSuccessMessage,
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
