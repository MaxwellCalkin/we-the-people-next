// components/features/MemberStats.tsx
import GlassCard from "@/components/ui/GlassCard";
import AlignmentBadge from "@/components/ui/AlignmentBadge";

interface MemberStatsProps {
  communityScore: number | null;
  communityDetail: string;
  personalScore: number | null;
  personalDetail: string;
  tenure: string;
  tenureDetail: string;
}

export default function MemberStats({
  communityScore,
  communityDetail,
  personalScore,
  personalDetail,
  tenure,
  tenureDetail,
}: MemberStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <GlassCard className="text-center">
        <AlignmentBadge
          score={communityScore}
          label="Community Alignment"
          detail={communityDetail}
          size="lg"
        />
      </GlassCard>
      <GlassCard className="text-center">
        <AlignmentBadge
          score={personalScore}
          label="Your Alignment"
          detail={personalDetail}
          size="lg"
        />
      </GlassCard>
      <GlassCard className="text-center">
        <p className="text-xs uppercase tracking-wider text-cream/40">Tenure</p>
        <p className="text-2xl font-bold text-cream mt-0.5">{tenure}</p>
        <p className="text-[0.7rem] text-cream/30 mt-0.5">{tenureDetail}</p>
      </GlassCard>
    </div>
  );
}
