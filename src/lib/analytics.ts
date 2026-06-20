// Lightweight Novus.ai event tracker (graceful no-op if script not loaded).
type Props = Record<string, unknown>;

declare global {
  interface Window {
    novus?: { track?: (event: string, props?: Props) => void };
  }
}

export function track(event: string, props?: Props) {
  if (typeof window === "undefined") return;
  try {
    window.novus?.track?.(event, props);
  } catch {
    /* ignore */
  }
  // Always log for debugging
  // eslint-disable-next-line no-console
  console.debug("[track]", event, props ?? {});
}
