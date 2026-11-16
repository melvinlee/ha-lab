# ha-lab

Claude Code ↔ Home Assistant (http://ha.home, 192.168.1.40) via HA's built-in
**Model Context Protocol Server** integration (streamable HTTP at `/api/mcp`).

**What's been done, current state and open items: [docs/WORKLOG.md](docs/WORKLOG.md).**

| Path | Contents |
|---|---|
| `README.md` | Setup and reference (MCP, Zigbee/MQTT, automations, dashboard) |
| `docs/WORKLOG.md` | Dated log of changes, findings and open items |
| `dashboards/home.yaml` | Lovelace dashboard (phone + 10" landscape tablet) |
| `automations/office_e1_switch_light_on.yaml` | E1 switch automation, exported from HA |
| `automations/master_bedroom_tradfri_button.yaml` | TRADFRI → LED Cove toggle, exported from HA |
| `automations/master_bedroom_no_motion_lights_off.yaml` | No motion 5 min → Main light + LED Cove off, exported from HA |
| `zigbee2mqtt/app-config.yaml` | Z2M app `serial` config (reference copy, not exported) |
| `scripts/push-dashboard.sh` | Push the dashboard YAML to HA (websocket API) |
| `scripts/mqtt-listen.mjs` | Watch an MQTT topic through HA (e.g. to check button payloads) |
| `scripts/ha-ws.mjs` | Send raw HA websocket commands (areas, device registry, …) |
| `.mcp.json` | Project MCP server config (uses `HA_URL`, `HA_TOKEN`) |

## Setup

1. In HA: **Settings → Devices & services → Model Context Protocol Server** must be
   added (it is). Entities are only visible to Claude if they're *exposed* to Assist:
   **Settings → Voice assistants → Expose**.
2. Create a token: HA profile (bottom-left) → **Security → Long-lived access tokens → Create token**.
3. Export it in your shell (e.g. `~/.zshrc`), then start Claude Code from this directory:

   ```bash
   export HA_TOKEN='<token>'
   cd ha-lab && claude
   ```

4. Approve the project MCP server when prompted; check with `/mcp`.

`HA_URL` defaults to the IP because the Mac's resolver (8.8.8.8) can't resolve `ha.home`.
If you point macOS DNS at Pi-hole (192.168.1.250), set `HA_URL=http://ha.home`.

## Zigbee via MQTT (Zigbee2MQTT)

Status (2026-11-15): **working**. Mosquitto + MQTT integration loaded, Z2M 2.14.3 running, SLZB-06 at 192.168.1.41.
The MCP tools can only start/stop/restart *installed* apps. They can't install apps
or run integration config flows, so these steps are done in the HA UI.

### 1. Mosquitto broker

- **Settings → Apps → Install app (store) → Mosquitto broker → Install**
- Turn on **Start on boot**, then **Start**

### 2. MQTT integration

- Usually auto-discovered: **Settings → Devices & services → MQTT: Discovered → Configure → Submit**
- Otherwise: **Add Integration → MQTT** (broker `core-mosquitto`, port `1883`)

### 3. Zigbee2MQTT app

- **App store → ⋮ → Repositories** → add
  `https://github.com/zigbee2mqtt/hassio-zigbee2mqtt`
- Install **Zigbee2MQTT**, then set the coordinator in its **Configuration** tab (see below)
- **Start** it and turn on **Show in sidebar** (pairing happens in the Z2M UI)

### Coordinator: SMLIGHT SLZB-06 (network)

Hardware: **TI CC2652P** radio (ESP32 core, Ethernet), PoE or USB-C power.
Z2M adapter = **`zstack`**.

Prep on the SLZB web UI (`http://192.168.1.41`):

1. Give it a **DHCP reservation / static IP**. Z2M connects by IP.
2. Use **Ethernet** (PoE or USB power + LAN), which is more stable than Wi-Fi.
3. **Mode → Zigbee coordinator**, connection type **LAN / Ethernet**.
4. Update **Zigbee firmware** to the latest *coordinator* build (Settings → Firmware update).
   Don't use router firmware.

Z2M app config (`serial` section):

```yaml
serial:
  port: tcp://192.168.1.41:6638
  adapter: zstack
  baudrate: 115200
```

(If the coordinator is ever swapped for a Silabs-based SLZB, e.g. 06M/06MG24, use `adapter: ember`.)

Notes:
- Port `6638` is the SLZB's Zigbee socket (shown on its web UI dashboard).
- Only one client can hold the socket. Don't run ZHA against the same SLZB.
- Optional: the **SMLIGHT** HA integration (Settings → Devices & services → Add → SMLIGHT)
  gives firmware updates and device sensors. It doesn't conflict with Z2M.

Z2M finds the Mosquitto broker automatically, so you don't enter MQTT credentials.
Paired devices appear in HA under the MQTT integration.

> Don't run ZHA and Zigbee2MQTT on the same coordinator.

### Verify (ask Claude)

- MQTT config entry is `loaded` (`config__get_config_entries` with domain `mqtt`)
- Apps are running: `core_mosquitto`, `45df7312_zigbee2mqtt`
- No MQTT/Z2M errors in `system_log__get_entries`
- Z2M log shows the coordinator connected (firmware version line, no `tcp://` connection errors)

### Troubleshooting

- **Z2M exits with code 1 and the watchdog restart-loops it**: check the Z2M app's **Log** tab
  (Supervisor logs only show the exit code). Usual causes: `serial.port` left as a placeholder,
  wrong `adapter`, or another client (ZHA) holding the SLZB socket.
- Check the socket from the Mac: `nc -z 192.168.1.41 6638`
- SLZB health in HA: `sensor.office_slzb_06_zigbee_type` should be `coordinator` and
  `sensor.office_slzb_06_connection_mode` should be `eth`.

## Automations

### Office: E1 switch controls ceiling light

`automation.office_e1_switch_turns_on_ceiling_light` (id `office_e1_switch_light_on`; entity id kept
from the original name), created via `POST /api/config/automation/config/<id>`
(the MCP tools can't create automations).

| E1 press     | Action                                                 |
|--------------|--------------------------------------------------------|
| double-click | `light.turn_on` → `light.aqara_ceiling_light_t1_white`  |
| single-click | `light.turn_off` → `light.aqara_ceiling_light_t1_white` |

- Trigger: MQTT topic `zigbee2mqtt/Aqara E1 Switch`, matched on `value_json.action`
  (Aqara Wireless mini switch E1, WXKG20LM, `0x54ef441001328ec0`)
- Light: Aqara Ceiling Light T1 (`0x54ef44100130d787`), main white channel
- The topic uses the Z2M friendly name. If the device is renamed in Z2M, update the triggers.

### Master Bedroom: TRADFRI button toggles LED Cove

`automation.master_bedroom_tradfri_button_toggles_led_cove` (id `master_bedroom_tradfri_button`),
exported to `automations/master_bedroom_tradfri_button.yaml`.

| TRADFRI press | Action |
|---|---|
| single press (`action: "on"`) | `switch.toggle` → `switch.smart_wall_switch_z1_pro_center` (LED Cove) |

- Trigger: MQTT topic `zigbee2mqtt/TRADFRI`, `value_json.action == "on"` (IKEA E1812, `0xb4e3f9fffe249914`).
  Payload confirmed with `node scripts/mqtt-listen.mjs zigbee2mqtt/TRADFRI 60`.
- Long press (`brightness_move_up` / `brightness_stop`) isn't used.

### Master Bedroom: no motion 5 min turns off lights

`automation.master_bedroom_no_motion_5_min_turns_off_lights` (id `master_bedroom_no_motion_lights_off`),
exported to `automations/master_bedroom_no_motion_lights_off.yaml`.

- Turns off **Main light** + **LED Cove** (`switch.smart_wall_switch_z1_pro_top` / `_center`). **Night Curtain is left alone.**
- Triggers: `binary_sensor.aqara_motion_sensor_p1_occupancy` → `off` for 5 min, **or** either light → `on` for 5 min
  (covers lights turned on while the room is already empty, e.g. via the TRADFRI button).
- Conditions: occupancy has been `off` for ≥ 5 min, and at least one of the two lights is on.
- Real delay ≈ 5 min + the P1's own clear time. The P1 only reports `off` after its occupancy timeout / detection interval (30 s).

## Dashboard

`dashboards/home.yaml` is one responsive **sections** dashboard with built-in cards only (no HACS).

| Screen | Layout |
|---|---|
| Phone | 1 column; hourly weather; tablet header hidden |
| 10" tablet, landscape (≥1024px) | up to 4 columns; greeting/clock + daily forecast header (2 columns wide) |

Views: **Home** (Office lights, E1 switch, SHIELD, shopping list) and **System** (Zigbee2MQTT,
SLZB-06, device health, updates/backups). Restart buttons ask for confirmation.

Live in HA as **North Gaia**: `http://192.168.1.40/dashboard-north-gaia` (sidebar).

Push changes after editing the YAML (creates the dashboard if missing, then saves the config):

```bash
scripts/push-dashboard.sh            # dashboards/home.yaml -> /dashboard-north-gaia "North Gaia"
```

Needs `HA_TOKEN`, ruby and node ≥ 22. Edits made in the HA UI get overwritten by the next push,
so keep the YAML as the source of truth.

Wall tablet: use the HA Companion app or Fully Kiosk Browser in fullscreen, and set it as the
default dashboard on that device (Profile → Dashboard).
