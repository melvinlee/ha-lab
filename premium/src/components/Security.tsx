import { useState } from "react";
import { Shield, Lock, LockOpen, DoorClosed, DoorOpen, Camera, History, Info } from "lucide-react";
import { useHass, isUnavailable } from "../ha/store";
import { LOCKS, DOORS, CAMERAS, TIMELINE_ENTITIES } from "../config";
import { useLogbook } from "../lib/data";
import { relTime } from "../lib/format";
import { domainIcon } from "../lib/icons";
import { Card, Badge, Empty, Skeleton } from "./ui";

export function Security() {
  const { get, entities, conn } = useHass();
  const log = useLogbook(TIMELINE_ENTITIES);
  const [camErr, setCamErr] = useState(false);
  const cam = CAMERAS[0] ? get(CAMERAS[0].entity) : undefined;
  const camUrl = cam && conn ? `${String(cam.attributes.entity_picture ?? "")}` : "";

  const locked = LOCKS.map((l) => get(l.entity)).filter((e) => e?.state === "locked").length;
  const open = DOORS.map((d) => get(d.entity)).filter((e) => e?.state === "on").length;
  const overall =
    !LOCKS.length && !DOORS.length ? null :
    open > 0 || locked < LOCKS.length ? <Badge tone="warn" label="Attention" /> : <Badge tone="ok" label="Secure" />;

  return (
    <Card title="Security" icon={Shield} right={overall}>
      <div className="sec-list">
        {LOCKS.length === 0 && DOORS.length === 0 ? (
          <Empty icon={Lock} title="No locks or door sensors">Pair a smart lock or contact sensor to monitor entry points.</Empty>
        ) : (
          <>
            {LOCKS.map((l) => {
              const e = get(l.entity);
              const isLocked = e?.state === "locked";
              return (
                <div className="sec-row" key={l.entity}>
                  <div className="row-icon">{isLocked ? <Lock size={16} aria-hidden /> : <LockOpen size={16} aria-hidden />}</div>
                  <div className="row-name">{l.name}</div>
                  {isUnavailable(e) ? <Badge tone="muted" label="Unavailable" /> : <Badge tone={isLocked ? "ok" : "warn"} icon={isLocked ? Lock : LockOpen} label={isLocked ? "Locked" : "Unlocked"} />}
                </div>
              );
            })}
            {DOORS.map((d) => {
              const e = get(d.entity);
              const isOpen = e?.state === "on";
              return (
                <div className="sec-row" key={d.entity}>
                  <div className="row-icon">{isOpen ? <DoorOpen size={16} aria-hidden /> : <DoorClosed size={16} aria-hidden />}</div>
                  <div className="row-name">{d.name}</div>
                  {isUnavailable(e) ? <Badge tone="muted" label="Unavailable" /> : <Badge tone={isOpen ? "warn" : "ok"} icon={isOpen ? DoorOpen : DoorClosed} label={isOpen ? "Open" : "Closed"} />}
                </div>
              );
            })}
          </>
        )}
      </div>

      {CAMERAS.length === 0 ? (
        <div style={{ marginBottom: 16 }}><Empty icon={Camera} title="No camera">Add a camera entity to show a live snapshot.</Empty></div>
      ) : (
        <div className="cam" style={{ marginBottom: 16 }}>
          {isUnavailable(cam) || camErr || !camUrl ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%" }}><Badge tone="muted" icon={Camera} label="Camera unavailable" /></div>
          ) : (
            <img src={camUrl} alt={`${CAMERAS[0].name} snapshot`} onError={() => setCamErr(true)} />
          )}
        </div>
      )}

      <div className="card-h"><h3 className="card-t" style={{ margin: 0 }}><History size={16} aria-hidden />Recent events</h3></div>
      {log.status === "loading" || !entities ? (
        <div className="col" style={{ gap: 12 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={24} />)}</div>
      ) : log.status === "error" ? (
        <Empty icon={Info} title="Couldn't load events">{log.error}</Empty>
      ) : log.data.length === 0 ? (
        <Empty icon={History} title="Quiet day">No events in the last 24 hours.</Empty>
      ) : (
        <ul className="timeline">
          {log.data.map((ev, i) => {
            const id = ev.entity_id ?? "";
            const I = domainIcon(id);
            const name = (entities[id]?.attributes.friendly_name as string | undefined) ?? ev.name ?? id;
            const what = ev.message ?? (id.startsWith("automation.") ? "triggered" : id.startsWith("binary_sensor.") ? (ev.state === "on" ? "detected motion" : "cleared") : `turned ${ev.state}`);
            return (
              <li className="tl-item" key={`${id}-${ev.when}-${i}`}>
                <span className="tl-ic"><I aria-hidden /></span>
                <span className="tl-text">{name} <span>{what}</span></span>
                <time className="tl-time num" dateTime={new Date(ev.when * 1000).toISOString()}>{relTime(ev.when * 1000)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
