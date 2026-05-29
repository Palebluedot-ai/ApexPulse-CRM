import { AUTH_SESSION_MAX_AGE_SECONDS } from "./constants";

export interface EdgeAuthConfig {
  sessionSecret: string;
  maxAgeSeconds: number;
}

interface EdgeSessionPayload {
  sub?: unknown;
  email?: unknown;
  exp?: unknown;
}

type EnvLike = Record<string, string | undefined>;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlDecode(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

async function signOnEdge(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

export function getEdgeAuthConfig(env: EnvLike = process.env): EdgeAuthConfig {
  return {
    sessionSecret: env.AUTH_SESSION_SECRET ?? "local-dev-session-secret",
    maxAgeSeconds: AUTH_SESSION_MAX_AGE_SECONDS,
  };
}

export async function verifySessionCookieOnEdge(
  token: string | undefined,
  config: EdgeAuthConfig,
  now = new Date(),
): Promise<boolean> {
  if (!token) return false;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra != null) return false;

  const expectedSignature = await signOnEdge(
    encodedPayload,
    config.sessionSecret,
  );
  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as EdgeSessionPayload;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    return (
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      typeof payload.exp === "number" &&
      payload.exp > nowSeconds
    );
  } catch {
    return false;
  }
}
