import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateEscapeRoom } from "@/lib/escape-room.functions";
import { Upload, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { track, pendoTrack } from "@/lib/analytics";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({ meta: [{ title: "Generate escape room — EscapeLearn" }] }),
  component: GeneratePage,
});

const STEPS = [
  "Analyzing your course content...",
  "Identifying key concepts...",
  "Building your escape rooms...",
  "Writing the narrative...",
  "Your escape room is ready.",
];

function GeneratePage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateEscapeRoom);
  const { profile } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);

  function onPickFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF");
      return;
    }
    setFile(f);
    if (!subject) setSubject(f.name.replace(/\.pdf$/i, "").slice(0, 80));
  }

  async function extractPdfText(f: File): Promise<string> {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buf = new Uint8Array(await f.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : text;
  }

  async function runGeneration() {
    if (!file) return;
    setBusy(true);
    setStep(0);
    track("pdf_uploaded", { name: file.name, size: file.size });
    pendoTrack("pdf_uploaded", {
      file_name: file.name,
      file_size: file.size,
      subject: subject || undefined,
      user_role: profile?.role,
    });
    const interval = setInterval(() => {
      setStep((s) => (s < STEPS.length - 2 ? s + 1 : s));
    }, 2500);
    try {
      const pdfText = await extractPdfText(file);
      if (pdfText.length < 200) {
        throw new Error("This PDF didn't yield enough readable text. Try a different file.");
      }
      const res = await generate({
        data: { pdfText, subject: subject || "Course content" },
      });
      clearInterval(interval);
      setStep(STEPS.length - 1);
      track("escape_room_generated", { escapeRoomId: res.escapeRoomId });
      pendoTrack("escape_room_generated", {
        escapeRoomId: res.escapeRoomId,
        subject: subject || undefined,
        user_role: profile?.role,
      });
      setTimeout(() => {
        if (profile?.role === "teacher") {
          navigate({
            to: "/teacher/review/$roomId",
            params: { roomId: res.escapeRoomId },
          });
        } else {
          navigate({ to: "/play/$roomId/briefing", params: { roomId: res.escapeRoomId } });
        }
      }, 700);
    } catch (err) {
      clearInterval(interval);
      setBusy(false);
      const errorMsg = err instanceof Error ? err.message : "Generation failed";
      pendoTrack("escape_room_generation_failed", {
        error_message: errorMsg.substring(0, 100),
        file_name: file.name,
        file_size: file.size,
        subject: subject || undefined,
      });
      toast.error(errorMsg);
    }
  }

  if (busy) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40 animate-pulse-glow">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 font-narrative text-3xl">Building your escape room</h1>
        <div className="mt-8 w-full space-y-3">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all ${
                i < step
                  ? "border-success/30 bg-success/5 text-muted-foreground"
                  : i === step
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-card/30 text-muted-foreground/50"
              }`}
            >
              <span className="font-mono text-xs">
                {i < step ? "✓" : i === step ? "•" : "·"}
              </span>
              {s}
            </div>
          ))}
        </div>
        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-card">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-narrative text-4xl">Upload a course PDF</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We'll extract the key concepts and build a 3-room escape (plus a boss).
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onPickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:bg-card/60"
        }`}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <FileText className="h-8 w-8 text-primary" />
            <div className="mt-3 font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB · click to change
            </div>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="mt-3 text-sm">Drop your PDF here, or click to browse</div>
            <div className="text-xs text-muted-foreground">PDFs only · up to ~8000 chars used</div>
          </>
        )}
      </label>

      <div className="mt-6">
        <label className="text-xs text-muted-foreground">Subject (optional)</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Cell Biology, Modern History…"
          className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        onClick={runGeneration}
        disabled={!file}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" /> Generate escape room
      </button>
    </main>
  );
}
