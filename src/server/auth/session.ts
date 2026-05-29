import { createHmac, timingSafeEqual } from "node:crypto";
import { AUTH_SESSION_MAX_AGE_SECONDS } from "./constants";

export { AUTH_SESSION_COOKIE, AUTH_SESSION_MAX_AGE_SECONDS } from "./constants";

export interface LocalAuthConfig {
  email: string;
  password: string;
  sessionSecret: string;
  maxAgeSeconds: number;
  cookieSecure: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SessionIdentity {
  userId: string;
  email: string;
}

interface SessionPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

type EnvLike = Record<string, string | undefined>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getLocalAuthConfig(env: EnvLike = process.env): LocalAuthConfig {
  const isStrictEnv = env.AUTH_STRICT_ENV === "true";
  const email = env.LOCAL_AUTH_EMAIL ?? "chao.local@example.com";
  const password = env.LOCAL_AUTH_PASSWORD ?? "local-dev-password";
  const sessionSecret = env.AUTH_SESSION_SECRET ?? "local-dev-session-secret";

  if (isStrictEnv) {
    const missing = [
      ["LOCAL_AUTH_EMAIL", env.LOCAL_AUTH_EMAIL],
      ["LOCAL_AUTH_PASSWORD", env.LOCAL_AUTH_PASSWORD],
      ["AUTH_SESSION_SECRET", env.AUTH_SESSION_SECRET],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing auth env: ${missing.join(", ")}`);
    }
  }

  return {
    email: normalizeEmail(email),
    password,
    sessionSecret,
    maxAgeSeconds: AUTH_SESSION_MAX_AGE_SECONDS,
    cookieSecure: env.AUTH_COOKIE_SECURE === "true",
  };
}

export function validateLocalLogin(
  input: LoginInput,
  config: LocalAuthConfig,
):
  | { ok: true; email: string }
  | { ok: false; reason: "invalid_credentials" } {
  if (
    normalizeEmail(input.email) !== config.email ||
    input.password !== config.password
  ) {
    return { ok: false, reason: "invalid_credentials" };
  }

  return { ok: true, email: config.email };
}

export function createSessionToken(
  identity: SessionIdentity,
  config: LocalAuthConfig,
  now = new Date(),
): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payload: SessionPayload = {
    sub: identity.userId,
    email: normalizeEmail(identity.email),
    iat: issuedAt,
    exp: issuedAt + config.maxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, config.sessionSecret);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined,
  config: LocalAuthConfig,
  now = new Date(),
): SessionIdentity | null {
  if (!token) return null;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra != null) return null;

  const expectedSignature = sign(encodedPayload, config.sessionSecret);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= nowSeconds
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: normalizeEmail(payload.email),
    };
  } catch {
    return null;
  }
}
