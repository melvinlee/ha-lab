// Push a Lovelace dashboard config (JSON on stdin) to Home Assistant over the websocket API.
// Creates the dashboard if it doesn't exist yet, then saves the config. Needs Node >= 22 (built-in WebSocket).
//
// Usage (via wrapper): scripts/push-dashboard.sh [dashboards/home.yaml] [url_path] [title] [icon]
// Env: HA_TOKEN (required), HA_URL (default http://192.168.1.40)

const [urlPath = "dashboard-north-gaia", title = "North Gaia", icon = "mdi:home"] = process.argv.slice(2);
const config = JSON.parse(await new Promise((res) => {
  let d = ""; process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", () => res(d));
}));

if (!process.env.HA_TOKEN) { console.error("HA_TOKEN is not set"); process.exit(1); }
const base = (process.env.HA_URL || "http://192.168.1.40").replace(/^http/, "ws");
const ws = new WebSocket(`${base}/api/websocket`);
let id = 0;
const pending = new Map();
const call = (msg) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, ...msg })); });
const fail = (what, r) => { console.error(`${what} failed: ${r.error?.code} ${r.error?.message}`); ws.close(); process.exit(1); };
setTimeout(() => { console.error("timeout"); process.exit(2); }, 30000).unref();

ws.onmessage = async (ev) => {
  const m = JSON.parse(ev.data);
  if (m.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: process.env.HA_TOKEN }));
  if (m.type === "auth_invalid") { console.error("auth invalid"); process.exit(1); }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.type !== "auth_ok") return;

  const list = await call({ type: "lovelace/dashboards/list" });
  if (!list.success) fail("list dashboards", list);
  if (list.result.some((d) => d.url_path === urlPath)) {
    console.log(`dashboard /${urlPath} exists`);
  } else {
    const c = await call({
      type: "lovelace/dashboards/create",
      url_path: urlPath, title, icon, mode: "storage", show_in_sidebar: true, require_admin: false,
    });
    if (!c.success) fail("create dashboard", c);
    console.log(`created dashboard /${urlPath} ("${title}")`);
  }

  const s = await call({ type: "lovelace/config/save", url_path: urlPath, config });
  if (!s.success) fail("save config", s);

  const back = await call({ type: "lovelace/config", url_path: urlPath });
  if (!back.success) fail("read back", back);
  const views = (back.result.views || []).map((v) => `${v.title} (${(v.sections || []).length} sections)`);
  console.log(`saved config: title="${back.result.title}" views: ${views.join(", ")}`);
  ws.close();
};
ws.onerror = (e) => { console.error("websocket error", e.message ?? ""); process.exit(1); };
