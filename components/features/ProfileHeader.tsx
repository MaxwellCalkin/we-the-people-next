import GlassCard from "@/components/ui/GlassCard";
import type { MemberResult } from "@/types";

interface ProfileHeaderProps {
  user: {
    userName: string;
    state: string;
    cd: string;
  };
  houseRep: MemberResult | null;
  senators: MemberResult[];
}

export default function ProfileHeader({
  user,
  houseRep,
  senators,
}: ProfileHeaderProps) {
  return (
    <GlassCard>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-brand text-2xl sm:text-3xl text-gradient">
            {user.userName}
          </h1>
          <p className="text-cream/50 text-sm mt-1">
            {user.state}-{user.cd} Congressional District
          </p>
        </div>

        <div className="text-sm space-y-1">
          {houseRep && (
            <p className="text-cream/70">
              <span className="text-cream/40">House Rep:</span>{" "}
              <span className="text-cream">{houseRep.name}</span>
              <span className="text-cream/40 ml-1">({houseRep.party})</span>
            </p>
          )}
          {senators.map((senator) => (
            <p key={senator.id} className="text-cream/70">
              <span className="text-cream/40">Senator:</span>{" "}
              <span className="text-cream">{senator.name}</span>
              <span className="text-cream/40 ml-1">({senator.party})</span>
            </p>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
