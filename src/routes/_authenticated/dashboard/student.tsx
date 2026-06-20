import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { Sparkles, Hash, Trophy, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { track, pendoTrack } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/student")({
  head: () => ({ meta: [{ title: "Student Dashboard — EscapeLearn" }] }),
  component: StudentDashboard,
});

type Session = {
  id: string;
  escape_room_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  hints_used: number;
  escape_rooms: { title: string; subject: string } | null;
};

function StudentDashboard() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("game_sessions")
      .select("id,escape_room_id,started_at,completed_at,score,hints_used,escape_rooms(title,subject)")
      .eq("student_id", user.id)
      .order("started_at", { ascending: false })
      .then(({ data }) => setSessions((data as unknown as Session[]) ?? []));
  }, [user]);

  const completed = sessions.filter((s) => s.completed_at);
  const avg = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.score ?? 0), 0) / completed.length)
    : 0;
  const best = completed.reduce<number | null>((a, s) => {
    if (!s.completed_at) return a;
    const t =
      (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000;
    return a === null || t < a ? t : a;
  }, null);

  async function joinByCode() {
    if (code.length < 4) return;
    setJoining(true);
    try {
      const { data, error } = await supabase
        .from("escape_rooms")
        .select("id")
        .eq("room_code", code.toUpperCase())
        .maybeSingle();
      if (error || !data) {
        toast.error("No room with that code");
        return;
      }
      track("student_joined_via_code", { code: code.toUpperCase() });
      pendoTrack("student_joined_via_code", {
        room_code: code.toUpperCase(),
        escape_room_id: data.id,
      });
      navigate({ to: "/play/$roomId/briefing", params: { roomId: data.id } });
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <h1 className="font-narrative text-4xl">Your escape log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resume a room or start a new one.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat icon={<Trophy className="h-4 w-4" />} label="Rooms completed" value={completed.length} />
        <Stat icon={<BookOpen className="h-4 w-4" />} label="Avg score" value={avg} />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Best time"
          value={best ? `${Math.floor(best / 60)}:${String(Math.floor(best % 60)).padStart(2, "0")}` : "—"}
        />
      </div>

      <h2 className="mt-10 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Start a new escape
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {/* Option A — upload your own course */}
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-card/60 p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" /> Recommended
          </div>
          <div className="mt-2 font-narrative text-2xl">Upload your own course</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop any PDF — lecture notes, a chapter, a study guide — and we'll turn it into a
            personal 3-room escape with a boss. No teacher code needed.
          </p>
          <Link
            to="/generate"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" /> Upload a PDF
          </Link>
        </div>

        {/* Option B — teacher code */}
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Hash className="h-4 w-4" /> Have a code?
          </div>
          <div className="mt-2 font-narrative text-2xl">Join a teacher's room</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Got a room code from your teacher? Enter it here to play their version.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                className="w-44 rounded-lg border border-input bg-background/60 px-3 py-2.5 pl-9 font-mono text-sm tracking-widest outline-none focus:border-primary"
              />
            </div>
            <button
              disabled={joining || code.length < 4}
              onClick={joinByCode}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition hover:bg-accent disabled:opacity-50"
            >
              Join room
            </button>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Past escapes
      </h2>
      <div className="mt-3 space-y-2">
        {sessions.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No sessions yet. Generate a room from a PDF to begin.
          </div>
        )}
        {sessions.map((s) => (
          <Link
            key={s.id}
            to="/play/$roomId/briefing"
            params={{ roomId: s.escape_room_id }}
            className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4 transition hover:bg-card"
          >
            <div>
              <div className="font-medium">{s.escape_rooms?.title ?? "Untitled"}</div>
              <div className="text-xs text-muted-foreground">{s.escape_rooms?.subject}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div className="font-mono text-lg text-foreground">
                {s.completed_at ? `${s.score ?? 0}` : "—"}
              </div>
              {s.completed_at ? "completed" : "in progress"}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-mono text-3xl">{value}</div>
    </div>
  );
}
