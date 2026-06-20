import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { Trophy, Share2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { track, pendoTrack } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/play/$roomId/results")({
  head: () => ({ meta: [{ title: "Results — EscapeLearn" }] }),
  component: Results,
});

type Sess = {
  id: string;
  started_at: string;
  completed_at: string | null;
  hints_used: number;
  score: number | null;
  pre_confidence_scores: Record<string, number> | null;
  post_confidence_scores: Record<string, number> | null;
};

type Escape = { id: string; title: string; subject: string; room_code: string };
type Attempt = { room_id: string; is_correct: boolean };

export function calcScore(seconds: number, hints: number, completed: boolean): number {
  const base = 1000;
  const timePenalty = Math.floor(seconds / 60) * 10;
  const hintPenalty = hints * 50;
  const completionPenalty = completed ? 0 : 250;
  return Math.max(100, base - timePenalty - hintPenalty - completionPenalty);
}

function Results() {
  const { roomId } = Route.useParams();
  const { user } = useSession();
  const [sess, setSess] = useState<Sess | null>(null);
  const [er, setEr] = useState<Escape | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [post, setPost] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase
        .from("game_sessions")
        .select("id,started_at,completed_at,hints_used,score,pre_confidence_scores,post_confidence_scores")
        .eq("escape_room_id", roomId)
        .eq("student_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSess(s as unknown as Sess | null);
      if (s?.post_confidence_scores)
        setPost(s.post_confidence_scores as unknown as Record<string, number>);


      const { data: e } = await supabase
        .from("escape_rooms")
        .select("id,title,subject,room_code")
        .eq("id", roomId)
        .maybeSingle();
      setEr(e as Escape | null);

      const { data: a } = await supabase
        .from("room_attempts")
        .select("room_id,is_correct")
        .eq("session_id", s?.id ?? "");
      setAttempts((a ?? []) as Attempt[]);

      const { data: rr } = await supabase
        .from("rooms")
        .select("concept,is_boss_room,order_index")
        .eq("escape_room_id", roomId)
        .order("order_index");
      const cs = (rr ?? []).filter((r) => !r.is_boss_room).map((r) => r.concept as string);
      setConcepts(cs);
      if (s && !s.post_confidence_scores) {
        const pre = (s.pre_confidence_scores ?? {}) as Record<string, number>;
        const init: Record<string, number> = {};
        cs.forEach((c) => (init[c] = pre[c] ?? 3));
        setPost(init);
      }

    })();
  }, [user, roomId]);

  if (!sess || !er)
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-card" />
      </main>
    );

  const seconds = sess.completed_at
    ? Math.round(
        (new Date(sess.completed_at).getTime() - new Date(sess.started_at).getTime()) / 1000,
      )
    : Math.round((Date.now() - new Date(sess.started_at).getTime()) / 1000);

  const totalRooms = concepts.length + 1;
  const completedRooms = new Set(attempts.filter((a) => a.is_correct).map((a) => a.room_id)).size;
  const escaped = completedRooms >= totalRooms;
  const score = sess.score ?? calcScore(seconds, sess.hints_used, escaped);

  async function finalize() {
    if (saved) return;
    const completionTime = sess?.completed_at ?? new Date().toISOString();
    await supabase
      .from("game_sessions")
      .update({
        completed_at: completionTime,
        score,
        post_confidence_scores: post,
      })
      .eq("id", sess!.id);
    setSaved(true);
    track("game_completed", { total_time: seconds, score, hints_used: sess!.hints_used });
    pendoTrack("game_completed", {
      total_time: seconds,
      score,
      hints_used: sess!.hints_used,
      rooms_completed: completedRooms,
      escaped,
    });
    toast.success("Results saved");
  }

  function shareLink() {
    const url = `${window.location.origin}/auth?role=student`;
    navigator.clipboard.writeText(
      `I escaped "${er!.title}" on EscapeLearn in ${fmt(seconds)} — can you beat it? Code: ${er!.room_code} — ${url}`,
    );
    toast.success("Share text copied");
    track("results_shared", { roomId });
    pendoTrack("results_shared", {
      roomId,
      score,
      total_time: seconds,
      room_code: er!.room_code,
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
          <Trophy className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 font-narrative text-5xl tracking-tight">
          {escaped ? "YOU ESCAPED" : "ALMOST THERE"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{er.title}</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Score" value={`${score}/1000`} highlight />
        <Stat label="Time" value={fmt(seconds)} />
        <Stat label="Rooms" value={`${completedRooms}/${totalRooms}`} />
        <Stat label="Hints" value={String(sess.hints_used)} />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6">
        <h2 className="text-sm font-medium">Rate your confidence now (1–5)</h2>
        <div className="mt-4 space-y-4">
          {concepts.map((c) => (
            <div key={c}>
              <div className="flex items-center justify-between text-sm">
                <span>{c}</span>
                <span className="font-mono text-primary">
                  {sess.pre_confidence_scores?.[c] ?? "—"} → {post[c] ?? 3}
                  {(post[c] ?? 3) - (sess.pre_confidence_scores?.[c] ?? 3) > 0 && (
                    <span className="ml-2 text-success">
                      +{(post[c] ?? 3) - (sess.pre_confidence_scores?.[c] ?? 3)} ↑
                    </span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={post[c] ?? 3}
                onChange={(e) => setPost({ ...post, [c]: Number(e.target.value) })}
                className="mt-2 w-full accent-primary"
              />
            </div>
          ))}
        </div>
        <button
          onClick={finalize}
          disabled={saved}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saved ? "Saved ✓" : "Save results"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={shareLink}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition hover:bg-accent"
        >
          <Share2 className="h-4 w-4" /> Share this room
        </button>
        <Link
          to="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Back to dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-primary/40 bg-primary/10" : "border-border bg-card/60"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
