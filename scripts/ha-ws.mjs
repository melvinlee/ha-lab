// Send Home Assistant websocket commands and print the results.
// Usage: node scripts/ha-ws.mjs '<json command>' ['<json command>' ...]
//   e.g. node scripts/ha-ws.mjs '{"type":"config/area_registry/list"}'
// A command can reference an earlier result with "$<n>.<path>", e.g. "$1.area_id" (1-based).
// Env: HA_TOKEN (required), HA_URL (default http://192.168.1.40). Needs Node >= 22.

const cmds = process.argv.slice(2).map((s) => JSON.parse(s));
if (!cmds.length || !process.env.HA_TOKEN) { console.error("usage: HA_TOKEN=... node scripts/ha-ws.mjs '<json>' ..."); process.exit(1); }
const base = (process.env.HA_URL || "http://192.168.1.40").replace(/^http/, "ws");
const ws = new WebSocket(`${base}/api/websocket`);
let id = 0;
const pending = new Map();
const results = [];
const call = (msg) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, ...msg })); });
const resolveRefs = (v) => {
  if (typeof v === "string" && /^\$\d+\./.test(v)) {
    const [, n, path] = v.match(/^\$(\d+)\.(.+)$/);
    return path.split(".").reduce((o, k) => o?.[k], results[n - 1]);
  }
  if (Array.isArray(v)) return v.map(resolveRefs);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveRefs(x)]));
  return v;
};
setTimeout(() => { console.error("timeout"); process.exit(2); }, 30000).unref();

ws.onmessage = async (ev) => {
  const m = JSON.parse(ev.data);
  if (m.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: process.env.HA_TOKEN }));
  if (m.type === "auth_invalid") { console.error("auth invalid"); process.exit(1); }
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.type !== "auth_ok") return;
  let failed = false;
  for (const c of cmds) {
    const r = await call(resolveRefs(c));
    results.push(r.result);
    console.log(JSON.stringify({ type: c.type, success: r.success, result: r.result, error: r.error }));
    if (!r.success) { failed = true; break; }
  }
  ws.close();
  // Don't process.exit() here: large stdout writes to a pipe are async and would be truncated.
  process.exitCode = failed ? 1 : 0;
  process.stdout.write("", () => process.exit(process.exitCode));
};
ws.onerror = (e) => { console.error("websocket error", e.message ?? ""); process.exit(1); };
