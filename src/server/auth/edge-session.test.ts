import { describe, expect, it } from "vitest";
import { createSessionToken, getLocalAuthConfig } from "./session";
import { getEdgeAuthConfig, verifySessionCookieOnEdge } from "./edge-session";

describe("edge session verification", () => {
  const nodeConfig = getLocalAuthConfig({
    LOCAL_AUTH_EMAIL: "chao.local@example.com",
    LOCAL_AUTH_PASSWORD: "local-pass",
    AUTH_SESSION_SECRET: "test-session-secret",
  });
  const edgeConfig = getEdgeAuthConfig({
    AUTH_SESSION_SECRET: "test-session-secret",
  });

  it("accepts a Node-created session token in middleware", async () => {
    const now = new Date("2026-05-29T22:20:00+08:00");
    const token = createSessionToken(
      {
        userId: "11111111-1111-1111-1111-111111111111",
        email: "chao.local@example.com",
      },
      nodeConfig,
      now,
    );

    await expect(
      verifySessionCookieOnEdge(token, edgeConfig, now),
    ).resolves.toBe(true);
  });

  it("rejects tampered tokens in middleware", async () => {
    const now = new Date("2026-05-29T22:20:00+08:00");
    const token = `${createSessionToken(
      {
        userId: "11111111-1111-1111-1111-111111111111",
        email: "chao.local@example.com",
      },
      nodeConfig,
      now,
    )}tampered`;

    await expect(
      verifySessionCookieOnEdge(token, edgeConfig, now),
    ).resolves.toBe(false);
  });
});
