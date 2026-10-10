// components/features/MemberStats.tsx
import Card from "@/components/ui/Card";
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
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <AlignmentBadge score={communityScore} label="Community alignment" detail={communityDetail} size="lg" align="start" />
      </Card>
      <Card>
        <AlignmentBadge score={personalScore} label="Your alignment" detail={personalDetail} size="lg" align="start" />
      </Card>
      <Card>
        <p className="text-xs font-medium text-ink-3">Time in office</p>
        <p className="mt-1 text-3xl font-semibold text-ink tabular-nums">{tenure}</p>
        <p className="mt-2 text-xs text-ink-3">{tenureDetail}</p>
      </Card>
    </div>
  );
}
