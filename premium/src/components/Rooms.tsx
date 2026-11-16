import { Activity, ThermometerSnowflake, Play, Pause, Home as HomeIcon, Loader, Blinds, Package, Droplets, Thermometer, BatteryLow } from "lucide-react";
import { fmt, relTime } from "../lib/format";
import { useState } from "react";
import { Sofa, DoorOpen, UtensilsCrossed, Brush, Check } from "lucide-react";
import type { HassEntity } from "home-assistant-js-websocket";
import { useHass, isUnavailable } from "../ha/store";
import { ROOMS, type Room, type RoomControl } from "../config";
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

const routineIcon = { sofa: Sofa, door: DoorOpen, utensils: UtensilsCrossed, mop: Brush } as const;

/** Button entities: state is the last-pressed timestamp; "unknown" just means never pressed. */
function Routines({ items }: { items: NonNullable<Room["routines"]> }) {
  const { get, call } = useHass();
  const [fired, setFired] = useState<string | null>(null);
  return (
    <div className="row">
      <div className="card-sub" style={{ fontWeight: 500 }}>Routines</div>
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
                call("button", "press", { entity_id: r.entity });
              }}
            >
              <span className="scene-ic"><I size={16} aria-hidden /></span>
              <span style={{ minWidth: 0 }}>
                <div className="scene-name">{r.name}</div>
                <div className="scene-sub num">
                  {missing ? "Not found" : unavailable ? "Unavailable" : fired === r.entity ? "Started" : Number.isNaN(last) ? "Never run" : `Last run ${relTime(last)}`}
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
  const onCount = room.controls.filter((c) => (c.kind === "light" || c.kind === "switch") && get(c.entity)?.state === "on").length;

  return (
    <Card
      title={room.name}
      icon={Icon}
      right={
        room.motion ? (
          isUnavailable(motion) ? <Badge tone="muted" label="Motion unknown" /> :
          motion!.state === "on" ? <Badge tone="accent" icon={Activity} label="Occupied" /> : <Badge tone="muted" label="Clear" />
        ) : onCount ? <Badge tone="accent" label={`${onCount} on`} /> : null
      }
    >
      {!entities ? (
        <div className="col" style={{ gap: 16 }}>{room.controls.map((c) => <Skeleton key={c.entity} h={32} />)}</div>
      ) : (
        <div className="rows">
          {room.controls.map((c) => <ControlRow key={c.entity} c={c} />)}
          {room.routines && <Routines items={room.routines} />}
          {room.drybox && <Drybox cfg={room.drybox} />}
          {!room.drybox && <div className="row">
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
