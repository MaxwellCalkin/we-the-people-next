import MagneticButton from "@/components/ui/MagneticButton";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="glass-card max-w-md w-full text-center p-10">
        <h1 className="font-brand text-7xl sm:text-8xl text-gradient mb-4">
          404
        </h1>
        <h2 className="font-brand text-xl sm:text-2xl text-cream mb-3">
          Page Not Found
        </h2>
        <p className="text-cream/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <MagneticButton href="/">Go Home</MagneticButton>
      </div>
    </div>
  );
}
