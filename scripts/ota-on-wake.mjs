// Start a firmware update on a sleepy (battery) Zigbee device the moment it wakes up.
// Waits for the first MQTT message from the device (e.g. you press its button), then calls update.install once.
//
// Usage: node scripts/ota-on-wake.mjs <z2m friendly name> <update entity> [wait seconds=180]
//   e.g. node scripts/ota-on-wake.mjs TRADFRI update.tradfri 180
// Env: HA_TOKEN (required), HA_URL (default http://192.168.1.40). Needs Node >= 22.

const [name, updateEntity, secs = "180"] = process.argv.slice(2);
if (!name || !updateEntity || !process.env.HA_TOKEN) {
  console.error("usage: HA_TOKEN=... node scripts/ota-on-wake.mjs <z2m name> <update.entity> [seconds]");
  process.exit(1);
}
const base = (process.env.HA_URL || "http://192.168.1.40").replace(/^http/, "ws");
const ws = new WebSocket(`${base}/api/websocket`);
const topic = `zigbee2mqtt/${name}`;
let fired = false;
const t = () => new Date().toLocaleTimeString();

setTimeout(() => { if (!fired) console.log(`${t()} no message from ${name} in ${secs}s; update NOT started`); ws.close(); process.exit(fired ? 0 : 2); }, Number(secs) * 1000);

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.type === "auth_required") return ws.send(JSON.stringify({ type: "auth", access_token: process.env.HA_TOKEN }));
  if (m.type === "auth_invalid") { console.error("auth invalid"); process.exit(1); }
  if (m.type === "auth_ok") return ws.send(JSON.stringify({ id: 1, type: "mqtt/subscribe", topic }));
  if (m.type === "result" && m.id === 1) return console.log(`${t()} waiting for ${name} to wake (press it)…`);
  if (m.type === "event" && m.event && !fired) {
    fired = true; // send exactly once: re-sending would supersede the queued request
    console.log(`${t()} ${name} is awake: starting ${updateEntity}`);
    ws.send(JSON.stringify({ id: 2, type: "call_service", domain: "update", service: "install", target: { entity_id: updateEntity } }));
  }
  if (m.type === "result" && m.id === 2) {
    console.log(`${t()} update.install ${m.success ? "accepted" : "FAILED: " + m.error?.message}`);
    ws.close();
    process.exit(m.success ? 0 : 1);
  }
};
ws.onerror = (e) => { console.error("websocket error", e.message ?? ""); process.exit(1); };
