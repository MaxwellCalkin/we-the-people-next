// app/(dashboard)/proposals/page.tsx
//
// Community bill proposals ranking board. Server component: reads scope/sort/
// state/district from the URL, applies browse-friendly defaults (the viewer's
// own state/district when known, else Global), and renders the client control
// bar plus a grid of ProposalCard. Any scope/state/district is selectable by
// anyone — the viewer's location is only a starting default, never a gate.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Lightbulb, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { listProposals } from "@/lib/proposals";
import { isValidStateCode, stateName } from "@/lib/states";
import { seatLabel } from "@/lib/format";
import ProposalBoardControls from "@/components/features/ProposalBoardControls";
import ProposalCard from "@/components/features/ProposalCard";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Community proposals" };

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
    session?.user?.state && isValidStateCode(session.user.state) ? session.user.state.toUpperCase() : undefined;
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
  let state = params.state && isValidStateCode(params.state) ? params.state.toUpperCase() : viewerState;
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

  const { proposals, total } = await listProposals({
    scope,
    state: scope === "global" ? undefined : state,
    district: scope === "district" ? district : undefined,
    sort,
    viewerId: session?.user?.id,
  });

  const scopeLabel =
    scope === "district" && state
      ? seatLabel("House", state, district)
      : scope === "state" && state
        ? stateName(state)
        : "the whole country";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Community"
        title="Proposals"
        description="Ideas for new laws from people on Heard. Upvote the ones you want your representatives to hear about."
        actions={
          <ButtonLink href="/proposals/new" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Propose a Bill
          </ButtonLink>
        }
      />

      <ProposalBoardControls scope={scope} sort={sort} state={state ?? ""} district={district ?? ""} />

      <p className="mb-4 mt-5 text-sm text-ink-3" aria-live="polite">
        {total === 0
          ? `No proposals from ${scopeLabel} yet`
          : `${total.toLocaleString("en-US")} ${total === 1 ? "proposal" : "proposals"} from ${scopeLabel}, ${
              sort === "top" ? "most upvoted first" : "newest first"
            }`}
      </p>

      {proposals.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={scope === "global" ? "No proposals yet" : `No proposals from ${scopeLabel} yet`}
          description="Describe a problem and what you'd like Congress to do about it. Neighbors can upvote it, and you'll see where the support comes from."
          action={<ButtonLink href="/proposals/new">Write a proposal</ButtonLink>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proposals.map((proposal, i) => (
            <li key={proposal._id}>
              <ProposalCard proposal={proposal} rank={sort === "top" ? i + 1 : undefined} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
