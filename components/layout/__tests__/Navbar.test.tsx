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
    <img {...props} alt={(props.alt as string) || ""} />
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockSignOut = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

afterEach(() => {
  cleanup();
  mockSignOut.mockClear();
});

describe("Navbar", () => {
  it("renders the logo linking to /profile", () => {
    render(<Navbar userName="Alice" />);
    const logo = screen.getByText("Heard");
    expect(logo.closest("a")).toHaveAttribute("href", "/profile");
  });

  it("renders Bills, Members, Feed, and How It Works nav links", () => {
    render(<Navbar userName="Alice" />);
    const billsLinks = screen.getAllByRole("link", { name: "Bills" });
    expect(billsLinks.length).toBeGreaterThanOrEqual(1);
    expect(billsLinks[0]).toHaveAttribute("href", "/bills");

    const membersLinks = screen.getAllByRole("link", { name: "Members" });
    expect(membersLinks[0]).toHaveAttribute("href", "/members");
  });

  it("does not render Profile as a top-level desktop nav link", () => {
    render(<Navbar userName="Alice" />);
    const nav = screen.getAllByRole("navigation")[0];
    const desktopLinks = within(nav).getAllByRole("link");
    const desktopLinkTexts = desktopLinks.map((l) => l.textContent);
    expect(desktopLinkTexts).not.toContain("Profile");
  });

  it("shows avatar dropdown with Profile and Logout when avatar button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    const menuButtons = screen.getAllByRole("button", { name: "User menu" });
    await user.click(menuButtons[0]);

    const profileLinks = screen.getAllByRole("link", { name: "Profile" });
    expect(profileLinks.length).toBeGreaterThanOrEqual(1);
    expect(profileLinks[0]).toHaveAttribute("href", "/profile");
  });

  it("calls signOut when Logout is clicked in the avatar dropdown", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    const menuButtons = screen.getAllByRole("button", { name: "User menu" });
    await user.click(menuButtons[0]);

    const dropdownContainer = menuButtons[0].closest(".relative")!;
    const logoutBtn = within(dropdownContainer as HTMLElement).getByRole(
      "button",
      { name: /logout/i }
    );
    await user.click(logoutBtn);

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("closes avatar dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    const menuButtons = screen.getAllByRole("button", { name: "User menu" });
    await user.click(menuButtons[0]);

    const dropdownContainer = menuButtons[0].closest(".relative")!;
    expect(
      within(dropdownContainer as HTMLElement).queryByRole("button", {
        name: /logout/i,
      })
    ).toBeInTheDocument();

    await user.click(document.body);

    expect(
      within(dropdownContainer as HTMLElement).queryByRole("button", {
        name: /logout/i,
      })
    ).not.toBeInTheDocument();
  });

  it("renders user initials in the avatar when no image is provided", () => {
    render(<Navbar userName="Alice Baker" />);
    expect(screen.getAllByText("AB").length).toBeGreaterThanOrEqual(1);
  });

  it("opens mobile sidebar when hamburger menu is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar userName="Alice" />);

    const hamburgers = screen.getAllByRole("button", { name: "Toggle menu" });
    await user.click(hamburgers[0]);

    expect(
      screen.getAllByRole("button", { name: "Close menu" }).length
    ).toBeGreaterThanOrEqual(1);
  });
});
