import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Users, Sparkles, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { LandingScene } from "@/components/landing/LandingScene";
import { NavBar } from "@/components/landing/NavBar";

const search = z.object({
  role: z.enum(["student", "teacher"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — EscapeLearn" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { role: roleParam } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">(roleParam ?? "student");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const trimmedName = fullName.trim();
        if (trimmedName.length < 2) throw new Error("Please enter your name");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { role, full_name: trimmedName },
          },
        });
        if (error) throw error;
        toast.success(`Welcome, ${trimmedName}!`);
        track("user_signed_up", { role, referral_role_param: roleParam });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // give trigger a moment to create profile, then read role
      await new Promise((r) => setTimeout(r, 300));
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No user");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role,full_name,created_at")
        .eq("id", u.user.id)
        .maybeSingle();
      const userRole = (profile?.role ?? role) as "student" | "teacher";
      if (mode === "signin") {
        track("user_signed_in", { role: userRole });
      }

      pendo.identify({
        visitor: {
          id: u.user.id,
          email: u.user.email ?? email,
          full_name: profile?.full_name ?? (mode === "signup" ? fullName.trim() : undefined),
          role: userRole,
          created_at: profile?.created_at,
        },
      });

      navigate({
        to: userRole === "teacher" ? "/dashboard/teacher" : "/dashboard/student",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-stone-100">
      <LandingScene />
      <NavBar variant="auth" />

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:py-16">
        {/* IMMERSIVE INTRO */}
        <section className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Step into the vault
          </span>
          <h1 className="mt-6 font-narrative text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            The door is locked.
            <br />
            <em className="text-primary not-italic">Your mind is the key.</em>
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
            Behind this page, a cinematic escape room is waiting — built from your own course,
            scored by a narrator, sealed by a puzzle only you can solve. Three rooms. One boss.
            One way out: <span className="text-foreground">learn it.</span>
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: <Lock className="h-4 w-4 text-primary" />, t: "Every PDF becomes 3 rooms + a final boss" },
              { icon: <KeyRound className="h-4 w-4 text-primary" />, t: "A narrator greets you in character — chemist, soldier, robot" },
              { icon: <Sparkles className="h-4 w-4 text-primary" />, t: "Live ambient music tuned to the subject" },
            ].map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-muted-foreground">
                <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card/60">
                  {f.icon}
                </span>
                {f.t}
              </li>
            ))}
          </ul>

          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
            ↓ Create your account to enter ↓
          </p>
        </section>

        {/* FORM CARD */}
        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        <div className="rounded-2xl border border-border bg-card/80 p-7 shadow-2xl backdrop-blur-md">
          <h1 className="font-narrative text-2xl">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Pick a role and step inside."
              : "Sign in to continue your escape."}
          </p>

          {mode === "signup" && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              <RoleButton
                active={role === "student"}
                onClick={() => setRole("student")}
                icon={<GraduationCap className="h-4 w-4" />}
                label="Student"
              />
              <RoleButton
                active={role === "teacher"}
                onClick={() => setRole("teacher")}
                icon={<Users className="h-4 w-4" />}
                label="Teacher"
              />
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-muted-foreground">Your name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
        </div>
        </div>
      </main>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border bg-background/40 text-muted-foreground hover:bg-card"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
