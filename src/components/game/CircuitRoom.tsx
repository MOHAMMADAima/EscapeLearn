import { forwardRef, useImperativeHandle, useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { CircuitConnection, MechanicHandle, MechanicProps } from "./types";
import { useSfx } from "./SfxContext";

type Props = MechanicProps<{ mechanic: "circuit"; connections: CircuitConnection[] }>;

type Line = { left: string; rightId: number; rightValue: string; wrong?: boolean; flash?: boolean };

export const CircuitRoom = forwardRef<MechanicHandle, Props>(function CircuitRoom(
  { data, onSolve, onWrong, disabled },
  ref,
) {
  const leftItems = useMemo(() => data.connections.map((c) => c.left), [data]);
  const rightItems = useMemo(
    () =>
      data.connections
        .map((c, i) => ({ id: i, value: c.right }))
        .sort(() => Math.random() - 0.5),
    [data],
  );
  const correctMap = useMemo(() => {
    const m = new Map<string, string>();
    data.connections.forEach((c) => m.set(c.left, c.right));
    return m;
  }, [data]);

  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const sfx = useSfx();
  const [shake, setShake] = useState(false);
  const [solved, setSolved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<Record<string, HTMLButtonElement | null>>({});
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const measure = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const c = cont.getBoundingClientRect();
    const next: Record<string, { x: number; y: number }> = {};
    for (const key of Object.keys(nodes.current)) {
      const el = nodes.current[key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const side: "left" | "right" = key.startsWith("L:") ? "left" : "right";
      next[key] = {
        x: side === "left" ? r.right - c.left : r.left - c.left,
        y: r.top - c.top + r.height / 2,
      };
    }
    setPositions((prev) => {
      const keys = Object.keys(next);
      if (
        keys.length === Object.keys(prev).length &&
        keys.every((k) => prev[k] && prev[k].x === next[k].x && prev[k].y === next[k].y)
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(cont);
    Object.values(nodes.current).forEach((el) => el && ro.observe(el));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, leftItems, rightItems]);

  useImperativeHandle(ref, () => ({
    revealHint() {
      // briefly flash one missing correct line
      const missing = data.connections.find(
        (c) =>
          !lines.some(
            (l) => l.left === c.left && l.rightValue === c.right && !l.wrong && !l.flash,
          ),
      );
      if (!missing) return;
      // pick any right slot with the correct value that isn't already connected
      const slot = rightItems.find(
        (s) =>
          s.value === missing.right &&
          !lines.some((l) => l.rightId === s.id && !l.wrong && !l.flash),
      );
      if (!slot) return;
      const flash: Line = {
        left: missing.left,
        rightId: slot.id,
        rightValue: slot.value,
        flash: true,
      };
      setLines((ls) => [...ls, flash]);
      setTimeout(() => {
        setLines((ls) => ls.filter((l) => l !== flash));
      }, 1500);
    },
  }));

  function clickLeft(l: string) {
    if (disabled || solved) return;
    sfx("click");
    setSelectedLeft(l);
  }
  function clickRight(slot: { id: number; value: string }) {
    if (disabled || solved || !selectedLeft) return;
    sfx("move");
    const left = selectedLeft;
    setSelectedLeft(null);
    const correct = correctMap.get(left) === slot.value;
    if (!correct) {
      const tmp: Line = { left, rightId: slot.id, rightValue: slot.value, wrong: true };
      setLines((ls) => [...ls.filter((x) => x.left !== left || x.wrong || x.flash), tmp]);
      onWrong?.();
      setTimeout(() => setLines((ls) => ls.filter((x) => x !== tmp)), 700);
      return;
    }
    setLines((ls) => {
      const next = [
        ...ls.filter(
          (x) =>
            !x.flash && !x.wrong && x.left !== left && x.rightId !== slot.id,
        ),
        { left, rightId: slot.id, rightValue: slot.value },
      ];
      if (next.length === data.connections.length) {
        setTimeout(() => {
          setSolved(true);
          setTimeout(() => onSolve(), 700);
        }, 200);
      }
      return next;
    });
  }


  return (
    <motion.div
      ref={containerRef}
      animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      onAnimationComplete={() => setShake(false)}
      className="relative w-full"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center">
        <div className="space-y-3">
          {leftItems.map((l) => (
            <button
              key={l}
              ref={(el) => { nodes.current[`L:${l}`] = el; }}
              onClick={() => clickLeft(l)}
              disabled={disabled || solved}
              className={`block w-full rounded-md border-2 px-4 py-3 text-left text-sm transition ${
                selectedLeft === l
                  ? "border-cyan-400 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                  : lines.some((x) => x.left === l && !x.wrong && !x.flash)
                    ? "border-cyan-500/60 bg-cyan-500/10"
                    : "border-cyan-900/50 bg-zinc-950/60 hover:border-cyan-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="text-cyan-500/40 text-2xl">→</div>
        <div className="space-y-3">
          {rightItems.map((slot) => (
            <button
              key={slot.id}
              ref={(el) => { nodes.current[`R:${slot.id}`] = el; }}
              onClick={() => clickRight(slot)}
              disabled={disabled || solved || !selectedLeft}
              className={`block w-full rounded-md border-2 px-4 py-3 text-left text-sm transition ${
                lines.some((x) => x.rightId === slot.id && !x.wrong && !x.flash)
                  ? "border-cyan-500/60 bg-cyan-500/10"
                  : "border-cyan-900/50 bg-zinc-950/60 hover:border-cyan-700"
              }`}
            >
              {slot.value}
            </button>
          ))}
        </div>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {lines.map((ln, i) => {
          const a = positions[`L:${ln.left}`] ?? { x: 0, y: 0 };
          const b = positions[`R:${ln.rightId}`] ?? { x: 0, y: 0 };
          if (a.x === 0 && b.x === 0) return null;
          const stroke = ln.wrong ? "#ef4444" : ln.flash ? "#fbbf24" : solved ? "#10b981" : "#22d3ee";
          return (
            <motion.line
              key={`${ln.left}-${ln.rightId}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={stroke}
              strokeWidth={2.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
            />
          );
        })}
      </svg>

      {solved && (
        <div className="mt-6 text-center font-mono text-sm uppercase tracking-widest text-emerald-400">
          <Zap className="inline h-4 w-4" /> Circuit powered
        </div>
      )}
    </motion.div>
  );
});
