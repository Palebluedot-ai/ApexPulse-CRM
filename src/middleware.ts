import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/server/auth/constants";
import {
  getEdgeAuthConfig,
  verifySessionCookieOnEdge,
} from "@/server/auth/edge-session";
import { getAuthGateDecision } from "@/server/auth/routes";

export async function middleware(request: NextRequest) {
  const hasValidSessionCookie = await verifySessionCookieOnEdge(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
    getEdgeAuthConfig(),
  );
  const decision = getAuthGateDecision(
    request.nextUrl.pathname,
    hasValidSessionCookie,
  );

  if (decision.type === "allow") {
    return NextResponse.next();
  }

  if (decision.type === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const redirectUrl = new URL(decision.destination, request.url);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
