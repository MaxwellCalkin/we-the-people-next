"use client";

import AnimatedCounter from "@/components/ui/AnimatedCounter";

interface VoteStatsProps {
  yeas: number;
  nays: number;
  yeasByDistrict: number;
  naysByDistrict: number;
}

export default function VoteStats({
  yeas,
  nays,
  yeasByDistrict,
  naysByDistrict,
}: VoteStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <AnimatedCounter target={yeas} label="Total WTP Yeas" />
      <AnimatedCounter target={nays} label="Total WTP Nays" />
      <AnimatedCounter target={yeasByDistrict} label="District Yeas" />
      <AnimatedCounter target={naysByDistrict} label="District Nays" />
    </div>
  );
}
