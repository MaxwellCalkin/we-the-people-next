"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password.");
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
        Welcome Back
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="email" className="block text-sm text-cream/70 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className={inputClasses}
          />
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
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className={inputClasses}
          />
        </div>

        <div className="pt-2 flex justify-center">
          <MagneticButton type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </MagneticButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-cream/60">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gold hover:underline">
          Sign Up
        </Link>
      </p>
    </GlassCard>
  );
}
