import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Play, Save, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/teacher/review/$roomId")({
  head: () => ({ meta: [{ title: "Review escape room — EscapeLearn" }] }),
  component: TeacherReview,
});

type Escape = {
  id: string;
  title: string;
  subject: string;
  narrative_intro: string;
  room_code: string;
};

type Room = {
  id: string;
  room_number: number;
  title: string;
  concept: string;
  narrative_description: string;
  hint: string;
  puzzle_question: string | null;
  correct_answer_keywords: string | null;
  is_boss_room: boolean;
  mechanic: string | null;
  game_data: unknown;
};

function TeacherReview() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const [er, setEr] = useState<Escape | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingEr, setSavingEr] = useState(false);

  useEffect(() => {
    supabase
      .from("escape_rooms")
      .select("id,title,subject,narrative_intro,room_code")
      .eq("id", roomId)
      .maybeSingle()
      .then(({ data }) => setEr(data as Escape | null));
    supabase
      .from("rooms")
      .select(
        "id,room_number,title,concept,narrative_description,hint,puzzle_question,correct_answer_keywords,is_boss_room,mechanic,game_data",
      )
      .eq("escape_room_id", roomId)
      .order("order_index")
      .then(({ data }) => setRooms((data ?? []) as Room[]));
  }, [roomId]);

  function copyCode() {
    if (!er) return;
    navigator.clipboard.writeText(er.room_code);
    toast.success("Room code copied");
    track("room_code_copied", { room_code: er.room_code, escape_room_id: er.id, source_page: "teacher_review" });
  }

  function updateRoomField<K extends keyof Room>(id: string, key: K, value: Room[K]) {
    setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function isValidGameJson(r: Room) {
    if (r.is_boss_room) return true;
    if (typeof r.game_data !== "string") return true;
    try {
      JSON.parse(r.game_data);
      return true;
    } catch {
      return false;
    }
  }

  async function saveRoom(r: Room) {
    if (!isValidGameJson(r)) {
      toast.error("Invalid puzzle JSON — fix the red-highlighted field before saving.");
      return;
    }
    setSavingId(r.id);
    let gameData: unknown = r.game_data;
    if (!r.is_boss_room && typeof r.game_data === "string") {
      gameData = JSON.parse(r.game_data);
    }
    const { error } = await supabase
      .from("rooms")
      .update({
        title: r.title,
        concept: r.concept,
        narrative_description: r.narrative_description,
        hint: r.hint,
        puzzle_question: r.puzzle_question,
        correct_answer_keywords: r.correct_answer_keywords,
        game_data: gameData as never,
      })
      .eq("id", r.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Saved "${r.title}"`);
      track("room_content_saved", { room_id: r.id, escape_room_id: roomId, room_number: r.room_number, is_boss_room: r.is_boss_room, mechanic: r.mechanic });
    }
  }

  async function saveEscape() {
    if (!er) return;
    setSavingEr(true);
    const { error } = await supabase
      .from("escape_rooms")
      .update({
        title: er.title,
        subject: er.subject,
        narrative_intro: er.narrative_intro,
      })
      .eq("id", er.id);
    setSavingEr(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Intro saved");
      track("escape_room_intro_saved", { escape_room_id: er.id });
    }
  }

  if (!er) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-card" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Escape room ready
        </div>
      </div>

      {/* Room code hero */}
      <section className="mt-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
          <KeyRound className="h-3.5 w-3.5" /> Share this code with your students
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-mono text-6xl tracking-[0.3em] text-primary">{er.room_code}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Students enter this code to join "{er.title}".
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-accent"
            >
              <Copy className="h-4 w-4" /> Copy code
            </button>
            <button
              onClick={() =>
                navigate({ to: "/play/$roomId/briefing", params: { roomId: er.id } })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4" /> Try the demo
            </button>
          </div>
        </div>
      </section>

      {/* Intro editor */}
      <section className="mt-8 rounded-2xl border border-border bg-card/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-narrative text-2xl">Intro & narrative</h2>
          <button
            onClick={saveEscape}
            disabled={savingEr}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {savingEr ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Title"
            value={er.title}
            onChange={(v) => setEr({ ...er, title: v })}
          />
          <Field
            label="Subject"
            value={er.subject}
            onChange={(v) => setEr({ ...er, subject: v })}
          />
        </div>
        <Field
          className="mt-4"
          label="Narrative intro"
          value={er.narrative_intro}
          onChange={(v) => setEr({ ...er, narrative_intro: v })}
          multiline
        />
      </section>

      {/* Rooms editor */}
      <section className="mt-8 space-y-4">
        <h2 className="font-narrative text-2xl">Rooms</h2>
        {rooms.map((r) => {
          const jsonValid = isValidGameJson(r);
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card/60 p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Room {r.room_number}
                  {r.is_boss_room ? " · Boss" : r.mechanic ? ` · ${r.mechanic}` : ""}
                </div>
                <button
                  onClick={() => saveRoom(r)}
                  disabled={savingId === r.id || !jsonValid}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {savingId === r.id ? "Saving…" : "Save"}
                </button>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field
                  label="Title"
                  value={r.title}
                  onChange={(v) => updateRoomField(r.id, "title", v)}
                />
                <Field
                  label="Concept"
                  value={r.concept}
                  onChange={(v) => updateRoomField(r.id, "concept", v)}
                />
              </div>
              <Field
                className="mt-3"
                label="Narrative"
                value={r.narrative_description}
                onChange={(v) => updateRoomField(r.id, "narrative_description", v)}
                multiline
              />
              <Field
                className="mt-3"
                label="Hint"
                value={r.hint}
                onChange={(v) => updateRoomField(r.id, "hint", v)}
                multiline
              />
              {r.is_boss_room && (
                <>
                  <Field
                    className="mt-3"
                    label="Puzzle question"
                    value={r.puzzle_question ?? ""}
                    onChange={(v) => updateRoomField(r.id, "puzzle_question", v)}
                    multiline
                  />
                  <Field
                    className="mt-3"
                    label="Correct answer keywords (comma-separated)"
                    value={r.correct_answer_keywords ?? ""}
                    onChange={(v) => updateRoomField(r.id, "correct_answer_keywords", v)}
                  />
                </>
              )}
              {!r.is_boss_room && r.game_data ? (
                <details className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-xs" open>
                  <summary className="cursor-pointer text-muted-foreground">
                    Puzzle data (editable JSON)
                  </summary>
                  <textarea
                    value={
                      typeof r.game_data === "string"
                        ? (r.game_data as string)
                        : JSON.stringify(r.game_data, null, 2)
                    }
                    onChange={(e) =>
                      updateRoomField(r.id, "game_data", e.target.value as unknown as Room["game_data"])
                    }
                    spellCheck={false}
                    rows={12}
                    className={`mt-2 w-full rounded-lg border bg-background/60 p-3 font-mono text-[11px] outline-none focus:border-primary ${
                      jsonValid ? "border-input" : "border-destructive"
                    }`}
                  />
                  <p className={`mt-1 text-[10px] ${jsonValid ? "text-muted-foreground" : "text-destructive"}`}>
                    {jsonValid ? 'Must be valid JSON. Saved on "Save".' : "Invalid JSON — correct it before saving."}
                  </p>
                </details>
              ) : null}
            </div>
          );
        })}
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(8, Math.max(3, Math.ceil(value.length / 80)))}
          className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      )}
    </label>
  );
}
