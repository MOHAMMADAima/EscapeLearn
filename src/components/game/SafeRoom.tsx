import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, X } from "lucide-react";
import type { MechanicHandle, MechanicProps, SafeClue } from "./types";
import { useSfx } from "./SfxContext";

type Props = MechanicProps<{ mechanic: "safe"; clues: SafeClue[]; code: string }>;

export const SafeRoom = forwardRef<MechanicHandle, Props>(function SafeRoom(
  { data, onSolve, onWrong, disabled },
  ref,
) {
  const len = data.code.length;
  // slots holds either a user-typed digit, a hint-locked digit, or null
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(len).fill(null));
  const [locked, setLocked] = useState<boolean[]>(() => Array(len).fill(false));
  const [openClue, setOpenClue] = useState<SafeClue | null>(null);
  const [shake, setShake] = useState(false);
  const [denied, setDenied] = useState(false);
  const [solved, setSolved] = useState(false);
  const sfx = useSfx();

  useImperativeHandle(ref, () => ({
    revealHint() {
      setSlots((prev) => {
        const next = [...prev];
        const idx = next.findIndex((_, i) => !locked[i]);
        if (idx === -1) return prev;
        next[idx] = data.code[idx];
        setLocked((l) => {
          const nl = [...l];
          nl[idx] = true;
          return nl;
        });
        return next;
      });
    },
  }));

  const filledCount = slots.filter((s) => s !== null).length;

  function press(d: string) {
    if (disabled || solved) return;
    sfx("click");
    setSlots((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s, i) => s === null && !locked[i]);
      if (idx === -1) return prev;
      next[idx] = d;
      return next;
    });
  }
  function back() {
    if (disabled || solved) return;
    setSlots((prev) => {
      const next = [...prev];
      // find last non-locked filled slot
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== null && !locked[i]) {
          next[i] = null;
          return next;
        }
      }
      return prev;
    });
  }
  function submit() {
    if (filledCount !== len) return;
    const entry = slots.map((s) => s ?? "").join("");
    if (entry === data.code) {
      setSolved(true);
      setTimeout(() => onSolve(), 1100);
    } else {
      setShake(true);
      setDenied(true);
      onWrong?.();
      setTimeout(() => {
        setShake(false);
        setDenied(false);
        setSlots((prev) => prev.map((s, i) => (locked[i] ? s : null)));
      }, 900);
    }
  }

  const displayDigits = useMemo(() => slots.map((s) => s ?? "•"), [slots]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-3 gap-3 self-start">
        {data.clues.map((c) => (
          <button
            key={c.object}
            onClick={() => setOpenClue(c)}
            disabled={disabled || solved}
            className="group flex flex-col items-center gap-2 rounded-md border-2 border-amber-900/40 bg-stone-900/80 p-5 text-stone-200 transition hover:border-amber-700/70 hover:bg-stone-800"
          >
            <span className="text-4xl transition group-hover:scale-110">{c.icon}</span>
            <span className="font-serif text-xs uppercase tracking-widest text-amber-200/70">
              {c.object}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        animate={shake ? { x: [0, -12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative w-64 rounded-xl border-4 p-5 ${
          solved
            ? "border-emerald-500 bg-emerald-950/40 shadow-[0_0_40px_rgba(16,185,129,0.5)]"
            : "border-stone-700 bg-gradient-to-b from-stone-800 to-stone-950"
        }`}
      >
        <div className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-stone-400">
          Vault
        </div>
        <div
          className={`mx-auto flex h-14 items-center justify-center gap-1 rounded border-2 font-mono text-2xl tracking-widest ${
            denied
              ? "border-red-500 bg-red-950/40 text-red-300"
              : solved
                ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                : "border-stone-700 bg-stone-950 text-amber-300"
          }`}
        >
          {displayDigits.map((d, i) => (
            <span
              key={i}
              className={`w-6 text-center ${locked[i] ? "text-amber-200" : ""}`}
            >
              {d}
            </span>
          ))}
        </div>
        {denied && (
          <div className="mt-2 text-center font-mono text-xs text-red-400">ACCESS DENIED</div>
        )}
        {solved && (
          <div className="mt-2 text-center font-mono text-xs text-emerald-300">UNLOCKED</div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => press(String(n))}
              disabled={disabled || solved}
              className="rounded border border-stone-700 bg-stone-800 py-2 font-mono text-lg text-stone-200 transition hover:bg-stone-700 active:bg-stone-600"
            >
              {n}
            </button>
          ))}
          <button
            onClick={back}
            disabled={disabled || solved}
            className="rounded border border-stone-700 bg-stone-800 py-2 text-stone-400 transition hover:bg-stone-700"
          >
            <Delete className="mx-auto h-4 w-4" />
          </button>
          <button
            onClick={() => press("0")}
            disabled={disabled || solved}
            className="rounded border border-stone-700 bg-stone-800 py-2 font-mono text-lg text-stone-200 transition hover:bg-stone-700"
          >
            0
          </button>
          <button
            onClick={submit}
            disabled={disabled || solved || filledCount !== len}
            className="rounded border border-emerald-700 bg-emerald-700/30 py-2 font-mono text-xs text-emerald-300 transition hover:bg-emerald-700/50 disabled:opacity-40"
          >
            ENTER
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {openClue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
            onClick={() => setOpenClue(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-lg border-2 border-amber-900/60 bg-stone-900 p-6 text-stone-100 shadow-2xl"
            >
              <button
                onClick={() => setOpenClue(null)}
                className="absolute right-3 top-3 text-stone-500 hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-4xl">{openClue.icon}</span>
                <div className="font-serif text-lg capitalize text-amber-200">{openClue.object}</div>
              </div>
              <p className="font-serif text-base leading-relaxed text-stone-200">
                {openClue.reveals}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
