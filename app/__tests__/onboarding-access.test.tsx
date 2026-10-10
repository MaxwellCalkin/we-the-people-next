// Who can use onboarding: saving a district needs an account, so signed-out
// visitors are sent to log in and brought back, before and during the form.
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import OnboardingPage from "../(dashboard)/onboarding/page";

const mockPush = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  redirect: (url: string) => mockRedirect(url),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: vi.fn() }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const signedIn = { user: { id: "u1", email: "voter@example.com" } };
const unauthorized = { ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) };

afterEach(() => {
  cleanup();
  mockPush.mockReset();
  mockRedirect.mockClear();
  mockAuth.mockReset();
  mockFetch.mockReset();
});

describe("onboarding", () => {
  it("sends signed-out visitors to log in, then back to onboarding", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fonboarding");
  });

  it("treats a session lookup that returns no user (a misconfigured Auth.js) as signed out", async () => {
    mockAuth.mockResolvedValue({ message: "There was a problem with the server configuration." });

    await expect(OnboardingPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login?callbackUrl=%2Fonboarding");
  });

  it("shows signed-in people the ZIP code form", async () => {
    mockAuth.mockResolvedValue(signedIn);

    render(await OnboardingPage());

    expect(screen.getByRole("heading", { name: "Find your representatives" })).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP code")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it.each([
    { step: "looking up the ZIP code", responses: [unauthorized] },
    {
      step: "saving the district",
      responses: [
        { ok: true, status: 200, json: async () => ({ state: "vt", districts: [{ number: 0, proportion: 1 }] }) },
        unauthorized,
      ],
    },
  ])(
    "sends someone whose session ended to log in instead of showing an error while $step",
    async ({ responses }) => {
      for (const response of responses) mockFetch.mockResolvedValueOnce(response);
      mockAuth.mockResolvedValue(signedIn);
      const user = userEvent.setup({ delay: null });
      render(await OnboardingPage());

      await user.type(screen.getByLabelText("ZIP code"), "05401");
      await user.click(screen.getByRole("button", { name: "Find my district" }));

      expect(mockPush).toHaveBeenCalledWith("/login?callbackUrl=%2Fonboarding");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  );
});
