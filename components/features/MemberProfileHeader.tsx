// components/features/MemberProfileHeader.tsx
import Image from "next/image";
import Link from "next/link";

interface MemberProfileHeaderProps {
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
  const location = chamber === "Senate" ? state : `${state}-${district}`;

  return (
    <div>
      <Link href="/members" className="text-cream/30 text-sm hover:text-cream/50 transition-colors">
        ← Back to Directory
      </Link>
      <div className="flex gap-6 mt-4">
        <div className="w-[120px] h-[150px] rounded-xl overflow-hidden border-2 border-gold/30 shrink-0 bg-navy-800">
          <Image
            src={imageUrl}
            alt={name}
            width={120}
            height={150}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-cream/40 text-xs uppercase tracking-widest">
            {chamber === "Senate" ? "Senator" : "Representative"} · {location}
          </p>
          <h1 className="font-brand text-2xl sm:text-3xl text-gradient mt-1">
            {name}
          </h1>
          <p className="text-cream/50 text-sm mt-1">
            {party}
            {leadership && <span className="text-cream/40"> · {leadership}</span>}
          </p>
          <div className="flex gap-3 mt-3">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold bg-gold/10 px-3 py-1.5 rounded-md border border-gold/20 hover:bg-gold/20 transition-colors"
              >
                Website ↗
              </a>
            )}
            {phone && (
              <span className="text-xs text-cream/40 px-3 py-1.5">{phone}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
