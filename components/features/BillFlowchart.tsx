"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Lightbulb,
  FileText,
  Users,
  MessageSquare,
  Vote,
  ArrowRight,
  GitMerge,
  CheckCheck,
  Landmark,
  BookOpen,
} from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "An Idea is Born",
    brief: "A citizen, group, or legislator identifies a need for new legislation.",
    detail:
      "Every law starts with an idea. Whether from a concerned citizen writing to their representative, an advocacy group campaigning for change, or a legislator seeing a gap in current law, the legislative process begins when someone identifies a problem that needs a legislative solution.",
  },
  {
    icon: FileText,
    title: "Bill is Drafted",
    brief: "The bill is written and formally introduced by a member of Congress.",
    detail:
      "A member of Congress works with legislative counsel to draft the bill in proper legal language. The bill is then formally introduced — in the House by placing it in the 'hopper,' or in the Senate by presenting it to the clerk. It receives a number (H.R. for House, S. for Senate) and is printed.",
  },
  {
    icon: Users,
    title: "Committee Review",
    brief: "The bill is assigned to a committee for study, hearings, and markup.",
    detail:
      "The Speaker of the House or presiding officer of the Senate refers the bill to the appropriate committee. The committee may hold hearings, invite expert testimony, and conduct a 'markup' session where members debate and amend the bill. Most bills never make it past this stage.",
  },
  {
    icon: MessageSquare,
    title: "Floor Debate",
    brief: "The full chamber debates the bill's merits.",
    detail:
      "If the committee approves the bill, it goes to the full chamber for debate. In the House, the Rules Committee sets debate terms. In the Senate, debate can be unlimited unless cloture is invoked (requiring 60 votes). Members offer amendments and argue for or against the bill.",
  },
  {
    icon: Vote,
    title: "Chamber Vote",
    brief: "Members cast their votes.",
    highlight: true,
    detail:
      "The moment of truth — representatives vote on the bill. This is exactly where Heard empowers YOU. By voting on bills here, you tell your representatives how you want them to vote. A simple majority (218 in the House, 51 in the Senate) is typically required to pass.",
  },
  {
    icon: ArrowRight,
    title: "Other Chamber",
    brief: "The bill goes to the other chamber and repeats steps 3-5.",
    detail:
      "Once one chamber passes the bill, it goes to the other chamber, which may accept it, reject it, ignore it, or amend it. The bill must pass both the House and Senate in identical form before it can be sent to the President.",
  },
  {
    icon: GitMerge,
    title: "Conference Committee",
    brief: "If versions differ, a joint committee reconciles them.",
    detail:
      "When the House and Senate pass different versions of the same bill, a conference committee made up of members from both chambers works to create a compromise version. This reconciled bill must then be approved by both chambers.",
  },
  {
    icon: CheckCheck,
    title: "Final Vote",
    brief: "Both chambers vote on the final version.",
    detail:
      "The conference report (the reconciled bill) goes back to both the House and Senate for a final up-or-down vote. No further amendments are allowed. Both chambers must approve the identical version of the bill.",
  },
  {
    icon: Landmark,
    title: "Presidential Action",
    brief: "The President signs the bill into law or vetoes it.",
    detail:
      "The President has 10 days to sign or veto the bill. If signed, it becomes law. If vetoed, it returns to Congress, which can override the veto with a two-thirds majority in both chambers. If the President takes no action for 10 days while Congress is in session, the bill becomes law without a signature.",
  },
  {
    icon: BookOpen,
    title: "It's Law!",
    brief: "The bill becomes a law of the United States.",
    detail:
      "The new law is assigned a Public Law number and published in the United States Statutes at Large. Federal agencies are responsible for implementing the law, and its effects ripple through society — all because an idea was born and people made their voices heard.",
  },
];

export default function BillFlowchart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Animate nodes in one by one
      nodesRef.current.forEach((node, i) => {
        if (!node) return;

        gsap.set(node, { opacity: 0, y: 50, scale: 0.9 });

        gsap.to(node, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: node,
            start: "top 88%",
            once: true,
          },
          delay: 0.05,
        });
      });

      // Animate SVG connecting lines
      pathsRef.current.forEach((path) => {
        if (!path) return;

        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 1,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: path,
            start: "top 90%",
            once: true,
          },
        });
      });
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const toggleExpand = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  return (
    <div ref={containerRef} className="w-full">
      {/* Desktop: Horizontal flowing layout */}
      <div className="hidden lg:block">
        <DesktopFlowchart
          nodesRef={nodesRef}
          svgRef={svgRef}
          pathsRef={pathsRef}
          expandedStep={expandedStep}
          toggleExpand={toggleExpand}
        />
      </div>

      {/* Mobile/Tablet: Vertical layout */}
      <div className="lg:hidden">
        <MobileFlowchart
          nodesRef={nodesRef}
          svgRef={svgRef}
          pathsRef={pathsRef}
          expandedStep={expandedStep}
          toggleExpand={toggleExpand}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop: Two rows of 5, connected by animated SVG lines           */
/* ------------------------------------------------------------------ */
interface FlowchartProps {
  nodesRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  pathsRef: React.MutableRefObject<(SVGPathElement | null)[]>;
  expandedStep: number | null;
  toggleExpand: (i: number) => void;
}

function DesktopFlowchart({
  nodesRef,
  pathsRef,
  expandedStep,
  toggleExpand,
}: FlowchartProps) {
  const topRow = steps.slice(0, 5);
  const bottomRow = steps.slice(5);

  return (
    <div className="relative">
      {/* Top row */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {topRow.map((step, i) => (
          <FlowchartNode
            key={i}
            step={step}
            index={i}
            nodesRef={nodesRef}
            expanded={expandedStep === i}
            onToggle={() => toggleExpand(i)}
          />
        ))}
      </div>

      {/* SVG lines connecting top row */}
      <svg
        className="w-full h-8 mb-2 overflow-visible"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3].map((i) => (
          <path
            key={`top-${i}`}
            ref={(el) => {
              pathsRef.current[i] = el;
            }}
            d={`M ${10 + i * 20 + 18}% 0 L ${10 + (i + 1) * 20 - 2}% 0`}
            stroke="rgba(201, 168, 76, 0.5)"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
        ))}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="rgba(201, 168, 76, 0.5)"
            />
          </marker>
        </defs>
      </svg>

      {/* Curved connecting line from row 1 to row 2 */}
      <svg className="w-full h-16 overflow-visible">
        <path
          ref={(el) => {
            pathsRef.current[4] = el;
          }}
          d="M 90% 0 C 95% 50%, 95% 50%, 90% 100%"
          stroke="rgba(201, 168, 76, 0.5)"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
      </svg>

      {/* Bottom row (reversed visual order so the flow continues right-to-left then wraps) */}
      <div className="grid grid-cols-5 gap-4 mt-2">
        {bottomRow
          .slice()
          .reverse()
          .map((step, i) => {
            const realIndex = 9 - i;
            return (
              <FlowchartNode
                key={realIndex}
                step={step}
                index={realIndex}
                nodesRef={nodesRef}
                expanded={expandedStep === realIndex}
                onToggle={() => toggleExpand(realIndex)}
              />
            );
          })}
      </div>

      {/* SVG lines connecting bottom row (right to left) */}
      <svg
        className="w-full h-8 mt-2 overflow-visible"
        style={{ transform: "translateY(-3.25rem)" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <path
            key={`bot-${i}`}
            ref={(el) => {
              pathsRef.current[5 + i] = el;
            }}
            d={`M ${90 - i * 20 - 2}% 0 L ${90 - (i + 1) * 20 + 18}% 0`}
            stroke="rgba(201, 168, 76, 0.5)"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile: Vertical stacked layout with connecting lines             */
/* ------------------------------------------------------------------ */
function MobileFlowchart({
  nodesRef,
  pathsRef,
  expandedStep,
  toggleExpand,
}: FlowchartProps) {
  return (
    <div className="flex flex-col items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="w-full max-w-md flex flex-col items-center">
          <FlowchartNode
            step={step}
            index={i}
            nodesRef={nodesRef}
            expanded={expandedStep === i}
            onToggle={() => toggleExpand(i)}
          />
          {i < steps.length - 1 && (
            <svg className="w-8 h-10 overflow-visible my-1" viewBox="0 0 32 40">
              <path
                ref={(el) => {
                  pathsRef.current[9 + i] = el;
                }}
                d="M 16 0 L 16 32"
                stroke="rgba(201, 168, 76, 0.5)"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead-mobile)"
              />
              <defs>
                <marker
                  id="arrowhead-mobile"
                  markerWidth="10"
                  markerHeight="7"
                  refX="5"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="rgba(201, 168, 76, 0.5)"
                  />
                </marker>
              </defs>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual flowchart node                                         */
/* ------------------------------------------------------------------ */
interface FlowchartNodeProps {
  step: (typeof steps)[number];
  index: number;
  nodesRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  expanded: boolean;
  onToggle: () => void;
}

function FlowchartNode({
  step,
  index,
  nodesRef,
  expanded,
  onToggle,
}: FlowchartNodeProps) {
  const Icon = step.icon;
  const isHighlight = "highlight" in step && step.highlight;

  return (
    <div
      ref={(el) => {
        nodesRef.current[index] = el;
      }}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      className={`relative glass-card glass-hover cursor-pointer transition-all duration-300 ${
        isHighlight
          ? "border-gold/50 animate-glow"
          : ""
      } ${expanded ? "ring-1 ring-gold/30" : ""}`}
    >
      {/* Step number badge */}
      <div className="absolute -top-3 -left-2 w-7 h-7 rounded-full bg-navy-800 border border-gold/40 flex items-center justify-center">
        <span className="text-xs font-bold text-gold">{index + 1}</span>
      </div>

      {/* Highlight callout */}
      {isHighlight && (
        <div className="absolute -top-3 right-2 px-2 py-0.5 rounded-full bg-gold text-navy-900 text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">
          Your Voice Matters
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <div
          className={`p-3 rounded-xl ${
            isHighlight
              ? "bg-gold/20 text-gold"
              : "bg-white/5 text-cream/80"
          }`}
        >
          <Icon className="w-6 h-6" />
        </div>

        <h3
          className={`font-brand text-sm tracking-wide ${
            isHighlight ? "text-gold" : "text-cream"
          }`}
        >
          {step.title}
        </h3>

        <p className="text-xs text-cream/60 leading-relaxed">{step.brief}</p>

        {isHighlight && (
          <p className="text-[11px] text-gold/80 font-medium italic">
            This is where YOUR voice matters on Heard
          </p>
        )}
      </div>

      {/* Expanded detail */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          expanded ? "max-h-96 opacity-100 mt-3 pt-3 border-t border-white/10" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-xs text-cream/70 leading-relaxed">{step.detail}</p>
      </div>

      {/* Click hint */}
      <div className="mt-2 text-[10px] text-cream/30 text-center">
        {expanded ? "Click to collapse" : "Click to learn more"}
      </div>
    </div>
  );
}
