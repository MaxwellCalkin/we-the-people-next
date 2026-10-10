import VoteSplitBar from "@/components/ui/VoteSplitBar";

interface VoteStatsProps {
  yeas: number;
  nays: number;
  districtYeas: number;
  districtNays: number;
  /** e.g. "PA-12"; omit when the viewer has no district on file. */
  districtLabel?: string;
}

export default function VoteStats({ yeas, nays, districtYeas, districtNays, districtLabel }: VoteStatsProps) {
  return (
    <div className="space-y-6">
      <VoteSplitBar label="Everyone on Heard" yeas={yeas} nays={nays} />
      {districtLabel && (
        <VoteSplitBar
          label={`Your district (${districtLabel})`}
          yeas={districtYeas}
          nays={districtNays}
          emptyText="No votes from your district yet"
        />
      )}
    </div>
  );
}
