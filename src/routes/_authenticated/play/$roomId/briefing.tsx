import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { track, pendoTrack } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/play/$roomId/briefing")({
  head: () => ({ meta: [{ title: "Briefing — EscapeLearn" }] }),
  component: Briefing,
});

type Room = { id: string; concept: string; title: string; room_number: number; is_boss_room: boolean };
type Escape = {
  id: string;
  title: string;
  subject: string;
  narrative_intro: string;
};

function Briefing() {
  const { roomId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [er, setEr] = useState<Escape | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    supabase
      .from("escape_rooms")
      .select("id,title,subject,narrative_intro")
      .eq("id", roomId)
      .maybeSingle()
      .then(({ data }) => setEr(data as Escape | null));
    supabase
      .from("rooms")
      .select("id,concept,title,room_number,is_boss_room")
      .eq("escape_room_id", roomId)
      .order("order_index")
      .then(({ data }) => {
        const list = (data ?? []) as Room[];
        setRooms(list);
        const init: Record<string, number> = {};
        list.filter((r) => !r.is_boss_room).forEach((r) => (init[r.concept] = 3));
        setConfidence(init);
      });
  }, [roomId]);

  async function startGame() {
    if (!user) return;
    setStarting(true);
    try {
      // Reuse existing in-progress session if any
      const { data: existing } = await supabase
        .from("game_sessions")
        .select("id,current_room_index,completed_at")
        .eq("escape_room_id", roomId)
        .eq("student_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let sessionId = existing?.id;
      let currentIdx = existing?.current_room_index ?? 0;
      if (!sessionId) {
        const { data: sess, error } = await supabase
          .from("game_sessions")
          .insert({
            escape_room_id: roomId,
            student_id: user.id,
            pre_confidence_scores: confidence,
            current_room_index: 0,
          })
          .select("id")
          .single();
        if (error) throw error;
        sessionId = sess.id;
      }
      track("game_started", { roomId, sessionId });
      pendoTrack("game_started", {
        roomId,
        sessionId,
        is_new_session: !existing,
        room_count: rooms.length,
      });
      const target = rooms[currentIdx];
      if (!target) throw new Error("No rooms");
      if (target.is_boss_room) {
        navigate({ to: "/play/$roomId/boss", params: { roomId } });
      } else {
        navigate({
          to: "/play/$roomId/room/$roomNumber",
          params: { roomId, roomNumber: String(target.room_number) },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start");
      setStarting(false);
    }
  }

  if (!er) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-card" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
          <KeyRound className="h-3.5 w-3.5" /> Briefing
        </div>
        <h1 className="mt-4 font-narrative text-5xl leading-tight">{er.title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{er.subject}</div>

        <div className="mt-8 rounded-2xl border border-border bg-card/60 p-8 font-narrative text-lg leading-relaxed text-muted-foreground">
          {er.narrative_intro.split(/\n+/).map((p, i) => (
            <p key={i} className={i > 0 ? "mt-4" : ""}>
              {p}
            </p>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <Info label="Subject" value={er.subject} />
          <Info label="Rooms" value={`${rooms.length}`} />
          <Info label="Est. time" value="~15 min" />
        </div>

        {rooms.filter((r) => !r.is_boss_room).length > 0 && (
          <div className="mt-10 rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="text-sm font-medium">
              Before you start, rate your confidence on these concepts (1–5)
            </h2>
            <div className="mt-4 space-y-4">
              {rooms
                .filter((r) => !r.is_boss_room)
                .map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{r.concept}</span>
                      <span className="font-mono text-primary">{confidence[r.concept] ?? 3}/5</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={confidence[r.concept] ?? 3}
                      onChange={(e) =>
                        setConfidence({ ...confidence, [r.concept]: Number(e.target.value) })
                      }
                      className="mt-2 w-full accent-primary"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        <button
          onClick={startGame}
          disabled={starting || rooms.length === 0}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 animate-pulse-glow disabled:opacity-50"
        >
          Enter the Escape Room <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}
