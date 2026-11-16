import { useCallback, useEffect, useState } from "react";

/** "auto" follows the device (prefers-color-scheme). Day = light, Night = dark. */
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

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "auto") {
    root.removeAttribute("data-theme");
    root.style.colorScheme = "light dark";
  } else {
    root.setAttribute("data-theme", mode === "day" ? "light" : "dark");
    root.style.colorScheme = mode === "day" ? "light" : "dark";
  }
}

// Apply before React renders, to avoid a flash of the wrong theme.
apply(read());

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(read);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    apply(m);
    try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  }, []);

  const cycle = useCallback(() => setMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]), [mode, setMode]);
  const effective: "day" | "night" = mode === "auto" ? (systemDark ? "night" : "day") : mode;

  return { mode, effective, setMode, cycle };
}
