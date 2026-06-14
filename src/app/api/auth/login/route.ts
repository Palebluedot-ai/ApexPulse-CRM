import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  buildLoginRedirectUrl,
  sanitizeLoginRedirect,
} from "@/server/auth/login";
import { verifyDbLogin } from "@/server/auth/db-login";
import {
  AUTH_SESSION_COOKIE,
  createSessionToken,
  getLocalAuthConfig,
  validateLocalLogin,
} from "@/server/auth/session";
import { createDb } from "@/server/db";
import { users } from "@/server/db/schema";

export const runtime = "nodejs";

async function readLoginPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      email: typeof body.email === "string" ? body.email : "",
      password: typeof body.password === "string" ? body.password : "",
      next: sanitizeLoginRedirect(
        typeof body.next === "string" ? body.next : null,
      ),
      wantsJson: true,
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    next: sanitizeLoginRedirect(form.get("next")),
    wantsJson: false,
  };
}

function invalidLoginResponse(request: Request, wantsJson: boolean) {
  if (wantsJson) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  return NextResponse.redirect(new URL("/login?error=invalid", request.url), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const payload = await readLoginPayload(request);
  const config = getLocalAuthConfig();

  const { client, db } = createDb();

  try {
    const dbResult = await verifyDbLogin(
      { email: payload.email, password: payload.password },
      async (normalizedEmail) => {
        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);
        return row ?? null;
      },
    );

    let identity: { userId: string; email: string } | null = null;

    if (dbResult.ok) {
      identity = { userId: dbResult.userId, email: dbResult.email };
    } else {
      // Env fallback: only used when DB has no active user with a hash for this email.
      const envValidation = validateLocalLogin(payload, config);
      if (envValidation.ok) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, envValidation.email))
          .limit(1);
        if (user && user.isActive) {
          identity = { userId: user.id, email: user.email };
        }
      }
    }

    if (!identity) {
      return invalidLoginResponse(request, payload.wantsJson);
    }

    const token = createSessionToken(identity, config);
    const response = payload.wantsJson
      ? NextResponse.json({ ok: true, userId: identity.userId })
      : NextResponse.redirect(
          buildLoginRedirectUrl({
            next: payload.next,
            requestUrl: request.url,
            host:
              request.headers.get("x-forwarded-host") ??
              request.headers.get("host"),
            protocol: request.headers.get("x-forwarded-proto"),
          }),
          { status: 303 },
        );

    response.cookies.set(AUTH_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: config.maxAgeSeconds,
    });

    return response;
  } finally {
    await client.end();
  }
}
