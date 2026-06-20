import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Animated cinematic background for the landing page.
 * Mystery / escape-room vibe: vault door silhouette, floating keys,
 * glowing padlocks, drifting glyphs, particle field.
 */
export function LandingScene() {
  const keys = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 8,
        dur: 16 + Math.random() * 14,
        size: 18 + Math.random() * 26,
        rot: Math.random() * 360,
      })),
    [],
  );
  const glyphs = useMemo(() => {
    const pool = ["⚷", "✦", "✧", "✶", "⌬", "❖", "✺", "◈"];
    return Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 8 + Math.random() * 8,
      glyph: pool[i % pool.length],
      size: 12 + Math.random() * 18,
    }));
  }, []);
  const particles = useMemo(
    () =>
      Array.from({ length: 90 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 4,
        dur: 3 + Math.random() * 5,
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Deep gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.18),transparent_60%),linear-gradient(180deg,#06051a,#020617)]" />

      {/* Faint grid */}
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(165,180,252,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(165,180,252,0.7)_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Slow rotating vault door silhouette */}
      <motion.svg
        viewBox="0 0 600 600"
        className="absolute -right-40 top-1/2 h-[900px] w-[900px] -translate-y-1/2 opacity-30"
        animate={{ rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <radialGradient id="vault" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0b0820" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="280" fill="url(#vault)" />
        <g fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.7">
          <circle cx="300" cy="300" r="270" />
          <circle cx="300" cy="300" r="220" strokeDasharray="6 12" />
          <circle cx="300" cy="300" r="160" />
          <circle cx="300" cy="300" r="100" strokeDasharray="2 8" />
        </g>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 300 + Math.cos(a) * 220;
          const y1 = 300 + Math.sin(a) * 220;
          const x2 = 300 + Math.cos(a) * 270;
          const y2 = 300 + Math.sin(a) * 270;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a78bfa" strokeWidth="3" />;
        })}
      </motion.svg>

      {/* Counter-rotating inner ring */}
      <motion.svg
        viewBox="0 0 400 400"
        className="absolute -left-32 top-[15%] h-[600px] w-[600px] opacity-20"
        animate={{ rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <g fill="none" stroke="#22d3ee" strokeWidth="1.5">
          <circle cx="200" cy="200" r="180" strokeDasharray="4 10" />
          <circle cx="200" cy="200" r="120" />
          <circle cx="200" cy="200" r="60" strokeDasharray="2 6" />
        </g>
      </motion.svg>

      {/* Floating keys */}
      {keys.map((k) => (
        <motion.div
          key={k.id}
          className="absolute text-violet-300/60"
          style={{ left: `${k.left}%`, top: `${k.top}%`, fontSize: k.size }}
          animate={{
            y: [0, -40, 0],
            x: [0, 20, -10, 0],
            rotate: [k.rot, k.rot + 25, k.rot - 15, k.rot],
          }}
          transition={{ duration: k.dur, delay: k.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          🗝
        </motion.div>
      ))}

      {/* Drifting glyphs */}
      {glyphs.map((g) => (
        <motion.div
          key={g.id}
          className="absolute font-serif text-fuchsia-300/40"
          style={{ left: `${g.left}%`, top: `${g.top}%`, fontSize: g.size }}
          animate={{ opacity: [0.1, 0.7, 0.1], y: [0, -20, 0] }}
          transition={{ duration: g.dur, delay: g.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          {g.glyph}
        </motion.div>
      ))}

      {/* Particle field */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute h-1 w-1 rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.9)]"
          style={{ left: `${p.left}%`, top: `${p.top}%` }}
          animate={{ opacity: [0.1, 1, 0.1] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
