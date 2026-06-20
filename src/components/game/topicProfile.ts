// Maps a course topic (subject + title + concept) to a sonic + voice persona.
// Used by useGameAudio to pick ambient palette, SFX style and TTS voice.

export type SfxStyle = "robotic" | "chemistry" | "classical" | "nature" | "ancient" | "default";

export type VoicePersona = {
  // Free-form opening line spoken before the narrative
  greetingPrefix: (name: string) => string;
  // Short in-character "good luck" line, spoken after the room title
  goodLuck: (name: string) => string;
  // SpeechSynthesis tuning
  rate: number; // 0.5..2
  pitch: number; // 0..2
  // Preferred BCP-47 language code(s) and voice name hints; first match wins
  langPrefs: string[];
  voiceHints: string[]; // lower-case substring matches on voice name
};

export type TopicProfile = {
  // Procedural ambient palette
  drone: number[]; // base frequencies (Hz)
  melody: number[]; // arpeggio frequencies (Hz)
  wave: OscillatorType;
  tempoMs: number; // ms between melody notes
  sfx: SfxStyle;
  voice: VoicePersona;
  label: string; // short human label for debugging
};

const HZ = {
  // helpful pitch references
  Cmin: [261.63, 311.13, 392.0, 466.16], // C Eb G Bb
  Cmaj: [261.63, 329.63, 392.0, 523.25],
  Dmaj: [293.66, 369.99, 440.0, 587.33],
  pent: [261.63, 293.66, 329.63, 392.0, 440.0],
};

function persona(
  greetingPrefix: VoicePersona["greetingPrefix"],
  goodLuck: VoicePersona["goodLuck"],
  rate: number,
  pitch: number,
  langPrefs: string[],
  voiceHints: string[],
): VoicePersona {
  return { greetingPrefix, goodLuck, rate, pitch, langPrefs, voiceHints };
}

const PROFILES: Array<{ keys: RegExp; profile: TopicProfile }> = [
  // History — French Revolution / France
  {
    keys: /(french revolution|révolution|france|napoleon|bastille|robespierre)/i,
    profile: {
      label: "French Revolution",
      drone: [98, 146.83], // G2 D3
      melody: [392.0, 466.16, 523.25, 587.33, 523.25, 466.16], // string-quartet feel in Cm
      wave: "triangle",
      tempoMs: 700,
      sfx: "classical",
      voice: persona(
        (n) => `Citoyen ${n || "anonyme"}, écoute bien.`,
        (n) => `Pour la République, ${n || "citoyen"} — bonne chance, et vive la liberté !`,
        0.95,
        1.0,
        ["fr-FR", "fr"],
        ["thomas", "amelie", "celine", "audrey", "google français", "français"],
      ),
    },
  },
  // History — generic / ancient
  {
    keys: /(history|histoire|rome|greek|medieval|ancient|empire|war|world war)/i,
    profile: {
      label: "History",
      drone: [110, 164.81],
      melody: [220, 261.63, 329.63, 392, 329.63],
      wave: "triangle",
      tempoMs: 900,
      sfx: "ancient",
      voice: persona(
        (n) => `Hear me, ${n || "scholar"}. The chronicles begin.`,
        (n) => `Walk carefully, ${n || "scholar"} — history favours the bold. Good luck.`,
        0.9,
        0.9,
        ["en-GB", "en-US", "en"],
        ["daniel", "google uk english male", "english united kingdom"],
      ),
    },
  },
  // Chemistry
  {
    keys: /(chemistry|chimie|chemical|molecule|reaction|acid|base|periodic)/i,
    profile: {
      label: "Chemistry",
      drone: [73.42, 110],
      melody: [392, 523.25, 659.25, 783.99, 659.25, 523.25],
      wave: "sine",
      tempoMs: 450,
      sfx: "chemistry",
      voice: persona(
        (n) => `Welcome to the lab, ${n || "researcher"}.`,
        (n) => `Goggles on, ${n || "researcher"} — let's make something fizz! Good luck!`,
        1.0,
        1.05,
        ["en-US", "en"],
        ["samantha", "google us english", "female"],
      ),
    },
  },
  // Physics
  {
    keys: /(physics|physique|quantum|relativity|gravity|wave|particle)/i,
    profile: {
      label: "Physics",
      drone: [55, 82.5],
      melody: [220, 277.18, 329.63, 440, 329.63],
      wave: "sawtooth",
      tempoMs: 600,
      sfx: "robotic",
      voice: persona(
        (n) => `Observation log. Subject: ${n || "student"}.`,
        (n) => `Trust the equations, ${n || "student"}. May the forces be with you.`,
        0.95,
        0.85,
        ["en-US", "en"],
        ["alex", "daniel", "google us english"],
      ),
    },
  },
  // Computer Science / Robotics / AI
  {
    keys: /(computer|coding|programming|robot|ai\b|artificial|algorithm|software|cyber|machine learning|data)/i,
    profile: {
      label: "Robotics / CS",
      drone: [110, 220],
      melody: [392, 587.33, 783.99, 587.33, 392, 311.13],
      wave: "square",
      tempoMs: 280,
      sfx: "robotic",
      voice: persona(
        (n) => `Hello ${n || "user"}. System online. Mission briefing follows.`,
        (n) => `Probability of success: high. Good. Luck. ${n || "user"}.`,
        0.85,
        0.6,
        ["en-US", "en"],
        ["fred", "albert", "google us english", "ralph"],
      ),
    },
  },
  // Biology / Nature
  {
    keys: /(biology|biologie|nature|ecology|plant|animal|cell|ecosystem|forest)/i,
    profile: {
      label: "Biology / Nature",
      drone: [73.42, 110],
      melody: [392, 440, 523.25, 587.33, 523.25, 440],
      wave: "sine",
      tempoMs: 800,
      sfx: "nature",
      voice: persona(
        (n) => `Step quietly, ${n || "explorer"}. Life is all around us.`,
        (n) => `Follow the wild trail, ${n || "explorer"}. Good luck out there.`,
        0.95,
        1.0,
        ["en-US", "en-GB", "en"],
        ["samantha", "karen", "google uk english female"],
      ),
    },
  },
  // Music
  {
    keys: /(music|musique|symphony|orchestra|composer|mozart|beethoven|bach)/i,
    profile: {
      label: "Classical Music",
      drone: [110, 164.81, 220],
      melody: [392, 523.25, 659.25, 783.99, 659.25, 523.25, 392],
      wave: "triangle",
      tempoMs: 500,
      sfx: "classical",
      voice: persona(
        (n) => `Maestro ${n || "musicien"}, the overture begins.`,
        (n) => `Let the music guide you, ${n || "maestro"}. Bonne chance!`,
        0.95,
        1.0,
        ["en-GB", "en", "it-IT"],
        ["daniel", "kate", "luca"],
      ),
    },
  },
  // Literature / Shakespeare
  {
    keys: /(literature|shakespeare|poetry|novel|writing|drama)/i,
    profile: {
      label: "Literature",
      drone: [98, 146.83],
      melody: [261.63, 311.13, 392, 466.16, 392, 311.13],
      wave: "triangle",
      tempoMs: 850,
      sfx: "classical",
      voice: persona(
        (n) => `Hark, good ${n || "reader"}! A tale unfolds.`,
        (n) => `Fortune favour thee, ${n || "reader"}. Good luck upon thy quest!`,
        0.9,
        0.95,
        ["en-GB", "en"],
        ["daniel", "oliver", "google uk english male"],
      ),
    },
  },
  // Math
  {
    keys: /(math|maths|geometry|algebra|calculus|equation|theorem)/i,
    profile: {
      label: "Mathematics",
      drone: [98],
      melody: [392, 440, 493.88, 523.25, 587.33, 523.25],
      wave: "triangle",
      tempoMs: 520,
      sfx: "default",
      voice: persona(
        (n) => `${n || "Student"}, consider the following problem.`,
        (n) => `Reason clearly, ${n || "student"}. The numbers are on your side. Good luck.`,
        1.0,
        1.0,
        ["en-US", "en"],
        ["samantha", "google us english"],
      ),
    },
  },
];

const FALLBACK: TopicProfile = {
  label: "Generic",
  drone: [110],
  melody: HZ.pent,
  wave: "triangle",
  tempoMs: 600,
  sfx: "default",
  voice: persona(
    (n) => `Welcome, ${n || "agent"}. Your mission begins.`,
    (n) => `Good luck, ${n || "agent"}. You've got this.`,
    1.0,
    1.0,
    ["en-US", "en"],
    [],
  ),
};

export function topicProfileFor(input: {
  subject?: string | null;
  title?: string | null;
  concept?: string | null;
}): TopicProfile {
  const text = `${input.subject ?? ""} ${input.title ?? ""} ${input.concept ?? ""}`;
  for (const { keys, profile } of PROFILES) {
    if (keys.test(text)) return profile;
  }
  return FALLBACK;
}
