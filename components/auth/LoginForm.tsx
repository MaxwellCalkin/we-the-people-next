"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import GoogleButton from "./GoogleButton";
import PasswordInput from "./PasswordInput";
import { loginHref } from "@/lib/safe-redirect";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("That email and password don't match an account. Check them and try again.");
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-brand text-4xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-2 text-ink-2">Log in to vote on bills and see how your representatives line up with you.</p>

      <div className="mt-8">
        <GoogleButton label="Continue with Google" callbackUrl={callbackUrl} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium text-ink-3">
        <span className="h-px flex-1 bg-line" />
        or log in with email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <Field id="email" label="Email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-invalid={error ? true : undefined}
            className="field h-12"
          />
        </Field>

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            aria-invalid={error ? true : undefined}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={loading} loadingText="Logging in…">
          Log in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-2">
        New to Heard?{" "}
        <Link
          href={callbackUrl === "/profile" ? "/signup" : loginHref(callbackUrl, "/signup")}
          className="font-semibold text-gold-bright underline-offset-4 hover:text-gold hover:underline"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
