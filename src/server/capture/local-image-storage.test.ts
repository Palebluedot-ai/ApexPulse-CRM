import { describe, expect, it } from "vitest";
import {
  buildLocalImageStoragePlan,
  localAttachmentPath,
} from "./local-image-storage";

describe("local image storage", () => {
  it("builds a safe local storage plan for image uploads", () => {
    expect(
      buildLocalImageStoragePlan({
        fileName: " 微信 截图../demo image.PNG ",
        mimeType: "image/png",
        fileSize: 18_000,
        uploadedAt: new Date("2026-05-29T14:10:00+08:00"),
        uniqueId: "abc123",
      }),
    ).toEqual({
      fileName: "微信-截图-demo-image.PNG",
      mimeType: "image/png",
      fileSize: 18_000,
      storageKey: "local-images/2026/05/29/20260529T061000000Z-abc123-微信-截图-demo-image.PNG",
    });
  });

  it("rejects non-image uploads before writing to disk", () => {
    expect(() =>
      buildLocalImageStoragePlan({
        fileName: "terms.pdf",
        mimeType: "application/pdf",
        fileSize: 18_000,
        uploadedAt: new Date("2026-05-29T14:10:00+08:00"),
        uniqueId: "abc123",
      }),
    ).toThrow("Image mime type is required");
  });

  it("rejects unsafe local attachment storage keys", () => {
    expect(() => localAttachmentPath("../secret.png")).toThrow(
      "Invalid local storage key",
    );

    expect(() => localAttachmentPath("local-images/ok.png")).not.toThrow();
  });
});
