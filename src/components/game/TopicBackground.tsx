import { useMemo } from "react";
import { motion } from "framer-motion";
import type { TopicProfile } from "./topicProfile";

/**
 * Full-screen animated background keyed to the room's topic profile.
 * Pure CSS + SVG + framer-motion — no extra deps, GPU friendly.
 */
export function TopicBackground({ profile }: { profile: TopicProfile }) {
  const kind = useMemo(() => pickKind(profile.label, profile.sfx), [profile.label, profile.sfx]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ perspective: 1200 }}
    >
      {kind === "chemistry" && <ChemistryScene />}
      {kind === "history-fr" && <FrenchRevolutionScene />}
      {kind === "history" && <AncientHistoryScene />}
      {kind === "physics" && <PhysicsScene />}
      {kind === "robotics" && <RoboticsScene />}
      {kind === "biology" && <BiologyScene />}
      {kind === "music" && <MusicScene />}
      {kind === "literature" && <LiteratureScene />}
      {kind === "math" && <MathScene />}
      {kind === "generic" && <GenericScene />}
      {/* Soft vignette so foreground stays readable */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

type Kind =
  | "chemistry"
  | "history-fr"
  | "history"
  | "physics"
  | "robotics"
  | "biology"
  | "music"
  | "literature"
  | "math"
  | "generic";

function pickKind(label: string, sfx: string): Kind {
  const l = label.toLowerCase();
  if (l.includes("french")) return "history-fr";
  if (l.includes("history")) return "history";
  if (l.includes("chemistry")) return "chemistry";
  if (l.includes("physics")) return "physics";
  if (l.includes("robot") || l.includes("cs")) return "robotics";
  if (l.includes("biology") || l.includes("nature")) return "biology";
  if (l.includes("music")) return "music";
  if (l.includes("literature")) return "literature";
  if (l.includes("math")) return "math";
  if (sfx === "nature") return "biology";
  if (sfx === "robotic") return "robotics";
  if (sfx === "classical") return "literature";
  return "generic";
}

/* ---------------- Chemistry: 3D bubbles + molecules ---------------- */
function ChemistryScene() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 30 + Math.random() * 90,
        delay: Math.random() * 8,
        dur: 10 + Math.random() * 14,
        hue: 170 + Math.random() * 60,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#0b3b4a,#020617_70%)]">
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: "110vh", x: 0, opacity: 0 }}
          animate={{
            y: "-20vh",
            x: [0, 20, -15, 10, 0],
            opacity: [0, 0.85, 0.85, 0],
            rotateX: [0, 60, 0],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle at 30% 30%, hsla(${b.hue},80%,80%,0.95), hsla(${b.hue},70%,40%,0.25) 60%, transparent 70%)`,
            boxShadow: `0 0 30px hsla(${b.hue},80%,60%,0.4), inset -8px -10px 20px hsla(${b.hue},80%,20%,0.5)`,
            transformStyle: "preserve-3d",
          }}
        />
      ))}
      {/* floating molecule */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute right-[6%] top-[18%] h-64 w-64 opacity-60"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <g stroke="#7dd3fc" strokeWidth="2" fill="none">
          <circle cx="100" cy="100" r="60" />
          <line x1="40" y1="100" x2="160" y2="100" />
          <line x1="100" y1="40" x2="100" y2="160" />
        </g>
        {[[40, 100], [160, 100], [100, 40], [100, 160], [100, 100]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="#22d3ee" opacity="0.8" />
        ))}
      </motion.svg>
    </div>
  );
}

/* ---------------- French Revolution: tricolor flags + parchment ---------------- */
function FrenchRevolutionScene() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#1a1108,#2a1808_60%,#0c0604)]">
      {/* parchment haze */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen [background:repeating-linear-gradient(0deg,transparent_0_3px,rgba(217,180,120,0.05)_3px_4px)]" />
      {/* silhouette skyline */}
      <svg className="absolute bottom-0 w-full" viewBox="0 0 800 200" preserveAspectRatio="none">
        <path
          d="M0,200 L0,140 L60,140 L70,100 L80,140 L150,140 L170,80 L190,140 L260,140 L280,60 L300,140 L380,140 L400,30 L420,140 L520,140 L540,90 L560,140 L680,140 L700,70 L720,140 L800,140 L800,200 Z"
          fill="#000"
          opacity="0.85"
        />
      </svg>
      {/* waving tricolor flags */}
      {[15, 45, 78].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute bottom-[18%] flex h-32 w-20 flex-col shadow-2xl"
          style={{ left: `${pos}%`, transformOrigin: "top left" }}
          animate={{ rotate: [-2, 3, -2], skewY: [-1, 1, -1] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-1/3 bg-blue-700" />
          <div className="h-1/3 bg-white" />
          <div className="h-1/3 bg-red-600" />
        </motion.div>
      ))}
      {/* glowing embers */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
          style={{ left: `${Math.random() * 100}%`, bottom: 0 }}
          animate={{ y: -400 - Math.random() * 200, opacity: [0, 1, 0] }}
          transition={{ duration: 6 + Math.random() * 6, delay: Math.random() * 6, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

/* ---------------- Ancient History: drifting parchment + columns ---------------- */
function AncientHistoryScene() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#3a2a14,#0c0804_70%)]">
      <svg className="absolute bottom-0 w-full" viewBox="0 0 800 300" preserveAspectRatio="none">
        {[80, 220, 380, 540, 700].map((x, i) => (
          <g key={i} fill="#1a120a" opacity="0.9">
            <rect x={x - 20} y="60" width="40" height="220" />
            <rect x={x - 30} y="50" width="60" height="15" />
            <rect x={x - 30} y="270" width="60" height="20" />
          </g>
        ))}
      </svg>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-3 w-8 rounded-sm bg-amber-200/20"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ x: [0, 80, 0], y: [0, -40, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 18 + Math.random() * 10, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ---------------- Physics: orbiting particles + waves ---------------- */
function PhysicsScene() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0a0a2a,#020617_70%)]">
      {Array.from({ length: 4 }).map((_, ring) => (
        <motion.div
          key={ring}
          className="absolute left-1/2 top-1/2 rounded-full border border-indigo-400/30"
          style={{
            width: 220 + ring * 160,
            height: 220 + ring * 160,
            marginLeft: -(110 + ring * 80),
            marginTop: -(110 + ring * 80),
          }}
          animate={{ rotate: ring % 2 ? -360 : 360 }}
          transition={{ duration: 30 + ring * 10, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300 shadow-[0_0_20px_rgba(165,180,252,0.9)]"
            style={{ left: "50%", top: 0 }}
          />
        </motion.div>
      ))}
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-px w-px rounded-full bg-white"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.8,
            boxShadow: "0 0 4px rgba(255,255,255,0.8)",
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- Robotics: scanning grid + matrix rain ---------------- */
function RoboticsScene() {
  const cols = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: (i / 28) * 100,
        delay: Math.random() * 5,
        dur: 4 + Math.random() * 6,
        chars: Array.from({ length: 18 }, () => (Math.random() > 0.5 ? "1" : "0")).join(""),
      })),
    [],
  );
  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#020617,#04162a)]">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.3)_1px,transparent_1px)] [background-size:48px_48px]" />
      {cols.map((c) => (
        <motion.div
          key={c.id}
          className="absolute top-0 font-mono text-xs leading-tight text-cyan-400/70"
          style={{ left: `${c.left}%` }}
          initial={{ y: "-30%" }}
          animate={{ y: "110%" }}
          transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: "linear" }}
        >
          {c.chars.split("").map((ch, j) => (
            <div key={j} style={{ opacity: 1 - j / 18 }}>
              {ch}
            </div>
          ))}
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent"
        animate={{ y: ["-20%", "120%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ---------------- Biology: drifting leaves + fireflies ---------------- */
function BiologyScene() {
  const leaves = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        dur: 14 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a2914,#03110a_70%)]">
      {leaves.map((l) => (
        <motion.div
          key={l.id}
          className="absolute -top-10"
          style={{ left: `${l.left}%` }}
          animate={{
            y: "110vh",
            x: [0, 40, -30, 20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: l.dur, delay: l.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path d="M11 1 C 17 6, 17 16, 11 21 C 5 16, 5 6, 11 1 Z" fill="#65a30d" opacity="0.8" />
          </svg>
        </motion.div>
      ))}
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ opacity: [0.1, 1, 0.1], scale: [0.6, 1.4, 0.6] }}
          transition={{ duration: 2 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

/* ---------------- Music: staves + floating notes ---------------- */
function MusicScene() {
  const notes = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        dur: 10 + Math.random() * 10,
        glyph: ["♪", "♫", "♩", "♬"][i % 4],
      })),
    [],
  );
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#2a1a3a,#0a0612_70%)]">
      <svg className="absolute inset-0 h-full w-full opacity-20">
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={i}
            x1="0"
            x2="100%"
            y1={`${15 + i * 14}%`}
            y2={`${15 + i * 14}%`}
            stroke="#e9d5ff"
            strokeWidth="1"
          />
        ))}
      </svg>
      {notes.map((n) => (
        <motion.div
          key={n.id}
          className="absolute text-4xl text-fuchsia-200"
          style={{ left: `${n.left}%`, bottom: "-10%" }}
          animate={{ y: "-110vh", x: [0, 30, -20, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: n.dur, delay: n.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          {n.glyph}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- Literature: floating pages + ink ---------------- */
function LiteratureScene() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#2a1f10,#0a0604_70%)]">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-24 w-20 rounded-sm bg-amber-50/90 shadow-2xl"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{
            y: [0, -60, 0],
            rotate: [-8, 8, -8],
          }}
          transition={{ duration: 10 + Math.random() * 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="m-2 space-y-1">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="h-0.5 w-full bg-stone-700/40" />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- Math: floating equations + grid ---------------- */
function MathScene() {
  const eqs = ["∫ e^x dx", "π·r²", "a² + b² = c²", "∑ⁿ 1/n", "e^{iπ}+1=0", "∂f/∂x", "√2", "lim n→∞"];
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a1a2a,#020617_70%)]">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.3)_1px,transparent_1px)] [background-size:40px_40px]" />
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute font-serif text-2xl text-sky-200/70"
          style={{ left: `${Math.random() * 90}%`, top: `${Math.random() * 90}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 8 + Math.random() * 6, repeat: Infinity, delay: Math.random() * 4 }}
        >
          {eqs[i % eqs.length]}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- Generic fallback ---------------- */
function GenericScene() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1e293b,#020617_70%)]">
      {Array.from({ length: 80 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ opacity: [0.1, 0.9, 0.1] }}
          transition={{ duration: 2 + Math.random() * 4, repeat: Infinity }}
        />
      ))}
    </div>
  );
}
