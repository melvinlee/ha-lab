import { Activity, ThermometerSnowflake, Play, Pause, Home as HomeIcon, Loader } from "lucide-react";
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

function RoomCard({ room }: { room: Room }) {
  const { entities, get } = useHass();
  const Icon = roomIcon[room.icon];
  const motion = room.motion ? get(room.motion) : undefined;
  const thermostat = room.climate.thermostat ? get(room.climate.thermostat) : undefined;
  const onCount = room.controls.filter((c) => get(c.entity)?.state === "on").length;

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
          <div className="row">
            {thermostat && !isUnavailable(thermostat) ? (
              <div className="row-h"><span className="num">{String(thermostat.attributes.current_temperature)}°</span></div>
            ) : (
              <Empty icon={ThermometerSnowflake} title="No climate control">
                <span className="faint" style={{ fontSize: 12 }}>Add a thermostat or AC to control temperature here.</span>
              </Empty>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function Rooms() {
  return <div className="grid rooms">{ROOMS.map((r) => <RoomCard key={r.id} room={r} />)}</div>;
}
