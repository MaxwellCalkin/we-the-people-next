"use client";

import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { fipsToState } from "@/lib/usGeo";

type Layer = "states" | "districts";

interface Props {
  byState: Record<string, number>;
  byDistrict: Record<string, number>;
  totalUpvotes: number;
  /** false when no congressional-district topojson is available (Task 0). */
  districtsAvailable?: boolean;
}

const MIN_TO_MAP = 3;

// Topojson shapes are loaded at runtime; keep the parsed structure loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Topo = any;

interface RenderedPath {
  id: string;
  d: string;
}

/**
 * Picks the choropleth GeometryCollection out of a topojson `objects` map.
 *
 * The states asset (`states-10m.json`) exposes TWO objects — `states` AND
 * `nation` — so a naive `Object.keys(objects)[0]` could select the single
 * country blob. The CD asset exposes one object (`cb_2022_us_cd118_20m`).
 * We therefore prefer a district object, then `states`, then the object with
 * the most geometries (never the 1-geometry `nation`).
 */
function pickObjectName(topo: Topo, layer: Layer): string {
  const objects = (topo?.objects ?? {}) as Record<
    string,
    { geometries?: unknown[] }
  >;
  const keys = Object.keys(objects);
  if (keys.length === 0) return "";
  if (layer === "districts") {
    const cd = keys.find((k) => k.toLowerCase().includes("cd"));
    if (cd) return cd;
  } else if (objects.states) {
    return "states";
  }
  // Fallback: the richest collection (avoids the single-feature `nation`).
  return keys.reduce((best, k) =>
    (objects[k]?.geometries?.length ?? 0) > (objects[best]?.geometries?.length ?? 0)
      ? k
      : best,
  );
}

export default function UpvoteHeatMap({
  byState,
  byDistrict,
  totalUpvotes,
  districtsAvailable = true,
}: Props) {
  const [layer, setLayer] = useState<Layer>("states");
  // Tag the loaded topology with the layer it belongs to so a stale map from
  // the previous layer is never rendered while the new one is in flight.
  const [loaded, setLoaded] = useState<{ layer: Layer; topo: Topo } | null>(
    null,
  );

  useEffect(() => {
    const url =
      layer === "states" ? "/maps/states-10m.json" : "/maps/cd-118.json";
    let active = true;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (active) setLoaded({ layer, topo: d });
      })
      .catch((e) => console.error("Error loading map:", e));
    return () => {
      active = false;
    };
  }, [layer]);

  const topo = loaded && loaded.layer === layer ? loaded.topo : null;

  const values = layer === "states" ? byState : byDistrict;
  const max = useMemo(
    () => Math.max(1, ...Object.values(values)),
    [values],
  );

  // Translate a topojson feature id into its tally value.
  // States: id = 2-digit state FIPS -> abbr.
  // Districts: id = 4-digit GEOID (2-digit state FIPS + 2-digit district)
  //            -> "ST-cd" (district number un-padded then re-padded to 2).
  const valueFor = (geoId: string): number => {
    const abbr = fipsToState(geoId.slice(0, 2));
    if (!abbr) return 0; // territories (e.g. PR=72) aren't in the tally
    if (layer === "states") return values[abbr] || 0;
    const dist = String(parseInt(geoId.slice(2), 10) || 0).padStart(2, "0");
    return values[`${abbr}-${dist}`] || 0;
  };

  const paths = useMemo<RenderedPath[]>(() => {
    if (!topo) return [];
    const objName = pickObjectName(topo, layer);
    if (!objName || !topo.objects[objName]) return [];
    const collection = feature(topo, topo.objects[objName]) as unknown as {
      features: Array<{ id?: string | number; geometry: unknown }>;
    };
    const path = geoPath(geoAlbersUsa());
    return collection.features.map((f) => ({
      id: String(f.id),
      d: path(f as never) || "",
    }));
  }, [topo, layer]);

  const fillFor = (v: number): string =>
    v <= 0
      ? "rgba(255,255,255,0.04)"
      : `rgba(212,175,55,${(0.15 + 0.85 * (v / max)).toFixed(3)})`; // gold scale

  if (totalUpvotes < MIN_TO_MAP) {
    return (
      <p className="text-cream/40 text-sm text-center py-8">
        Not enough upvotes yet to map this proposal.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-brand text-lg text-cream">Where the support is</h3>
        <div className="inline-flex rounded-lg border border-glass-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setLayer("states")}
            className={`px-3 py-1 transition-colors ${
              layer === "states"
                ? "bg-gold/15 text-gold"
                : "text-cream/60 hover:text-cream"
            }`}
          >
            States
          </button>
          <button
            type="button"
            disabled={!districtsAvailable}
            onClick={() => setLayer("districts")}
            className={`px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              layer === "districts"
                ? "bg-gold/15 text-gold"
                : "text-cream/60 hover:text-cream"
            }`}
          >
            Districts{!districtsAvailable && " (soon)"}
          </button>
        </div>
      </div>
      <svg
        viewBox="0 0 960 600"
        className="w-full h-auto"
        role="img"
        aria-label={`Upvote heat map by ${layer}`}
      >
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill={fillFor(valueFor(p.id))}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
          />
        ))}
      </svg>
    </div>
  );
}
