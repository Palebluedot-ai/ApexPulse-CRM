import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  getLocalAuthConfig,
  validateLocalLogin,
  verifySessionToken,
} from "./session";

describe("local auth session", () => {
  const config = getLocalAuthConfig({
    LOCAL_AUTH_EMAIL: "chao.local@example.com",
    LOCAL_AUTH_PASSWORD: "local-pass",
    AUTH_SESSION_SECRET: "test-session-secret",
  });

  it("accepts the configured local email and password", () => {
    expect(
      validateLocalLogin(
        {
          email: " chao.local@example.com ",
          password: "local-pass",
        },
        config,
      ),
    ).toEqual({ ok: true, email: "chao.local@example.com" });
  });

  it("rejects the wrong local password", () => {
    expect(
      validateLocalLogin(
        {
          email: "chao.local@example.com",
          password: "wrong",
        },
        config,
      ),
    ).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("creates a signed session token that can be verified", () => {
    const now = new Date("2026-05-29T22:00:00+08:00");
    const token = createSessionToken(
      {
        userId: "11111111-1111-1111-1111-111111111111",
        email: "chao.local@example.com",
      },
      config,
      now,
    );

    expect(verifySessionToken(token, config, now)).toEqual({
      userId: "11111111-1111-1111-1111-111111111111",
      email: "chao.local@example.com",
    });
  });

  it("rejects expired session tokens", () => {
    const issuedAt = new Date("2026-05-01T10:00:00+08:00");
    const checkedAt = new Date("2026-05-20T10:00:00+08:00");
    const token = createSessionToken(
      {
        userId: "11111111-1111-1111-1111-111111111111",
        email: "chao.local@example.com",
      },
      config,
      issuedAt,
    );

    expect(verifySessionToken(token, config, checkedAt)).toBeNull();
  });

  it("requires explicit auth env only when strict mode is enabled", () => {
    expect(() =>
      getLocalAuthConfig({
        AUTH_STRICT_ENV: "true",
      }),
    ).toThrow("Missing auth env");
  });
});
