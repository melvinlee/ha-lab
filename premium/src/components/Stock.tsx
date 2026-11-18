import { ChartLine, TrendingUp, TrendingDown, CircleAlert } from "lucide-react";
import { useHass, isUnavailable } from "../ha/store";
import { STOCK_SENSORS } from "../config";
import { Card, Badge, Empty, Skeleton } from "./ui";

/** Quote card fed by a REST sensor (ha-config/rest.yaml): state = last price, attributes = Yahoo chart `meta`. */
export function StockCards() {
  return <>{STOCK_SENSORS.map((s) => <Stock key={s.entity} {...s} />)}</>;
}

function Stock({ entity, name }: { entity: string; name: string }) {
  const { entities, get } = useHass();
  const e = get(entity);
  const price = Number(e?.state);
  const prev = Number(e?.attributes.chartPreviousClose);
  const ok = !!e && !isUnavailable(e) && Number.isFinite(price) && price > 0;
  const change = ok && Number.isFinite(prev) && prev > 0 ? price - prev : null;
  const pct = change != null ? (change / prev) * 100 : null;
  const t = Number(e?.attributes.regularMarketTime);
  const when = Number.isFinite(t) && t > 0
    ? new Date(t * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;
  const up = (change ?? 0) >= 0;
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card title={name} icon={ChartLine} right={when ? <span className="card-sub">As of {when}</span> : null}>
      {!entities ? (
        <Skeleton h={40} />
      ) : !e ? (
        <Empty icon={CircleAlert} title="Quote sensor not found">Expected <code>{entity}</code> (see ha-config/rest.yaml).</Empty>
      ) : !ok ? (
        <Empty icon={CircleAlert} title="Quote unavailable">The quote service didn't respond. Retrying every 5 minutes.</Empty>
      ) : (
        <div className="stock">
          <div className="num stock-price">${fmt(price)}</div>
          {change != null && pct != null && (
            <Badge
              tone={up ? "ok" : "bad"}
              icon={up ? TrendingUp : TrendingDown}
              label={`${up ? "+" : "−"}${fmt(Math.abs(change))} (${up ? "+" : "−"}${Math.abs(pct).toFixed(2)}%)`}
            />
          )}
        </div>
      )}
    </Card>
  );
}
