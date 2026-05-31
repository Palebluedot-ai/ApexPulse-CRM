import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  buildLoginRedirectUrl,
  sanitizeLoginRedirect,
} from "@/server/auth/login";
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
  const validation = validateLocalLogin(payload, config);

  if (!validation.ok) {
    return invalidLoginResponse(request, payload.wantsJson);
  }

  const { client, db } = createDb();

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validation.email))
      .limit(1);

    if (!user || !user.isActive) {
      return invalidLoginResponse(request, payload.wantsJson);
    }

    const token = createSessionToken(
      { userId: user.id, email: user.email },
      config,
    );
    const response = payload.wantsJson
      ? NextResponse.json({ ok: true, userId: user.id })
      : NextResponse.redirect(
          buildLoginRedirectUrl({
            next: payload.next,
            requestUrl: request.url,
            host:
              request.headers.get("x-forwarded-host") ??
              request.headers.get("host"),
            protocol: request.headers.get("x-forwarded-proto"),
          }),
          {
            status: 303,
          },
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
