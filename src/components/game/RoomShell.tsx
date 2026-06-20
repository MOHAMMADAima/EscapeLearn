import { ReactNode, useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Lock, Unlock, Timer, Volume2, VolumeX } from "lucide-react";
import { useGameAudio } from "./useGameAudio";
import { topicProfileFor } from "./topicProfile";
import { SfxProvider } from "./SfxContext";
import { TopicBackground } from "./TopicBackground";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type Theme = "industrial" | "circuit" | "detective" | "cartography";

const THEMES: Record<Theme, { bg: string; accent: string; chip: string; label: string }> = {
  industrial: {
    bg: "bg-[radial-gradient(ellipse_at_top,rgba(180,83,9,0.18),transparent_60%),linear-gradient(180deg,#0c0a09,#1c1917)]",
    accent: "text-amber-400",
    chip: "border-amber-700/50 bg-amber-900/20 text-amber-300",
    label: "Steam Chamber",
  },
  circuit: {
    bg: "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.15),transparent_60%),linear-gradient(180deg,#020617,#0f172a)]",
    accent: "text-cyan-400",
    chip: "border-cyan-700/50 bg-cyan-900/20 text-cyan-300",
    label: "Mainframe Core",
  },
  detective: {
    bg: "bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.12),transparent_60%),linear-gradient(180deg,#0a0a09,#1c1410)]",
    accent: "text-amber-300",
    chip: "border-stone-700 bg-stone-900 text-stone-300",
    label: "Detective's Office",
  },
  cartography: {
    bg: "bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.14),transparent_60%),linear-gradient(180deg,#0a1410,#0c1f1a)]",
    accent: "text-emerald-300",
    chip: "border-emerald-700/50 bg-emerald-900/20 text-emerald-300",
    label: "Cartographer's Hall",
  },
};

export interface RoomShellProps {
  theme: Theme;
  roomNumber: number;
  totalRooms: number;
  title: string;
  narrative: string;
  concept: string;
  hintText: string;
  hintsUsed: number;
  onHint: () => void;
  hintDisabled?: boolean;
  solved: boolean;
  wrongFlash: number; // increment to trigger red flash
  // NEW — topic + user info for adaptive audio/voice
  subject?: string | null;
  userName?: string | null;
  children: ReactNode;
}

export function RoomShell(props: RoomShellProps) {
  const theme = THEMES[props.theme];
  const progress = ((props.roomNumber - 1 + (props.solved ? 1 : 0)) / props.totalRooms) * 100;
  const [showHint, setShowHint] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Build a topic-aware audio profile from subject + title + concept
  const profile = useMemo(
    () => topicProfileFor({ subject: props.subject, title: props.title, concept: props.concept }),
    [props.subject, props.title, props.concept],
  );
  const audio = useGameAudio(profile);

  // Reset + tick timer per room
  useEffect(() => {
    setElapsed(0);
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [props.roomNumber]);

  // Success / wrong SFX based on parent state changes
  const lastSolved = useRef(false);
  useEffect(() => {
    if (props.solved && !lastSolved.current) {
      audio.playSfx("success");
    }
    lastSolved.current = props.solved;
  }, [props.solved, audio]);
  const lastWrong = useRef(0);
  useEffect(() => {
    if (props.wrongFlash > lastWrong.current) {
      audio.playSfx("wrong");
    }
    lastWrong.current = props.wrongFlash;
  }, [props.wrongFlash, audio]);

  function handleHint() {
    if (props.hintDisabled) return;
    audio.playSfx("hint");
    setShowHint(true);
    props.onHint();
  }

  function handleToggleAudio() {
    audio.toggle();
  }

  return (
    <SfxProvider value={audio.playSfx}>
      <div className={`relative min-h-screen ${theme.bg} text-stone-100`}>
        <TopicBackground profile={profile} />
        {/* Red wrong-answer flash */}
        <AnimatePresence>
          {props.wrongFlash > 0 && (
            <motion.div
              key={props.wrongFlash}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="pointer-events-none fixed inset-0 z-40 bg-red-600"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-white/5 bg-black/40 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
            <div className={`text-xs font-mono uppercase tracking-[0.3em] ${theme.accent}`}>
              Room {props.roomNumber} / {props.totalRooms} · {theme.label}
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-current to-current"
                style={{ color: "currentColor" }}
              />
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs ${theme.chip}`}
              title="Time in this room"
            >
              <Timer className="h-3.5 w-3.5" />
              {formatTime(elapsed)}
            </div>
            <button
              onClick={handleToggleAudio}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${theme.chip} hover:brightness-125`}
              title={
                audio.enabled
                  ? `Mute ambient (${profile.label})`
                  : `Play ambient (${profile.label})`
              }
              aria-label={audio.enabled ? "Mute audio" : "Play audio"}
            >
              {audio.enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleHint}
              disabled={props.hintDisabled}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${theme.chip} hover:brightness-125 disabled:opacity-40`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Hint · −50pt
              {props.hintsUsed > 0 && <span className="opacity-70">({props.hintsUsed})</span>}
            </button>
          </div>
        </div>

        {/* Body */}
        <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">
          <div className="mb-6">
            <h1 className="font-serif text-3xl leading-tight">{props.title}</h1>
            <p className="mt-2 max-w-2xl font-serif text-sm leading-relaxed text-stone-400">
              {props.narrative}
            </p>
            <div className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-[11px] uppercase tracking-widest ${theme.chip}`}>
              Concept: {props.concept}
            </div>
            {!audio.enabled && (
              <div className="mt-3 text-[11px] uppercase tracking-widest text-stone-500">
                Tip: tap <Volume2 className="inline h-3 w-3" /> to hear the ambience
              </div>
            )}

            {/* Topic-themed good-luck line, addressed to the player by name */}
            <motion.div
              key={`gl-${props.roomNumber}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className={`mt-5 max-w-2xl rounded-xl border bg-black/30 px-4 py-3 font-serif italic leading-relaxed backdrop-blur-sm ${theme.chip}`}
            >
              <span className="mr-2 not-italic opacity-70">✦</span>
              {profile.voice.goodLuck(props.userName ?? "")}
            </motion.div>
          </div>

          <div className="relative rounded-2xl border border-white/5 bg-black/20 p-6 backdrop-blur-sm">
            {props.children}

            <AnimatePresence>
              {props.solved && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: [0.7, 1.05, 1] }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/60 bg-emerald-950/70 px-10 py-6 shadow-[0_0_60px_rgba(16,185,129,0.5)] backdrop-blur"
                  >
                    <Unlock className="h-10 w-10 text-emerald-300" />
                    <div className="font-mono text-xl uppercase tracking-[0.4em] text-emerald-300">
                      Unlocked
                    </div>
                  </motion.div>
                  {Array.from({ length: 18 }).map((_, i) => {
                    const angle = (i / 18) * Math.PI * 2;
                    return (
                      <motion.div
                        key={i}
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{
                          x: Math.cos(angle) * 220,
                          y: Math.sin(angle) * 220,
                          opacity: 0,
                        }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                        className="absolute h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]"
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showHint && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{props.hintText}</div>
            </div>
          )}

          {!props.solved && (
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.3em] text-stone-500">
              <Lock className="h-3 w-3" /> Door sealed
            </div>
          )}
        </main>
      </div>
    </SfxProvider>
  );
}
