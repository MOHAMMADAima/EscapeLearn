import { forwardRef, useImperativeHandle, useState } from "react";
import { motion, Reorder } from "framer-motion";
import { ArrowUpDown, Lock } from "lucide-react";
import type { LeverItem, MechanicHandle, MechanicProps } from "./types";
import { useSfx } from "./SfxContext";

type Props = MechanicProps<{ mechanic: "levers"; items: LeverItem[] }>;

export const LeversRoom = forwardRef<MechanicHandle, Props>(function LeversRoom(
  { data, onSolve, onWrong, disabled },
  ref,
) {
  const [order, setOrder] = useState<LeverItem[]>(() =>
    [...data.items].sort(() => Math.random() - 0.5),
  );
  const sfx = useSfx();
  const [shake, setShake] = useState(false);
  const [solvedIdx, setSolvedIdx] = useState<number>(-1);
  const [hintedId, setHintedId] = useState<number | null>(null);

  useImperativeHandle(ref, () => ({
    revealHint() {
      const first = data.items.find((i) => i.correct_order === 1);
      if (first) setHintedId(first.id);
    },
  }));

  function check() {
    const isOk = order.every((it, idx) => it.correct_order === idx + 1);
    if (isOk) {
      // sequentially light up
      for (let i = 0; i < order.length; i++) {
        setTimeout(() => setSolvedIdx(i), i * 180);
      }
      setTimeout(() => onSolve(), order.length * 180 + 400);
    } else {
      setShake(true);
      onWrong?.();
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-xs uppercase tracking-[0.3em] text-amber-500/70">
        Pull the levers in the correct sequence
      </div>
      <motion.div
        animate={shake ? { x: [0, -12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Reorder.Group axis="y" values={order} onReorder={(v) => { sfx("move"); setOrder(v); }} className="space-y-3">
          {order.map((item, idx) => {
            const lit = solvedIdx >= idx;
            const hinted = hintedId === item.id;
            return (
              <Reorder.Item
                key={item.id}
                value={item}
                dragListener={!(disabled || solvedIdx >= 0)}
                whileDrag={{ scale: 1.03 }}
                className={`group flex cursor-grab items-center gap-4 rounded-md border-2 px-5 py-4 transition-all ${
                  lit
                    ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
                    : hinted
                      ? "border-amber-400 bg-amber-500/15"
                      : "border-amber-900/40 bg-gradient-to-r from-zinc-900 to-zinc-950 hover:border-amber-700/60"
                }`}
              >
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full border-2 font-mono text-sm ${
                    lit ? "border-emerald-400 bg-emerald-500 text-zinc-950" : "border-amber-700/60 bg-zinc-800 text-amber-400"
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 font-serif text-base text-amber-50">{item.label}</div>
                <ArrowUpDown className="h-4 w-4 text-amber-700/60 group-hover:text-amber-400" />
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </motion.div>
      <button
        onClick={() => { sfx("click"); check(); }}
        disabled={disabled || solvedIdx >= 0}
        className="rounded-md border-2 border-amber-600/60 bg-amber-600/10 px-8 py-3 font-mono text-sm uppercase tracking-widest text-amber-300 transition hover:bg-amber-600/20 disabled:opacity-40"
      >
        <Lock className="mr-2 inline h-4 w-4" /> Engage Levers
      </button>
    </div>
  );
});
