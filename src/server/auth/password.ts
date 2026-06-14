import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

// 2^15 cost factor — strong enough for interactive login on Vercel cold start,
// not so heavy that a tester waits forever. Stored in the hash so we can bump it later.
const SCRYPT_N = 32768;
const SCRYPT_MAXMEM = 128 * 1024 * 1024; // permits N up to ~131072 at default r=8 p=1
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new Error("Password must not be empty");
  }

  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    maxmem: SCRYPT_MAXMEM,
  });

  return [
    "scrypt",
    SCRYPT_N.toString(),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;

  const n = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(n) || n <= 0) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2], "base64url");
    expected = Buffer.from(parts[3], "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scryptAsync(password, salt, expected.length, {
    N: n,
    maxmem: SCRYPT_MAXMEM,
  });
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
