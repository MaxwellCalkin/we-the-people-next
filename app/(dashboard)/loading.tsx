import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" role="status" aria-label="Loading">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="mt-4 h-10 w-full max-w-md" />
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-3 p-6" aria-hidden="true">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
      <div className="card mt-5 space-y-3 p-6" aria-hidden="true">
        <Skeleton className="h-5 w-1/4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
