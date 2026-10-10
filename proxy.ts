import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  // Require a user: a misconfigured Auth.js (e.g. untrusted host, missing
  // secret) answers with an error object, which must not count as signed in.
  const isLoggedIn = !!req.auth?.user;

  const isOnboarding = nextUrl.pathname === "/onboarding";
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isLoggedIn && !isOnboarding && !isApiRoute) {
    // Check session for missing district — needsOnboarding flag
    const needsOnboarding = req.auth?.user?.needsOnboarding;
    // Also check directly in case the flag wasn't set
    const state = req.auth?.user?.state;
    const cd = req.auth?.user?.cd;
    if (needsOnboarding || !state || !cd) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
});

export const config = {
  // Route groups like (dashboard) aren't part of the URL, so match real paths:
  // every page except API routes, Next.js internals, files with an extension
  // (public/ assets, /icon.svg), and the pages a signed-in user without a
  // district must still reach — /login, /signup, and /onboarding itself.
  // Exclusions are whole segments, so a page like /signups still runs. The
  // extension test is `\.\w+$`, not `\.[^/]*$`, because the latter backtracks
  // quadratically on long dotted paths and this regex runs on every request.
  matcher: [
    "/((?!api(?:/|$)|_next/|login(?:/|$)|signup(?:/|$)|onboarding(?:/|$)|.*\\.\\w+$).*)",
  ],
};
