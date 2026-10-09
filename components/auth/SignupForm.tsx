"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { describedBy } from "@/components/ui/Field";
import GoogleButton from "./GoogleButton";
import PasswordInput from "./PasswordInput";
import DistrictChoice, { type DistrictOption } from "./DistrictChoice";
import { loginHref } from "@/lib/safe-redirect";

// Mirrors the server-side checks in app/api/auth/signup/route.ts.
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;
const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (p: string) => p.length >= 10 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

type FormState = { userName: string; email: string; zip: string; password: string; confirmPassword: string };

export default function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ userName: "", email: "", zip: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [districts, setDistricts] = useState<DistrictOption[] | null>(null);
  const [splitState, setSplitState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === "zip" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "zip" && districts) {
      setDistricts(null);
      setSelectedDistrict(null);
    }
  };
  const blur = (key: keyof FormState) => () => setTouched((t) => ({ ...t, [key]: true }));

  const usernameError =
    touched.userName && form.userName && !USERNAME_PATTERN.test(form.userName.trim())
      ? "Use 3–30 letters, numbers, hyphens, or underscores."
      : undefined;
  const zipError = touched.zip && form.zip && form.zip.length !== 5 ? "Enter all 5 digits." : undefined;
  const confirmError =
    touched.confirmPassword && form.confirmPassword && form.confirmPassword !== form.password
      ? "Passwords don't match yet."
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ userName: true, email: true, zip: true, password: true, confirmPassword: true });

    const clientErrors: string[] = [];
    if (!USERNAME_PATTERN.test(form.userName.trim())) clientErrors.push("Choose a username of 3–30 letters, numbers, hyphens, or underscores.");
    const failedRules = PASSWORD_RULES.filter((r) => !r.test(form.password));
    if (failedRules.length) clientErrors.push(`Password needs: ${failedRules.map((r) => r.label.toLowerCase()).join(", ")}.`);
    if (form.password !== form.confirmPassword) clientErrors.push("Passwords don't match.");
    if (!/^\d{5}$/.test(form.zip)) clientErrors.push("Enter a 5-digit ZIP code.");
    if (clientErrors.length) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const payload: Record<string, string> = { ...form };
      if (selectedDistrict !== null && splitState) {
        payload.state = splitState;
        payload.cd = String(selectedDistrict);
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.needsDistrictSelection) {
        setDistricts(data.districts);
        setSplitState(data.state);
        setSelectedDistrict(data.districts[0]?.number ?? null);
        setLoading(false);
        return;
      }

      if (!data.success) {
        setErrors(data.errors || ["We couldn't create your account. Please try again."]);
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push(loginHref(callbackUrl));
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrors(["We couldn't reach the server. Check your connection and try again."]);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-brand text-4xl font-semibold text-ink">Create your account</h1>
      <p className="mt-2 text-ink-2">It&apos;s free. We&apos;ll match you with your senators and representative.</p>

      <div className="mt-8">
        <GoogleButton label="Sign up with Google" callbackUrl={callbackUrl} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium text-ink-3">
        <span className="h-px flex-1 bg-line" />
        or sign up with email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {errors.length > 0 && (
          <Alert tone="error" title={errors.length === 1 ? errors[0] : "Please fix the following:"}>
            {errors.length > 1 && (
              <ul className="list-disc space-y-0.5 pl-4">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        <Field id="userName" label="Username" hint="Shown on your proposals. Letters, numbers, - and _." error={usernameError}>
          <input
            id="userName"
            name="userName"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={form.userName}
            onChange={set("userName")}
            onBlur={blur("userName")}
            placeholder="e.g. civic_sam"
            required
            aria-invalid={usernameError ? true : undefined}
            aria-describedby={describedBy("userName", { hint: true, error: usernameError })}
            className="field h-12"
          />
        </Field>

        <Field id="email" label="Email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            onBlur={blur("email")}
            placeholder="you@example.com"
            required
            className="field h-12"
          />
        </Field>

        <Field
          id="zip"
          label="ZIP code"
          hint="Used once to find your congressional district. We don't store it."
          error={zipError}
        >
          <input
            id="zip"
            name="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            value={form.zip}
            onChange={set("zip")}
            onBlur={blur("zip")}
            placeholder="12345"
            required
            aria-invalid={zipError ? true : undefined}
            aria-describedby={describedBy("zip", { hint: true, error: zipError })}
            className="field h-12 max-w-[10rem] tracking-[0.15em]"
          />
        </Field>

        {districts && (
          <DistrictChoice
            state={splitState}
            districts={districts}
            value={selectedDistrict}
            onChange={setSelectedDistrict}
          />
        )}

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            onBlur={blur("password")}
            placeholder="Create a password"
            required
            aria-describedby="password-rules"
          />
          <ul id="password-rules" className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Password requirements">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(form.password);
              return (
                <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${met ? "text-yea" : "text-ink-3"}`}>
                  {met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
                  {rule.label}
                  <span className="sr-only">{met ? "(met)" : "(not met yet)"}</span>
                </li>
              );
            })}
          </ul>
        </Field>

        <Field id="confirmPassword" label="Confirm password" error={confirmError}>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            onBlur={blur("confirmPassword")}
            placeholder="Type it again"
            required
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={describedBy("confirmPassword", { error: confirmError })}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={loading} loadingText="Creating your account…">
          {districts ? "Confirm district and create account" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-2">
        Already have an account?{" "}
        <Link
          href={callbackUrl === "/profile" ? "/login" : loginHref(callbackUrl)}
          className="font-semibold text-gold-bright underline-offset-4 hover:text-gold hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
