export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {/* Pulsing Logo */}
      <h1 className="font-brand text-3xl sm:text-4xl text-gradient animate-pulse mb-12">
        We The People
      </h1>

      {/* Skeleton Cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mb-4" />
            <div className="h-3 bg-white/10 rounded w-full mb-2" />
            <div className="h-3 bg-white/10 rounded w-5/6 mb-2" />
            <div className="h-3 bg-white/10 rounded w-2/3" />
            <div className="mt-6 h-8 bg-white/10 rounded-full w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
