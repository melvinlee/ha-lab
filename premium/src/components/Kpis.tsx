import { Zap, BatteryCharging, Thermometer, Power, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { ReactNode } from "react";
import { useHass, isUnavailable } from "../ha/store";
import { POWER_SENSORS, ENERGY_SENSORS, ROOMS, DEVICE_ENTITIES } from "../config";
import { usePowerSeries, useDailyEnergy, useOnCountSeries, useMeanSeries } from "../lib/data";
import { fmtPower, fmtKwh, fmt } from "../lib/format";
import { Card, Sparkline, Skeleton, Badge } from "./ui";

function Tile({ label, icon: Icon, value, unit, foot, spark, loading }: { label: string; icon: typeof Zap; value?: ReactNode; unit?: string; foot?: ReactNode; spark?: ReactNode; loading?: boolean }) {
  return (
    <Card className="kpi">
      <div className="kpi-label"><Icon size={14} aria-hidden />{label}</div>
      {loading ? <Skeleton w="60%" h={32} /> : <div className="kpi-value num">{value}{unit && <span className="kpi-unit">{unit}</span>}</div>}
      <div className="kpi-foot">{loading ? <Skeleton w="40%" h={12} /> : foot}</div>
      {spark}
    </Card>
  );
}

export function Kpis() {
  const { entities, get } = useHass();
  const power = usePowerSeries(POWER_SENSORS);
  const daily = useDailyEnergy(ENERGY_SENSORS);
  const onSeries = useOnCountSeries(DEVICE_ENTITIES);
  const tempIds = ROOMS.map((r) => r.climate.temperature).filter((x): x is string => !!x);
  const tempSeries = useMeanSeries(tempIds);

  // Power now: live state sum
  const powerEntities = POWER_SENSORS.map(get);
  const livePower = powerEntities.filter((e) => !isUnavailable(e)).reduce((a, e) => a + Number(e!.state), 0);
  const powerOk = powerEntities.some((e) => !isUnavailable(e));
  const p = fmtPower(livePower);

  // Energy today vs yesterday (same time)
  let energy: ReactNode = null;
  if (daily.status === "ready") {
    const { today, yesterdaySoFar } = daily.data;
    const t = fmtKwh(today);
    const delta = yesterdaySoFar > 0 ? ((today - yesterdaySoFar) / yesterdaySoFar) * 100 : null;
    energy = (
      <Tile
        label="Energy today" icon={BatteryCharging} value={t.v} unit={t.u}
        foot={
          delta == null ? <span>No data for yesterday</span> : (
            <Badge
              tone={delta > 5 ? "warn" : delta < -5 ? "ok" : "muted"}
              icon={delta > 5 ? TrendingUp : delta < -5 ? TrendingDown : Minus}
              label={`${delta > 0 ? "+" : ""}${fmt(delta, 0)}% vs yesterday`}
            />
          )
        }
      />
    );
  }

  // Indoor climate: room sensors only (the drybox sensor is deliberately excluded)
  const temps = ROOMS.map((r) => r.climate.temperature).filter(Boolean).map((id) => get(id!)).filter((e) => !isUnavailable(e));
  const hums = ROOMS.map((r) => r.climate.humidity).filter(Boolean).map((id) => get(id!)).filter((e) => !isUnavailable(e));
  const avg = (xs: typeof temps) => xs.reduce((a, e) => a + Number(e!.state), 0) / xs.length;

  // Indoor 24 h low–high from the temperature series (#86)
  const tv = tempSeries.status === "ready" ? tempSeries.data.map((p) => p.v) : [];
  const tempRange = tv.length > 1 ? `${fmt(Math.min(...tv), 1)}–${fmt(Math.max(...tv), 1)}°` : null;

  // Devices on
  const devs = DEVICE_ENTITIES.map(get);
  const avail = devs.filter((e) => !isUnavailable(e));
  const on = avail.filter((e) => e!.state === "on").length;
  const unavailableCount = devs.length - avail.length;

  return (
    <div className="grid kpis">
      <Tile
        label="Power now" icon={Zap} loading={!entities}
        value={powerOk ? p.v : "—"} unit={powerOk ? p.u : undefined}
        foot={powerOk ? <span>{POWER_SENSORS.length === 1 ? "Bedroom Switch only · no whole-home meter" : `${POWER_SENSORS.length} meters`}</span> : <Badge tone="muted" label="Meter unavailable" />}
        spark={power.status === "ready" ? <Sparkline data={power.data} /> : null}
      />
      {daily.status === "ready" ? energy : daily.status === "error"
        ? <Tile label="Energy today" icon={BatteryCharging} value="—" foot={<Badge tone="bad" label="Statistics error" />} />
        : <Tile label="Energy today" icon={BatteryCharging} loading />}
      <Tile
        label="Indoor" icon={Thermometer} loading={!entities}
        value={temps.length ? `${fmt(avg(temps), 1)}°` : "—"}
        unit={hums.length ? ` ${fmt(avg(hums), 0)}% RH` : undefined}
        foot={temps.length || hums.length ? <span>Average of {temps.length} room sensor{temps.length === 1 ? "" : "s"}{tempRange ? ` · 24 h ${tempRange}` : ""}</span> : <Badge tone="muted" icon={Info} label="No room climate sensor" />}
        spark={tempSeries.status === "ready" ? <Sparkline data={tempSeries.data} fit /> : null}
      />
      <Tile
        label="Devices on" icon={Power} loading={!entities}
        value={on} unit={`of ${avail.length}`}
        foot={unavailableCount ? <Badge tone="warn" label={`${unavailableCount} unavailable`} /> : <span>Lights and switches</span>}
        spark={onSeries.status === "ready" ? <Sparkline data={onSeries.data} /> : null}
      />
    </div>
  );
}
