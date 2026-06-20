import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { LandingMusicToggle } from "./LandingMusicToggle";

export function NavBar({ variant = "default" }: { variant?: "default" | "auth" }) {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <KeyRound className="h-4 w-4" />
        </span>
        EscapeLearn
      </Link>

      <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
        <Link to="/" className="transition-colors hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>
          Home
        </Link>
        <a href="/#how" className="transition-colors hover:text-foreground">How it works</a>
      </nav>

      <div className="flex items-center gap-3">
        <LandingMusicToggle />
        {variant !== "auth" && (
          <Link
            to="/auth"
            className="rounded-lg border border-border bg-card/70 px-3 py-1.5 text-sm transition-colors hover:bg-card"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
