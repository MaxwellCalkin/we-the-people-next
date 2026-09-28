// Where people land once they're in: every way of getting into the app
// (Google, email login, email signup, finishing onboarding) should open the
// Elections page, not the Bills page whose default Trending tab is often empty.
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import LoginPage from "../(auth)/login/page";
import SignupPage from "../(auth)/signup/page";
import OnboardingPage from "../(dashboard)/onboarding/page";
import ElectionsIndexPage from "../(dashboard)/elections/page";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockPush = vi.fn();
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  redirect: (url: string) => mockRedirect(url),
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));

const mockSignIn = vi.fn();
const mockUpdateSession = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => ({ update: mockUpdateSession }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("gsap", () => ({ default: { to: vi.fn() } }));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

afterEach(() => {
  cleanup();
  mockPush.mockReset();
  mockRedirect.mockClear();
  mockAuth.mockReset();
  mockSignIn.mockReset();
  mockUpdateSession.mockReset();
  mockFetch.mockReset();
});

describe("after signing in", () => {
  it("sends Google sign-ins from the login page to Elections", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/elections",
    });
  });

  it("sends email logins to Elections", async () => {
    mockSignIn.mockResolvedValue({ error: undefined });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "voter@example.com");
    await user.type(screen.getByLabelText("Password"), "Password1234");
    await user.click(screen.getByRole("button", { name: "Log In" }));

    expect(mockPush).toHaveBeenCalledWith("/elections");
  });

  it("sends Google sign-ups to Elections", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.click(screen.getByRole("button", { name: "Sign up with Google" }));

    expect(mockSignIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/elections",
    });
  });

  it("sends new email sign-ups to Elections", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));
    mockSignIn.mockResolvedValue({ error: undefined });
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.type(screen.getByLabelText("Username"), "new_voter");
    await user.type(screen.getByLabelText("Email"), "voter@example.com");
    await user.type(screen.getByLabelText("ZIP Code"), "05401");
    await user.type(screen.getByLabelText("Password"), "Password1234");
    await user.type(screen.getByLabelText("Confirm Password"), "Password1234");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockPush).toHaveBeenCalledWith("/elections");
  });

  it("sends people who just saved their district during onboarding to Elections", async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ state: "vt", districts: [{ number: 0, proportion: 1 }] })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true }));
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.type(screen.getByLabelText("ZIP Code"), "05401");
    await user.click(screen.getByRole("button", { name: "Find My District" }));

    expect(mockUpdateSession).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/elections");
  });

  it("sends a brand-new Google account from Elections to onboarding, since it has no district yet", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "new@example.com", state: undefined, cd: undefined },
    });

    await expect(ElectionsIndexPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
  });
});
