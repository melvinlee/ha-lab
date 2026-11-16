import { useEffect, useState } from "react";
import { Bus as BusIcon, MapPin, CircleAlert, AlarmClock } from "lucide-react";
import { useHass, isUnavailable } from "../ha/store";
import { BUS_SENSORS } from "../config";
import { Card, Badge, Empty, Skeleton } from "./ui";

interface Arrival { OriginCode?: string; DestinationCode?: string; EstimatedArrival?: string; Monitored?: number }
interface Service { ServiceNo: string; Operator?: string; NextBus?: Arrival; NextBus2?: Arrival; NextBus3?: Arrival }

/** "Arriving", "5 min", "65 min" (minutes only, no hours) */
const minsUntil = (iso: string | undefined, now: number) => { const t = iso ? Date.parse(iso) : NaN; return Number.isNaN(t) ? null : (t - now) / 60000; };

function eta(iso: string | undefined, now: number) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((t - now) / 60000);
  if (mins < -1) return null; // already left
  if (mins <= 1) return "Arriving";
  return `${mins} min`;
}

export function BusStops() {
  return <>{BUS_SENSORS.map((id) => <Bus key={id} sensor={id} />)}</>;
}

function Bus({ sensor: BUS_SENSOR }: { sensor: string }) {
  const { entities, get } = useHass();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15e3); return () => clearInterval(t); }, []);

  const e = get(BUS_SENSOR);
  const services = (e?.attributes.Services as Service[] | undefined) ?? [];
  const stop = services[0]?.NextBus?.OriginCode || (e?.attributes.BusStopCode as string | undefined) || "Bus stop";
  const updated = e ? new Date(e.last_updated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Card title={stop} icon={BusIcon} right={e && !isUnavailable(e) ? <span className="card-sub num">Updated {updated}</span> : null}>
      {!entities ? (
        <div className="col" style={{ gap: 12 }}><Skeleton h={40} /><Skeleton h={40} /></div>
      ) : !e ? (
        <Empty icon={CircleAlert} title="Bus sensor not found">Expected <code>{BUS_SENSOR}</code> (see ha-config/rest.yaml).</Empty>
      ) : e.state === "unavailable" ? (
        <Empty icon={CircleAlert} title="Bus times unavailable">The arrival API didn't respond. Retrying every minute.</Empty>
      ) : services.length === 0 ? (
        <Empty icon={BusIcon} title="No services right now">No buses are scheduled at this stop.</Empty>
      ) : (
        <div className="rows">
          {services.map((s) => {
            const arr = [s.NextBus, s.NextBus2, s.NextBus3].map((a) => ({ a, label: eta(a?.EstimatedArrival, now) })).filter((x) => x.label);
            const dest = s.NextBus?.DestinationCode;
            return (
              <div className="row" key={s.ServiceNo}>
                <div className="row-h">
                  <div className="row-icon on"><BusIcon size={16} aria-hidden /></div>
                  <div className="row-name">
                    <div>{s.ServiceNo}</div>
                    <div>{dest ? <><MapPin size={11} aria-hidden style={{ verticalAlign: -1 }} /> To {dest}</> : s.Operator}</div>
                  </div>
                  {arr[0] ? (() => {
                    const m = minsUntil(arr[0].a?.EstimatedArrival, now);
                    const soon = m != null && m < 5;
                    return soon
                      ? <Badge tone="bad" flash icon={AlarmClock} label={arr[0].label!} />
                      : <Badge tone="accent" label={arr[0].label!} />;
                  })() : <Badge tone="muted" label="No more buses" />}
                </div>
                {arr.length > 0 && (
                  <div className="bus-etas">
                    {arr.map(({ label }, i) => (
                      <div className={`bus-eta eta-${i + 1}`} key={i}>
                        <div className="num v">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
