import {
  createConnection,
  getAuth,
  ERR_HASS_HOST_REQUIRED,
  type Connection,
} from "home-assistant-js-websocket";

declare global {
  interface Window {
    hassConnection?: Promise<{ auth: unknown; conn: Connection }>;
  }
}

/**
 * Inside HA (served from /local/ in an iframe on the same origin) we reuse the frontend's
 * existing websocket via window.parent.hassConnection, so there's no login and no token.
 * Standalone (dev server, or /local/premium/ opened directly) falls back to HA's OAuth flow.
 */
export async function connect(): Promise<{ conn: Connection; embedded: boolean }> {
  try {
    if (window.parent !== window && window.parent.hassConnection) {
      const { conn } = await window.parent.hassConnection;
      return { conn, embedded: true };
    }
  } catch {
    // cross-origin parent: fall through to standalone auth
  }

  const hassUrl = (import.meta.env.VITE_HA_URL as string | undefined) || window.location.origin;
  let auth;
  try {
    auth = await getAuth({
      hassUrl,
      saveTokens: (t) => {
        try { localStorage.setItem("hassTokens", JSON.stringify(t)); } catch { /* storage blocked */ }
      },
      loadTokens: async () => {
        try { const v = localStorage.getItem("hassTokens"); return v ? JSON.parse(v) : null; } catch { return null; }
      },
    });
  } catch (err) {
    if (err === ERR_HASS_HOST_REQUIRED) throw new Error("No Home Assistant URL configured");
    throw err;
  }
  if (location.search.includes("auth_callback=1")) history.replaceState(null, "", location.pathname);
  const conn = await createConnection({ auth });
  return { conn, embedded: false };
}
