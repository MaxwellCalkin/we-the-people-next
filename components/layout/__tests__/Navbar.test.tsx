import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import Navbar from "../Navbar";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={(props.alt as string) || ""} />
  ),
}));

let mockPathname = "/bills";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname,
}));

const mockSignOut = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

afterEach(() => {
  cleanup();
  mockSignOut.mockClear();
  mockPathname = "/bills";
  document.body.style.overflow = "";
});

describe("Navbar", () => {
  it("links the logo to the profile for signed-in users", () => {
    render(<Navbar userName="Alice" />);
    expect(screen.getByRole("link", { name: "Heard home" })).toHaveAttribute("href", "/profile");
  });

  it("links the logo to the landing page for visitors", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: "Heard home" })).toHaveAttribute("href", "/");
  });

  it("renders the main section links", () => {
    render(<Navbar userName="Alice" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Bills" })).toHaveAttribute("href", "/bills");
    expect(within(nav).getByRole("link", { name: "Members" })).toHaveAttribute("href", "/members");
    expect(within(nav).getByRole("link", { name: "Elections" })).toHaveAttribute("href", "/elections");
    expect(within(nav).getByRole("link", { name: "Proposals" })).toHaveAttribute("href", "/proposals");
  });

  it("marks the section for the current page, including nested routes", () => {
    mockPathname = "/vote/hr1/119";
    render(<Navbar userName="Alice" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Bills" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Members" })).not.toHaveAttribute("aria-current");
  });

  it("does not render Profile as a top-level desktop nav link", () => {
    render(<Navbar userName="Alice" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const desktopLinkTexts = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(desktopLinkTexts).not.toContain("Profile");
  });

  it("shows Log in and Sign up instead of an account menu when nobody is signed in", () => {
    render(<Navbar userName="" />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByRole("button", { name: "User menu" })).not.toBeInTheDocument();
  });

  it("shows avatar dropdown with Profile and Log out when avatar button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" district="PA-12" />);

    const menuButton = screen.getByRole("button", { name: "User menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await user.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByText("Voting district PA-12")).toBeInTheDocument();
  });

  it("calls signOut when Log out is clicked in the avatar dropdown", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    await user.click(screen.getByRole("button", { name: "User menu" }));
    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("closes avatar dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    await user.click(screen.getByRole("button", { name: "User menu" }));
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("closes the avatar dropdown with Escape and returns focus to the menu button", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    const menuButton = screen.getByRole("button", { name: "User menu" });
    await user.click(menuButton);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
  });

  it("renders user initials in the avatar when no image is provided", () => {
    render(<Navbar userName="Alice Baker" />);
    expect(screen.getAllByText("AB").length).toBeGreaterThanOrEqual(1);
  });

  it("opens the mobile menu, locks page scroll, and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(within(dialog).getByRole("button", { name: "Close menu" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
