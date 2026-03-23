"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    userName: "",
    email: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        const errors: string[] = data.errors || ["Signup failed."];
        errors.forEach((err: string) => toast.error(err));
        setLoading(false);
        return;
      }

      // Auto-login after successful signup
      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error("Account created but login failed. Please log in manually.");
        router.push("/login");
      } else {
        router.push("/profile");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all";

  return (
    <GlassCard className="p-8">
      <h1 className="text-3xl font-brand font-bold text-cream text-center mb-8">
        Create Your Account
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="userName"
            className="block text-sm text-cream/70 mb-1.5"
          >
            Username
          </label>
          <input
            id="userName"
            name="userName"
            type="text"
            value={form.userName}
            onChange={handleChange}
            placeholder="Choose a username"
            required
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-cream/70 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
            className={inputClasses}
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm text-cream/70 mb-1.5"
          >
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={form.address}
            onChange={handleChange}
            placeholder="123 Main St, City, State, Zip"
            required
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-cream/40">
            Used to find your congressional district
          </p>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm text-cream/70 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            required
            className={inputClasses}
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm text-cream/70 mb-1.5"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            required
            className={inputClasses}
          />
        </div>

        <div className="pt-2 flex justify-center">
          <MagneticButton type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </MagneticButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-cream/60">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:underline">
          Log In
        </Link>
      </p>
    </GlassCard>
  );
}
