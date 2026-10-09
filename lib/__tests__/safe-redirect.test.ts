import { describe, expect, it } from "vitest";
import { loginHref, safeCallbackUrl } from "@/lib/safe-redirect";

describe("safeCallbackUrl", () => {
  it("keeps same-site paths, including query strings", () => {
    expect(safeCallbackUrl("/vote/hr1/119")).toBe("/vote/hr1/119");
    expect(safeCallbackUrl("/proposals?scope=state&state=PA")).toBe("/proposals?scope=state&state=PA");
  });

  it("falls back for missing values", () => {
    expect(safeCallbackUrl(undefined)).toBe("/profile");
    expect(safeCallbackUrl("", "/bills")).toBe("/bills");
  });

  it("rejects absolute and protocol-relative URLs that would leave the site", () => {
    expect(safeCallbackUrl("https://evil.example/phish")).toBe("/profile");
    expect(safeCallbackUrl("//evil.example")).toBe("/profile");
    expect(safeCallbackUrl("/\\evil.example")).toBe("/profile");
  });

  it("does not send people back to the auth pages they just left", () => {
    expect(safeCallbackUrl("/login?callbackUrl=/x")).toBe("/profile");
    expect(safeCallbackUrl("/signup")).toBe("/profile");
  });

  it("uses the first value when a param is repeated", () => {
    expect(safeCallbackUrl(["/bills", "/members"])).toBe("/bills");
  });
});

describe("loginHref", () => {
  it("encodes the return path for the login page", () => {
    expect(loginHref("/vote/hr1/119")).toBe("/login?callbackUrl=%2Fvote%2Fhr1%2F119");
    expect(loginHref("/proposals/new", "/signup")).toBe("/signup?callbackUrl=%2Fproposals%2Fnew");
  });
});
