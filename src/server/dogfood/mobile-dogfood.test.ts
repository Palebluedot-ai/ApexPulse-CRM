import { describe, expect, it } from "vitest";
import { buildMobileDogfoodModel } from "./mobile-dogfood";

describe("mobile dogfood model", () => {
  it("builds a mobile dogfood checklist with the current browser address", () => {
    expect(
      buildMobileDogfoodModel({
        host: "192.168.68.55:3000",
        protocol: "http",
      }),
    ).toEqual({
      currentBaseUrl: "http://192.168.68.55:3000",
      accessHint: "手机和 Mac 需要在同一个 Wi-Fi；手机打开当前地址即可测试。",
      mobileWarning: null,
      goldenPath: [
        "手机登录",
        "上传 1 张真实微信截图",
        "进入待确认",
        "AI 提取字段",
        "人工修正并确认入库",
        "检查客户详情和任务",
      ],
      checks: [
        "Mac 上 Postgres 正在运行",
        "Mac 上 Next dev server 正在运行",
        ".env.local 已配置视觉 API",
        "手机能访问当前地址",
        "真实截图不会进入 Git",
      ],
    });
  });

  it("falls back to localhost when no host header is available", () => {
    expect(
      buildMobileDogfoodModel({
        host: null,
        protocol: null,
      }),
    ).toMatchObject({
      currentBaseUrl: "http://localhost:3000",
      mobileWarning:
        "当前是 localhost 地址。手机不能直接使用它，请复制终端里的 Network URL。",
    });
  });
});
