"use client";

import { useEffect, useState } from "react";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

interface VoteStatsProps {
  billSlug: string;
}

export default function VoteStats({ billSlug }: VoteStatsProps) {
  const [data, setData] = useState({
    yeas: 0,
    nays: 0,
    yeasByDistrict: 0,
    naysByDistrict: 0,
  });

  useEffect(() => {
    fetch(`/api/bills/votes?slug=${encodeURIComponent(billSlug)}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [billSlug]);

  return (
    <div className="grid grid-cols-2 gap-6">
      <AnimatedCounter target={data.yeas} label="Total Heard Yeas" />
      <AnimatedCounter target={data.nays} label="Total Heard Nays" />
      <AnimatedCounter target={data.yeasByDistrict} label="District Yeas" />
      <AnimatedCounter target={data.naysByDistrict} label="District Nays" />
    </div>
  );
}
