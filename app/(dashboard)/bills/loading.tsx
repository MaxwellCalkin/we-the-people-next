import Skeleton, { SkeletonRow } from "@/components/ui/Skeleton";

export default function BillsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" role="status" aria-label="Loading bills">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-10 w-72" />
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <div className="mt-10 flex gap-6 border-b border-line pb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
