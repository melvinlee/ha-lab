// Listen to an MQTT topic through Home Assistant's websocket API (mqtt/subscribe) and print messages.
// Usage: node scripts/mqtt-listen.mjs <topic> [seconds=60]
//   e.g. node scripts/mqtt-listen.mjs 'zigbee2mqtt/TRADFRI' 90
// Read-only. Env: HA_TOKEN (required), HA_URL (default http://192.168.1.40). Needs Node >= 22.

const [topic, secs = "60"] = process.argv.slice(2);
if (!topic || !process.env.HA_TOKEN) { console.error("usage: HA_TOKEN=... node scripts/mqtt-listen.mjs <topic> [seconds]"); process.exit(1); }
const base = (process.env.HA_URL || "http://192.168.1.40").replace(/^http/, "ws");
const ws = new WebSocket(`${base}/api/websocket`);
let count = 0;

setTimeout(() => { console.log(`done: ${count} message(s) on ${topic} in ${secs}s`); ws.close(); process.exit(0); }, Number(secs) * 1000);

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: process.env.HA_TOKEN }));
  if (m.type === "auth_invalid") { console.error("auth invalid"); process.exit(1); }
  if (m.type === "auth_ok") return ws.send(JSON.stringify({ id: 1, type: "mqtt/subscribe", topic, qos: 0 }));
  if (m.type === "result" && m.id === 1) {
    if (!m.success) { console.error("subscribe failed:", m.error?.message); process.exit(1); }
    return console.log(`listening on ${topic} for ${secs}s...`);
  }
  if (m.type === "event" && m.event) {
    count++;
    let p = m.event.payload;
    let action = "";
    try { const j = JSON.parse(p); action = j.action ?? ""; } catch {}
    const t = new Date().toLocaleTimeString();
    console.log(`${t} ${m.event.topic}${m.event.retain ? " (retained)" : ""} action=${JSON.stringify(action)} payload=${p}`);
  }
};
ws.onerror = (e) => { console.error("websocket error", e.message ?? ""); process.exit(1); };
