import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { ambientAudio } from "./ambientAudio";

export function LandingMusicToggle() {
  const [enabled, setEnabled] = useState(() => ambientAudio.isEnabled());

  useEffect(() => {
    // Sync with the singleton — survives route changes.
    setEnabled(ambientAudio.isEnabled());
    return ambientAudio.subscribe(setEnabled);
  }, []);

  return (
    <button
      type="button"
      onClick={() => ambientAudio.toggle()}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      title={enabled ? "Mute ambient music" : "Play ambient music"}
      aria-label={enabled ? "Mute ambient music" : "Play ambient music"}
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      {enabled ? "Sound on" : "Sound off"}
    </button>
  );
}
