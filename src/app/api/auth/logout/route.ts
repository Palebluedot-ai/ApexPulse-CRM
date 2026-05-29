import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/server/auth/constants";
import { getLocalAuthConfig } from "@/server/auth/session";

export function POST(request: Request) {
  const config = getLocalAuthConfig();
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
