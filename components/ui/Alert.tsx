import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "error" | "warning" | "info" | "success";

const STYLES: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: "border-nay/35 bg-nay/[0.08] text-ink", icon: CircleAlert },
  warning: { box: "border-gold/35 bg-gold/[0.08] text-ink", icon: TriangleAlert },
  info: { box: "border-info/30 bg-info/[0.07] text-ink", icon: Info },
  success: { box: "border-yea/30 bg-yea/[0.08] text-ink", icon: CircleCheck },
};

const ICON_COLOR: Record<Tone, string> = {
  error: "text-nay",
  warning: "text-gold-bright",
  info: "text-info",
  success: "text-yea",
};

export default function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = STYLES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${box} ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_COLOR[tone]}`} aria-hidden="true" />
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-ink-2" : "text-ink-2"}>{children}</div>}
      </div>
    </div>
  );
}
