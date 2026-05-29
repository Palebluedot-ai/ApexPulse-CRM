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
