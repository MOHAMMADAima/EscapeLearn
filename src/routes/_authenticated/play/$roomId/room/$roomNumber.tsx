import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { RoomShell } from "@/components/game/RoomShell";
import { LeversRoom } from "@/components/game/LeversRoom";
import { CircuitRoom } from "@/components/game/CircuitRoom";
import { SafeRoom } from "@/components/game/SafeRoom";
import { MapRoom } from "@/components/game/MapRoom";
import type { GameData, Mechanic, MechanicHandle } from "@/components/game/types";

export const Route = createFileRoute("/_authenticated/play/$roomId/room/$roomNumber")({
  head: () => ({ meta: [{ title: "Escape Room — EscapeLearn" }] }),
  component: RoomPage,
});

type RoomRow = {
  id: string;
  room_number: number;
  title: string;
  concept: string;
  narrative_description: string;
  hint: string;
  is_boss_room: boolean;
  order_index: number;
  mechanic: string | null;
  game_data: unknown;
};

const THEME_FOR: Record<Mechanic, "industrial" | "circuit" | "detective" | "cartography"> = {
  levers: "industrial",
  circuit: "circuit",
  safe: "detective",
  map: "cartography",
};

function RoomPage() {
  const { roomId, roomNumber } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const startRef = useRef<number>(Date.now());
  const mechRef = useRef<MechanicHandle | null>(null);

  const current = useMemo(
    () => rooms.find((r) => String(r.room_number) === roomNumber),
    [rooms, roomNumber],
  );
  const nonBoss = rooms.filter((r) => !r.is_boss_room);
  const currentIndex = nonBoss.findIndex((r) => r.id === current?.id);

  const userName =
    profileName ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rooms")
      .select("*")
      .eq("escape_room_id", roomId)
      .order("order_index")
      .then(({ data }) => setRooms((data ?? []) as RoomRow[]));

    supabase
      .from("escape_rooms")
      .select("subject")
      .eq("id", roomId)
      .maybeSingle()
      .then(({ data }) => setSubject((data?.subject as string | undefined) ?? null));

    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfileName((data?.full_name as string | undefined) ?? null));

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
    setSolved(false);
    setHintsUsed(0);
    setHintShown(false);
    setWrongFlash(0);
  }, [user, roomId, roomNumber]);

  async function handleSolve() {
    if (!current || !sessionId || solved) return;
    setSolved(true);
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    try {
      await supabase.from("room_attempts").insert({
        session_id: sessionId,
        room_id: current.id,
        student_id: user!.id,
        answer_given: `[mechanic:${current.mechanic ?? "unknown"}]`,
        is_correct: true,
        hint_used: hintsUsed > 0,
        time_spent_seconds: timeSpent,
      });
      const nextIdx = currentIndex + 1;
      await supabase
        .from("game_sessions")
        .update({ current_room_index: nextIdx })
        .eq("id", sessionId);
      track("room_completed", {
        room_number: current.room_number,
        time_spent: timeSpent,
        hints_used: hintsUsed,
        mechanic: current.mechanic,
        roomId,
        sessionId,
        concept: current.concept,
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      const next = nonBoss[currentIndex + 1];
      if (next) {
        navigate({
          to: "/play/$roomId/room/$roomNumber",
          params: { roomId, roomNumber: String(next.room_number) },
        });
      } else {
        navigate({ to: "/play/$roomId/boss", params: { roomId } });
      }
    }, 1700);
  }

  function handleWrong() {
    setWrongFlash((n) => n + 1);
    if (current) {
      track("answer_incorrect", { room_number: current.room_number, mechanic: current.mechanic, roomId, concept: current.concept });
    }
  }

  async function handleHint() {
    if (!sessionId || solved) return;
    setHintShown(true);
    setHintsUsed((h) => h + 1);
    mechRef.current?.revealHint();
    try {
      const { data } = await supabase
        .from("game_sessions")
        .select("hints_used")
        .eq("id", sessionId)
        .single();
      await supabase
        .from("game_sessions")
        .update({ hints_used: (data?.hints_used ?? 0) + 1 })
        .eq("id", sessionId);
    } catch (e) {
      console.error(e);
    }
    if (current) track("hint_used", { room_number: current.room_number, is_boss_room: false, roomId, sessionId });
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-card" />
      </main>
    );
  }

  const mechanic = current.mechanic as Mechanic | null;
  const gameData = current.game_data as GameData | null;

  if (!mechanic || !gameData) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-muted-foreground">
          This room is missing puzzle data. Try regenerating the escape room.
        </p>
      </main>
    );
  }

  const theme = THEME_FOR[mechanic];

  let body: React.ReactNode = null;
  if (mechanic === "levers" && gameData.mechanic === "levers") {
    body = <LeversRoom ref={mechRef} data={gameData} onSolve={handleSolve} onWrong={handleWrong} disabled={solved} />;
  } else if (mechanic === "circuit" && gameData.mechanic === "circuit") {
    body = <CircuitRoom ref={mechRef} data={gameData} onSolve={handleSolve} onWrong={handleWrong} disabled={solved} />;
  } else if (mechanic === "safe" && gameData.mechanic === "safe") {
    body = <SafeRoom ref={mechRef} data={gameData} onSolve={handleSolve} onWrong={handleWrong} disabled={solved} />;
  } else if (mechanic === "map" && gameData.mechanic === "map") {
    body = <MapRoom ref={mechRef} data={gameData} onSolve={handleSolve} onWrong={handleWrong} disabled={solved} />;
  } else {
    body = <div className="text-sm text-muted-foreground">Unknown mechanic: {mechanic}</div>;
  }

  void hintShown; // currently the RoomShell handles hint display internally
  void toast; // reserved for future feedback toasts

  return (
    <RoomShell
      theme={theme}
      roomNumber={currentIndex + 1}
      totalRooms={nonBoss.length + 1}
      title={current.title}
      narrative={current.narrative_description}
      concept={current.concept}
      hintText={current.hint}
      hintsUsed={hintsUsed}
      onHint={handleHint}
      hintDisabled={solved}
      solved={solved}
      wrongFlash={wrongFlash}
      subject={subject}
      userName={userName}
    >
      {body}
    </RoomShell>
  );
}
