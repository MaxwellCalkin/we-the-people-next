import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SignupForm from "../SignupForm";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const signIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  push.mockClear();
  signIn.mockClear();
});

async function fill(user: ReturnType<typeof userEvent.setup>, password: string, confirm = password) {
  await user.type(screen.getByLabelText("Username"), "civic_sam");
  await user.type(screen.getByLabelText("Email"), "sam@example.com");
  await user.type(screen.getByLabelText("ZIP code"), "19103");
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirm);
}

describe("SignupForm", () => {
  it("shows each password requirement as it is met", async () => {
    const user = userEvent.setup({ delay: null });
    render(<SignupForm callbackUrl="/profile" />);

    const rules = screen.getByRole("list", { name: "Password requirements" });
    expect(rules).toHaveTextContent("At least 10 characters(not met yet)");

    await user.type(screen.getByLabelText("Password"), "Longenough1");
    expect(rules).toHaveTextContent("At least 10 characters(met)");
    expect(rules).toHaveTextContent("One uppercase letter(met)");
    expect(rules).toHaveTextContent("One number(met)");
  });

  it("blocks a weak password before contacting the server", async () => {
    const user = userEvent.setup({ delay: null });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<SignupForm callbackUrl="/profile" />);

    await fill(user, "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Password needs: at least 10 characters, one uppercase letter, one number.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("blocks mismatched passwords before contacting the server", async () => {
    const user = userEvent.setup({ delay: null });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<SignupForm callbackUrl="/profile" />);

    await fill(user, "Longenough1", "Longenough2");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords don't match.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the server's validation errors inline", async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false, errors: ["An account with that email already exists."] }), { status: 400 })
    );
    render(<SignupForm callbackUrl="/profile" />);

    await fill(user, "Longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An account with that email already exists.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("asks which district to use when a ZIP code spans several", async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, needsDistrictSelection: true, state: "pa", districts: [{ number: 3, proportion: 0.6 }, { number: 5, proportion: 0.4 }] }),
        { status: 200 }
      )
    );
    render(<SignupForm callbackUrl="/profile" />);

    await fill(user, "Longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("radio", { name: /PA-03/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /PA-05/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm district and create account" })).toBeInTheDocument();
  });

  it("signs the new account in and returns to where the person started", async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 201 }));
    signIn.mockResolvedValue({ error: undefined });
    render(<SignupForm callbackUrl="/vote/hr725/119" />);

    await fill(user, "Longenough1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/vote/hr725/119"));
    expect(signIn).toHaveBeenCalledWith("credentials", { email: "sam@example.com", password: "Longenough1", redirect: false });
  });
});
