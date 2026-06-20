import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Lock, Unlock, ArrowRight, GraduationCap, Users } from "lucide-react";
import { LandingScene } from "@/components/landing/LandingScene";
import { NavBar } from "@/components/landing/NavBar";
import { StorySection } from "@/components/landing/StorySection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EscapeLearn — Your PDF just became an escape room" },
      {
        name: "description",
        content:
          "Upload any course document. EscapeLearn generates 3 puzzle rooms + a boss room from your PDF. Solve them to actually learn.",
      },
      { property: "og:title", content: "EscapeLearn" },
      {
        property: "og:description",
        content: "Upload a PDF. Get an AI-built escape room. Learn by escaping.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden text-stone-100">
      <LandingScene />
      <NavBar />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 grid-bg opacity-30" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered learning escape rooms
            </span>
            <h1 className="mt-6 font-narrative text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Your PDF just became <em className="text-primary not-italic">an escape room.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Upload any course document. Solve narrative puzzles built from the real content.
              Actually learn — by escaping.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ role: "student" }}
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground animate-pulse-glow transition-transform hover:-translate-y-0.5"
              >
                Start as Student
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/auth"
                search={{ role: "teacher" }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-5 py-3 text-sm font-medium transition-colors hover:bg-card"
              >
                I'm a Teacher
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div>
                <div className="font-mono text-2xl text-foreground">3+1</div>
                rooms per PDF
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="font-mono text-2xl text-foreground">~15min</div>
                avg escape time
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <div className="font-mono text-2xl text-foreground">1000</div>
                max score
              </div>
            </div>
          </div>

          {/* Mock escape room interface */}
          <MockRoom />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-narrative text-3xl md:text-4xl">How it works</h2>
        <HowItWorksTabs />
      </section>

      {/* STORY / MANIFESTO */}
      <StorySection />

      <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground">
        EscapeLearn · built for curious minds
      </footer>
    </div>
  );
}

const studentSteps = [
  { n: "01", t: "Upload your course — or use a code", d: "Drop your own PDF (lecture, chapter, study guide) to build a personal escape, or enter a code from your teacher." },
  { n: "02", t: "Enter the escape room", d: "Step inside a themed, story-driven environment where every puzzle is based on what you need to learn." },
  { n: "03", t: "Solve to escape & learn", d: "Crack 3 puzzle rooms + 1 boss room. Each solved challenge reinforces real course concepts." },
];

const teacherSteps = [
  { n: "01", t: "Upload your course PDF", d: "Drop any lecture notes, textbook chapter, or study guide. The AI reads and understands it." },
  { n: "02", t: "AI generates the rooms", d: "In seconds, 3 puzzle rooms + 1 boss room are crafted around your actual content." },
  { n: "03", t: "Share the room code", d: "Give students the code. Watch them learn by escaping — with live progress tracking." },
];

function HowItWorksTabs() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const steps = role === "student" ? studentSteps : teacherSteps;

  return (
    <>
      <div className="mt-6 inline-flex rounded-lg border border-border bg-card/60 p-1">
        <button
          onClick={() => setRole("student")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            role === "student"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="h-4 w-4" /> For Students
        </button>
        <button
          onClick={() => setRole("teacher")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            role === "teacher"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" /> For Teachers
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-border bg-card/60 p-6 transition-colors hover:bg-card"
          >
            <div className="font-mono text-xs text-primary">{s.n}</div>
            <div className="mt-2 text-lg font-semibold">{s.t}</div>
            <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function MockRoom() {
  return (
    <div className="relative animate-fade-up">
      <div className="relative rounded-2xl border border-border bg-surface/80 p-5 shadow-2xl glow-purple backdrop-blur">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" />
            Room 2 of 3 — The Mitochondrial Vault
          </div>
          <div className="font-mono text-xs text-muted-foreground">04:21</div>
        </div>
        <p className="mt-4 font-narrative text-sm text-muted-foreground">
          The chamber hums with the heat of a thousand reactions. To open the brass door, you must
          name the molecule that carries energy across the membrane.
        </p>
        <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Puzzle</div>
          <div className="mt-1 text-sm">
            Explain how ATP is produced during oxidative phosphorylation.
          </div>
        </div>
        <div className="mt-3 h-24 rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
          The proton gradient drives ATP synthase as electrons travel through…
          <span className="animate-pulse">▍</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button className="rounded-md border border-warning/40 px-3 py-1.5 text-xs text-warning">
            Use Hint
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Unlock className="h-3.5 w-3.5" /> Submit Answer
          </button>
        </div>
      </div>
      <div className="absolute -right-6 -top-6 hidden h-24 w-24 rounded-full bg-primary/20 blur-2xl md:block" />
    </div>
  );
}
