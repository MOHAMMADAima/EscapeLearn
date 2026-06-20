import { useCallback, useEffect, useRef, useState } from "react";
import type { SfxStyle, TopicProfile, VoicePersona } from "./topicProfile";

// =======================================================================
// useGameAudio — topic-aware ambient music + UI SFX + intro narration.
// All audio is procedural (Web Audio API) so no asset shipping is needed.
// Voice uses the browser SpeechSynthesis API; persona tunes pitch/rate/voice.
// =======================================================================

type AudioRefs = {
  ctx: AudioContext;
  master: GainNode;
  ambient: { stop: () => void } | null;
};

export function useGameAudio(profile: TopicProfile) {
  const [enabled, setEnabled] = useState(false);
  const refs = useRef<AudioRefs | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Lazily build / fetch an AudioContext + master gain.
  const ensureCtx = useCallback(() => {
    if (refs.current) return refs.current;
    const AC: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    refs.current = { ctx, master, ambient: null };
    return refs.current;
  }, []);

  // ============== AMBIENT MUSIC ==============
  const startAmbient = useCallback(() => {
    const a = ensureCtx();
    if (!a) return;
    if (a.ambient) return;
    const { ctx, master } = a;
    if (ctx.state === "suspended") void ctx.resume();

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
    ambientGain.connect(master);

    const pal = profileRef.current;

    const droneOscs = pal.drone.map((freq) => {
      const o = ctx.createOscillator();
      o.type = pal.wave;
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
      const c = refs.current?.ctx;
      if (!c) return;
      const freq = pal.melody[i % pal.melody.length];
      i++;
      const o = c.createOscillator();
      o.type = pal.wave;
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
    const interval = window.setInterval(playNote, pal.tempoMs);

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
  }, [ensureCtx]);

  const stopAmbient = useCallback(() => {
    const a = refs.current;
    if (!a?.ambient) return;
    a.ambient.stop();
    a.ambient = null;
  }, []);

  // Restart ambient when palette changes if currently on
  useEffect(() => {
    if (!enabled) return;
    stopAmbient();
    startAmbient();
  }, [profile, enabled, startAmbient, stopAmbient]);

  // ============== SFX ==============
  const playSfx = useCallback(
    (kind: "click" | "move" | "success" | "wrong" | "hint") => {
      const a = ensureCtx();
      if (!a) return;
      const { ctx, master } = a;
      if (ctx.state === "suspended") void ctx.resume();
      const style: SfxStyle = profileRef.current.sfx;
      sfx(ctx, master, kind, style);
    },
    [ensureCtx],
  );

  // ============== VOICE NARRATION ==============
  const speak = useCallback((text: string, persona: VoicePersona) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const speakNow = () => {
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = persona.rate;
      utter.pitch = persona.pitch;
      const voices = synth.getVoices();
      const lang = persona.langPrefs[0] ?? "en-US";
      utter.lang = lang;
      // Pick the best matching voice
      const lower = (s: string) => s.toLowerCase();
      let chosen: SpeechSynthesisVoice | undefined;
      for (const hint of persona.voiceHints) {
        chosen = voices.find((v) => lower(v.name).includes(hint));
        if (chosen) break;
      }
      if (!chosen) {
        for (const lp of persona.langPrefs) {
          chosen = voices.find((v) => v.lang.toLowerCase().startsWith(lp.toLowerCase()));
          if (chosen) break;
        }
      }
      if (chosen) utter.voice = chosen;
      synth.speak(utter);
    };
    // Voices may load asynchronously
    if (synth.getVoices().length === 0) {
      const handler = () => {
        speakNow();
        synth.removeEventListener("voiceschanged", handler);
      };
      synth.addEventListener("voiceschanged", handler);
      // also try a short timeout fallback in case event doesn't fire
      window.setTimeout(speakNow, 350);
    } else {
      speakNow();
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) startAmbient();
      else {
        stopAmbient();
        stopSpeaking();
      }
      return next;
    });
  }, [startAmbient, stopAmbient, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbient();
      stopSpeaking();
      try {
        refs.current?.ctx.close();
      } catch {
        // ignore
      }
      refs.current = null;
    };
  }, [stopAmbient, stopSpeaking]);

  return { enabled, toggle, playSfx, speak, stopSpeaking, startAmbient };
}

// =======================================================================
// Procedural SFX bank — keyed by topic SfxStyle.
// Each SFX is a tiny 50–400ms envelope on one or two oscillators.
// =======================================================================
function sfx(
  ctx: AudioContext,
  out: AudioNode,
  kind: "click" | "move" | "success" | "wrong" | "hint",
  style: SfxStyle,
) {
  const t0 = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(out);

  const env = (peak: number, dur: number) => {
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  };

  const tone = (freq: number, wave: OscillatorType, dur: number) => {
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  const sweep = (from: number, to: number, wave: OscillatorType, dur: number) => {
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(from, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  const noise = (dur: number, type: BiquadFilterType, freq: number) => {
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    src.connect(filt).connect(g);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  };

  switch (`${style}:${kind}`) {
    // ROBOTIC
    case "robotic:click":
      env(0.25, 0.08);
      tone(880, "square", 0.06);
      tone(1320, "square", 0.05);
      break;
    case "robotic:move":
      env(0.18, 0.16);
      sweep(220, 880, "square", 0.14);
      break;
    case "robotic:hint":
      env(0.2, 0.25);
      tone(660, "square", 0.1);
      tone(990, "square", 0.1);
      break;
    case "robotic:success":
      env(0.3, 0.5);
      sweep(440, 1760, "square", 0.45);
      break;
    case "robotic:wrong":
      env(0.3, 0.35);
      sweep(440, 80, "sawtooth", 0.3);
      break;

    // CHEMISTRY (bubbles / fizz / glass)
    case "chemistry:click":
      env(0.22, 0.18);
      sweep(900, 300, "sine", 0.16);
      break;
    case "chemistry:move":
      env(0.15, 0.25);
      noise(0.22, "bandpass", 1800);
      break;
    case "chemistry:hint":
      env(0.2, 0.35);
      noise(0.3, "bandpass", 2400);
      tone(660, "sine", 0.2);
      break;
    case "chemistry:success":
      env(0.3, 0.6);
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        o.start(t0 + i * 0.08);
        o.stop(t0 + i * 0.08 + 0.25);
      });
      break;
    case "chemistry:wrong":
      env(0.3, 0.4);
      noise(0.35, "lowpass", 600);
      break;

    // CLASSICAL (plucked strings / harp)
    case "classical:click":
      env(0.22, 0.4);
      tone(523.25, "triangle", 0.35);
      break;
    case "classical:move":
      env(0.18, 0.5);
      tone(392, "triangle", 0.45);
      tone(587.33, "triangle", 0.4);
      break;
    case "classical:hint":
      env(0.22, 0.6);
      [392, 523.25, 659.25].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        o.connect(g);
        o.start(t0 + i * 0.1);
        o.stop(t0 + i * 0.1 + 0.4);
      });
      break;
    case "classical:success":
      env(0.3, 0.9);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        o.connect(g);
        o.start(t0 + i * 0.09);
        o.stop(t0 + i * 0.09 + 0.6);
      });
      break;
    case "classical:wrong":
      env(0.3, 0.5);
      tone(207.65, "triangle", 0.45);
      tone(220, "triangle", 0.45);
      break;

    // NATURE (bird/wood/water)
    case "nature:click":
      env(0.25, 0.18);
      sweep(1800, 2400, "sine", 0.12);
      break;
    case "nature:move":
      env(0.18, 0.3);
      noise(0.28, "bandpass", 1200);
      break;
    case "nature:hint":
      env(0.22, 0.4);
      sweep(1600, 2200, "sine", 0.18);
      sweep(2200, 1700, "sine", 0.18);
      break;
    case "nature:success":
      env(0.3, 0.6);
      [659.25, 880, 1046.5].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g);
        o.start(t0 + i * 0.08);
        o.stop(t0 + i * 0.08 + 0.25);
      });
      break;
    case "nature:wrong":
      env(0.3, 0.35);
      noise(0.3, "lowpass", 400);
      break;

    // ANCIENT (parchment / drum / wood)
    case "ancient:click":
      env(0.28, 0.2);
      tone(196, "triangle", 0.15);
      noise(0.1, "lowpass", 800);
      break;
    case "ancient:move":
      env(0.22, 0.3);
      tone(146.83, "triangle", 0.25);
      break;
    case "ancient:hint":
      env(0.22, 0.4);
      tone(220, "triangle", 0.3);
      tone(293.66, "triangle", 0.3);
      break;
    case "ancient:success":
      env(0.32, 0.7);
      [196, 261.63, 329.63, 392].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        o.connect(g);
        o.start(t0 + i * 0.1);
        o.stop(t0 + i * 0.1 + 0.4);
      });
      break;
    case "ancient:wrong":
      env(0.3, 0.5);
      tone(98, "triangle", 0.45);
      noise(0.2, "lowpass", 300);
      break;

    // DEFAULT
    default:
      switch (kind) {
        case "click":
          env(0.2, 0.1);
          tone(660, "triangle", 0.08);
          break;
        case "move":
          env(0.18, 0.2);
          sweep(440, 660, "triangle", 0.16);
          break;
        case "hint":
          env(0.22, 0.3);
          tone(523.25, "sine", 0.25);
          break;
        case "success":
          env(0.3, 0.5);
          [523.25, 659.25, 783.99].forEach((f, i) => {
            const o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = f;
            o.connect(g);
            o.start(t0 + i * 0.08);
            o.stop(t0 + i * 0.08 + 0.3);
          });
          break;
        case "wrong":
          env(0.3, 0.35);
          sweep(330, 110, "sawtooth", 0.3);
          break;
      }
  }
}
