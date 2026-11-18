import { Activity, ThermometerSnowflake, Play, Pause, Home as HomeIcon, Loader, Blinds, Package, Droplets, Thermometer, BatteryLow, WashingMachine, Wind, Clock, Zap } from "lucide-react";
import { fmt, relTime } from "../lib/format";
import { useState } from "react";
import { Sofa, DoorOpen, UtensilsCrossed, Brush, Check, Lightbulb, LightbulbOff, Briefcase, Sunset } from "lucide-react";
import type { HassEntity } from "home-assistant-js-websocket";
import { useHass, isUnavailable } from "../ha/store";
import { ROOMS, type Room, type RoomControl, type Appliance } from "../config";
import { controlIcon, roomIcon } from "../lib/icons";
import { Card, Switch, Slider, Badge, Empty, Skeleton } from "./ui";

function ControlRow({ c }: { c: RoomControl }) {
  const { get, call, isPending } = useHass();
  const e = get(c.entity);
  const Icon = controlIcon[c.icon];
  const unavailable = isUnavailable(e);
  const pending = isPending(c.entity);

  if (c.kind === "vacuum") return <VacuumRow c={c} e={e} />;
  if (c.kind === "curtain") return <CurtainRow c={c} />;
  if (c.kind === "mode") return <ModeRow c={c} />;

  const on = e?.state === "on";
  const supportsBrightness = c.kind === "light" && Array.isArray(e?.attributes.supported_color_modes) && (e!.attributes.supported_color_modes as string[]).some((m) => m !== "onoff");
  const bri = typeof e?.attributes.brightness === "number" ? Math.round(((e.attributes.brightness as number) / 255) * 100) : 0;
  const domain = c.entity.split(".")[0];

  const sub = unavailable ? null : on ? (supportsBrightness ? `On · ${bri}%` : "On") : "Off";

  return (
    <div className="row">
      <div className="row-h">
        <div className={`row-icon${on && !unavailable ? " on" : ""}`}><Icon size={16} aria-hidden /></div>
        <div className="row-name">
          <div>{c.name}</div>
          <div>{unavailable ? <Badge tone="muted" label={e ? "Unavailable" : "Not found"} /> : <span className="num">{sub}</span>}</div>
        </div>
        <Switch
          label={`${c.name} ${on ? "off" : "on"}`}
          checked={on}
          disabled={unavailable}
          pending={pending}
          onChange={(v) => call(domain, v ? "turn_on" : "turn_off", { entity_id: c.entity }, { entity: c.entity, state: v ? "on" : "off" })}
        />
      </div>
      {supportsBrightness && !unavailable && (
        <Slider
          label={`${c.name} brightness`}
          value={on ? bri : 0}
          min={0}
          max={100}
          onCommit={(v) =>
            v === 0
              ? call("light", "turn_off", { entity_id: c.entity }, { entity: c.entity, state: "off" })
              : call("light", "turn_on", { entity_id: c.entity, brightness_pct: v }, { entity: c.entity, state: "on", attributes: { brightness: Math.round((v / 100) * 255) } })
          }
        />
      )}
    </div>
  );
}

/** Mode switch (e.g. Bath mode): ON pauses an automation. Status shows the automation's real state. */
function ModeRow({ c }: { c: RoomControl }) {
  const { get, call, isPending } = useHass();
  const e = get(c.entity);
  const auto = c.pauses ? get(c.pauses) : undefined;
  const unavailable = isUnavailable(e);
  const on = e?.state === "on";
  const Icon = controlIcon[c.icon];
  const paused = auto?.state === "off";
  return (
    <div className="row">
      <div className="row-h">
        <div className={`row-icon${on && !unavailable ? " on" : ""}`}><Icon size={16} aria-hidden /></div>
        <div className="row-name">
          <div>{c.name}</div>
          <div>
            {unavailable ? <Badge tone="muted" label={e ? "Unavailable" : "Not found"} /> :
              !auto ? <span>{on ? "On" : "Off"}</span> :
              <span>{on ? "On" : "Off"} · auto-off {paused ? "paused" : "active"}</span>}
          </div>
        </div>
        <Switch label={`${c.name} ${on ? "off" : "on"}`} checked={on} disabled={unavailable} pending={isPending(c.entity)}
          onChange={(v) => call("switch", v ? "turn_on" : "turn_off", { entity_id: c.entity }, { entity: c.entity, state: v ? "on" : "off" })} />
      </div>
    </div>
  );
}

/** Curtain driven by a relay switch: shown as Open/Closed, never as a light. */
function CurtainRow({ c }: { c: RoomControl }) {
  const { get, call, isPending } = useHass();
  const e = get(c.entity);
  const unavailable = isUnavailable(e);
  const openState = c.openState ?? "on";
  const closedState = openState === "on" ? "off" : "on";
  const isOpen = e?.state === openState;
  const Icon = Blinds;
  const set = (open: boolean) => {
    const target = open ? openState : closedState;
    call("switch", target === "on" ? "turn_on" : "turn_off", { entity_id: c.entity }, { entity: c.entity, state: target });
  };
  return (
    <div className="row">
      <div className="row-h">
        <div className={`row-icon${isOpen && !unavailable ? " on" : ""}`}><Icon size={16} aria-hidden /></div>
        <div className="row-name">
          <div>{c.name}</div>
          <div>{unavailable ? <Badge tone="muted" label={e ? "Unavailable" : "Not found"} /> : <span>{isOpen ? "Open" : "Closed"}</span>}</div>
        </div>
        <Switch label={`${isOpen ? "Close" : "Open"} ${c.name}`} checked={isOpen} disabled={unavailable} pending={isPending(c.entity)} onChange={set} />
      </div>
    </div>
  );
}

function VacuumRow({ c, e }: { c: RoomControl; e?: HassEntity }) {
  const { call, isPending } = useHass();
  const Icon = controlIcon[c.icon];
  const unavailable = isUnavailable(e);
  const s = e?.state ?? "unavailable";
  const cleaning = s === "cleaning";
  const battery = e?.attributes.battery_level as number | undefined;
  const tone = s === "error" ? "bad" : cleaning ? "accent" : s === "docked" ? "ok" : "muted";
  const label = s.replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase());
  return (
    <div className="row">
      <div className="row-h">
        <div className={`row-icon${cleaning ? " on" : ""}`}><Icon size={16} aria-hidden /></div>
        <div className="row-name">
          <div>{c.name}</div>
          <div>{unavailable ? <Badge tone="muted" label="Unavailable" /> : <span className="num">{label}{battery != null ? ` · ${battery}%` : ""}</span>}</div>
        </div>
        {!unavailable && <Badge tone={tone} label={cleaning ? "Cleaning" : label} icon={cleaning ? Loader : undefined} />}
      </div>
      {!unavailable && (
        <div className="slider-wrap" style={{ gap: 8 }}>
          <button className="btn" disabled={isPending(c.entity)} onClick={() => call("vacuum", cleaning ? "pause" : "start", { entity_id: c.entity }, { entity: c.entity, state: cleaning ? "paused" : "cleaning" })}>
            {cleaning ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}{cleaning ? "Pause" : "Start"}
          </button>
          <button className="btn" disabled={s === "docked" || s === "returning"} onClick={() => call("vacuum", "return_to_base", { entity_id: c.entity }, { entity: c.entity, state: "returning" })}>
            <HomeIcon size={14} aria-hidden />Dock
          </button>
        </div>
      )}
    </div>
  );
}

/** Drybox enclosure climate: humidity is what matters, with colour + icon + label status. */
function Drybox({ cfg }: { cfg: NonNullable<Room["drybox"]> }) {
  const { get } = useHass();
  const h = get(cfg.humidity);
  const t = cfg.temperature ? get(cfg.temperature) : undefined;
  const b = cfg.battery ? get(cfg.battery) : undefined;
  const rh = isUnavailable(h) ? null : Number(h!.state);
  const pct = rh == null ? 0 : Math.min(100, Math.max(0, rh));
  const status =
    rh == null ? <Badge tone="muted" label="Sensor unavailable" /> :
    rh <= cfg.goodMax ? <Badge tone="ok" label="Dry" /> :
    rh <= cfg.watchMax ? <Badge tone="warn" label="Watch" /> :
    <Badge tone="bad" label="Replace desiccant" />;
  const barColor = rh == null ? "var(--text-3)" : rh <= cfg.goodMax ? "var(--ok)" : rh <= cfg.watchMax ? "var(--warn)" : "var(--bad)";
  const lowBatt = b && !isUnavailable(b) && Number(b.state) < 20;
  return (
    <div className="row">
      <div className="row-h">
        <div className="row-icon"><Package size={16} aria-hidden /></div>
        <div className="row-name">
          <div>Drybox</div>
          <div className="num">
            {t && !isUnavailable(t) ? <><Thermometer size={11} aria-hidden style={{ verticalAlign: -1 }} /> {fmt(Number(t.state), 1)}°C</> : "Enclosure climate"}
            {lowBatt ? <> · <BatteryLow size={11} aria-hidden style={{ verticalAlign: -1 }} /> {b!.state}%</> : null}
          </div>
        </div>
        {status}
      </div>
      <div className="slider-wrap" style={{ gap: 12 }}>
        <Droplets size={14} aria-hidden style={{ color: "var(--text-2)", flex: "none" }} />
        <div className="meter" role="meter" aria-label="Drybox humidity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rh ?? undefined}>
          <div className="meter-fill" style={{ width: `${pct}%`, background: barColor }} />
          <div className="meter-mark" style={{ left: `${cfg.goodMax}%` }} aria-hidden />
          <div className="meter-mark" style={{ left: `${cfg.watchMax}%` }} aria-hidden />
        </div>
        <span className="num" style={{ width: 48, textAlign: "right", fontSize: 14, fontWeight: 600 }}>{rh == null ? "—" : `${fmt(rh, 0)}%`}</span>
      </div>
    </div>
  );
}

const applianceIcon = { washer: WashingMachine, dryer: Wind } as const;
const cap = (x: string) => x.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** SmartThings washer/dryer: read-only status, progress meter and finish time while running. */
function ApplianceRow({ a }: { a: Appliance }) {
  const { get } = useHass();
  const m = get(a.machineState);
  const job = a.jobState ? get(a.jobState) : undefined;
  const prog = a.progress ? get(a.progress) : undefined;
  const done = a.completionTime ? get(a.completionTime) : undefined;
  const pw = a.power ? get(a.power) : undefined;
  const Icon = applianceIcon[a.icon];
  const unavailable = isUnavailable(m);
  const s = m?.state ?? "";
  const running = s === "run";
  const paused = s === "pause";
  const pct = prog && !isUnavailable(prog) ? Math.min(100, Math.max(0, Number(prog.state))) : null;
  const jobLabel = job && !isUnavailable(job) && job.state !== "none" ? cap(job.state) : null;
  const watts = pw && !isUnavailable(pw) ? Number(pw.state) : null;
  const finish = done && !isUnavailable(done) ? Date.parse(done.state) : NaN;
  const active = running || paused;
  const badge = unavailable ? <Badge tone="muted" label={m ? "Unavailable" : "Not found"} /> :
    running ? <Badge tone="accent" icon={Loader} label="Running" spin /> :
    paused ? <Badge tone="warn" icon={Pause} label="Paused" /> :
    <Badge tone="muted" label={s === "stop" ? "Idle" : cap(s)} />;
  const finishText = !Number.isNaN(finish) ? new Date(finish).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div className="row">
      <div className="row-h">
        <div className={`row-icon${running ? " on drum" : ""}`}><Icon size={16} aria-hidden /></div>
        <div className="row-name">
          <div>{a.name}</div>
          <div className="num">
            {unavailable ? "—" : [jobLabel, watts != null ? `${fmt(watts, 0)} W` : null].filter(Boolean).join(" · ") || "Off"}
            {active && finishText ? <> · <Clock size={11} aria-hidden style={{ verticalAlign: -1 }} /> Done {finishText}</> : null}
          </div>
        </div>
        {badge}
      </div>
      {active && pct != null && (
        <div className="slider-wrap" style={{ gap: 12 }}>
          <div className="meter" role="meter" aria-label={`${a.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className="meter-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
          </div>
          <span className="num" style={{ width: 48, textAlign: "right", fontSize: 14, fontWeight: 600 }}>{fmt(pct, 0)}%</span>
        </div>
      )}
    </div>
  );
}

/** kWh today from a daily utility meter. "unknown" = no source update since the last reset, i.e. 0. */
function kwhToday(e?: HassEntity): number | null {
  if (!e || e.state === "unavailable") return null;
  if (e.state === "unknown") return 0;
  const v = Number(e.state);
  return Number.isFinite(v) ? v : null;
}

function ApplianceEnergy({ items }: { items: Appliance[] }) {
  const { get } = useHass();
  const parts = items.filter((a) => a.energyToday).map((a) => ({ name: a.name, v: kwhToday(get(a.energyToday!)) }));
  if (!parts.length) return null;
  const known = parts.filter((p) => p.v != null);
  const total = known.reduce((t, p) => t + p.v!, 0);
  return (
    <div className="row">
      <div className="row-h">
        <div className="row-icon"><Zap size={16} aria-hidden /></div>
        <div className="row-name">
          <div>Energy today</div>
          {parts.map((p) => (
            <div key={p.name} className="num" style={{ fontSize: "var(--t-xs)", color: "var(--text-2)", fontWeight: 400 }}>{p.name} {p.v == null ? "—" : `${fmt(p.v, 2)} kWh`}</div>
          ))}
        </div>
        {known.length ? <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{fmt(total, 2)} kWh</span> : <Badge tone="muted" label="Unavailable" />}
      </div>
    </div>
  );
}

const routineIcon = { sofa: Sofa, door: DoorOpen, utensils: UtensilsCrossed, mop: Brush, briefcase: Briefcase, sunset: Sunset } as const;

/** Button entities: state is the last-pressed timestamp; "unknown" just means never pressed. */
function Routines({ items, title = "Routines" }: { items: NonNullable<Room["routines"]>; title?: string }) {
  const { get, call } = useHass();
  const [fired, setFired] = useState<string | null>(null);
  return (
    <div className="row">
      <div className="card-sub" style={{ fontWeight: 500 }}>{title}</div>
      <div className="routines">
        {items.map((r) => {
          const e = get(r.entity);
          const missing = !e;
          const unavailable = e?.state === "unavailable";
          const last = e && !unavailable && e.state !== "unknown" ? Date.parse(e.state) : NaN;
          const I = fired === r.entity ? Check : routineIcon[r.icon];
          return (
            <button
              key={r.entity}
              className={`routine${fired === r.entity ? " fired" : ""}`}
              disabled={missing || unavailable}
              onClick={() => {
                setFired(r.entity);
                setTimeout(() => setFired((f) => (f === r.entity ? null : f)), 1500);
                const d = r.entity.split(".")[0];
                if (d === "scene") call("scene", "turn_on", { entity_id: r.entity });
                else call("button", "press", { entity_id: r.entity });
              }}
            >
              <span className="scene-ic"><I size={16} aria-hidden /></span>
              <span style={{ minWidth: 0 }}>
                <div className="scene-name">{r.name}</div>
                <div className="scene-sub num">
                  {missing ? "Not found" : unavailable ? "Unavailable" : fired === r.entity ? (r.entity.startsWith("scene.") ? "Activated" : "Started") : Number.isNaN(last) ? "Never run" : `Last run ${relTime(last)}`}
                </div>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
  const { entities, get } = useHass();
  const Icon = roomIcon[room.icon];
  const motion = room.motion ? get(room.motion) : undefined;
  const thermostat = room.climate.thermostat ? get(room.climate.thermostat) : undefined;
  const lights = room.controls.filter((c) => c.kind === "light" || c.kind === "switch");
  const lightCount = lights.length;
  const onCount = lights.filter((c) => get(c.entity)?.state === "on").length;

  return (
    <Card
      title={room.name}
      icon={Icon}
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {room.motion && (
            isUnavailable(motion) ? <Badge tone="muted" icon={Activity} label="Motion unknown" /> :
            motion!.state === "on" ? <Badge tone="accent" icon={Activity} label="Motion" /> : <Badge tone="muted" icon={Activity} label="No motion" />
          )}
          {lightCount > 0 && (
            onCount > 0 ? <Badge tone="accent" icon={Lightbulb} label={`${onCount} on`} /> : <Badge tone="muted" icon={LightbulbOff} label="All off" />
          )}
        </div>
      }
    >
      {!entities ? (
        <div className="col" style={{ gap: 16 }}>{[...room.controls.map((c) => c.entity), ...(room.appliances ?? []).map((a) => a.machineState)].map((k) => <Skeleton key={k} h={32} />)}</div>
      ) : (
        <div className="rows">
          {room.controls.map((c) => <ControlRow key={c.entity} c={c} />)}
          {room.appliances?.map((a) => <ApplianceRow key={a.machineState} a={a} />)}
          {room.appliances && <ApplianceEnergy items={room.appliances} />}
          {room.routines && <Routines items={room.routines} title={room.routinesTitle} />}
          {room.drybox && <Drybox cfg={room.drybox} />}
          {!room.drybox && !room.appliances && <div className="row">
            {thermostat && !isUnavailable(thermostat) ? (
              <div className="row-h"><span className="num">{String(thermostat.attributes.current_temperature)}°</span></div>
            ) : (
              <Empty icon={ThermometerSnowflake} title="No climate control">
                <span className="faint" style={{ fontSize: 12 }}>Add a thermostat or AC to control temperature here.</span>
              </Empty>
            )}
          </div>}
        </div>
      )}
    </Card>
  );
}

export function Rooms() {
  return <div className="grid rooms">{ROOMS.map((r) => <RoomCard key={r.id} room={r} />)}</div>;
}
