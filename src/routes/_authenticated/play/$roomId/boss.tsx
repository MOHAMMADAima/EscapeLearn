import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { evaluateAnswer } from "@/lib/escape-room.functions";
import { Lightbulb, Flame, AlertCircle, Unlock } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/play/$roomId/boss")({
  head: () => ({ meta: [{ title: "Final Challenge — EscapeLearn" }] }),
  component: BossRoom,
});

type RoomRow = {
  id: string;
  room_number: number;
  title: string;
  concept: string;
  narrative_description: string;
  puzzle_question: string;
  correct_answer_keywords: string;
  hint: string;
  is_boss_room: boolean;
};

function BossRoom() {
  const { roomId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const evalFn = useServerFn(evaluateAnswer);

  const [boss, setBoss] = useState<RoomRow | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rooms")
      .select("*")
      .eq("escape_room_id", roomId)
      .eq("is_boss_room", true)
      .maybeSingle()
      .then(({ data }) => setBoss(data as RoomRow | null));
    supabase
      .from("game_sessions")
      .select("id")
      .eq("escape_room_id", roomId)
      .eq("student_id", user.id)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSessionId(data?.id ?? null));
    startRef.current = Date.now();
  }, [user, roomId]);

  async function useHint() {
    if (hintShown || !sessionId) return;
    setHintShown(true);
    const { data } = await supabase
      .from("game_sessions")
      .select("hints_used")
      .eq("id", sessionId)
      .single();
    await supabase
      .from("game_sessions")
      .update({ hints_used: (data?.hints_used ?? 0) + 1 })
      .eq("id", sessionId);
    if (boss) track("hint_used", { room_number: boss.room_number, is_boss_room: true, roomId, sessionId });
  }

  async function submit() {
    if (!boss || !sessionId || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await evalFn({
        data: {
          question: boss.puzzle_question,
          userAnswer: answer,
          keywords: boss.correct_answer_keywords,
          concept: boss.concept,
        },
      });
      const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
      await supabase.from("room_attempts").insert({
        session_id: sessionId,
        room_id: boss.id,
        student_id: user!.id,
        answer_given: answer,
        is_correct: res.is_correct,
        hint_used: hintShown,
        time_spent_seconds: timeSpent,
      });
      if (res.is_correct) {
        setSuccess(true);
        setFeedback({ ok: true, text: res.feedback });
        track("boss_room_completed", { time_spent: timeSpent, hint_used: hintShown, roomId, sessionId, concept: boss.concept });
        setTimeout(() => {
          navigate({ to: "/play/$roomId/results", params: { roomId } });
        }, 1800);
      } else {
        setFeedback({ ok: false, text: res.feedback });
        track("boss_answer_incorrect", { roomId, sessionId, time_spent: timeSpent, hint_used: hintShown, concept: boss.concept });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  function giveUp() {
    track("game_abandoned", { roomId, sessionId, time_spent_in_boss: Math.round((Date.now() - startRef.current) / 1000), hint_used: hintShown });
    navigate({ to: "/play/$roomId/results", params: { roomId } });
  }

  if (!boss) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-card" />
      </main>
    );
  }

  return (
    <main className="relative mx-auto min-h-[calc(100vh-60px)] max-w-3xl px-6 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.4em] text-primary animate-pulse">
        <Flame className="h-3.5 w-3.5" /> Final Challenge
      </div>
      <h1 className="mt-4 text-center font-narrative text-5xl leading-tight md:text-6xl">
        {boss.title}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-center font-narrative text-lg leading-relaxed text-muted-foreground">
        {boss.narrative_description}
      </p>

      <div className="mt-10 rounded-2xl border border-primary/40 bg-card/70 p-7 glow-purple">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Synthesize everything you've learned
        </div>
        <div className="mt-2 text-xl leading-snug">{boss.puzzle_question}</div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={success}
          rows={8}
          placeholder="Connect the concepts from all 3 rooms…"
          className="mt-5 w-full resize-none rounded-lg border border-input bg-background/60 p-4 text-sm outline-none focus:border-primary"
        />

        {hintShown && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {boss.hint}
          </div>
        )}

        {feedback && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm ${
              feedback.ok
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.ok ? (
              <Unlock className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>{feedback.text}</div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={useHint}
              disabled={hintShown || success}
              className="inline-flex items-center gap-2 rounded-md border border-warning/40 px-3 py-2 text-sm text-warning transition hover:bg-warning/10 disabled:opacity-50"
            >
              <Lightbulb className="h-4 w-4" /> Hint
            </button>
            <button
              onClick={giveUp}
              className="rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground transition hover:bg-card"
            >
              End run
            </button>
          </div>
          <button
            onClick={submit}
            disabled={submitting || success || !answer.trim()}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {success ? "Escaping…" : submitting ? "Evaluating…" : "Attempt escape"}
          </button>
        </div>
      </div>
    </main>
  );
}
