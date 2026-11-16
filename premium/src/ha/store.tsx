import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { subscribeEntities, callService, type Connection, type HassEntities, type HassEntity } from "home-assistant-js-websocket";
import { connect } from "./connection";

export type ConnStatus = "connecting" | "ready" | "reconnecting" | "error";

interface Pending { state: string; attributes?: Record<string, unknown>; at: number }

interface HassCtx {
  status: ConnStatus;
  error?: string;
  conn?: Connection;
  entities?: HassEntities;
  /** Entity with any optimistic override applied. */
  get: (id: string) => HassEntity | undefined;
  isPending: (id: string) => boolean;
  call: (domain: string, service: string, data: Record<string, unknown>, optimistic?: { entity: string; state: string; attributes?: Record<string, unknown> }) => Promise<void>;
  toasts: { id: number; text: string }[];
}

const Ctx = createContext<HassCtx | null>(null);
const OPTIMISTIC_TIMEOUT = 6000;

export function HassProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [error, setError] = useState<string>();
  const [conn, setConn] = useState<Connection>();
  const [entities, setEntities] = useState<HassEntities>();
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let c: Connection | undefined;
    const onReady = () => setStatus("ready");
    const onDisc = () => setStatus("reconnecting");
    const onErr = () => setStatus("error");
    connect()
      .then(({ conn }) => {
        c = conn;
        setConn(conn);
        setStatus(conn.connected ? "ready" : "reconnecting");
        conn.addEventListener("ready", onReady);
        conn.addEventListener("disconnected", onDisc);
        conn.addEventListener("reconnect-error", onErr);
        unsub = subscribeEntities(conn, (e) => setEntities(e));
      })
      .catch((e) => {
        setStatus("error");
        setError(e instanceof Error ? e.message : `Connection failed (${String(e)})`);
      });
    return () => {
      unsub?.();
      c?.removeEventListener("ready", onReady);
      c?.removeEventListener("disconnected", onDisc);
      c?.removeEventListener("reconnect-error", onErr);
    };
  }, []);

  // Drop optimistic overrides once HA confirms (state matches) or after a timeout.
  useEffect(() => {
    if (!entities) return;
    setPending((p) => {
      let changed = false;
      const next = { ...p };
      for (const [id, v] of Object.entries(p)) {
        const real = entities[id];
        if (!real || real.state === v.state || Date.now() - v.at > OPTIMISTIC_TIMEOUT) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : p;
    });
  }, [entities]);

  useEffect(() => {
    const t = setInterval(() => {
      setPending((p) => {
        const now = Date.now();
        const expired = Object.entries(p).filter(([, v]) => now - v.at > OPTIMISTIC_TIMEOUT);
        if (!expired.length) return p;
        const next = { ...p };
        expired.forEach(([id]) => delete next[id]);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const get = useCallback(
    (id: string) => {
      const real = entities?.[id];
      const p = pending[id];
      if (!real || !p) return real;
      return { ...real, state: p.state, attributes: { ...real.attributes, ...(p.attributes ?? {}) } };
    },
    [entities, pending],
  );

  const call = useCallback<HassCtx["call"]>(
    async (domain, service, data, optimistic) => {
      if (!conn) return;
      if (optimistic) {
        setPending((p) => ({ ...p, [optimistic.entity]: { state: optimistic.state, attributes: optimistic.attributes, at: Date.now() } }));
      }
      try {
        await callService(conn, domain, service, data);
      } catch (e) {
        if (optimistic) setPending((p) => { const n = { ...p }; delete n[optimistic.entity]; return n; });
        const msg = (e as { message?: string })?.message ?? "Action failed";
        toast(`${domain}.${service}: ${msg}`);
      }
    },
    [conn, toast],
  );

  const value = useMemo<HassCtx>(
    () => ({ status, error, conn, entities, get, isPending: (id) => id in pending, call, toasts }),
    [status, error, conn, entities, get, pending, call, toasts],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHass() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHass outside HassProvider");
  return v;
}

export const isUnavailable = (e?: HassEntity) => !e || e.state === "unavailable" || e.state === "unknown";

/** Stateless entities (scenes, buttons, scripts) report "unknown" until first used. Only "unavailable" means unusable. */
const STATELESS = new Set(["scene", "button", "script", "input_button"]);
export const isUsable = (e?: HassEntity) =>
  !!e && e.state !== "unavailable" && (e.state !== "unknown" || STATELESS.has(e.entity_id.split(".")[0]));
