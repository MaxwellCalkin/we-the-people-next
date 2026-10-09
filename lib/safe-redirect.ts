/**
 * Only allow same-site relative paths as post-login destinations so a crafted
 * ?callbackUrl= can't bounce people to another site.
 */
export function safeCallbackUrl(value: string | string[] | null | undefined, fallback = "/profile"): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.startsWith("/login") || raw.startsWith("/signup")) return fallback;
  return raw;
}

/** "/login?callbackUrl=%2Fvote%2Fhr1%2F119" */
export function loginHref(returnTo: string, base: "/login" | "/signup" = "/login"): string {
  return `${base}?callbackUrl=${encodeURIComponent(returnTo)}`;
}
