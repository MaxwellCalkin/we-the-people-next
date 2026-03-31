"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GlassCard from "@/components/ui/GlassCard";
import MagneticButton from "@/components/ui/MagneticButton";

interface District {
  number: number;
  proportion: number;
}

export default function OnboardingPage() {
  const { update } = useSession();
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[] | null>(null);
  const [splitState, setSplitState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);

  const saveDistrictAndRedirect = async (state: string, cd: string) => {
    const res = await fetch("/api/user/district", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, cd }),
    });

    if (!res.ok) {
      toast.error("Failed to save your district. Please try again.");
      return;
    }

    // Refresh the session so needsOnboarding updates
    await update();
    router.push("/bills");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{5}$/.test(zip)) {
      toast.error("Please enter a valid 5-digit ZIP code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/district", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not look up your district.");
        setLoading(false);
        return;
      }

      // Single district — save immediately
      if (data.state && data.cd !== undefined && !data.districts) {
        await saveDistrictAndRedirect(data.state, String(data.cd));
        return;
      }

      // Split ZIP — show district picker
      if (data.districts) {
        setDistricts(data.districts);
        setSplitState(data.state);
        setSelectedDistrict(data.districts[0]?.number ?? null);
        setLoading(false);
        return;
      }

      toast.error("Unexpected response. Please try again.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictSelect = async () => {
    if (selectedDistrict === null) return;
    setLoading(true);
    try {
      await saveDistrictAndRedirect(splitState, String(selectedDistrict));
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-cream placeholder:text-cream/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all";

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <GlassCard className="p-8 max-w-md w-full">
        <h1 className="text-3xl font-brand font-bold text-cream text-center mb-4">
          Welcome to Heard
        </h1>

        <p className="text-cream/70 text-center mb-8">
          To show you how your representatives vote, we need to know your
          congressional district. Enter your ZIP code below &mdash; we never
          store it.
        </p>

        {!districts ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="zip"
                className="block text-sm text-cream/70 mb-1.5"
              >
                ZIP Code
              </label>
              <input
                id="zip"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
                required
                className={inputClasses}
              />
            </div>

            <div className="pt-2 flex justify-center">
              <MagneticButton type="submit" disabled={loading}>
                {loading ? "Looking up..." : "Find My District"}
              </MagneticButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-cream/70">
              Your ZIP code spans multiple congressional districts. Please
              select yours:
            </p>
            <div className="flex flex-col gap-2">
              {districts.map((d) => (
                <label
                  key={d.number}
                  className="flex items-center gap-3 p-3 rounded-lg border border-glass-border bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <input
                    type="radio"
                    name="district"
                    value={d.number}
                    checked={selectedDistrict === d.number}
                    onChange={() => setSelectedDistrict(d.number)}
                    className="accent-gold"
                  />
                  <span className="text-cream">
                    {splitState.toUpperCase()} District {d.number}
                  </span>
                  <span className="text-cream/40 text-xs ml-auto">
                    {Math.round(d.proportion * 100)}% of ZIP
                  </span>
                </label>
              ))}
            </div>
            <div className="pt-2 flex justify-center">
              <MagneticButton
                type="button"
                onClick={handleDistrictSelect}
                disabled={loading}
              >
                {loading ? "Saving..." : "Continue"}
              </MagneticButton>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
