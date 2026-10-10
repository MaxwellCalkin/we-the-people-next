import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  return <SignupForm callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
