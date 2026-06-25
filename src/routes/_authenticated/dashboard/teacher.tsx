import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard/teacher")({
  head: () => ({ meta: [{ title: "Teacher Dashboard — EscapeLearn" }] }),
  component: TeacherDashboard,
});

type Room = {
  id: string;
  title: string;
  subject: string;
  room_code: string;
  created_at: string;
};

function TeacherDashboard() {
  const { user } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("escape_rooms")
      .select("id,title,subject,room_code,created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const list = (data ?? []) as Room[];
        setRooms(list);
        if (list.length) {
          const { data: sess } = await supabase
            .from("game_sessions")
            .select("escape_room_id")
            .in("escape_room_id", list.map((r) => r.id));
          const c: Record<string, number> = {};
          (sess ?? []).forEach((s) => {
            c[s.escape_room_id] = (c[s.escape_room_id] ?? 0) + 1;
          });
          setCounts(c);
        }
      });
  }, [user]);

  function copy(code: string, escapeRoomId: string) {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
    track("room_code_copied", { room_code: code, escape_room_id: escapeRoomId, source_page: "teacher_dashboard" });
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-narrative text-4xl">Your rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a room from a PDF and share the code with students.
          </p>
        </div>
        <Link
          to="/generate"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Sparkles className="h-4 w-4" /> Create escape room
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {rooms.length === 0 && (
          <div className="md:col-span-2 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No rooms yet. Create one from a course PDF.
          </div>
        )}
        {rooms.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card/60 p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{r.subject}</div>
            <div className="mt-1 text-lg font-semibold">{r.title}</div>

            <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div>
                <div className="text-xs text-muted-foreground">Room code</div>
                <div className="font-mono text-3xl tracking-[0.3em] text-primary">{r.room_code}</div>
              </div>
              <button
                onClick={() => copy(r.room_code, r.id)}
                className="rounded-md border border-border bg-card p-2 transition hover:bg-accent"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{counts[r.id] ?? 0} students joined</span>
              <span>{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
