// components/features/ProfileHeader.tsx
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import Avatar from "@/components/ui/Avatar";
import AlignmentBadge from "@/components/ui/AlignmentBadge";
import AvatarUpload from "@/components/features/AvatarUpload";

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
}

export default function ProfileHeader({ user, reps }: ProfileHeaderProps) {
  return (
    <div className="space-y-6">
      {/* User Header */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AvatarUpload currentAvatar={user.avatar} userName={user.userName} />
            <div>
              <h1 className="font-brand text-2xl sm:text-3xl text-gradient">
                {user.userName}
              </h1>
              <p className="text-cream/50 text-sm mt-1">
                {user.state}-{user.cd} Congressional District
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* My Representatives */}
      <div>
        <h2 className="text-[0.65rem] uppercase tracking-widest text-cream/40 mb-3">
          My Representatives
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reps.map((rep) => (
            <Link key={rep.id} href={`/members/${rep.id}`}>
              <GlassCard hover className="text-center">
                <Avatar
                  src={rep.imageUrl}
                  name={rep.name}
                  size={64}
                  className="mx-auto mb-3 border-2 border-gold/30"
                />
                <p className="text-[0.65rem] uppercase tracking-wider text-cream/40">
                  {rep.role}
                </p>
                <p className="text-cream font-semibold text-sm mt-1">{rep.name}</p>
                <p className="text-cream/40 text-xs">{rep.party}</p>
                <div className="mt-3 pt-3 border-t border-glass-border">
                  <AlignmentBadge
                    score={rep.alignment.score}
                    label="Your Alignment"
                    detail={rep.alignment.total > 0 ? `${rep.alignment.matching}/${rep.alignment.total} votes` : undefined}
                  />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
