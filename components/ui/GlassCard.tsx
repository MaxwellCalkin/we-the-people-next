interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  hover = false,
}: GlassCardProps) {
  return (
    <div className={`glass-card ${hover ? "glass-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}
