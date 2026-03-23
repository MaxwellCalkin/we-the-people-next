export default function BillsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title skeleton */}
      <div className="h-9 bg-white/10 rounded w-48 mb-6 animate-pulse" />

      {/* Search bar skeleton */}
      <div className="h-10 bg-white/10 rounded-lg max-w-md mb-8 animate-pulse" />

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card animate-pulse">
            <div className="h-4 bg-white/10 rounded w-2/3 mb-4" />
            <div className="h-3 bg-white/10 rounded w-full mb-2" />
            <div className="h-3 bg-white/10 rounded w-5/6 mb-2" />
            <div className="h-3 bg-white/10 rounded w-4/5 mb-2" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="flex gap-3 mt-6">
              <div className="h-8 bg-white/10 rounded-full w-20" />
              <div className="h-8 bg-white/10 rounded-full w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
