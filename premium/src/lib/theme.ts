import { useCallback, useEffect, useState } from "react";

/** "auto" follows the clock (see nightByTime). Day = light, Night = dark. */
export type ThemeMode = "auto" | "day" | "night";
const KEY = "ng-premium-theme";
const ORDER: ThemeMode[] = ["auto", "day", "night"];

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "day" || v === "night" || v === "auto" ? v : "auto";
  } catch {
    return "auto"; // storage blocked (private mode, sandbox): fall back to auto
  }
}

/** Auto follows the clock: Day 07:00–18:59, Night otherwise (the wall tablet's OS setting doesn't change by time). */
const DAY_START = 7, NIGHT_START = 19;
const nightByTime = (d = new Date()) => d.getHours() < DAY_START || d.getHours() >= NIGHT_START;
const resolve = (mode: ThemeMode): "day" | "night" => (mode === "auto" ? (nightByTime() ? "night" : "day") : mode);

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  const eff = resolve(mode);
  root.setAttribute("data-theme", eff === "day" ? "light" : "dark");
  root.style.colorScheme = eff === "day" ? "light" : "dark";
}

// Apply before React renders, to avoid a flash of the wrong theme.
apply(read());

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(read);
  const [night, setNight] = useState(nightByTime);

  // In Auto, re-check the clock every minute and switch at 07:00 / 19:00.
  useEffect(() => {
    const t = setInterval(() => {
      setNight(nightByTime());
      if (mode === "auto") apply("auto");
    }, 60e3);
    return () => clearInterval(t);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    apply(m);
    try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  }, []);

  const cycle = useCallback(() => setMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]), [mode, setMode]);
  const effective: "day" | "night" = mode === "auto" ? (night ? "night" : "day") : mode;

  return { mode, effective, setMode, cycle };
}
