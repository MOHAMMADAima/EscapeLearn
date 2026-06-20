// =======================================================================
// Module-level ambient audio singleton.
// Lives outside React's lifecycle so it keeps playing across SPA navigation.
// State is persisted in localStorage so a fresh load remembers the choice
// (and resumes on the first user gesture, since browsers block autoplay).
// =======================================================================

type Listener = (enabled: boolean) => void;

const STORAGE_KEY = "escapelearn:ambient-enabled";

type AudioRefs = {
  ctx: AudioContext;
  master: GainNode;
  ambient: { stop: () => void } | null;
};

// Mysterious, cinematic ambient palette (matches landing voice).
const PALETTE = {
  drone: [55, 82.4, 110],
  melody: [220, 277.18, 329.63, 440, 329.63, 277.18],
  wave: "triangle" as OscillatorType,
  tempoMs: 750,
};

let refs: AudioRefs | null = null;
let enabled = false;
const listeners = new Set<Listener>();

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStored(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

function ensureCtx(): AudioRefs | null {
  if (refs) return refs;
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  refs = { ctx, master, ambient: null };
  return refs;
}

function startAmbient() {
  const a = ensureCtx();
  if (!a) return;
  if (a.ambient) return;
  const { ctx, master } = a;
  if (ctx.state === "suspended") void ctx.resume();

  const ambientGain = ctx.createGain();
  ambientGain.gain.value = 0;
  ambientGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
  ambientGain.connect(master);

  const droneOscs = PALETTE.drone.map((freq) => {
    const o = ctx.createOscillator();
    o.type = PALETTE.wave;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12 + Math.random() * 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(g).connect(ambientGain);
    o.start();
    lfo.start();
    return { o, lfo };
  });

  let i = 0;
  const playNote = () => {
    if (!refs) return;
    const c = refs.ctx;
    const freq = PALETTE.melody[i % PALETTE.melody.length];
    i++;
    const o = c.createOscillator();
    o.type = PALETTE.wave;
    o.frequency.value = freq;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g).connect(ambientGain);
    o.start(t);
    o.stop(t + 1.3);
  };
  const interval = window.setInterval(playNote, PALETTE.tempoMs);

  a.ambient = {
    stop: () => {
      window.clearInterval(interval);
      try {
        ambientGain.gain.cancelScheduledValues(ctx.currentTime);
        ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
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
}

function stopAmbient() {
  if (!refs?.ambient) return;
  refs.ambient.stop();
  refs.ambient = null;
}

function emit() {
  listeners.forEach((l) => l(enabled));
}

export const ambientAudio = {
  isEnabled(): boolean {
    return enabled;
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  enable() {
    if (enabled) return;
    enabled = true;
    writeStored(true);
    startAmbient();
    emit();
  },
  disable() {
    if (!enabled) return;
    enabled = false;
    writeStored(false);
    stopAmbient();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    emit();
  },
  toggle() {
    if (enabled) this.disable();
    else this.enable();
  },
  /**
   * Call once on app boot. If the user previously enabled music, we attempt
   * to resume it. Browsers usually block this until a user gesture, so we
   * also attach a one-shot gesture listener that retries.
   */
  hydrate() {
    if (typeof window === "undefined") return;
    const wanted = readStored();
    if (!wanted) return;
    enabled = true;
    emit();
    const tryStart = () => {
      startAmbient();
      const a = refs;
      if (a && a.ctx.state !== "running") {
        // Still suspended — wait for a gesture.
        const resume = () => {
          void a.ctx.resume().then(() => {
            if (enabled && !a.ambient) startAmbient();
          });
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
        };
        window.addEventListener("pointerdown", resume, { once: true });
        window.addEventListener("keydown", resume, { once: true });
      }
    };
    tryStart();
  },
};
