"use client";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { ArrowBigUp } from "lucide-react";

interface ProposalCardProps {
  proposal: {
    _id: string; title: string; description: string; image?: string;
    upvoteCount: number; authorState?: string; authorDistrict?: string;
    user?: { userName?: string };
  };
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
  const loc = proposal.authorState
    ? `${proposal.authorState}${proposal.authorDistrict ? "-" + proposal.authorDistrict : ""}`
    : null;
  return (
    <GlassCard hover className="flex flex-col overflow-hidden !p-0">
      {proposal.image && (
        <div className="relative w-full aspect-video overflow-hidden rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proposal.image} alt={proposal.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-cream font-semibold text-sm mb-2 line-clamp-2">{proposal.title}</h3>
        <p className="text-cream/50 text-xs mb-4 line-clamp-3">{proposal.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-cream/60 text-xs">
            <ArrowBigUp className="h-4 w-4" />{proposal.upvoteCount}
          </span>
          {loc && <span className="text-cream/40 text-xs">{loc}</span>}
        </div>
        <Link href={`/proposal/${proposal._id}`} className="mt-3 inline-block text-gold text-sm font-medium hover:text-gold/80 transition-colors">
          View Proposal &rarr;
        </Link>
      </div>
    </GlassCard>
  );
}
