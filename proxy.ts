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

  // Security headers come from next.config.ts so they also cover the routes
  // this proxy skips.
  return NextResponse.next();
});

export const config = {
  // Route groups like (dashboard) aren't part of the URL, so match real paths:
  // every page except API routes, Next.js internals, files with an extension
  // (public/ assets, /icon.svg), and the pages a signed-in user without a
  // district must still reach — /login, /signup, and /onboarding itself.
  // Exclusions are whole segments, so a page like /signups still runs. The
  // extension test is `\.\w+$`, not `\.[^/]*$`, because the latter backtracks
  // quadratically on long dotted paths and this regex runs on every request.
  //
  // The proxy only acts on signed-in users, so it runs only when the request
  // carries an Auth.js session cookie. Signed-out visitors, crawlers, and
  // uptime checks skip it, which matters because every run is billed as Vercel
  // compute and those visitors are most of the traffic. One entry per name the
  // cookie can have: "__Secure-" is added over https, and ".0" when the session
  // is split across cookies. Next.js reads this at build time, so each entry
  // has to spell the path pattern out in full; it can't share a variable.
  matcher: [
    {
      source: "/((?!api(?:/|$)|_next/|login(?:/|$)|signup(?:/|$)|onboarding(?:/|$)|.*\\.\\w+$).*)",
      has: [{ type: "cookie", key: "__Secure-authjs.session-token" }],
    },
    {
      source: "/((?!api(?:/|$)|_next/|login(?:/|$)|signup(?:/|$)|onboarding(?:/|$)|.*\\.\\w+$).*)",
      has: [{ type: "cookie", key: "__Secure-authjs.session-token.0" }],
    },
    {
      source: "/((?!api(?:/|$)|_next/|login(?:/|$)|signup(?:/|$)|onboarding(?:/|$)|.*\\.\\w+$).*)",
      has: [{ type: "cookie", key: "authjs.session-token" }],
    },
    {
      source: "/((?!api(?:/|$)|_next/|login(?:/|$)|signup(?:/|$)|onboarding(?:/|$)|.*\\.\\w+$).*)",
      has: [{ type: "cookie", key: "authjs.session-token.0" }],
    },
  ],
};
