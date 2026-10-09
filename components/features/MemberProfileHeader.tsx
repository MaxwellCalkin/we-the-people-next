// components/features/MemberProfileHeader.tsx
import Link from "next/link";
import { ExternalLink, ListChecks, Phone } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import PartyBadge from "@/components/ui/PartyBadge";
import Badge from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { displayName, seatLabel } from "@/lib/format";

interface MemberProfileHeaderProps {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: number;
  chamber: string;
  imageUrl: string;
  website?: string;
  phone?: string;
  leadership?: string;
}

export default function MemberProfileHeader({
  bioguideId,
  name,
  party,
  state,
  district,
  chamber,
  imageUrl,
  website,
  phone,
  leadership,
}: MemberProfileHeaderProps) {
  const fullName = displayName(name);
  const role = chamber === "Senate" ? "Senator" : "Representative";

  return (
    <header>
      <Breadcrumbs items={[{ label: "Members", href: "/members" }, { label: fullName }]} className="mb-5" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar src={imageUrl} name={fullName} size={112} shape="rounded" variant="neutral" className="ring-1 ring-line-strong" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-3">
            {role} · {seatLabel(chamber, state, district)}
          </p>
          <h1 className="mt-1 font-brand text-[2.1rem] font-semibold leading-tight text-ink sm:text-[2.6rem]">{fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PartyBadge party={party} />
            {leadership && <Badge tone="gold">{leadership}</Badge>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/members/${bioguideId}/votes`} className={buttonClasses({ size: "sm" })}>
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Voting record
            </Link>
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Official website
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
