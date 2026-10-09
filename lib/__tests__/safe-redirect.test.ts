import { describe, expect, it } from "vitest";
import { loginHref, safeCallbackUrl } from "@/lib/safe-redirect";
import { HOME_PATH } from "@/lib/routes";

describe("safeCallbackUrl", () => {
  it("keeps same-site paths, including query strings", () => {
    expect(safeCallbackUrl("/vote/hr1/119")).toBe("/vote/hr1/119");
    expect(safeCallbackUrl("/proposals?scope=state&state=PA")).toBe("/proposals?scope=state&state=PA");
  });

  it("falls back to the signed-in home for missing values", () => {
    expect(safeCallbackUrl(undefined)).toBe(HOME_PATH);
    expect(safeCallbackUrl("", "/bills")).toBe("/bills");
  });

  it("rejects absolute and protocol-relative URLs that would leave the site", () => {
    expect(safeCallbackUrl("https://evil.example/phish")).toBe(HOME_PATH);
    expect(safeCallbackUrl("//evil.example")).toBe(HOME_PATH);
    expect(safeCallbackUrl("/\\evil.example")).toBe(HOME_PATH);
  });

  it("does not send people back to the auth pages they just left", () => {
    expect(safeCallbackUrl("/login?callbackUrl=/x")).toBe(HOME_PATH);
    expect(safeCallbackUrl("/signup")).toBe(HOME_PATH);
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
