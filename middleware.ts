import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const needsOnboarding = req.auth?.user?.needsOnboarding;

  const isOnboarding = nextUrl.pathname === "/onboarding";
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  if (isLoggedIn && needsOnboarding && !isOnboarding && !isApiRoute) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }
});

export const config = {
  matcher: ["/(dashboard)/:path*"],
};
