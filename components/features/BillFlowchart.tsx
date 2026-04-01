"use client";

import { useEffect, useRef } from "react";
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
    brief:
      "A citizen, group, or legislator identifies a need for new legislation.",
    detail:
      "Every law starts with an idea. Whether from a concerned citizen writing to their representative, an advocacy group campaigning for change, or a legislator seeing a gap in current law, the legislative process begins when someone identifies a problem that needs a legislative solution.",
  },
  {
    icon: FileText,
    title: "Bill is Drafted",
    brief:
      "The bill is written and formally introduced by a member of Congress.",
    detail:
      "A member of Congress works with legislative counsel to draft the bill in proper legal language. The bill is then formally introduced — in the House by placing it in the \u2018hopper,\u2019 or in the Senate by presenting it to the clerk. It receives a number (H.R. for House, S. for Senate) and is printed.",
  },
  {
    icon: Users,
    title: "Committee Review",
    brief:
      "The bill is assigned to a committee for study, hearings, and markup.",
    detail:
      "The Speaker of the House or presiding officer of the Senate refers the bill to the appropriate committee. The committee may hold hearings, invite expert testimony, and conduct a \u2018markup\u2019 session where members debate and amend the bill. Most bills never make it past this stage.",
  },
  {
    icon: MessageSquare,
    title: "Floor Debate",
    brief: "The full chamber debates the bill\u2019s merits.",
    detail:
      "If the committee approves the bill, it goes to the full chamber for debate. In the House, the Rules Committee sets debate terms. In the Senate, debate can be unlimited unless cloture is invoked (requiring 60 votes). Members offer amendments and argue for or against the bill.",
  },
  {
    icon: Vote,
    title: "Chamber Vote",
    brief: "Members cast their votes.",
    highlight: true,
    detail:
      "The moment of truth \u2014 representatives vote on the bill. This is exactly where Heard empowers YOU. By voting on bills here, you tell your representatives how you want them to vote. A simple majority (218 in the House, 51 in the Senate) is typically required to pass.",
  },
  {
    icon: ArrowRight,
    title: "Other Chamber",
    brief: "The bill goes to the other chamber and repeats steps 3\u20135.",
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
    title: "It\u2019s Law!",
    brief: "The bill becomes a law of the United States.",
    detail:
      "The new law is assigned a Public Law number and published in the United States Statutes at Large. Federal agencies are responsible for implementing the law, and its effects ripple through society \u2014 all because an idea was born and people made their voices heard.",
  },
];

export default function BillFlowchart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Progress bar fill follows scroll
      if (progressFillRef.current && containerRef.current) {
        gsap.to(progressFillRef.current, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 60%",
            end: "bottom 40%",
            scrub: 0.3,
          },
        });
      }

      // Each step animates in on scroll
      stepRefs.current.forEach((el, i) => {
        if (!el) return;

        const isEven = i % 2 === 0;
        const contentEl = el.querySelector(".step-content");
        const numberEl = el.querySelector(".step-number");
        const iconEl = el.querySelector(".step-icon");

        // Content slides in from alternating sides
        if (contentEl) {
          gsap.set(contentEl, {
            opacity: 0,
            x: isEven ? -60 : 60,
          });
          gsap.to(contentEl, {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              once: true,
            },
          });
        }

        // Number pops in
        if (numberEl) {
          gsap.set(numberEl, { scale: 0, opacity: 0 });
          gsap.to(numberEl, {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "back.out(2)",
            scrollTrigger: {
              trigger: el,
              start: "top 78%",
              once: true,
            },
          });
        }

        // Icon floats in
        if (iconEl) {
          gsap.set(iconEl, { scale: 0.5, opacity: 0, rotate: -15 });
          gsap.to(iconEl, {
            scale: 1,
            opacity: 1,
            rotate: 0,
            duration: 0.6,
            ease: "back.out(1.5)",
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              once: true,
            },
            delay: 0.15,
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Vertical progress track — visible on md+ */}
      <div
        ref={progressRef}
        className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-cream/10"
      >
        <div
          ref={progressFillRef}
          className="absolute inset-0 bg-gradient-to-b from-gold/80 to-gold/20 origin-top"
          style={{ transform: "scaleY(0)" }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-16 md:space-y-24">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isEven = i % 2 === 0;
          const isHighlight = "highlight" in step && step.highlight;

          return (
            <div
              key={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className="relative"
            >
              {/* Center dot on the timeline (md+) */}
              <div
                className={`step-number hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 z-10
                  w-10 h-10 rounded-full items-center justify-center font-bold text-sm
                  ${
                    isHighlight
                      ? "bg-gold text-navy-900 shadow-[0_0_24px_rgba(201,168,76,0.5)]"
                      : "bg-navy-800 border border-gold/40 text-gold"
                  }`}
              >
                {i + 1}
              </div>

              {/* Content card — alternates sides on md+, stacked on mobile */}
              <div
                className={`step-content md:w-[calc(50%-2.5rem)] ${
                  isEven ? "md:mr-auto md:pr-4" : "md:ml-auto md:pl-4"
                }`}
              >
                <div
                  className={`glass-card transition-all duration-300 hover:border-gold/30 hover:shadow-[0_8px_32px_rgba(201,168,76,0.12)] ${
                    isHighlight ? "border-gold/50 animate-glow" : ""
                  }`}
                >
                  {/* Mobile step number */}
                  <div className="flex items-center gap-3 md:hidden mb-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isHighlight
                          ? "bg-gold text-navy-900"
                          : "bg-navy-800 border border-gold/40 text-gold"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <h3
                      className={`font-brand text-lg tracking-wide ${
                        isHighlight ? "text-gold" : "text-cream"
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>

                  {/* Desktop title row */}
                  <div className="hidden md:flex items-center gap-4 mb-4">
                    <div
                      className={`step-icon flex-shrink-0 p-3 rounded-xl ${
                        isHighlight
                          ? "bg-gold/20 text-gold"
                          : "bg-white/5 text-cream/80"
                      }`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3
                        className={`font-brand text-xl tracking-wide ${
                          isHighlight ? "text-gold" : "text-cream"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="text-cream/50 text-sm mt-0.5">
                        {step.brief}
                      </p>
                    </div>
                  </div>

                  {/* Mobile icon + brief */}
                  <div className="md:hidden flex items-start gap-3 mb-3">
                    <div
                      className={`step-icon flex-shrink-0 p-2.5 rounded-xl ${
                        isHighlight
                          ? "bg-gold/20 text-gold"
                          : "bg-white/5 text-cream/80"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-cream/50 text-sm leading-relaxed">
                      {step.brief}
                    </p>
                  </div>

                  {/* Detail text */}
                  <p className="text-sm text-cream/70 leading-relaxed">
                    {step.detail}
                  </p>

                  {/* Highlight callout */}
                  {isHighlight && (
                    <div className="mt-4 pt-4 border-t border-gold/20">
                      <p className="text-sm text-gold/90 font-medium italic">
                        This is where YOUR voice matters on Heard
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
