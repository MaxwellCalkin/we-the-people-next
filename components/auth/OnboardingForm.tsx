"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { describedBy } from "@/components/ui/Field";
import DistrictChoice, { type DistrictOption } from "@/components/auth/DistrictChoice";
import { HOME_PATH } from "@/lib/routes";
import { loginHref } from "@/lib/safe-redirect";

export default function OnboardingForm() {
  const { update } = useSession();
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [districts, setDistricts] = useState<DistrictOption[] | null>(null);
  const [splitState, setSplitState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);

  // Both lookups need an account. If the session ended while the form was
  // open, send them to log in and back here instead of showing an error.
  const logInAgain = () => router.push(loginHref("/onboarding"));

  const saveDistrict = async (state: string, cd: string) => {
    const res = await fetch("/api/user/district", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, cd }),
    });
    if (res.status === 401) {
      logInAgain();
      return;
    }
    if (!res.ok) {
      setError("We couldn't save your district. Please try again.");
      setLoading(false);
      return;
    }
    // Refresh the session so needsOnboarding updates, then open the signed-in home.
    await update();
    router.push(HOME_PATH);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (districts) {
      if (selectedDistrict === null) return;
      setLoading(true);
      try {
        await saveDistrict(splitState, String(selectedDistrict));
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
      return;
    }

    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5-digit ZIP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/district", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
      });
      if (res.status === 401) {
        logInAgain();
        return;
      }
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "We couldn't find a district for that ZIP code.");
        setLoading(false);
        return;
      }
      if (data.districts?.length === 1) {
        await saveDistrict(data.state, String(data.districts[0].number));
        return;
      }
      if (data.districts?.length > 1) {
        setDistricts(data.districts);
        setSplitState(data.state);
        setSelectedDistrict(data.districts[0]?.number ?? null);
        setLoading(false);
        return;
      }
      setError("We couldn't find a district for that ZIP code.");
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-6 sm:py-12">
      <div className="card p-6 sm:p-8 animate-fade-up">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 text-gold-bright ring-1 ring-gold/25">
          <MapPin className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-brand text-3xl font-semibold text-ink sm:text-4xl">Find your representatives</h1>
        <p className="mt-3 leading-relaxed text-ink-2">
          Your ZIP code tells us which senators and House member represent you, so we can compare their votes with
          yours. We use it once and don&apos;t store it.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {error && <Alert tone="error">{error}</Alert>}

          <Field id="zip" label="ZIP code" hint="The ZIP code where you're registered to vote.">
            <input
              id="zip"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              pattern="[0-9]{5}"
              maxLength={5}
              value={zip}
              onChange={(e) => {
                setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                setDistricts(null);
              }}
              placeholder="12345"
              required
              autoFocus
              aria-describedby={describedBy("zip", { hint: true })}
              className="field h-12 max-w-[10rem] text-lg tracking-[0.2em]"
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

          <Button type="submit" size="lg" fullWidth loading={loading} loadingText={districts ? "Saving…" : "Looking up your district…"}>
            {districts ? "Save my district" : "Find my district"}
          </Button>
        </form>
      </div>
    </div>
  );
}
