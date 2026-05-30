export interface MobileDogfoodModel {
  currentBaseUrl: string;
  accessHint: string;
  mobileWarning: string | null;
  goldenPath: string[];
  checks: string[];
}

export function buildMobileDogfoodModel(input: {
  host: string | null;
  protocol: string | null;
}): MobileDogfoodModel {
  const host = input.host?.trim() || "localhost:3000";
  const protocol = input.protocol?.trim() || "http";
  const isLocalhost =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");

  return {
    currentBaseUrl: `${protocol}://${host}`,
    accessHint: "手机和 Mac 需要在同一个 Wi-Fi；手机打开当前地址即可测试。",
    mobileWarning: isLocalhost
      ? "当前是 localhost 地址。手机不能直接使用它，请复制终端里的 Network URL。"
      : null,
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
  };
}
