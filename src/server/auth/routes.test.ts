import { describe, expect, it } from "vitest";
import { getAuthGateDecision } from "./routes";

describe("auth route gate", () => {
  it("allows the login page without a session", () => {
    expect(getAuthGateDecision("/login", false)).toEqual({ type: "allow" });
  });

  it("redirects protected pages to login when there is no session", () => {
    expect(getAuthGateDecision("/customers", false)).toEqual({
      type: "redirect",
      destination: "/login?next=%2Fcustomers",
    });
  });

  it("returns 401 for protected API routes when there is no session", () => {
    expect(getAuthGateDecision("/api/tasks", false)).toEqual({
      type: "unauthorized",
    });
  });

  it("allows protected paths when a session cookie exists", () => {
    expect(getAuthGateDecision("/tasks", true)).toEqual({ type: "allow" });
  });
});
