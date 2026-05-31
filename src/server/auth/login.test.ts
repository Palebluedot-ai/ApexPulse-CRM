import { describe, expect, it } from "vitest";
import { buildLoginRedirectUrl, sanitizeLoginRedirect } from "./login";

describe("login helpers", () => {
  it("keeps local next paths after login", () => {
    expect(sanitizeLoginRedirect("/customers")).toBe("/customers");
  });

  it("falls back to home for external next URLs", () => {
    expect(sanitizeLoginRedirect("https://evil.example.com")).toBe("/");
  });

  it("falls back to home for auth endpoints", () => {
    expect(sanitizeLoginRedirect("/api/auth/logout")).toBe("/");
  });

  it("keeps the network host when redirecting after mobile login", () => {
    expect(
      buildLoginRedirectUrl({
        next: "/dogfood/mobile",
        requestUrl: "http://localhost:3000/api/auth/login",
        host: "192.168.68.55:3000",
        protocol: "http",
      }).toString(),
    ).toBe("http://192.168.68.55:3000/dogfood/mobile");
  });
});
