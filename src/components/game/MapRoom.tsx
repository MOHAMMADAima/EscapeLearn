import { forwardRef, useImperativeHandle, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import type { MapZone, MechanicHandle, MechanicProps } from "./types";
import { useSfx } from "./SfxContext";

type Props = MechanicProps<{ mechanic: "map"; zones: MapZone[]; items: string[] }>;

export const MapRoom = forwardRef<MechanicHandle, Props>(function MapRoom(
  { data, onSolve, onWrong, disabled },
  ref,
) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [dragged, setDragged] = useState<string | null>(null);
  const [bounce, setBounce] = useState<string | null>(null);
  const sfx = useSfx();

  useImperativeHandle(ref, () => ({
    revealHint() {
      const z = data.zones.find((z) => !placed[z.id]);
      if (!z) return;
      setPlaced((p) => ({ ...p, [z.id]: z.correct_item }));
      setLocked((s) => new Set(s).add(z.id));
      checkSolved({ ...placed, [z.id]: z.correct_item });
    },
  }));

  function checkSolved(state: Record<string, string>) {
    const ok = data.zones.every((z) => state[z.id] === z.correct_item);
    if (ok) setTimeout(onSolve, 600);
  }

  function dropOn(zone: MapZone) {
    if (!dragged || disabled || locked.has(zone.id)) return;
    const item = dragged;
    setDragged(null);
    if (item === zone.correct_item) {
      sfx("move");
      const next = { ...placed, [zone.id]: item };
      setPlaced(next);
      setLocked((s) => new Set(s).add(zone.id));
      checkSolved(next);
    } else {
      onWrong?.();
      setBounce(item);
      setTimeout(() => setBounce(null), 500);
    }
  }

  const availableItems = data.items.filter(
    (i) => !Object.values(placed).includes(i),
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      {/* Map zones */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border-2 border-emerald-900/40 bg-[radial-gradient(ellipse_at_center,rgba(20,83,45,0.3),rgba(0,0,0,0.6))] p-4">
        {data.zones.map((z) => {
          const item = placed[z.id];
          const isLocked = locked.has(z.id);
          return (
            <div
              key={z.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOn(z)}
              className={`flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition ${
                isLocked
                  ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                  : "border-emerald-700/40 bg-stone-900/40"
              }`}
            >
              <div className="flex items-center gap-1.5 font-serif text-xs uppercase tracking-widest text-emerald-200/70">
                <MapPin className="h-3 w-3" /> {z.label}
              </div>
              {item ? (
                <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 font-serif text-sm text-emerald-100">
                  {item}
                </div>
              ) : (
                <div className="text-xs text-stone-500">drop here</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Item tray */}
      <div className="flex flex-col gap-2 self-start rounded-xl border-2 border-amber-900/40 bg-stone-950/70 p-4">
        <div className="mb-1 font-serif text-xs uppercase tracking-widest text-amber-200/70">
          Labels
        </div>
        <AnimatePresence>
          {availableItems.map((it) => (
            <motion.div
              key={it}
              layout
              draggable={!disabled}
              onDragStart={() => setDragged(it)}
              onDragEnd={() => setDragged(null)}
              animate={bounce === it ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
              className={`cursor-grab rounded-md border-2 border-amber-700/50 bg-amber-900/20 px-3 py-2 font-serif text-sm text-amber-100 transition hover:border-amber-500 active:cursor-grabbing ${
                dragged === it ? "opacity-50" : ""
              }`}
            >
              {it}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
