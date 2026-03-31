import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

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
  matcher: ["/(dashboard)/:path*"],
};
