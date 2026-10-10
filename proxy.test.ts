// @vitest-environment node
// Which requests the proxy runs on (checked with Next's own matcher logic) and
// what it does to them (driven by a real Auth.js session cookie). No mocks and
// no DB: with the JWT session strategy, auth() reads the session from the
// cookie alone.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { encode } from "next-auth/jwt";
import nextConfig from "@/next.config";

const SECRET = "proxy-test-secret";
const ORIGIN = "http://localhost:4200";
// Auth.js names the cookie by protocol; over plain http it has no __Secure- prefix.
const SESSION_COOKIE = "authjs.session-token";

let proxyModule: typeof import("./proxy");

beforeAll(async () => {
  // lib/auth reads the secret when it is first imported.
  vi.stubEnv("NEXTAUTH_SECRET", SECRET);
  proxyModule = await import("./proxy");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

function sessionFor(user: { state?: string; cd?: string; needsOnboarding?: boolean }) {
  return encode({
    secret: SECRET,
    salt: SESSION_COOKIE,
    token: { sub: "u1", id: "u1", email: "voter@test.local", userName: "voter", ...user },
  });
}

async function visit(
  path: string,
  sessionToken?: string,
  proxy = proxyModule.default,
): Promise<Response> {
  // Next's server always forwards these; Auth.js uses them to locate the session.
  const headers = new Headers({ host: "localhost:4200", "x-forwarded-proto": "http" });
  if (sessionToken) headers.set("cookie", `${SESSION_COOKIE}=${sessionToken}`);
  // auth() types its wrapper as a route handler; the second argument goes unused.
  const res = await proxy(new NextRequest(`${ORIGIN}${path}`, { headers }), {
    params: Promise.resolve({}),
  });
  if (!res) throw new Error(`proxy returned no response for ${path}`);
  return res;
}

function expectPassedThroughWithSecurityHeaders(res: Response) {
  expect(res.status).toBe(200);
  expect(res.headers.get("location")).toBeNull();
  expect(res.headers.get("x-frame-options")).toBe("DENY");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
}

describe("proxy matcher", () => {
  const runsOn = (url: string) =>
    unstable_doesMiddlewareMatch({ config: proxyModule.config, nextConfig, url });

  it.each([
    "/",
    "/bills",
    "/bills/search",
    "/elections",
    "/elections/CA/house/12",
    "/members/A000370/votes",
    "/profile",
    "/proposals/new",
    "/vote/hr1/119/voted",
  ])("runs on the page %s", (url) => {
    expect(runsOn(url)).toBe(true);
  });

  it.each([
    "/api/user/me",
    "/api/auth/session",
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/icon.svg",
    "/maps/cd-118.json",
  ])("skips API routes, Next.js internals, and static files: %s", (url) => {
    expect(runsOn(url)).toBe(false);
  });

  it.each(["/login", "/login?callbackUrl=%2Fbills", "/signup", "/onboarding"])(
    "skips %s so signed-in users without a district can still reach it",
    (url) => {
      expect(runsOn(url)).toBe(false);
    },
  );

  it.each(["/signups", "/api-docs", "/onboarding-faq"])(
    "still runs on %s, which only starts with an excluded name",
    (url) => {
      expect(runsOn(url)).toBe(true);
    },
  );
});

describe("proxy", () => {
  it.each([
    { session: "a new account", user: { needsOnboarding: true } },
    // e.g. the sign-in DB lookup missed, so the flag was never set on the token
    { session: "a session without the needsOnboarding flag", user: {} },
  ])("redirects a signed-in user without a district to /onboarding ($session)", async ({ user }) => {
    const res = await visit("/bills", await sessionFor(user));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/onboarding`);
  });

  it("lets a signed-in user with a district through, with security headers", async () => {
    const res = await visit(
      "/bills",
      await sessionFor({ state: "CA", cd: "12", needsOnboarding: false }),
    );

    expectPassedThroughWithSecurityHeaders(res);
  });

  it('treats an at-large district (cd "0") as complete instead of looping to onboarding', async () => {
    const res = await visit(
      "/bills",
      await sessionFor({ state: "AK", cd: "0", needsOnboarding: false }),
    );

    expectPassedThroughWithSecurityHeaders(res);
  });

  it("lets signed-out visitors through, with security headers", async () => {
    expectPassedThroughWithSecurityHeaders(await visit("/bills"));
  });

  it.each(["/onboarding", "/api/user/district"])(
    "never redirects %s, so onboarding can't loop even if the matcher is widened",
    async (path) => {
      const res = await visit(path, await sessionFor({ needsOnboarding: true }));

      expect(res.headers.get("location")).toBeNull();
    },
  );
});

describe("proxy when Auth.js is misconfigured", () => {
  // e.g. `next start` without AUTH_TRUST_HOST, or a deploy missing its secret:
  // Auth.js answers the session lookup with an error object instead of a session.
  let misconfiguredProxy: typeof proxyModule.default;

  beforeAll(async () => {
    vi.resetModules();
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    misconfiguredProxy = (await import("./proxy")).default;
  });

  it("lets signed-out visitors through instead of sending everyone to /onboarding", async () => {
    // Auth.js logs the configuration error on every lookup; keep test output clean.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await visit("/bills", undefined, misconfiguredProxy);

      expectPassedThroughWithSecurityHeaders(res);
    } finally {
      consoleError.mockRestore();
    }
  });
});
