import { describe, expect, it } from "vitest";
import { sanitizeLoginRedirect } from "./login";

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
});
