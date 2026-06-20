import { BrainCircuit, Gamepad2, BarChart3, Zap, Trophy, Rocket } from "lucide-react";

const pillars = [
  {
    icon: BrainCircuit,
    label: "Product Thinking",
    title: "The lecture ends. Then what?",
    body: "Most courses die in the last five minutes. The professor closes the slideshow; students close their laptops. Homework becomes a checkbox. EscapeLearn turns any PDF into a narrative escape room where students don't just read — they solve, score, and actually learn.",
  },
  {
    icon: Gamepad2,
    label: "Originality",
    title: "Hijack the dopamine loop.",
    body: "We don't fight gaming addiction — we redirect it. The same competitive rush that keeps players up until 3 AM now powers puzzles built from real course content. Sane addiction. Productive obsession. When learning feels like winning, students don't need discipline — they need more time.",
  },
  {
    icon: BarChart3,
    label: "Shippedness",
    title: "Proof, not promises.",
    body: "Universities get what they never had before: real completion tracking. See who escaped the room and who got stuck at the door. Identify knowledge gaps before the exam, not after. Homework becomes data. Lectures become action.",
  },
  {
    icon: Zap,
    label: "Craft",
    title: "Use it anywhere in the cycle.",
    body: "Drop an escape room at the start of a course and watch students show up eager, competitive, awake. Or close the lecture with one — so the last word isn't 'any questions?' but 'can you beat the boss room?' Learning isn't an interruption. It's the main event.",
  },
];

export function StorySection() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24">
      {/* Top manifesto headline */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider">
          <Trophy className="h-3.5 w-3.5 text-primary" /> The Manifesto
        </span>
        <h2 className="mt-6 font-narrative text-4xl leading-[1.1] tracking-tight md:text-5xl">
          Learning is not a task.
          <br />
          <em className="text-primary not-italic">It is a human necessity.</em>
        </h2>
      </div>

      {/* Pull quote */}
      <div className="mx-auto mt-16 max-w-3xl border-l-2 border-primary pl-6">
        <p className="font-narrative text-xl leading-relaxed text-foreground md:text-2xl">
          "We are building lifelong learners. Future citizens who don't see education as something to endure, but a pleasure to chase. Ludo-learning isn't a gimmick. It's a mindset."
        </p>
      </div>

      {/* Four-pillar grid */}
      <div className="mt-20 grid gap-6 md:grid-cols-2">
        {pillars.map((p) => (
          <div
            key={p.label}
            className="group rounded-2xl border border-border bg-card/60 p-7 transition-colors hover:bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60">
                <p.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {p.label}
              </span>
            </div>
            <h3 className="mt-5 font-narrative text-2xl leading-snug">{p.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Bottom shipped block */}
      <div className="relative mt-16 overflow-hidden rounded-2xl border border-border bg-card/60 p-8 md:p-12">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
              <Rocket className="h-3.5 w-3.5" /> Shipped & Measurable
            </div>
            <h3 className="mt-3 font-narrative text-2xl leading-snug md:text-3xl">
              This isn't a slide deck. It's live.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Novus is tracking every PDF upload, every room start, every hint used, every escape.
              Real behaviors. Real metrics. Real impact. The room is built. The door is open.
            </p>
          </div>
          <div className="flex shrink-0 gap-8 font-mono text-sm">
            <div>
              <div className="text-2xl text-foreground">3+1</div>
              <div className="text-xs text-muted-foreground">Rooms</div>
            </div>
            <div>
              <div className="text-2xl text-foreground">Live</div>
              <div className="text-xs text-muted-foreground">Tracking</div>
            </div>
            <div>
              <div className="text-2xl text-foreground">Now</div>
              <div className="text-xs text-muted-foreground">Shipped</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
