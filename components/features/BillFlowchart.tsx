import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  FileText,
  GitMerge,
  Landmark,
  Lightbulb,
  MessageSquare,
  Repeat,
  Users,
  Vote,
} from "lucide-react";

export const steps = [
  {
    icon: Lightbulb,
    title: "An idea is born",
    brief: "A citizen, group, or legislator identifies a need for new legislation.",
    detail:
      "Every law starts with an idea. Whether from a concerned citizen writing to their representative, an advocacy group campaigning for change, or a legislator seeing a gap in current law, the legislative process begins when someone identifies a problem that needs a legislative solution.",
  },
  {
    icon: FileText,
    title: "The bill is drafted",
    brief: "The bill is written and formally introduced by a member of Congress.",
    detail:
      "A member of Congress works with legislative counsel to draft the bill in proper legal language. The bill is then formally introduced — in the House by placing it in the ‘hopper,’ or in the Senate by presenting it to the clerk. It receives a number (H.R. for House, S. for Senate) and is printed.",
  },
  {
    icon: Users,
    title: "Committee review",
    brief: "The bill is assigned to a committee for study, hearings, and markup.",
    detail:
      "The Speaker of the House or presiding officer of the Senate refers the bill to the appropriate committee. The committee may hold hearings, invite expert testimony, and conduct a ‘markup’ session where members debate and amend the bill. Most bills never make it past this stage.",
  },
  {
    icon: MessageSquare,
    title: "Floor debate",
    brief: "The full chamber debates the bill’s merits.",
    detail:
      "If the committee approves the bill, it goes to the full chamber for debate. In the House, the Rules Committee sets debate terms. In the Senate, debate can be unlimited unless cloture is invoked (requiring 60 votes). Members offer amendments and argue for or against the bill.",
  },
  {
    icon: Vote,
    title: "Chamber vote",
    brief: "Members cast their votes.",
    highlight: true,
    detail:
      "The moment of truth — representatives vote on the bill. This is exactly where Heard empowers you. By voting on bills here, you tell your representatives how you want them to vote. A simple majority (218 in the House, 51 in the Senate) is typically required to pass.",
  },
  {
    icon: Repeat,
    title: "The other chamber",
    brief: "The bill goes to the other chamber and repeats steps 3–5.",
    detail:
      "Once one chamber passes the bill, it goes to the other chamber, which may accept it, reject it, ignore it, or amend it. The bill must pass both the House and Senate in identical form before it can be sent to the President.",
  },
  {
    icon: GitMerge,
    title: "Conference committee",
    brief: "If the versions differ, a joint committee reconciles them.",
    detail:
      "When the House and Senate pass different versions of the same bill, a conference committee made up of members from both chambers works to create a compromise version. This reconciled bill must then be approved by both chambers.",
  },
  {
    icon: CheckCheck,
    title: "Final vote",
    brief: "Both chambers vote on the final version.",
    detail:
      "The conference report (the reconciled bill) goes back to both the House and Senate for a final up-or-down vote. No further amendments are allowed. Both chambers must approve the identical version of the bill.",
  },
  {
    icon: Landmark,
    title: "Presidential action",
    brief: "The President signs the bill into law or vetoes it.",
    detail:
      "The President has 10 days to sign or veto the bill. If signed, it becomes law. If vetoed, it returns to Congress, which can override the veto with a two-thirds majority in both chambers. If the President takes no action for 10 days while Congress is in session, the bill becomes law without a signature.",
  },
  {
    icon: BookOpen,
    title: "It’s law!",
    brief: "The bill becomes a law of the United States.",
    detail:
      "The new law is assigned a Public Law number and published in the United States Statutes at Large. Federal agencies are responsible for implementing the law, and its effects ripple through society — all because an idea was born and people made their voices heard.",
  },
];

export default function BillFlowchart() {
  return (
    <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="Steps" className="hidden lg:block">
        <ol className="sticky top-24 space-y-1 border-l border-line">
          {steps.map((step, i) => (
            <li key={step.title}>
              <a
                href={`#step-${i + 1}`}
                className={`-ml-px flex gap-2.5 border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                  step.highlight
                    ? "border-gold font-medium text-gold-bright"
                    : "border-transparent text-ink-3 hover:border-line-input hover:text-ink"
                }`}
              >
                <span className="w-4 tabular-nums">{i + 1}</span>
                {step.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <ol className="relative space-y-5">
        <span className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-gradient-to-b from-gold/50 via-line-strong to-gold/50" aria-hidden="true" />
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} id={`step-${i + 1}`} className="relative flex scroll-mt-24 gap-4 sm:gap-5">
              <span
                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-canvas ${
                  step.highlight ? "bg-gold text-gold-ink" : "border border-gold/40 bg-surface-2 text-gold-bright"
                }`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div
                className={`card min-w-0 flex-1 p-5 sm:p-6 ${
                  step.highlight ? "border-gold/50 shadow-[0_0_0_1px_rgb(201_168_76/0.2),0_20px_48px_-24px_rgb(201_168_76/0.45)]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${step.highlight ? "text-gold-bright" : "text-ink-3"}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-ink">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="mt-0.5 font-medium text-ink-2">{step.brief}</p>
                  </div>
                </div>
                <p className="mt-3 leading-relaxed text-ink-3">{step.detail}</p>
                {step.highlight && (
                  <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-ink">This is where your voice counts on Heard.</p>
                    <Link
                      href="/bills"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-bright hover:text-gold"
                    >
                      Vote on a bill
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
