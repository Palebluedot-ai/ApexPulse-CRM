export function sanitizeLoginRedirect(value: FormDataEntryValue | string | null): string {
  if (typeof value !== "string") return "/";

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/api/auth/") || value.startsWith("/login")) {
    return "/";
  }

  return value;
}

export function buildLoginRedirectUrl(input: {
  next: string;
  requestUrl: string;
  host: string | null;
  protocol: string | null;
}): URL {
  const fallbackUrl = new URL(input.requestUrl);
  const host = input.host?.trim();

  if (!host) {
    return new URL(input.next, fallbackUrl);
  }

  const protocol =
    input.protocol?.trim() || fallbackUrl.protocol.replace(":", "") || "http";

  return new URL(input.next, `${protocol}://${host}`);
}
