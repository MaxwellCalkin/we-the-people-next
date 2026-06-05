// app/(dashboard)/proposals/page.tsx
//
// Community bill proposals ranking board. Server component: reads scope/sort/
// state/district from the URL, applies browse-friendly defaults (the viewer's
// own state/district when known, else Global), and renders the client control
// bar plus a grid of ProposalCard. Any scope/state/district is selectable by
// anyone — the viewer's location is only a starting default, never a gate.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { listProposals } from "@/lib/proposals";
import { isValidStateCode } from "@/lib/states";
import ProposalBoardControls from "@/components/features/ProposalBoardControls";
import ProposalCard from "@/components/features/ProposalCard";
import StaggerReveal from "@/components/animations/StaggerReveal";

type Scope = "global" | "state" | "district";
type Sort = "top" | "new";

interface ProposalsPageProps {
  searchParams: Promise<{
    scope?: string;
    state?: string;
    district?: string;
    sort?: string;
  }>;
}

export default async function ProposalsPage({ searchParams }: ProposalsPageProps) {
  const session = await auth();
  const params = await searchParams;

  const viewerState =
    session?.user?.state && isValidStateCode(session.user.state)
      ? session.user.state.toUpperCase()
      : undefined;
  const viewerDistrict = session?.user?.cd || undefined;

  // Resolve scope. An explicit URL value wins; otherwise default to Global
  // (nationwide) — most useful while volume is still building, since a viewer's
  // own district is often empty early on. The controls still pre-select the
  // viewer's own state/district when they narrow down (browse-friendly).
  let scope: Scope;
  if (params.scope === "global" || params.scope === "state" || params.scope === "district") {
    scope = params.scope;
  } else {
    scope = "global";
  }

  // Resolve state/district, falling back to the viewer's own location and
  // finally collapsing to Global if a narrower scope has no usable location.
  let state =
    params.state && isValidStateCode(params.state)
      ? params.state.toUpperCase()
      : viewerState;
  let district = params.district || (state === viewerState ? viewerDistrict : undefined);

  if ((scope === "state" || scope === "district") && !state) {
    scope = "global";
    state = undefined;
    district = undefined;
  }
  if (scope === "district" && !district) {
    scope = "state";
    district = undefined;
  }

  const sort: Sort = params.sort === "new" ? "new" : "top";

  const { proposals } = await listProposals({
    scope,
    state: scope === "global" ? undefined : state,
    district: scope === "district" ? district : undefined,
    sort,
    viewerId: session?.user?.id,
  });

  const scopeLabel =
    scope === "district"
      ? `${state}-${district}`
      : scope === "state"
        ? state
        : "Nationwide";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="font-brand text-3xl sm:text-4xl text-gradient">Proposals</h1>
          <p className="text-cream/50 text-sm mt-1">
            Community ideas for new bills — upvote the ones you want your
            representatives to hear.
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-navy hover:bg-gold/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Propose a Bill
        </Link>
      </div>

      <div className="mt-6 mb-6">
        <ProposalBoardControls
          scope={scope}
          sort={sort}
          state={state ?? ""}
          district={district ?? ""}
        />
      </div>

      {proposals.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-cream/60 text-lg">No proposals yet for {scopeLabel}.</p>
          <p className="text-cream/40 text-sm mt-2">
            Be the first to{" "}
            <Link href="/proposals/new" className="text-gold hover:text-gold/80">
              propose a bill
            </Link>
            .
          </p>
        </div>
      ) : (
        <StaggerReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal._id} proposal={proposal} />
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
