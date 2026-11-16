import { useState } from "react";
import { WifiOff, RefreshCw, CircleAlert } from "lucide-react";
import { HassProvider, useHass } from "./ha/store";
import { TopBar } from "./components/TopBar";
import { Kpis } from "./components/Kpis";
import { Rooms } from "./components/Rooms";
import { Energy } from "./components/Energy";
import { Security } from "./components/Security";
import { Scenes } from "./components/Scenes";
import { CommandPalette } from "./components/CommandPalette";

function ConnectionBanner() {
  const { status, error } = useHass();
  if (status === "ready" || status === "connecting") return null;
  if (status === "reconnecting")
    return (
      <div className="banner warn" role="status">
        <RefreshCw size={16} aria-hidden />
        <span className="grow"><strong>Reconnecting to Home Assistant…</strong> <span className="muted">Showing last known states. Controls are paused.</span></span>
      </div>
    );
  return (
    <div className="banner bad" role="alert">
      <WifiOff size={16} aria-hidden />
      <span className="grow"><strong>Can't reach Home Assistant.</strong> <span className="muted">{error ?? "The connection was lost."}</span></span>
      <button className="btn" onClick={() => location.reload()}><RefreshCw size={14} aria-hidden />Retry</button>
    </div>
  );
}

function Toasts() {
  const { toasts } = useHass();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div className="toast" key={t.id}><CircleAlert size={16} aria-hidden />{t.text}</div>)}
    </div>
  );
}

function Dashboard() {
  const [palette, setPalette] = useState(false);
  const { status } = useHass();
  return (
    <main className="app" aria-busy={status === "connecting"} style={status === "reconnecting" || status === "error" ? { pointerEvents: "auto" } : undefined}>
      <TopBar onOpenPalette={() => setPalette(true)} />
      <ConnectionBanner />
      <Scenes />
      <Kpis />
      <div className="grid main">
        <div className="col">
          <Rooms />
          <Energy />
        </div>
        <div className="col">
          <Security />
        </div>
      </div>
      <CommandPalette open={palette} setOpen={setPalette} />
      <Toasts />
    </main>
  );
}

export default function App() {
  return (
    <HassProvider>
      <Dashboard />
    </HassProvider>
  );
}
