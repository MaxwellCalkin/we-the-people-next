// components/features/ProfileHeader.tsx
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import AlignmentBadge from "@/components/ui/AlignmentBadge";
import PartyBadge from "@/components/ui/PartyBadge";
import { SectionHeading } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import AvatarUpload from "@/components/features/AvatarUpload";
import { displayName } from "@/lib/format";
import { stateName } from "@/lib/states";

interface RepCard {
  id: string;
  name: string;
  party: string;
  role: string;
  imageUrl: string;
  alignment: { score: number | null; matching: number; total: number };
}

interface ProfileHeaderProps {
  user: {
    userName: string;
    state: string;
    cd: string;
    avatar?: string | null;
  };
  reps: RepCard[];
  voteCount: number;
  proposalCount: number;
}

export default function ProfileHeader({ user, reps, voteCount, proposalCount }: ProfileHeaderProps) {
  const state = user.state.toUpperCase();
  const district = parseInt(user.cd, 10);
  const districtLabel = district ? `${state}-${String(district).padStart(2, "0")}` : `${state} at-large`;

  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="bg-hero-glow absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <AvatarUpload currentAvatar={user.avatar} userName={user.userName} />
          <div className="min-w-0 flex-1">
            <h1 className="font-brand text-[2.1rem] font-semibold leading-tight text-ink sm:text-[2.5rem] break-words">
              {user.userName}
            </h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-2">
              <MapPin className="h-4 w-4 text-gold-bright" aria-hidden="true" />
              Voting district {districtLabel} · {stateName(state)}
            </p>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <dt className="text-xs text-ink-3">Bills voted on</dt>
                <dd className="text-xl font-semibold tabular-nums text-ink">{voteCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Proposals</dt>
                <dd className="text-xl font-semibold tabular-nums text-ink">{proposalCount}</dd>
              </div>
            </dl>
          </div>
          <ButtonLink href="/bills" className="self-start sm:self-center" iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
            Vote on bills
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="reps-heading">
        <SectionHeading
          id="reps-heading"
          title="Your representatives"
          description="Your alignment is how often each one voted the way you did on bills you both voted on."
        />
        {reps.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center text-sm text-ink-2">
            We couldn&apos;t load your representatives right now. Please try again later.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-3">
            {reps.map((rep) => {
              const name = displayName(rep.name);
              return (
                <li key={rep.id} className="card card-interactive group flex flex-col p-5">
                  <div className="flex items-center gap-3">
                    <Avatar src={rep.imageUrl} name={name} size={56} variant="neutral" shape="rounded" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink-3">{rep.role}</p>
                      <Link href={`/members/${rep.id}`} className="stretched-link block truncate font-semibold text-ink">
                        {name}
                      </Link>
                      <PartyBadge party={rep.party} className="mt-1" />
                    </div>
                  </div>
                  <div className="mt-5 border-t border-line pt-4">
                    <AlignmentBadge
                      score={rep.alignment.score}
                      label="Agrees with you"
                      align="start"
                      detail={
                        rep.alignment.total > 0
                          ? `${rep.alignment.matching} of ${rep.alignment.total} shared votes`
                          : voteCount === 0
                            ? "Vote on bills to compare"
                            : "No shared votes yet"
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
