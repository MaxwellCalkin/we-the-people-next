// Redirects from next.config.ts, run through Next's own route matching so the
// host checks behave the way they do in production.
import { describe, it, expect } from "vitest";
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import nextConfig from "../next.config";

const route = (url: string) =>
  unstable_getResponseFromNextConfig({ url, nextConfig });

describe("next.config redirects", () => {
  it("sends the old domain to the same path and query on heard-us.vercel.app", async () => {
    const res = await route(
      "https://we-the-people-next.vercel.app/bills/search?q=climate"
    );
    expect(res.status).toBe(308);
    expect(getRedirectUrl(res)).toBe(
      "https://heard-us.vercel.app/bills/search?q=climate"
    );
  });

  it("sends the old domain's home page to the production home page", async () => {
    const res = await route("https://we-the-people-next.vercel.app/");
    expect(res.status).toBe(308);
    expect(getRedirectUrl(res)).toBe("https://heard-us.vercel.app/");
  });

  it.each(["https://heard-us.vercel.app/bills", "http://localhost:4200/bills"])(
    "does not redirect %s",
    async (url) => {
      const res = await route(url);
      expect(res.status).toBe(200);
      expect(getRedirectUrl(res)).toBeNull();
    }
  );

  it("still sends /feed to /proposals", async () => {
    const res = await route("https://heard-us.vercel.app/feed");
    expect(res.status).toBe(307);
    expect(getRedirectUrl(res)).toBe("https://heard-us.vercel.app/proposals");
  });
});

describe("next.config security headers", () => {
  it.each([
    "/",
    "/bills",
    // The proxy skips these, so the headers must come from next.config.
    "/login",
    "/signup",
    "/onboarding",
    "/api/ballot/elections",
    "/icon.svg",
  ])("sends clickjacking, sniffing, and referrer protection on %s", async (path) => {
    const res = await route(`https://heard-us.vercel.app${path}`);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });
});
