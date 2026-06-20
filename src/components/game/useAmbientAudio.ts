import { useEffect, useRef, useState, useCallback } from "react";

type Theme = "industrial" | "circuit" | "detective" | "cartography";

// Per-theme musical/sonic palette built procedurally with the Web Audio API.
// industrial → low brass-like drone + occasional metallic clangs
// circuit    → arpeggiated synth notes
// detective  → slow string-pad chord (minor) + faint ticking clock
// cartography→ wooden flute notes over soft wind
const PALETTE: Record<
  Theme,
  { drone: number[]; melody: number[]; wave: OscillatorType; tempoMs: number }
> = {
  industrial: { drone: [55, 82.5], melody: [110, 146.83, 164.81, 110], wave: "sawtooth", tempoMs: 1600 },
  circuit: { drone: [110], melody: [261.63, 329.63, 392, 523.25, 392, 329.63], wave: "triangle", tempoMs: 380 },
  detective: { drone: [98, 146.83, 174.61], melody: [220, 261.63, 329.63, 261.63], wave: "sine", tempoMs: 2200 },
  cartography: { drone: [73.42], melody: [392, 440, 523.25, 587.33, 523.25, 440], wave: "sine", tempoMs: 900 },
};

export function useAmbientAudio(theme: Theme) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ stop: () => void } | null>(null);

  const stop = useCallback(() => {
    nodesRef.current?.stop();
    nodesRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (nodesRef.current) return;
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = ctxRef.current ?? new AC();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.2);
    master.connect(ctx.destination);

    const pal = PALETTE[theme];

    // Drone layer
    const droneOscs = pal.drone.map((freq) => {
      const o = ctx.createOscillator();
      o.type = pal.wave;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      // slow LFO for breathing
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12 + Math.random() * 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain).connect(g.gain);
      o.connect(g).connect(master);
      o.start();
      lfo.start();
      return { o, lfo };
    });

    // Melody scheduler
    let i = 0;
    const playNote = () => {
      if (!ctxRef.current) return;
      const freq = pal.melody[i % pal.melody.length];
      i++;
      const o = ctx.createOscillator();
      o.type = pal.wave;
      o.frequency.value = freq;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 1.3);
    };
    const interval = window.setInterval(playNote, pal.tempoMs);

    nodesRef.current = {
      stop: () => {
        window.clearInterval(interval);
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        } catch {
          // ignore
        }
        droneOscs.forEach(({ o, lfo }) => {
          try {
            o.stop(ctx.currentTime + 0.5);
            lfo.stop(ctx.currentTime + 0.5);
          } catch {
            // ignore
          }
        });
      },
    };
  }, [theme]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) start();
      else stop();
      return next;
    });
  }, [start, stop]);

  // Restart when theme changes if enabled
  useEffect(() => {
    if (enabled) {
      stop();
      start();
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => () => stop(), [stop]);

  return { enabled, toggle };
}
