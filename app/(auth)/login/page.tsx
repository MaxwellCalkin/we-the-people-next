import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
