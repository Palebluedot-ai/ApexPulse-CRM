import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes a password into the scrypt$N$salt$hash format", async () => {
    const hash = await hashPassword("hunter2-correct-horse");
    const parts = hash.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toMatch(/^\d+$/); // N param
    expect(parts[2]).toMatch(/^[A-Za-z0-9_-]+$/); // base64url salt
    expect(parts[3]).toMatch(/^[A-Za-z0-9_-]+$/); // base64url hash
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("returns false on malformed hash string instead of throwing", async () => {
    await expect(verifyPassword("anything", "not-a-valid-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt$bad$bad")).resolves.toBe(false);
  });

  it("rejects an empty password at hash time", async () => {
    await expect(hashPassword("")).rejects.toThrow(/empty/i);
  });
});
