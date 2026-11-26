import { DAY } from "./contract";

/** "2026-12-05" -> UTC day index the contract uses. */
export function dateToNight(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000 / DAY);
}

export const todayNight = () => Math.floor(Date.now() / 1000 / DAY);

export function nightToISO(night: number): string {
  return new Date(night * DAY * 1000).toISOString().slice(0, 10);
}

export function formatNight(night: number): string {
  return new Date(night * DAY * 1000).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
