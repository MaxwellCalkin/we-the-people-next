import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-navy-600/30 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link
        href="/"
        className="font-brand text-3xl font-bold text-cream tracking-wider mb-10 relative z-10"
      >
        Heard
      </Link>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
