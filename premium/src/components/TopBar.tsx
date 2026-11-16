import { useEffect, useState } from "react";
import { Command, Users, Search, Sun, Moon, MonitorSmartphone } from "lucide-react";
import type { ThemeMode } from "../lib/theme";
import { useHass, isUnavailable } from "../ha/store";
import { WEATHER } from "../config";
import { clock, greeting, longDate, fmt } from "../lib/format";
import { weatherIcon } from "../lib/icons";
import { Skeleton } from "./ui";

const THEMES: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "auto", label: "Auto", Icon: MonitorSmartphone },
  { mode: "day", label: "Day", Icon: Sun },
  { mode: "night", label: "Night", Icon: Moon },
];

function ThemeSwitch({ mode, setMode }: { mode: ThemeMode; setMode: (m: ThemeMode) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Theme">
      {THEMES.map(({ mode: m, label, Icon }) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} className="seg-btn" onClick={() => setMode(m)} title={`${label} theme`}>
          <Icon size={14} aria-hidden />
          <span className="seg-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function TopBar({ onOpenPalette, theme, setTheme }: { onOpenPalette: () => void; theme: ThemeMode; setTheme: (m: ThemeMode) => void }) {
  const { entities, get } = useHass();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15e3); return () => clearInterval(t); }, []);

  const persons = entities ? Object.values(entities).filter((e) => e.entity_id.startsWith("person.")) : [];
  const home = persons.filter((p) => p.state === "home");
  const known = persons.filter((p) => !isUnavailable(p));
  const firstName = (persons[0]?.attributes.friendly_name as string | undefined)?.split(" ")[0];

  const w = get(WEATHER);
  const WIcon = weatherIcon(w?.state);
  const raining = ["rainy", "pouring", "lightning-rainy"].includes(w?.state ?? "");
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="topbar">
      <div className="greet">
        <h1>{greeting(now)}{firstName ? `, ${firstName}` : ""}</h1>
        <p><span className="num">{clock(now)}</span> · {longDate(now)}</p>
      </div>
      <div className="topbar-r">
        {!entities ? (
          <Skeleton w={160} h={32} style={{ borderRadius: 999 }} />
        ) : isUnavailable(w) ? (
          <span className="pill"><WIcon size={16} aria-hidden /> Weather unavailable</span>
        ) : (
          <span className={`pill${raining ? " rain" : ""}`} title={w!.state}>
            <span className="wx-ic"><WIcon size={16} aria-hidden /></span>
            <strong className="num">{fmt(Number(w!.attributes.temperature), 0)}{String(w!.attributes.temperature_unit ?? "°")}</strong>
            <span style={{ textTransform: "capitalize" }}>{w!.state.replace(/-/g, " ").replace("partlycloudy", "partly cloudy")}</span>
            {w!.attributes.humidity != null && <span className="num">{fmt(Number(w!.attributes.humidity))}% RH</span>}
          </span>
        )}
        {!entities ? (
          <Skeleton w={120} h={32} style={{ borderRadius: 999 }} />
        ) : (
          <span className="pill" title={persons.map((p) => `${p.attributes.friendly_name}: ${p.state}`).join("\n")}>
            <Users size={16} aria-hidden />
            {persons.length === 0 ? (
              "No people configured"
            ) : known.length === 0 ? (
              <>Presence unknown</>
            ) : (
              <><strong className="num">{home.length}</strong> of <span className="num">{persons.length}</span> home</>
            )}
          </span>
        )}
        <ThemeSwitch mode={theme} setMode={setTheme} />
        <button className="pill kbd-btn" onClick={onOpenPalette} aria-label="Open command palette">
          <Search size={16} aria-hidden /> Search
          <kbd>{isMac ? <Command size={11} aria-hidden /> : "Ctrl"}</kbd><kbd>K</kbd>
        </button>
      </div>
    </header>
  );
}
