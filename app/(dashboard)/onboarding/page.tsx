// app/(dashboard)/onboarding/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginHref } from "@/lib/safe-redirect";
import OnboardingForm from "@/components/auth/OnboardingForm";

export const metadata: Metadata = { title: "Find your representatives" };

export default async function OnboardingPage() {
  // Saving a district needs an account, so signed-out visitors log in first
  // and come back here. (The proxy skips this page.)
  const session = await auth();
  if (!session?.user) redirect(loginHref("/onboarding"));

  return <OnboardingForm />;
}
