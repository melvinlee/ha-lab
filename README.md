# ha-lab

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.11-41BDF5?logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)
[![Zigbee2MQTT](https://img.shields.io/badge/Zigbee2MQTT-SLZB--06-FFC135?logo=zigbee&logoColor=black)](https://www.zigbee2mqtt.io/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-MCP-D97757?logo=claude&logoColor=white)](https://claude.com/claude-code)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](premium/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](premium/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](premium/)
[![pre-commit](https://img.shields.io/badge/pre--commit-gitleaks-FAB040?logo=pre-commit&logoColor=white)](.pre-commit-config.yaml)
[![Last commit](https://img.shields.io/github/last-commit/melvinlee/ha-lab)](https://github.com/melvinlee/ha-lab/commits/main)
[![Open issues](https://img.shields.io/github/issues/melvinlee/ha-lab)](https://github.com/melvinlee/ha-lab/issues)
[![Open PRs](https://img.shields.io/github/issues-pr/melvinlee/ha-lab)](https://github.com/melvinlee/ha-lab/pulls)

Claude Code ↔ Home Assistant (http://ha.home, 192.168.1.40) via HA's built-in
**Model Context Protocol Server** integration (streamable HTTP at `/api/mcp`).

**What's been done, current state and open items: [docs/WORKLOG.md](docs/WORKLOG.md).**

| Path | Contents |
|---|---|
| `.claude/skills/` | Project agent skills: ha-zigbee-device, ha-automation, ha-scene, ng-premium-deploy, sleepy-device-settings, issue-workflow |
| `.claude/agents/pr-reviewer.md` | Project subagent (Sonnet, read-only): "review PR #N" checks the diff against the issue, live HA and repo conventions, then reports a verdict |
| `CLAUDE.md` | Guidance for Claude Code: commands, architecture, gotchas, conventions |
| `README.md` | Setup and reference (areas/devices, MCP, Zigbee/MQTT, automations, dashboard, scripts, workflow) |
| `docs/WORKLOG.md` | Dated log of changes, findings and open items |
| `dashboards/home.yaml` | Lovelace dashboard (phone + 10" landscape tablet) |
| `automations/office_e1_switch_light_on.yaml` | E1 switch automation, exported from HA |
| `automations/master_bedroom_tradfri_button.yaml` | TRADFRI → LED Cove toggle, exported from HA |
| `automations/master_bedroom_tradfri_double_click.yaml` | TRADFRI double-click → Bedlamp toggle, exported from HA |
| `automations/kitchen_*.yaml` | Kitchen: Switch 1 bottom → Main Light, Main Light status mirror, presence lights, exported from HA |
| `automations/master_bedroom_motion_main_light_on.yaml` | Motion → Main light on, exported from HA |
| `automations/master_bedroom_slider_dims_bedlamp.yaml` | Z1 Pro slider → Bedlamp brightness, exported from HA |
| `automations/bathroom_motion_lights_on.yaml`, `bathroom_no_motion_lights_off.yaml` | Bathroom motion on / 15-min auto-off, exported from HA |
| `automations/office_scene_schedule.yaml` | Office hour / After office by time and on light-on, exported from HA |
| `automations/master_bedroom_no_motion_lights_off.yaml` | No motion 5 min → Main light + LED Cove off, exported from HA |
| `automations/living_room_front_door_back_home.yaml` | Front door opens → Back Home (staged: rockers and spotlights, then fan), exported from HA |
| `automations/living_room_mini_switch_double_all_off.yaml` | Living Room Mini Switch double press → Living, Dining, Kitchen lights, Ceiling Fan and Laundry Light off, exported from HA |
| `ha-config/` | Copies of HA YAML managed here: `configuration.yaml` (adds `rest: !include rest.yaml`), `rest.yaml` (bus API sensors, QQQ quote) |
| `scenes/*.yaml` | Good morning / Movie / Away / Goodnight / Office hour / After office / Back Home, exported from HA |
| `zigbee2mqtt/app-config.yaml` | Z2M app `serial` config (reference copy, not exported) |
| `zigbee2mqtt/devices-availability.yaml` | Reference copy of the per-device Z2M availability (5 min) on the 7 spotlights, with how to apply it (#35) |
| `scripts/push-dashboard.sh` | Push the dashboard YAML to HA (websocket API) |
| `scripts/start-issue-branch.sh` | Start an issue branch `feature/<n>-<slug>` from the latest `main` (refuses a dirty tree) |
| `scripts/mqtt-listen.mjs` | Watch an MQTT topic through HA (e.g. to check button payloads) |
| `scripts/ha-ws.mjs` | Send raw HA websocket commands (areas, device registry, …) |
| `helpers/` | Reference copies of helpers created via the config-flow API (not loaded by HA) |
| `premium/` | Premium SaaS-style dashboard app (issue #3), see `premium/README.md` |
| `scripts/deploy-premium.sh` | Build the premium app, copy to HA `/config/www/premium`, create the **NG Premium** dashboard |
| `.pre-commit-config.yaml`, `.gitleaks.toml` | Pre-commit hooks: gitleaks secret scan + basic file checks |
| `.mcp.json` | Project MCP server config (uses `HA_URL`, `HA_TOKEN`) |

## Areas & devices

| Area | Device | Model | Integration | Key entities |
|---|---|---|---|---|
| Office | Aqara Ceiling Light T1 | HCXDD12LM | Z2M `0x54ef44100130d787` | `light.aqara_ceiling_light_t1_white` (main), `..._rgb` (ring) |
| Office | Aqara E1 Switch | WXKG20LM (wireless) | Z2M `0x54ef441001328ec0` | presses on MQTT `zigbee2mqtt/Aqara E1 Switch`; `sensor.aqara_e1_switch_battery` |
| Office | Aqara Sensor (**drybox**, not room climate) | WSDCGQ11LM | Z2M `0x00158d008bbd8791` | `sensor.aqara_sensor_humidity`, `_temperature`, `_battery` |
| Office | SLZB-06 Zigbee coordinator | SMLIGHT SLZB-06 | `smlight` | `sensor.office_slzb_06_*` |
| Living Room | Qrevo 2 Breeze + dock | Roborock a294 | `roborock` | `vacuum.living_room_qrevo_2_breeze`, map `image.living_room_qrevo_2_breeze_ng_29` |
| Living Room | Living Room Switch | Aqara Smart wall switch Z1 Pro (Z2M: quadruple rocker; 3 relay rockers wired) | Z2M `0x54ef441001251769` | Top **Ceiling Fan** `switch.living_room_switch_top`, Center **LED Cove** `switch.living_room_switch_center`, Bottom **TV Light** `switch.living_room_switch_bottom` (relay that **powers the TV Spotlights**; off = bulbs unpowered, shown `unavailable` within ~5 min, see Z2M availability); `sensor.living_room_switch_power` / `_energy` |
| Living Room | TV Spotlight 1 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef441001163f74` | `light.tv_spotlight_1`, `switch.tv_spotlight_1_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | TV Spotlight 2 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012aee86` | `light.tv_spotlight_2`, `switch.tv_spotlight_2_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | Sofa Spotlight 1 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012aee3f` | `light.sofa_spotlight_1`, `switch.sofa_spotlight_1_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | Sofa Spotlight 2 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012ae78b` | `light.sofa_spotlight_2`, `switch.sofa_spotlight_2_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | Front Door Sensor | Aqara door and window sensor (battery, sleepy) | Z2M `0x00158d008bbf6e42` | `binary_sensor.front_door_sensor_contact` (door; on = open), `sensor.front_door_sensor_battery` / `_voltage` / `_device_temperature` |
| Living Room | Living Room Mini Switch | Aqara Wireless mini switch E1 (battery, sleepy; no press entity, MQTT trigger on `zigbee2mqtt/Living Room Mini Switch`) | Z2M `0x54ef4410013efd93` | `sensor.living_room_mini_switch_battery` / `_voltage` / `_device_temperature`; double press → all Living/Dining/Kitchen lights, Ceiling Fan and Laundry Light off |
| Living Room | TV Spotlights / Sofa Spotlights | Z2M groups (id 1: TV Spotlight 1+2, id 2: Sofa Spotlight 1+2), one Zigbee broadcast each | Z2M group | `light.tv_spotlights`, `light.sofa_spotlights`; set once to 3500 K / 50% (no default scene/automation) |
| Living Room | Sofalamp | IKEA TRADFRI bulb E26/E27, white spectrum, globe, clear, 806 lm (2202-4000 K) | Z2M `0x04cd15fffe6bf316` | `light.sofalamp`, `select.sofalamp_power_on_behavior` (**previous**), `sensor.sofalamp_color_options`, `button.sofalamp_identify`, `update.sofalamp`. Not the Sofa Spotlights |
| Dining Room | Dining Switch | Aqara Smart wall switch Z1 Pro (Z2M: quadruple rocker; 3 relay rockers wired, all `control_relay`) | Z2M `0x54ef441000be746f` | Top **Walkway** `switch.dining_switch_top`, Center **Spotlight** `switch.dining_switch_center` (relay that **powers the Dining Spotlights**, decision A: while it is off the bulbs lose power and show `unavailable` within ~5 min, via Z2M availability, #35), Bottom **Dining Table** `switch.dining_switch_bottom`; `sensor.dining_switch_power` / `_energy` |
| Dining Room | Dining Spotlight 1 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef441001261f11` | `light.dining_spotlight_1`, `switch.dining_spotlight_1_power_outage_memory` (**on**) |
| Dining Room | Dining Spotlight 2 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012624ee` | `light.dining_spotlight_2`, `switch.dining_spotlight_2_power_outage_memory` (**on**) |
| Dining Room | Dining Spotlight 3 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012b25e9` | `light.dining_spotlight_3`, `switch.dining_spotlight_3_power_outage_memory` (**on**) |
| All spotlights | Z2M availability | Per-device `availability: {timeout: 5}` on the 7 Spotlight T2s only (global availability stays off) | Z2M config | An unpowered bulb is pinged after 5 min of silence and goes `unavailable`, and so does its group. It comes back when it rejoins. Needed one Z2M restart. |
| Dining Room | Dining Spotlights | Z2M group (id 3: Dining Spotlight 1-3), one Zigbee broadcast | Z2M group | `light.dining_spotlights`; set once to 3500 K / 50%; only works while the center rocker is on |
| Kitchen | Kitchen Switch 1 | Aqara Z1 Pro (Z2M: quadruple rocker; 3 relay rockers wired) | Z2M `0x54ef4410011f846e` | Top **Cabinet LED** `switch.kitchen_switch_1_top`, Center **Walkway** `switch.kitchen_switch_1_center`, Bottom **decoupled** `switch.kitchen_switch_1_bottom` (press → Main Light; relay mirrors Main Light for the LED) |
| Kitchen | Kitchen Switch 2 | Aqara D1 with neutral, double rocker | Z2M `0x00158d008b849b39` | Left **Laundry Light** `switch.kitchen_switch_2_left` (Laundry Room light; entity renamed in HA only, #60), Right **Main Light** `switch.kitchen_switch_2_right` (the Main Light relay) |
| Kitchen | Kitchen Presence Sensor | Aqara presence sensor (mmWave) | Z2M `0x54ef4410011f6f8e` | `binary_sensor.kitchen_presence_sensor_presence` |
| Master Bedroom | Aqara Motion sensor P1 | RTCGQ14LM | Z2M `0x54ef4410013ddb88` | `binary_sensor.aqara_motion_sensor_p1_occupancy`, `_illuminance`, `_battery` |
| Master Bedroom | **Bedroom Switch** (Z2M: Smart wall switch Z1 Pro) | ZNQBKG45LM, 4-rocker | Z2M `0x54ef4410011fd575` | `switch.smart_wall_switch_z1_pro_top` = **Main light**, `_center` = **LED Cove**, `_bottom` = **Night Curtain** (a curtain on the relay: **ON = open, OFF = closed**) |
| Master Bedroom | Bedlamp | IKEA TRADFRI bulb E26/E27 white spectrum 806 lm (LED2004G8) | Z2M `0x04cd15fffe73e97e` | `light.bedlamp` (2200–4000 K) |
| Master Bedroom | TRADFRI | IKEA E1812 shortcut button | Z2M `0xb4e3f9fffe249914` | presses on MQTT `zigbee2mqtt/TRADFRI` (`action: "on"`); `sensor.tradfri_battery` |
| Bathroom | **Bathroom Switch D1** | Aqara D1 triple rocker, with neutral (QBKG26LM) | Z2M `0x54ef441000d3a1ee` | `switch.bathroom_switch_d1_left` = **LED Cove**, `_center` = **Main Light**, `_right` = **Bath mode** (decoupled; toggled by its rocker via HA; ON pauses the auto-off) |
| Bathroom | **Bathroom Motion Sensor P1** | RTCGQ14LM | Z2M `0x54ef4410013de0db` | `binary_sensor.bathroom_motion_sensor_p1_occupancy`, `_illuminance`, `_battery` |
| Laundry Room | Samsung washer / Samsung dryer | SmartThings (washer `DA_WM_TP1_21_COMMON`) | SmartThings cloud | `sensor.laundry_room_{washer,dryer}_{machine_state,job_state,progress,completion_time,power}`; shown read-only on NG Premium (#47) |
| Laundry Room | Washer / Dryer **Energy today** | Utility Meter helpers (daily, config flow, no YAML) | HA helper | `sensor.laundry_room_washer_energy_today`, `sensor.laundry_room_dryer_energy_today` (sources `sensor.laundry_room_*_energy`, kWh `total_increasing`); options in `helpers/utility_meter_laundry.yaml`; summed on NG Premium |
| Bedroom | Body Composition Scale | Xiaomi MJTZC01YM | `xiaomi_ble` | `binary_sensor.bedroom_body_composition_scale_6bd0_stabilized` |
| (none) | NG Shuttle bus arrivals | REST API | `rest` (`ha-config/rest.yaml`) | `sensor.ng_shuttle_arrivals` (stop NG), `sensor.yishun_mrt_shuttle_arrivals` (stop Yishun MRT) |
| (none) | Nasdaq QQQ quote | REST API (Yahoo Finance public chart endpoint, no key, unofficial) | `rest` (`ha-config/rest.yaml`, every 5 min) | `sensor.qqq_price` (USD; attributes `chartPreviousClose`, `regularMarketTime`, day high/low, `exchangeName`). Shown as the **Nasdaq QQQ** card in NG Premium, before the bus stops (#46) |
| Living Room | SHIELD | NVIDIA SHIELD Android TV | `cast` | `media_player.shield` |
| Living Room | HASS Bridge:21064 | HomeKit Bridge (HomeBridge) | `homekit` (bridge, port 21064) | exposes HA entities to Apple Home; no entities of its own |

Wireless buttons (E1, TRADFRI) have **no press entity** in Z2M 2.x. Their automations
use MQTT triggers on `value_json.action`.

**Renaming:** rename in **Z2M** (with "update HA entity ID") to change entity IDs and the MQTT topic. Rename in **HA** (device
`name_by_user` / entity name) for display only. "Bedroom Switch" and the rocker names are HA-only, so the entity IDs are unchanged.

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
- **Settings on battery (sleepy) devices**, e.g. the P1 detection interval: send the change **once** and press the device's button
  to wake it. Z2M queues the write. Re-sending replaces the queued write (`Request superseded` in the debug log).
- To see Z2M write errors, set `select.zigbee2mqtt_bridge_log_level` to `debug` and watch `node scripts/mqtt-listen.mjs zigbee2mqtt/bridge/logging 60`. Set it back to `info` afterwards.
- SLZB health in HA: `sensor.office_slzb_06_zigbee_type` should be `coordinator` and
  `sensor.office_slzb_06_connection_mode` should be `eth`.

## Automations

Each automation entity has an **area** (entity registry, not stored in `automations/*.yaml`), so the HA Automations page
groups and filters them by room. This table is the record of that mapping (#66).

| Area | Automations |
|---|---|
| Master Bedroom | `master_bedroom_tradfri_button_toggles_led_cove`, `master_bedroom_tradfri_double_click_toggles_bedlamp`, `master_bedroom_motion_turns_on_main_light`, `master_bedroom_no_motion_5_min_turns_off_lights`, `master_bedroom_bedroom_switch_slider_dims_bedlamp` |
| Office | `office_e1_switch_turns_on_ceiling_light`, `office_switch_lighting_scene_by_time` |
| Bathroom | `bathroom_motion_turns_on_lights`, `bathroom_no_motion_15_min_turns_off_lights`, `bathroom_right_rocker_toggles_its_light`, `bathroom_right_rocker_pauses_auto_off` |
| Kitchen | `kitchen_switch_1_bottom_toggles_main_light`, `kitchen_switch_1_bottom_status_follows_main_light`, `kitchen_presence_lights` |
| Living Room | `living_room_front_door_opens_back_home`, `living_room_mini_switch_double_press_turns_off_living_dining_kitchen_lights` (also turns off Dining and Kitchen; filed where the switch is) |
| Laundry room | `laundry_room_washer_finished_notification`, `laundry_room_dryer_finished_notification` |

(Entity IDs, i.e. `automation.<name>`.) Set with `config/entity_registry/update` (`area_id`) via `scripts/ha-ws.mjs`.

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
| double-click (`action: "off"`, firmware ≥ 604241926) | `light.toggle` → `light.bedlamp` (automation `master_bedroom_tradfri_double_click`, `automations/master_bedroom_tradfri_double_click.yaml`) |

- Trigger: MQTT topic `zigbee2mqtt/TRADFRI`, `value_json.action == "on"` (IKEA E1812, `0xb4e3f9fffe249914`).
  Payload confirmed with `node scripts/mqtt-listen.mjs zigbee2mqtt/TRADFRI 60`.
- Long press (`brightness_move_up` / `brightness_stop`) isn't used.

### Master Bedroom: motion turns on Main light

`automation.master_bedroom_motion_turns_on_main_light` (id `master_bedroom_motion_main_light_on`),
exported to `automations/master_bedroom_motion_main_light_on.yaml`.

- Trigger: `binary_sensor.aqara_motion_sensor_p1_occupancy` `off` → `on`.
- Condition: Main light is off. Action: `switch.turn_on` → `switch.smart_wall_switch_z1_pro_top` (Main light).
- No time or light-level condition, so it fires day and night. Pairs with the auto-off below (no motion 5 min → off).

### Master Bedroom: Bedroom Switch slider dims Bedlamp

`automation.master_bedroom_bedroom_switch_slider_dims_bedlamp` (id `master_bedroom_slider_dims_bedlamp`),
exported to `automations/master_bedroom_slider_dims_bedlamp.yaml`.

- Trigger: MQTT `zigbee2mqtt/Smart wall switch Z1 Pro`, `action` in `slider_up` / `slider_down` (several messages stream per slide).
- `action_slide_speed` = displacement **delta** since the last message (signed; a full slider ≈ 0–100). Each message runs
  `light.turn_on` `light.bedlamp` with `brightness_step_pct` = that delta (0.2 s transition), mode `queued` (max 30).
- Up from off turns it on; down to 0 turns it off. The relays are not affected by sliding.

### Master Bedroom: no motion 5 min turns off lights

`automation.master_bedroom_no_motion_5_min_turns_off_lights` (id `master_bedroom_no_motion_lights_off`),
exported to `automations/master_bedroom_no_motion_lights_off.yaml`.

- Turns off **Main light** + **LED Cove** (`switch.smart_wall_switch_z1_pro_top` / `_center`). **Night Curtain is left alone.**
- Triggers: `binary_sensor.aqara_motion_sensor_p1_occupancy` → `off` for 5 min, **or** either light → `on` for 5 min
  (covers lights turned on while the room is already empty, e.g. via the TRADFRI button).
- Conditions: occupancy has been `off` for ≥ 5 min, and at least one of the two lights is on.
- Real delay ≈ 5 min + the P1's clear time. The P1 reports `off` once its detection interval (now **5 s**) has passed.

### Office: switch lighting scene by time

`automation.office_switch_lighting_scene_by_time` (id `office_scene_schedule`), exported to `automations/office_scene_schedule.yaml`.

- Triggers: **09:00**, **18:00**, and the ceiling light turning **on**.
- Condition: the ceiling light is **on**, so it never turns the light on by itself (e.g. holidays or an empty office).
- Action: weekdays 09:00–18:00 → `scene.office_hour` (6000 K); otherwise → `scene.after_office` (4000 K). Both turn the ring off.

### Bathroom: motion lighting

| Automation | Trigger | Action |
|---|---|---|
| `automation.bathroom_motion_turns_on_lights` (`bathroom_motion_lights_on`) | P1 occupancy `off` → `on`, if either light is off | LED Cove + Main Light **on** |
| `automation.bathroom_no_motion_15_min_turns_off_lights` (`bathroom_no_motion_lights_off`) | occupancy `off` 15 min **or** a light `on` 15 min; condition: occupancy off ≥ 15 min and a light on | LED Cove + Main Light + **right-rocker light** **off** |

| `automation.bathroom_right_rocker_toggles_its_light` (`bathroom_right_rocker_toggle`) | MQTT `zigbee2mqtt/Bathroom Switch D1`, `action == "single_right"` | `switch.toggle` → `switch.bathroom_switch_d1_right` (its own relay) |

| `automation.bathroom_right_rocker_pauses_auto_off` (`bathroom_right_rocker_override`) | right-rocker light `on` / `off` | **on** → disable the 15-min auto-off (manual override, e.g. showering) · **off** → re-enable it and run its check once · **on for 2 h** → turn the right light off (safety; ends the override) |

Exported to `automations/bathroom_*.yaml`. No night mode (optional on #8). The right rocker is **decoupled**, so its relay only switches
through HA (if HA or Z2M is down, the right rocker does nothing).

### Kitchen: Switch 1 bottom, Main Light status, presence lights

| Automation (id) | Trigger | Action |
|---|---|---|
| `kitchen_main_light_sync` | MQTT `zigbee2mqtt/Kitchen Switch 1`, `action == "single_bottom"` | `switch.toggle` Main Light (`switch.kitchen_switch_2_right`) |
| `kitchen_main_light_indicator` | Main Light or Switch 1 bottom changes; HA start | Copies the state to the other side only when they differ (no loop). Switch 1 bottom stays `decoupled`; its relay just drives the rocker LED |
| `kitchen_presence_lights` (mode `restart`) | `binary_sensor.kitchen_presence_sensor_presence` off→on / on→off **for 5 min** | Present: Cabinet LED, Walkway, Main Light on (all hours). Empty 5 min: Walkway + Main Light off straight away, Cabinet LED off after 10 s (#44) |

- The **Laundry Light** rocker (`switch.kitchen_switch_2_left`, Switch 2 left; it lights the Laundry Room, #60) is not touched by the kitchen automations. The Laundry Room finished automations turn it **on**, then **off** after 10 min (#47); the Living Room Mini Switch double press turns it **off** (#58).
- Verified on the devices 2026-11-17 (presence on/off, 10 s Cabinet LED delay, bottom press, rocker LED lights with the Main Light).

### Living Room: front door opens → Back Home

| Automation (id) | Trigger | Condition | Action |
|---|---|---|---|
| `living_room_front_door_back_home` (`automation.living_room_front_door_opens_back_home`, mode `single`) | `binary_sensor.front_door_sensor_contact` off→on (door opens) | TV Light rocker (`switch.living_room_switch_bottom`) is off **or** `light.tv_spotlights` is off | Dining center rocker on → 3 s → Dining Spotlights 3500 K / 50% → 3 s → TV Light rocker on → 3 s → TV Spotlights 3500 K / 50% → 2 s → Ceiling Fan (`switch.living_room_switch_top`) on |

- The TV Spotlights are powered by the Living Room **TV Light** rocker (`switch.living_room_switch_bottom`), and the Dining Spotlights by the Dining center rocker. Each rocker goes on 3 s before its bulbs, so they can boot and rejoin before being set to 3500 K / 50%. The condition includes the rocker because unpowered bulbs show `unavailable`, not `off`.
- Order when the door opens: Dining center rocker; +3 s Dining Spotlights; +3 s TV Light rocker; +3 s (bulb boot) TV Spotlights; +2 s Ceiling Fan. The automation runs these steps itself; the scene is the same end state, for manual use.
  Unpowered bulbs show `unavailable` within ~5 min (Z2M availability, #35); after the rocker turns on, the **3 s delay** gives them time to boot and rejoin.

### Living Room: Mini Switch double press turns off Living, Dining, Kitchen lights

| Automation (id) | Trigger | Action |
|---|---|---|
| `living_room_mini_switch_double_all_off` (mode `single`) | MQTT `zigbee2mqtt/Living Room Mini Switch`, `action: double` | In sequence: **Dining** (Dining Spotlights, then center / bottom (Table) / top (Walkway) rockers) → 2 s → **Living** (TV + Sofa Spotlights, then LED Cove, TV Light, Ceiling Fan) → 2 s → **Kitchen** (Cabinet LED, Walkway, Main Light `switch.kitchen_switch_2_right`, Laundry Light `switch.kitchen_switch_2_left`) |

- Includes the **Ceiling Fan** (`switch.living_room_switch_top`) and the **Laundry Light** (`switch.kitchen_switch_2_left`). Leaves the Roborock alone. Single / long press do nothing.
- Kitchen Main Light is switched off on its real relay (Switch 2 right); `kitchen_main_light_indicator` then mirrors the decoupled Switch 1 bottom LED.
- If someone is in the kitchen, the presence automation turns the kitchen lights back on at its next detection.
- `double` confirmed with a real press on this device (2026-11-18). The staged order (Dining > 2 s > Living > 2 s > Kitchen) was verified on the device the same day.

### Laundry Room: washer / dryer finished

| Automation | Trigger | Action |
|---|---|---|
| `laundry_room_washer_finished` | `sensor.laundry_room_washer_machine_state` run → stop | Notify iPhone + iPad: "Washer finished, ready to unload."; turn on the Laundry Light (`switch.kitchen_switch_2_left`), off after 10 min |
| `laundry_room_dryer_finished` | `sensor.laundry_room_dryer_machine_state` run → stop | Notify iPhone + iPad: "Dryer finished."; turn on the Laundry Light (`switch.kitchen_switch_2_left`), off after 10 min |

- Mode `single`, one automation per machine. Both use the same rocker: if the second machine finishes within the first one's 10 min, the first turn-off ends it early (accepted, #47).
- Test notification sent to both devices on 2026-11-18. **Not yet verified:** a real cycle (`run` → `stop`, notification, rocker on/off).

## Scenes

Created with `POST /api/config/scene/config/<id>`, exported to `scenes/<id>.yaml`.
Night Curtain = relay **ON = open, OFF = closed**.

| Scene | Main light | LED Cove | Night Curtain | Bedlamp | Office (T1 white / ring) |
|---|---|---|---|---|---|
| `scene.good_morning` | on | on | **open** (on) | on, 100% @ 4000 K | white on |
| `scene.movie` | off | on | **closed** (off) | on, 15% @ 2200 K | off / off |
| `scene.away` | off | off | *unchanged* | off | off / off |
| `scene.goodnight` | *unchanged* | *unchanged* | *unchanged* | *unchanged* | off / off (see below) |

**Goodnight** (`scene.goodnight`, reworked in #38) leaves the **Master Bedroom untouched** (no main light/cove/bedlamp change, curtain not moved) and turns **off**:
- **Living Room:** Ceiling Fan, LED Cove, TV Light rocker, TV Spotlights, Sofa Spotlights. (Sofalamp is not in Goodnight yet.)
- **Dining Room:** Spotlight rocker, Dining Spotlights, Dining Table. **Walkway is left as it is.**
- **Kitchen:** Main Light (Switch 2 right), Walkway, Cabinet LED.
- **Laundry Room:** Laundry Light (Kitchen Switch 2 left, #60).
- **Office:** Ceiling light, Ambient ring.

Notes:
- The spotlight rockers are cut too (user decision), so the bulbs lose power. The next "on" needs the rocker first; Back Home does this.
- Never included: the decoupled Kitchen bottom rocker (it mirrors the Main Light), and the Bathroom (its motion auto-off handles it).

**Office-only scenes**: ceiling light colour temperature (brightness untouched) and the **ambient ring off**.

| Scene | Ceiling light (`light.aqara_ceiling_light_t1_white`) | Ambient ring (`light.aqara_ceiling_light_t1_rgb`) |
|---|---|---|
| `scene.office_hour` | on, **6000 K** (the light reports 6024 K, its nearest step) | **off** |
| `scene.after_office` | on, **4000 K** | **off** |

**Living/Dining scene**: `scene.back_home` (**Back Home**): Ceiling Fan `switch.living_room_switch_top` on, Dining center rocker `switch.dining_switch_center` on, `light.tv_spotlights` and `light.dining_spotlights` on at **50% (128) / 3500 K** (bulbs report 3508 K). Same end state as the front-door automation, for manual use (the automation runs its own staged steps); not in NG Premium (user decision).

## Dashboard

`dashboards/home.yaml` is one responsive **sections** dashboard with built-in cards only (no HACS).

| Screen | Layout |
|---|---|
| Phone | 1 column; hourly weather; tablet header hidden |
| 10" tablet, landscape (≥1024px) | up to 4 columns; greeting/clock + daily forecast header (2 columns wide) |

| View | Sections |
|---|---|
| **Home** | tablet header (greeting, clock, weather, drybox RH) · weather (phone) · **Office** (ceiling light, ring, E1 automation, **Drybox** subsection: humidity gauge, desiccant alert >50% RH, temperature, 7-day history) · **Living Room** (Roborock controls, alerts, routines, mop settings) · Roborock map · **Master Bedroom** (Main light / LED Cove / Night Curtain toggles, Bedlamp brightness and colour temperature, power, motion, light level, TRADFRI, automation tiles, low-battery alerts) · Media (SHIELD) · Shopping list |
| **System** | Zigbee2MQTT · SLZB-06 coordinator · Roborock maintenance · Device health (batteries, temperatures) · Updates & backups |

Badges at the top: person, weather, Office light, Drybox RH, plus Bedroom motion / Roborock / SHIELD / Pairing
(shown only when active). Restart buttons ask for confirmation. Automation tiles: tap the icon to enable or disable.

Live in HA as **North Gaia**: `http://192.168.1.40/dashboard-north-gaia` (sidebar).

Push changes after editing the YAML (creates the dashboard if missing, then saves the config):

```bash
scripts/push-dashboard.sh            # dashboards/home.yaml -> /dashboard-north-gaia "North Gaia"
```

Needs `HA_TOKEN`, ruby and node ≥ 22. Edits made in the HA UI get overwritten by the next push,
so keep the YAML as the source of truth.

Wall tablet: use the HA Companion app or Fully Kiosk Browser in fullscreen, and set it as the
default dashboard on that device (Profile → Dashboard).

## NG Premium dashboard

SaaS-style dashboard app (issue #3) in `premium/` (details: `premium/README.md`). Live at
`http://192.168.1.40/dashboard-premium` (sidebar **NG Premium**), served from `/config/www/premium/` and reusing HA's own
websocket connection (no token). Deploy with `scripts/deploy-premium.sh` (needs the Samba share mounted at `/Volumes/config`).

| Area | Notes |
|---|---|
| Theme | Auto / Day / Night, saved per device. Day accent blue `#2563eb`, Night indigo `#7c7cf0` |
| Panels | top bar · scenes · KPIs · rooms (lights, curtain, Roborock + routines, drybox) · Laundry Room (washer/dryer status, progress, finish time, energy today) · bus stops · energy · security + timeline · Cmd/Ctrl+K |
| Bus card | Row under the KPIs, compact; ETAs in minutes for every bus today (`Tmr HH:MM` next day), HA polls every 10 min; `ServiceNotice` `NO_MORE_BUSES_TODAY` shows "No more buses today" + first bus; header shows Live / Timetable |
| Theme | Auto = by time (Day 07:00–18:59, Night otherwise); Day / Night lock it |
| Data gaps | no whole-home meter, solar, room climate, locks/doors/cameras, or presence tracker → designed empty states |

## Scripts

All need `HA_TOKEN` (and optionally `HA_URL`, default `http://192.168.1.40`) and Node ≥ 22.

| Script | Use |
|---|---|
| `scripts/push-dashboard.sh [file] [url_path] [title] [icon]` | YAML → JSON (ruby) → create the dashboard if missing → save config → read back |
| `node scripts/ha-ws.mjs '<json>' ...` | Raw websocket commands. `"$1.area_id"` references an earlier result. E.g. create an area and assign a device:<br>`node scripts/ha-ws.mjs '{"type":"config/area_registry/create","name":"X"}' '{"type":"config/device_registry/update","device_id":"…","area_id":"$1.area_id"}'` |
| `scripts/deploy-premium.sh` | Build `premium/`, rsync to `/Volumes/config/www/premium/`, create/update the NG Premium dashboard |
| `node scripts/ota-on-wake.mjs <z2m name> <update.entity> [s]` | Firmware update for a sleepy device: waits for its next message (press it), then calls `update.install` **once** |
| `node scripts/mqtt-listen.mjs <topic> [seconds]` | Print MQTT messages through HA (read-only). E.g. `zigbee2mqtt/TRADFRI 60` to see button payloads |

Automations are created with the REST config API (`POST /api/config/automation/config/<id>`), then exported:

```bash
curl -s "$HA_URL/api/config/automation/config/<id>" -H "Authorization: Bearer $HA_TOKEN" \
  | ruby -rjson -ryaml -e 'puts JSON.parse(STDIN.read).to_yaml' > automations/<id>.yaml
```

## Pre-commit hooks (gitleaks)

`.pre-commit-config.yaml` runs **gitleaks** (v8.30.1, config `.gitleaks.toml`: default rules + a `home-assistant-token` rule) and
basic checks (YAML with HA `!include` tags allowed, JSON, end of file, trailing whitespace, large files, merge conflicts,
private keys) on every commit.

```bash
pre-commit install                                         # once per clone
SSL_CERT_FILE=/etc/ssl/cert.pem pre-commit run --all-files # first run downloads the hook envs; this Mac's uv Python needs the CA bundle
```

- History scan (2026-11-16): 108 commits, **no leaks**.
- Verified: a commit containing a fake `HA_TOKEN="eyJ…"` is **blocked** (rules `jwt` + `home-assistant-token`).

## Claude Code skills

Project skills in `.claude/skills/` (loaded when a Claude Code session starts in this repo):

| Skill | Triggers on |
|---|---|
| `ha-zigbee-device` | rename / move a Zigbee device, create an area, name rockers |
| `ha-automation` | "when X do Y", auto-off, button/slider mappings (payload capture → create → trace → export) |
| `ha-scene` | create or change scenes (range check, create, test, export, dashboard) |
| `ng-premium-deploy` | changes to the NG Premium app, build, deploy, verify what HA serves |
| `sleepy-device-settings` | settings/OTA on battery devices (send once, wake; `ota-on-wake.mjs`; debug log) |
| `issue-workflow` | create/update issues, branch, worklog, PR without attribution |

## Workflow

- One GitHub issue per piece of work, on a branch `feature/<issue>-<slug>`, with a PR to `main` ("Closes #n").
  Example: issue #1 Master Bedroom → PR #2.
- Changes are applied to live HA first, then recorded here (exported automations, dashboard YAML, worklog entry).
- Commit messages have **no `Co-Authored-By` trailer**.
