import { describe, expect, it } from "vitest";
import { hashPassword } from "./password";
import { findActiveUserByEmail, verifyDbLogin } from "./db-login";

// Pure functions over an injected lookup, so we don't need a real DB in unit tests.

describe("findActiveUserByEmail", () => {
  it("normalizes email casing and whitespace before lookup", async () => {
    let asked: string | null = null;
    const lookup = async (email: string) => {
      asked = email;
      return null;
    };

    await findActiveUserByEmail("  Foo@Example.COM  ", lookup);

    expect(asked).toBe("foo@example.com");
  });

  it("returns null when lookup returns null", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => null);
    expect(result).toBeNull();
  });

  it("returns null when the user is inactive", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => ({
      id: "uid",
      email: "a@b.com",
      passwordHash: "scrypt$...$...$...",
      isActive: false,
    }));
    expect(result).toBeNull();
  });

  it("returns null when the user has no passwordHash (legacy row)", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => ({
      id: "uid",
      email: "a@b.com",
      passwordHash: null,
      isActive: true,
    }));
    expect(result).toBeNull();
  });

  it("returns the user when active and has a hash", async () => {
    const result = await findActiveUserByEmail("a@b.com", async () => ({
      id: "uid",
      email: "a@b.com",
      passwordHash: "scrypt$32768$abc$def",
      isActive: true,
    }));
    expect(result).toEqual({
      id: "uid",
      email: "a@b.com",
      passwordHash: "scrypt$32768$abc$def",
    });
  });
});

describe("verifyDbLogin", () => {
  it("returns the user identity when password matches", async () => {
    const hash = await hashPassword("correct-pw");
    const result = await verifyDbLogin(
      { email: "tester@example.com", password: "correct-pw" },
      async () => ({
        id: "user-123",
        email: "tester@example.com",
        passwordHash: hash,
        isActive: true,
      }),
    );
    expect(result).toEqual({ ok: true, userId: "user-123", email: "tester@example.com" });
  });

  it("returns invalid when no user found", async () => {
    const result = await verifyDbLogin(
      { email: "nobody@example.com", password: "anything" },
      async () => null,
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns invalid when password does not match (does not leak existence)", async () => {
    const hash = await hashPassword("real-pw");
    const result = await verifyDbLogin(
      { email: "tester@example.com", password: "wrong-pw" },
      async () => ({
        id: "user-123",
        email: "tester@example.com",
        passwordHash: hash,
        isActive: true,
      }),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns invalid when user is inactive even with correct password", async () => {
    const hash = await hashPassword("real-pw");
    const result = await verifyDbLogin(
      { email: "tester@example.com", password: "real-pw" },
      async () => ({
        id: "user-123",
        email: "tester@example.com",
        passwordHash: hash,
        isActive: false,
      }),
    );
    expect(result).toEqual({ ok: false, reason: "invalid_credentials" });
  });
});
