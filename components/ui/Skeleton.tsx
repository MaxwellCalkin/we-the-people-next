export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

/** A card-shaped placeholder matching list rows used across the app. */
export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`card flex items-center gap-4 p-4 ${className}`}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  );
}
