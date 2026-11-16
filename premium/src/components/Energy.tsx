import { BarChart3, Sun, Info } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ENERGY_SENSORS, SOLAR_SENSORS, TARIFF_SGD_PER_KWH, CURRENCY } from "../config";
import { useHourlyEnergy, useDailyEnergy } from "../lib/data";
import { fmt, fmtKwh, fmtMoney } from "../lib/format";
import { Card, Skeleton, Empty, Badge } from "./ui";

const hh = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export function Energy() {
  const cons = useHourlyEnergy(ENERGY_SENSORS);
  const solar = useHourlyEnergy(SOLAR_SENSORS);
  const daily = useDailyEnergy(ENERGY_SENSORS);
  const hasSolar = SOLAR_SENSORS.length > 0;

  const data =
    cons.status === "ready"
      ? cons.data.map((p) => ({
          t: p.t,
          consumption: p.v,
          solar: hasSolar && solar.status === "ready" ? solar.data.find((s) => s.t === p.t)?.v ?? 0 : undefined,
        }))
      : [];
  const total24 = data.reduce((a, p) => a + p.consumption, 0);
  const today = daily.status === "ready" ? daily.data.today : null;

  return (
    <Card
      title="Energy"
      icon={BarChart3}
      right={
        <div className="legend" aria-label="Chart legend">
          <span><i style={{ background: "var(--accent)" }} />Consumption</span>
          <span><i style={{ background: "var(--text-3)" }} />Solar{!hasSolar && " (none)"}</span>
        </div>
      }
    >
      {!ENERGY_SENSORS.length ? (
        <Empty icon={Info} title="No energy sensors">Add a power meter to see consumption.</Empty>
      ) : cons.status === "loading" ? (
        <Skeleton h={220} />
      ) : cons.status === "error" ? (
        <Empty icon={Info} title="Couldn't load statistics">{cons.error}</Empty>
      ) : data.length === 0 ? (
        <Empty icon={Info} title="No data in the last 24 hours">Statistics appear after the first full hour of readings.</Empty>
      ) : (
        <div className="chart" role="img" aria-label={`Energy consumption over the last 24 hours, total ${fmt(total24, 2)} kWh`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gCons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="t" tickFormatter={hh} stroke="var(--text-3)" tickLine={false} axisLine={false} fontSize={12} minTickGap={40} />
              <YAxis stroke="var(--text-3)" tickLine={false} axisLine={false} fontSize={12} width={48} tickFormatter={(v) => `${fmt(v * 1000, 0)}`} unit=" Wh" />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-pop)", fontSize: 12 }}
                labelFormatter={(t) => hh(Number(t))}
                formatter={(v, name) => [`${fmt(Number(v) * 1000, 0)} Wh`, name === "consumption" ? "Consumption" : "Solar"]}
              />
              <Area type="monotone" dataKey="consumption" stroke="var(--accent)" strokeWidth={1.75} fill="url(#gCons)" animationDuration={200} />
              {hasSolar && <Area type="monotone" dataKey="solar" stroke="var(--text-3)" strokeWidth={1.5} fill="transparent" animationDuration={200} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="stats3">
        <div className="stat"><div className="l">Today</div><div className="v num">{today == null ? <Skeleton w={80} h={24} /> : `${fmtKwh(today).v} ${fmtKwh(today).u}`}</div></div>
        <div className="stat"><div className="l">Cost today · {CURRENCY} {fmt(TARIFF_SGD_PER_KWH, 2)}/kWh</div><div className="v num">{today == null ? <Skeleton w={80} h={24} /> : fmtMoney(today * TARIFF_SGD_PER_KWH, CURRENCY)}</div></div>
        <div className="stat">
          <div className="l">Solar today</div>
          <div className="v">{hasSolar ? "—" : <Badge tone="muted" icon={Sun} label="No solar configured" />}</div>
        </div>
      </div>
      <p className="card-sub" style={{ margin: "12px 0 0" }}>
        Metered: Bedroom Switch only. Add a whole-home meter to <code>ENERGY_SENSORS</code> for full consumption.
      </p>
    </Card>
  );
}
