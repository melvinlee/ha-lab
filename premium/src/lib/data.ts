import { useEffect, useState } from "react";
import type { Connection } from "home-assistant-js-websocket";
import { useHass } from "../ha/store";

export interface StatRow { start: number; end: number; mean?: number | null; sum?: number | null; change?: number | null; state?: number | null }
type StatResult = Record<string, StatRow[]>;

export type Loadable<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: string };

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

async function stats(conn: Connection, ids: string[], start: Date, period: "5minute" | "hour" | "day", types: string[], end?: Date) {
  if (!ids.length) return {} as StatResult;
  return conn.sendMessagePromise<StatResult>({
    type: "recorder/statistics_during_period",
    start_time: start.toISOString(),
    ...(end ? { end_time: end.toISOString() } : {}),
    statistic_ids: ids,
    period,
    types,
  });
}

/** Generic polling loader bound to the HA connection. */
function usePoll<T>(fn: ((conn: Connection) => Promise<T>) | null, deps: unknown[], everyMs: number): Loadable<T> {
  const { conn, status } = useHass();
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  useEffect(() => {
    if (!conn || status !== "ready" || !fn) return;
    let alive = true;
    const run = () =>
      fn(conn)
        .then((data) => alive && setState({ status: "ready", data }))
        .catch((e) => alive && setState({ status: "error", error: (e as { message?: string })?.message ?? String(e) }));
    run();
    const t = setInterval(run, everyMs);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, status, ...deps]);
  return state;
}

/** Sum of mean power (W) across sensors, 5-minute buckets, last 24h. */
export function usePowerSeries(ids: string[]) {
  return usePoll(
    ids.length
      ? async (conn) => {
          const r = await stats(conn, ids, new Date(Date.now() - 24 * 3600e3), "5minute", ["mean"]);
          return mergeBy(r, (row) => row.mean ?? 0);
        }
      : null,
    [ids.join()],
    5 * 60e3,
  );
}

/** Mean of several measurement sensors (e.g. room temperatures), 5-minute buckets, last 24h.
 *  Averaged across the sensors that reported in each bucket, not summed (#86). */
export function useMeanSeries(ids: string[]) {
  return usePoll(
    ids.length
      ? async (conn) => {
          const r = await stats(conn, ids, new Date(Date.now() - 24 * 3600e3), "5minute", ["mean"]);
          const sum = new Map<number, { s: number; n: number }>();
          for (const rows of Object.values(r)) for (const row of rows) {
            if (row.mean == null) continue;
            const b = sum.get(row.start) ?? { s: 0, n: 0 };
            b.s += row.mean; b.n += 1; sum.set(row.start, b);
          }
          return [...sum.entries()].sort((a, b) => a[0] - b[0]).map(([t, b]) => ({ t, v: b.s / b.n }));
        }
      : null,
    [ids.join()],
    5 * 60e3,
  );
}

/** kWh per hour (sum of `change`) for the last 24h. */
export function useHourlyEnergy(ids: string[]) {
  return usePoll(
    ids.length
      ? async (conn) => {
          const r = await stats(conn, ids, new Date(Date.now() - 24 * 3600e3), "hour", ["change"]);
          return mergeBy(r, (row) => Math.max(0, row.change ?? 0));
        }
      : null,
    [ids.join()],
    5 * 60e3,
  );
}

/** kWh today and yesterday (daily `change`). */
export function useDailyEnergy(ids: string[]) {
  return usePoll(
    ids.length
      ? async (conn) => {
          const today = startOfDay();
          const yesterday = new Date(today.getTime() - 24 * 3600e3);
          const r = await stats(conn, ids, yesterday, "day", ["change"]);
          const days = mergeBy(r, (row) => Math.max(0, row.change ?? 0));
          const pick = (d: Date) => days.find((p) => p.t === d.getTime())?.v ?? 0;
          // Same time yesterday, for a fair comparison
          const hourly = await stats(conn, ids, yesterday, "hour", ["change"], new Date(Date.now() - 24 * 3600e3));
          const ySoFar = mergeBy(hourly, (row) => Math.max(0, row.change ?? 0)).reduce((a, p) => a + p.v, 0);
          // Since the 1st of this month (local), summed from daily statistics
          const first = new Date(today.getFullYear(), today.getMonth(), 1);
          const m = await stats(conn, ids, first, "day", ["change"]);
          const month = mergeBy(m, (row) => Math.max(0, row.change ?? 0)).reduce((a, p) => a + p.v, 0);
          return { today: pick(today), yesterday: pick(yesterday), yesterdaySoFar: ySoFar, month };
        }
      : null,
    [ids.join()],
    5 * 60e3,
  );
}

/** Hourly "how many of these entities were on" for the last 24h. */
export function useOnCountSeries(ids: string[]) {
  return usePoll(
    ids.length
      ? async (conn) => {
          const start = new Date(Date.now() - 24 * 3600e3);
          const r = await conn.sendMessagePromise<Record<string, { s: string; lu: number }[]>>({
            type: "history/history_during_period",
            start_time: start.toISOString(),
            entity_ids: ids,
            minimal_response: true,
            no_attributes: true,
            significant_changes_only: false,
          });
          const points: { t: number; v: number }[] = [];
          for (let h = 0; h <= 24; h++) {
            const t = start.getTime() + h * 3600e3;
            let on = 0;
            for (const id of ids) {
              const hist = r[id] ?? [];
              let s: string | undefined;
              for (const p of hist) { if (p.lu * 1000 <= t) s = p.s; else break; }
              if (s === "on") on++;
            }
            points.push({ t, v: on });
          }
          return points;
        }
      : null,
    [ids.join()],
    5 * 60e3,
  );
}

export interface LogEvent { entity_id?: string; name?: string; state?: string; message?: string; when: number; context_service?: string; context_event_type?: string }

export function useLogbook(ids: string[], hours = 24) {
  return usePoll(
    async (conn) => {
      const r = await conn.sendMessagePromise<LogEvent[]>({
        type: "logbook/get_events",
        start_time: new Date(Date.now() - hours * 3600e3).toISOString(),
        entity_ids: ids,
      });
      return r.filter((e) => e.state !== "unavailable" && e.state !== "unknown").sort((a, b) => b.when - a.when).slice(0, 12);
    },
    [ids.join(), hours],
    30e3,
  );
}

function mergeBy(r: StatResult, val: (row: StatRow) => number) {
  const m = new Map<number, number>();
  for (const rows of Object.values(r)) for (const row of rows) m.set(row.start, (m.get(row.start) ?? 0) + val(row));
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, v }));
}
