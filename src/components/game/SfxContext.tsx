import { createContext, useContext, type ReactNode } from "react";

export type SfxKind = "click" | "move" | "success" | "wrong" | "hint";
export type SfxFn = (kind: SfxKind) => void;

const SfxContext = createContext<SfxFn>(() => {});

export function SfxProvider({ value, children }: { value: SfxFn; children: ReactNode }) {
  return <SfxContext.Provider value={value}>{children}</SfxContext.Provider>;
}

export function useSfx(): SfxFn {
  return useContext(SfxContext);
}
