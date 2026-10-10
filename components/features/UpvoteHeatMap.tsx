"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from "d3-zoom";
import { ArrowLeft, Plus, Minus, RotateCcw, MapPin } from "lucide-react";
import { fipsToState, stateToFips, districtKey, isDistrictInState } from "@/lib/usGeo";
import { getStateInfo } from "@/lib/states";

const W = 960;
const H = 600;
const MIN_TO_MAP = 3;

// Topojson is parsed at runtime; keep the parsed structures loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Topo = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoFeature = { id?: string | number;[k: string]: any };
type Tooltip = { x: number; y: number; title: string; sub: string };

interface Props {
  byState: Record<string, number>;
  byDistrict: Record<string, number>;
  totalUpvotes: number;
  /** false when no congressional-district topojson is available. */
  districtsAvailable?: boolean;
  /** viewer's home state abbreviation (any case) — emphasizes their district. */
  viewerState?: string;
  /** viewer's home congressional district number. */
  viewerDistrict?: string;
}

// The states asset exposes both `states` and a single-feature `nation`; the CD
// asset exposes one object. Prefer the named object, else the richest.
function pickObject(topo: Topo, prefer?: string): string {
  const objects = topo?.objects ?? {};
  const keys = Object.keys(objects);
  if (prefer && objects[prefer]) return prefer;
  return keys.reduce(
    (best, k) =>
      (objects[k]?.geometries?.length ?? 0) > (objects[best]?.geometries?.length ?? 0) ? k : best,
    keys[0]
  );
}

// district GEOID (e.g. "0612") -> tally key ("CA-12")
function geoIdToKey(geoId: string | number): string {
  const s = String(geoId);
  const abbr = fipsToState(s.slice(0, 2)) || "??";
  const num = String(parseInt(s.slice(2), 10) || 0).padStart(2, "0");
  return `${abbr}-${num}`;
}

const upvoteText = (v: number) => `${v} upvote${v === 1 ? "" : "s"}`;

export default function UpvoteHeatMap({
  byState,
  byDistrict,
  totalUpvotes,
  districtsAvailable = true,
  viewerState,
  viewerDistrict,
}: Props) {
  const vState = viewerState ? viewerState.toUpperCase() : undefined;
  const viewerKey =
    districtsAvailable && vState && viewerDistrict ? districtKey(vState, viewerDistrict) : null;
  const canFindMine = !!(viewerKey && stateToFips(vState!));

  const [statesTopo, setStatesTopo] = useState<Topo>(null);
  const [districtsTopo, setDistrictsTopo] = useState<Topo>(null);
  const [view, setView] = useState<"national" | "state">("national");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [tip, setTip] = useState<Tooltip | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const viewRef = useRef<"national" | "state">("national");

  // Load assets: states now, districts prefetched so drill-in is instant.
  useEffect(() => {
    let active = true;
    fetch("/maps/states-10m.json")
      .then((r) => r.json())
      .then((d) => active && setStatesTopo(d))
      .catch((e) => console.error("states map:", e));
    if (districtsAvailable) {
      fetch("/maps/cd-118.json")
        .then((r) => r.json())
        .then((d) => active && setDistrictsTopo(d))
        .catch((e) => console.error("cd map:", e));
    }
    return () => {
      active = false;
    };
  }, [districtsAvailable]);

  // One geoAlbersUsa projection, fitted to the national extent and shared by
  // both the states layer and the districts layer (same geographic space).
  const path = useMemo(() => {
    if (!statesTopo) return null;
    const proj = geoAlbersUsa();
    const fc = feature(statesTopo, statesTopo.objects[pickObject(statesTopo, "states")]);
    proj.fitSize([W, H], fc as never);
    return geoPath(proj);
  }, [statesTopo]);

  const stateFeatures = useMemo<GeoFeature[]>(() => {
    if (!statesTopo) return [];
    return (
      feature(statesTopo, statesTopo.objects[pickObject(statesTopo, "states")]) as unknown as {
        features: GeoFeature[];
      }
    ).features;
  }, [statesTopo]);

  const districtFeatures = useMemo<GeoFeature[]>(() => {
    if (!districtsTopo || !selectedState) return [];
    const all = (
      feature(districtsTopo, districtsTopo.objects[pickObject(districtsTopo)]) as unknown as {
        features: GeoFeature[];
      }
    ).features;
    return all.filter((f) => isDistrictInState(String(f.id), selectedState));
  }, [districtsTopo, selectedState]);

  // Attach d3-zoom once. Gestures (wheel/drag) only fire in the state view.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .filter((event: Event) => viewRef.current === "state" && !(event as MouseEvent).button)
      .on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) =>
        setTransform({ k: e.transform.k, x: e.transform.x, y: e.transform.y })
      );
    zoomRef.current = zb;
    select(svg).call(zb);
    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  const valueForState = (id: string | number) => {
    const a = fipsToState(String(id).slice(0, 2));
    return a ? byState[a] || 0 : 0;
  };
  const valueForDistrict = (id: string | number) => byDistrict[geoIdToKey(id)] || 0;

  const stateMax = useMemo(() => Math.max(1, ...Object.values(byState)), [byState]);
  const districtMax = useMemo(
    () => Math.max(1, ...districtFeatures.map((f) => valueForDistrict(f.id!))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [districtFeatures]
  );

  const fillFor = (v: number, max: number) =>
    v <= 0 ? "rgba(255,255,255,0.05)" : `rgba(212,175,55,${(0.15 + 0.85 * (v / max)).toFixed(3)})`;

  // Cursor-following tooltip positioned relative to the map wrapper.
  const showTip = (e: { clientX: number; clientY: number }, title: string, sub: string) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, sub });
  };
  const hideTip = () => setTip(null);

  function applyTransform(t: { k: number; x: number; y: number }) {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).call(zoomRef.current.transform, t as never);
    } else {
      setTransform({ k: t.k, x: t.x, y: t.y });
    }
  }

  function fitTransformFor(abbr: string) {
    const sf = stateFeatures.find((f) => String(f.id) === stateToFips(abbr));
    if (!sf || !path) return zoomIdentity;
    const [[x0, y0], [x1, y1]] = path.bounds(sf as never);
    const dx = x1 - x0;
    const dy = y1 - y0;
    if (!dx || !dy) return zoomIdentity;
    const k = Math.min(8, 0.9 / Math.max(dx / W, dy / H));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return zoomIdentity.translate(W / 2 - k * cx, H / 2 - k * cy).scale(k);
  }

  function drillTo(abbr: string) {
    if (!districtsAvailable) return;
    viewRef.current = "state";
    setView("state");
    setSelectedState(abbr);
    setTip(null);
    applyTransform(fitTransformFor(abbr));
  }

  function backToUS() {
    viewRef.current = "national";
    setView("national");
    setSelectedState(null);
    setTip(null);
    applyTransform(zoomIdentity);
  }

  const zoomBy = (factor: number) => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).call(zoomRef.current.scaleBy, factor);
    }
  };
  const resetZoom = () => {
    if (selectedState) applyTransform(fitTransformFor(selectedState));
  };

  if (totalUpvotes < MIN_TO_MAP) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <MapPin className="h-6 w-6 text-ink-3" aria-hidden="true" />
        <h3 className="mt-3 font-semibold text-ink">Where the support is</h3>
        <p className="mt-1 max-w-sm text-sm text-ink-3">
          The map appears once this proposal has {MIN_TO_MAP} upvotes. Share it to help it get there.
        </p>
      </div>
    );
  }

  const g = `translate(${transform.x},${transform.y}) scale(${transform.k})`;
  const mineFeature =
    view === "state" && viewerKey && selectedState === vState
      ? districtFeatures.find((f) => geoIdToKey(f.id!) === viewerKey)
      : undefined;
  const mineCentroid = mineFeature && path ? path.centroid(mineFeature as never) : null;

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex min-h-[2.25rem] flex-wrap items-center justify-between gap-3">
        {view === "national" ? (
          <>
            <div>
              <h3 className="font-semibold text-ink">Where the support is</h3>
              {districtsAvailable && <p className="text-sm text-ink-3">Select a state to see its districts.</p>}
            </div>
            {canFindMine && (
              <button
                type="button"
                onClick={() => drillTo(vState!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-gold/50 hover:text-ink"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" /> Find my district
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={backToUS}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the U.S.
            </button>
            <span className="text-sm text-ink-3">{(selectedState && getStateInfo(selectedState)?.name) || selectedState} districts</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-line-strong">
              <button type="button" onClick={() => zoomBy(1.5)} aria-label="Zoom in" className="px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out" className="border-x border-line-strong px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink">
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={resetZoom} aria-label="Reset zoom" className="px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>

      <div ref={wrapRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label={view === "national" ? "Upvotes by state" : `Upvotes by district in ${selectedState}`}
          style={{ cursor: view === "state" ? "grab" : "default", touchAction: "none" }}
          onMouseLeave={hideTip}
        >
          <g transform={g}>
            {view === "national"
              ? stateFeatures.map((f) => {
                  const v = valueForState(f.id!);
                  const abbr = fipsToState(String(f.id).slice(0, 2));
                  const name = (abbr && getStateInfo(abbr)?.name) || abbr || "Unknown";
                  return (
                    <path
                      key={String(f.id)}
                      d={path ? path(f as never) || "" : ""}
                      fill={fillFor(v, stateMax)}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={0.5 / transform.k}
                      style={{ cursor: districtsAvailable ? "pointer" : "default" }}
                      onClick={() => abbr && drillTo(abbr)}
                      onMouseEnter={(e) => showTip(e, name, upvoteText(v))}
                      onMouseMove={(e) => showTip(e, name, upvoteText(v))}
                    />
                  );
                })
              : districtFeatures.map((f) => {
                  const v = valueForDistrict(f.id!);
                  const key = geoIdToKey(f.id!);
                  return (
                    <path
                      key={String(f.id)}
                      d={path ? path(f as never) || "" : ""}
                      fill={fillFor(v, districtMax)}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={0.5 / transform.k}
                      onMouseEnter={(e) => showTip(e, key, upvoteText(v))}
                      onMouseMove={(e) => showTip(e, key, upvoteText(v))}
                    />
                  );
                })}

            {/* Emphasize the viewer's district on top so its outline isn't covered */}
            {mineFeature && (
              <path
                d={path ? path(mineFeature as never) || "" : ""}
                fill="none"
                stroke="#D4AF37"
                strokeWidth={2.4 / transform.k}
                pointerEvents="none"
              />
            )}
            {mineCentroid && !Number.isNaN(mineCentroid[0]) && (
              <g transform={`translate(${mineCentroid[0]},${mineCentroid[1]})`} pointerEvents="none">
                <circle r={3 / transform.k} fill="#D4AF37" />
                <text
                  y={-7 / transform.k}
                  textAnchor="middle"
                  fontSize={13 / transform.k}
                  fill="#F5E6C8"
                  stroke="rgba(10,14,26,0.85)"
                  strokeWidth={3.5 / transform.k}
                  style={{ paintOrder: "stroke", fontWeight: 600 }}
                >
                  You
                </text>
              </g>
            )}
          </g>
        </svg>

        {tip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: tip.x,
              top: tip.y,
              transform: "translate(-50%, calc(-100% - 12px))",
              backgroundColor: "rgba(10,14,26,0.96)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="font-semibold whitespace-nowrap" style={{ color: "#F5E6C8" }}>
              {tip.title}
            </div>
            <div className="whitespace-nowrap" style={{ color: "#D4AF37" }}>
              {tip.sub}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-ink-3" aria-hidden="true">
        <span>Fewer</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.15), rgba(212,175,55,1))" }}
        />
        <span>More upvotes</span>
      </div>
    </div>
  );
}
