export type AuthGateDecision =
  | { type: "allow" }
  | { type: "redirect"; destination: string }
  | { type: "unauthorized" };

const publicExactPaths = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/manifest.webmanifest",
  "/favicon.ico",
]);

function isFrameworkAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/")
  );
}

export function isPublicPath(pathname: string): boolean {
  return publicExactPaths.has(pathname) || isFrameworkAsset(pathname);
}

export function getAuthGateDecision(
  pathname: string,
  hasSessionCookie: boolean,
): AuthGateDecision {
  if (isPublicPath(pathname) || hasSessionCookie) {
    return { type: "allow" };
  }

  if (pathname.startsWith("/api/")) {
    return { type: "unauthorized" };
  }

  return {
    type: "redirect",
    destination: `/login?next=${encodeURIComponent(pathname)}`,
  };
}
