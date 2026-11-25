# ha-lab

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.11-41BDF5?logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)
[![Zigbee2MQTT](https://img.shields.io/badge/Zigbee2MQTT-SLZB--06-FFC135?logo=zigbee&logoColor=black)](https://www.zigbee2mqtt.io/)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-MCP-D97757?logo=claude&logoColor=white)](https://claude.com/claude-code)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](premium/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](premium/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](premium/)
[![pre-commit](https://img.shields.io/badge/pre--commit-gitleaks%20%2B%20trufflehog-FAB040?logo=pre-commit&logoColor=white)](.pre-commit-config.yaml)
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
| `automations/office_e1_switch_light_on.yaml` | Office Mini Switch: single toggles the main light, double toggles the ring (#122), exported from HA |
| `automations/master_bedroom_tradfri_button.yaml` | Bedroom Mini Switch → LED Cove toggle, exported from HA |
| `automations/master_bedroom_tradfri_double_click.yaml` | Bedroom Mini Switch double-click → Bedlamp toggle (3 s fade), exported from HA |
| `automations/kitchen_*.yaml` | Kitchen: Switch 1 bottom → Main Light, Main Light status mirror, presence lights, exported from HA |
| `automations/master_bedroom_slider_dims_bedlamp.yaml` | Z1 Pro slider → Bedlamp brightness, exported from HA |
| `automations/bathroom_motion_lights_on.yaml`, `bathroom_no_motion_lights_off.yaml` | Bathroom motion on / 15-min auto-off, exported from HA |
| `automations/office_scene_schedule.yaml` | Office hour / After office by time and on light-on, exported from HA |
| `automations/living_room_front_door_back_home.yaml` | Front door opens → Back Home (powers the spotlight rockers if off, then runs `scene.back_home`), exported from HA |
| `automations/living_room_mini_switch_hold_away.yaml` | Living Room Mini Switch hold → `scene.away` (whole house off), exported from HA |
| `automations/living_room_switch_slider_toggles_sofalamp.yaml` | Living Room Switch slider → Sofalamp (tap toggles, slide dims), exported from HA |
| `automations/living_room_display_led_schedule.yaml` | Display LED on 08:30, off 09:30 every day (#101), exported from HA |
| `automations/living_room_switch_4th_rocker_movie.yaml` | Living Room Switch 4th (wireless) rocker → `scene.movie`, exported from HA |
| `ha-config/` | Copies of HA YAML managed here: `configuration.yaml` (adds `rest: !include rest.yaml`), `rest.yaml` (bus API sensors, QQQ quote) |
| `scenes/*.yaml` | Good morning / Movie / Away / Goodnight / Office hour / After office / Back Home, exported from HA |
| `zigbee2mqtt/app-config.yaml` | Z2M app `serial` config (reference copy, not exported) |
| `zigbee2mqtt/devices-availability.yaml` | Reference copy of the per-device Z2M availability (5 min) on the 10 Spotlight T2 bulbs (7 from #35, 3 Walkway from #114), with how to apply it (#35) |
| `scripts/push-dashboard.sh` | Push the dashboard YAML to HA (websocket API) |
| `scripts/start-issue-branch.sh` | Start an issue branch `feature/<n>-<slug>` from the latest `main` (refuses a dirty tree) |
| `scripts/mqtt-listen.mjs` | Watch an MQTT topic through HA (e.g. to check button payloads) |
| `scripts/ha-ws.mjs` | Send raw HA websocket commands (areas, device registry, …) |
| `helpers/` | Reference copies of helpers created via the config-flow API (not loaded by HA) |
| `premium/` | Premium SaaS-style dashboard app (issue #3), see `premium/README.md` |
| `scripts/deploy-premium.sh` | Build the premium app, copy to HA `/config/www/premium`, create the **NG Premium** dashboard |
| `.pre-commit-config.yaml`, `.gitleaks.toml` | Pre-commit hooks: gitleaks + TruffleHog secret scans + basic file checks |
| `.github/workflows/secret-scan.yml` | CI: TruffleHog secret scan on pushes to `main` and on PRs (#125) |
| `.mcp.json` | Project MCP server config (uses `HA_URL`, `HA_TOKEN`) |

## Areas & devices

| Area | Device | Model | Integration | Key entities |
|---|---|---|---|---|
| Office | **Office Light** (was Aqara Ceiling Light T1; renamed #90, name only) | Aqara Ceiling Light T1 HCXDD12LM | Z2M `0x54ef44100130d787` (topic `zigbee2mqtt/Office Light`) | `light.aqara_ceiling_light_t1_white` (main), `..._rgb` (ring). Entity IDs kept on purpose: 2 automations, 5 scenes and both dashboards use them |
| Office | **Office Mini Switch** (was Aqara E1 Switch; renamed #111, IDs follow) | Aqara Wireless mini switch E1 WXKG20LM (battery) | Z2M `0x54ef441001328ec0` | presses on MQTT `zigbee2mqtt/Office Mini Switch`; `sensor.office_mini_switch_battery` / `_voltage` / `_device_temperature` |
| Office | **Drybox Sensor** (**drybox**, not room climate; was Aqara Sensor, renamed #92) | WSDCGQ11LM | Z2M `0x00158d008bbd8791` | `sensor.drybox_sensor_humidity`, `_temperature`, `_battery`, `_pressure`, `_voltage` |
| Office | **Office Temperature Sensor** (room climate) | Aqara temperature and humidity sensor WSDCGQ11LM (battery) | Z2M `0x00158d008cd53909` | `sensor.office_temperature_sensor_temperature`, `_humidity`, `_pressure`, `_battery`, `_voltage`. NG Premium Office card badge + Indoor KPI and its 24 h temperature + humidity graph (#80, #86, #88) |
| Living Room | **SLZB-MR5U** Zigbee coordinator (since #105; radio 1 = coordinator) | SMLIGHT SLZB-MR5U, Ethernet, `192.168.1.42` | `smlight` | `sensor.living_room_slzb_mr5u_*` (`_zigbee_type` = `coordinator`, `_connection_mode` = `eth`, `_firmware_channel`). Radio 2 entities end in `_2` |
| Office | SLZB-06 (old coordinator, **off and removed from HA** since 2026-11-23, #105) | SMLIGHT SLZB-06 | (was `smlight`) | none: device, config entry and `sensor.office_slzb_06_*` entities deleted |
| Junior Bedroom | **Junior Bedroom Temperature Sensor** (room climate; added #96) | Aqara temperature and humidity sensor WSDCGQ11LM (battery) | Z2M `0x00158d008ccfb909` | `sensor.junior_bedroom_temperature_sensor_temperature`, `_humidity`, `_pressure`, `_battery`, `_voltage`. NG Premium **Junior Bedroom** card badge; counts in the Indoor KPI average and its 24 h graph (now 2 room sensors, #96). Not on North Gaia |
| Living Room | Qrevo 2 Breeze + dock | Roborock a294 | `roborock` | `vacuum.living_room_qrevo_2_breeze`, map `image.living_room_qrevo_2_breeze_ng_29` |
| Living Room | Living Room Switch | Aqara Smart wall switch Z1 Pro (Z2M: quadruple rocker; 3 relay rockers wired) | Z2M `0x54ef441001251769` | Top **Ceiling Fan** `switch.living_room_switch_top`, Center **LED Cove** `switch.living_room_switch_center`, Bottom **TV Light** `switch.living_room_switch_bottom` (relay that **powers the TV Spotlights**; off = bulbs unpowered, shown `unavailable` within ~5 min, see Z2M availability); touch **slider** → Sofalamp (tap `slider_single` toggles, `slider_up`/`slider_down` dim, #78); 4th (wireless) rocker `single_wireless` → **Movie** scene (#78); `sensor.living_room_switch_power` / `_energy` |
| Living Room | TV Spotlight 1 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef441001163f74` | `light.tv_spotlight_1`, `switch.tv_spotlight_1_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | TV Spotlight 2 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012aee86` | `light.tv_spotlight_2`, `switch.tv_spotlight_2_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | Sofa Spotlight 1 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012aee3f` | `light.sofa_spotlight_1`, `switch.sofa_spotlight_1_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | Sofa Spotlight 2 | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410012ae78b` | `light.sofa_spotlight_2`, `switch.sofa_spotlight_2_power_outage_memory` (**on**: restores the last state after a power cut) |
| Living Room | Front Door Sensor | Aqara door and window sensor (battery, sleepy) | Z2M `0x00158d008bbf6e42` | `binary_sensor.front_door_sensor_contact` (door; on = open), `sensor.front_door_sensor_battery` / `_voltage` / `_device_temperature` |
| Living Room | Living Room Mini Switch | Aqara Wireless mini switch E1 (battery, sleepy; no press entity, MQTT trigger on `zigbee2mqtt/Living Room Mini Switch`) | Z2M `0x54ef4410013efd93` | `sensor.living_room_mini_switch_battery` / `_voltage` / `_device_temperature`; **hold → Away scene** (#76); single and double press do nothing (double-press all-off removed in #76) |
| Living Room | TV Spotlights / Sofa Spotlights | Z2M groups (id 1: TV Spotlight 1+2, id 2: Sofa Spotlight 1+2), one Zigbee broadcast each | Z2M group | `light.tv_spotlights`, `light.sofa_spotlights`; set once to 3500 K / 50% (no default scene/automation) |
| Living Room | Walkway Spotlight 1 (#114) | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef4410011a97df` | `light.walkway_spotlight_1`, `switch.walkway_spotlight_1_power_outage_memory` (**on**), Z2M availability timeout 5 min (set via `device/options`, not read back from the live file yet); powered by the Dining Switch top rocker (Walkway), `sensor.walkway_spotlight_1_device_temperature` |
| Living Room | Walkway Spotlight 2 (#114) | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef441001289291` | `light.walkway_spotlight_2`, `switch.walkway_spotlight_2_power_outage_memory` (**on**), Z2M availability timeout 5 min (set via `device/options`, not read back from the live file yet); powered by the Dining Switch top rocker (Walkway), `sensor.walkway_spotlight_2_device_temperature` |
| Living Room | Walkway Spotlight 3 (#114) | Aqara Spotlight T2 (SSWQD03LM, 2702-6535 K) | Z2M `0x54ef44100128921c` | `light.walkway_spotlight_3`, `switch.walkway_spotlight_3_power_outage_memory` (**on**), Z2M availability timeout 5 min (set via `device/options`, not read back from the live file yet); powered by the Dining Switch top rocker (Walkway), `sensor.walkway_spotlight_3_device_temperature` |
| Living Room | Walkway Spotlights (#114) | Z2M group (id 4: Walkway Spotlight 1-3), one Zigbee broadcast | Z2M group | `light.walkway_spotlights`; group device in Living Room; NG Premium Living Room tile (toggle + brightness) |
| Living Room | Walkway Motion Sensor (#114) | Aqara High precision motion sensor RTCGQ13LM (battery, sleepy) | Z2M `0x54ef44100136b369` | `binary_sensor.walkway_motion_sensor_occupancy`, `select.walkway_motion_sensor_motion_sensitivity`, `number.walkway_motion_sensor_detection_interval`, `sensor.walkway_motion_sensor_battery` / `_voltage` / `_device_temperature`; drives `living_room_walkway_motion_lights` |
| Living Room | Sofalamp | IKEA TRADFRI bulb E26/E27, white spectrum, globe, clear, 806 lm (2202-4000 K) | Z2M `0x04cd15fffe6bf316` | `light.sofalamp`, `select.sofalamp_power_on_behavior` (**previous**), `sensor.sofalamp_color_options`, `button.sofalamp_identify`, `update.sofalamp`. Not the Sofa Spotlights |
| Living Room | **Display LED** (was Smart Light; renamed #99, IDs follow) | Chuan Dian Intelligent drive power supply (LED driver, colour temperature) | Matter (serial `10021945800140`) | `light.living_room_display_led`, `select.living_room_display_led_power_on_behavior` (**on**), `number.living_room_display_led_on_level` / `_power_on_level` / transition times, `button.living_room_display_led_identify`, `update.living_room_display_led_firmware`. Daily schedule automation (08:30 on, 09:30 off) and NG Premium Living Room tile (#101) with 3500 / 4000 / 6000 K colour swatches (#103); reports 3508 / 4000 / 6024 K |
| Dining Room | Dining Switch | Aqara Smart wall switch Z1 Pro (Z2M: quadruple rocker; 3 relay rockers wired, all `control_relay`) | Z2M `0x54ef441000be746f` | Top **Walkway** `switch.dining_switch_top` (relay that **powers the Living Room Walkway Spotlights**, #114; left on, the automations switch the bulbs, not the rocker), Center **Spotlight** `switch.dining_switch_center` (relay that **powers the Dining Spotlights**, decision A: while it is off the bulbs lose power and show `unavailable` within ~5 min, via Z2M availability, #35), Bottom **Dining Table** `switch.dining_switch_bottom`; `sensor.dining_switch_power` / `_energy` |
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
| Master Bedroom | **Bedroom Spotlight** (#117) | Aqara Spotlight T3 (TDL01LM, 2702-6024 K, colour temperature only) | Z2M `0x54ef4410011b5686` | `light.bedroom_spotlight`, `select.bedroom_spotlight_power_on_behavior`, `number.bedroom_spotlight_min_brightness` / `_max_brightness`, `sensor.bedroom_spotlight_device_temperature`; NG Premium Master Bedroom tile (toggle + brightness) |
| Master Bedroom | **Bedroom Mini Switch** (was TRADFRI; re-paired and renamed 2026-11-24, IDs follow) | IKEA TRADFRI shortcut button E1812 (battery) | Z2M `0xb4e3f9fffe249914` | presses on MQTT `zigbee2mqtt/Bedroom Mini Switch` (`action: "on"` single, `"off"` double); `sensor.bedroom_mini_switch_battery` |
| Bathroom | **Bathroom Switch D1** | Aqara D1 triple rocker, with neutral (QBKG26LM) | Z2M `0x54ef441000d3a1ee` | `switch.bathroom_switch_d1_left` = **LED Cove**, `_center` = **Main Light**, `_right` = **Bath mode** (decoupled; toggled by its rocker via HA; ON pauses the auto-off) |
| Bathroom | **Bathroom Motion Sensor P1** | RTCGQ14LM | Z2M `0x54ef4410013de0db` | `binary_sensor.bathroom_motion_sensor_p1_occupancy`, `_illuminance`, `_battery` |
| Laundry Room | Samsung washer / Samsung dryer | SmartThings (washer `DA_WM_TP1_21_COMMON`) | SmartThings cloud | `sensor.laundry_room_{washer,dryer}_{machine_state,job_state,progress,completion_time,power}`; shown read-only on NG Premium (#47). `_power` has only ever reported **0 W** (even mid-cycle), so the card doesn't show power (#84). `_energy` is real **kWh** in **0.1 kWh steps**, updated every **15 min** (SmartThings power consumption report), display precision 1 (#84) |
| Laundry Room | Washer / Dryer **Energy today** | Utility Meter helpers (daily, config flow, no YAML) | HA helper | `sensor.laundry_room_washer_energy_today`, `sensor.laundry_room_dryer_energy_today` (sources `sensor.laundry_room_*_energy`, kWh `total_increasing`); options in `helpers/utility_meter_laundry.yaml`; display precision 1 (entity registry, #84); summed on NG Premium to 1 decimal, with the cost at the `TARIFF_SGD_PER_KWH` tariff (SGD 0.30/kWh) under it |
| Bedroom | Body Composition Scale | Xiaomi MJTZC01YM | `xiaomi_ble` | `binary_sensor.bedroom_body_composition_scale_6bd0_stabilized` |
| (none) | NG Shuttle bus arrivals | REST API | `rest` (`ha-config/rest.yaml`) | `sensor.ng_shuttle_arrivals` (stop NG), `sensor.yishun_mrt_shuttle_arrivals` (stop Yishun MRT) |
| (none) | Nasdaq QQQ quote | REST API (Yahoo Finance public chart endpoint, no key, unofficial) | `rest` (`ha-config/rest.yaml`, every 5 min) | `sensor.qqq_price` (USD; attributes `chartPreviousClose`, `regularMarketTime`, day high/low, `exchangeName`). Shown as the **Nasdaq QQQ** card in NG Premium, before the bus stops (#46) |
| Living Room | SHIELD | NVIDIA SHIELD Android TV | `cast` | `media_player.shield` |
| Living Room | HASS Bridge:21064 | HomeKit Bridge (HomeBridge) | `homekit` (bridge, port 21064) | exposes HA entities to Apple Home; no entities of its own |

Wireless buttons (E1, IKEA E1812) have **no press entity** in Z2M 2.x. Their automations
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

Status (2026-11-23): **working**. Mosquitto + MQTT integration loaded, Z2M 2.14.3 running on the **SLZB-MR5U** at 192.168.1.42 (`ember`).
Until 2026-11-23 the coordinator was the Office SLZB-06 at 192.168.1.41 (`zstack`); see "Coordinator move" below and WORKLOG step 56 (#105).
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

### Coordinator: SMLIGHT SLZB-MR5U (network)

Living Room, Ethernet, `192.168.1.42`. Silicon Labs radio running **EmberZNet 7.4.2**, so the Z2M adapter is **`ember`**.
It has two radios: radio 1 is the Zigbee coordinator (`sensor.living_room_slzb_mr5u_zigbee_type`); radio 2 entities end in `_2`.
Firmware channel reads `dev` (consider `release`, #105).

Prep on the SLZB web UI (`http://192.168.1.42`):

1. Give it a **DHCP reservation / static IP**. Z2M connects by IP.
2. Use **Ethernet** (PoE or USB power + LAN), which is more stable than Wi-Fi.
3. **Mode → Zigbee coordinator**, connection type **LAN / Ethernet**.
4. Update **Zigbee firmware** to the latest *coordinator* build (Settings → Firmware update).
   Don't use router firmware.

Z2M app config (`serial` section):

```yaml
serial:
  port: tcp://192.168.1.42:6638
  adapter: ember
  baudrate: 115200
```

**Coordinator move (2026-11-23, #105).** The previous coordinator was the Office SLZB-06 (TI CC2652P, `zstack`, `.41`).
Z2M 2.14.3 can't restore a `zstack` `coordinator_backup.json` onto `ember` (`Current backup file is not for EmberZNet stack`),
so it formed a new network with the same channel/PAN/key and every device had to rejoin. While the old routers still expected the
old coordinator, unicasts failed (`ROUTE_ERROR_ADDRESS_CONFLICT`, `Delivery failed`). Most routers moved over once pairing was open;
others needed a factory reset. Groups and per-device settings (power-outage memory, decoupled rockers) had to be re-applied.
The old zstack backup is kept as `/config/zigbee2mqtt/coordinator_backup-bak.json`.
**Never run two coordinators with the same network settings at once.**

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
- Check the socket from the Mac: `nc -z 192.168.1.42 6638`
- **Settings on battery (sleepy) devices**, e.g. the P1 detection interval: send the change **once** and press the device's button
  to wake it. Z2M queues the write. Re-sending replaces the queued write (`Request superseded` in the debug log).
- To see Z2M write errors, set `select.zigbee2mqtt_bridge_log_level` to `debug` and watch `node scripts/mqtt-listen.mjs zigbee2mqtt/bridge/logging 60`. Set it back to `info` afterwards.
- SLZB health in HA: `sensor.living_room_slzb_mr5u_zigbee_type` should be `coordinator` and
  `sensor.living_room_slzb_mr5u_connection_mode` should be `eth`.

## Automations

Each automation entity has an **area** (entity registry, not stored in `automations/*.yaml`), so the HA Automations page
groups and filters them by room. This table is the record of that mapping (#66).

| Area | Automations |
|---|---|
| Master Bedroom | `master_bedroom_tradfri_button_toggles_led_cove`, `master_bedroom_tradfri_double_click_toggles_bedlamp`, `master_bedroom_bedroom_switch_slider_dims_bedlamp` |
| Office | `office_e1_switch_turns_on_ceiling_light`, `office_switch_lighting_scene_by_time` |
| Bathroom | `bathroom_motion_turns_on_lights`, `bathroom_no_motion_15_min_turns_off_lights`, `bathroom_right_rocker_toggles_its_light`, `bathroom_right_rocker_pauses_auto_off` |
| Kitchen | `kitchen_switch_1_bottom_toggles_main_light`, `kitchen_switch_1_bottom_status_follows_main_light`, `kitchen_presence_lights` |
| Living Room | `living_room_front_door_opens_back_home`, `living_room_mini_switch_hold_runs_the_away_scene` (whole house), `living_room_switch_slider_toggles_sofalamp`, `living_room_switch_4th_rocker_runs_movie`, `living_room_display_led_daily_schedule`, `living_room_walkway_motion_lights`, `living_room_walkway_lights_off_at_midnight` |
| Laundry room | `laundry_room_washer_finished_notification`, `laundry_room_dryer_finished_notification` |

(Entity IDs, i.e. `automation.<name>`.) Set with `config/entity_registry/update` (`area_id`) via `scripts/ha-ws.mjs`.

### Office: Mini Switch toggles main light and ring

`automation.office_e1_switch_turns_on_ceiling_light` (id `office_e1_switch_light_on`; entity id kept
from the original name), created via `POST /api/config/automation/config/<id>`
(the MCP tools can't create automations).

| Mini Switch press | Action |
|---|---|
| single-click | `light.toggle` → `light.aqara_ceiling_light_t1_white` (main light) |
| double-click | `light.toggle` → `light.aqara_ceiling_light_t1_rgb` (ambient ring, last colour / brightness) |

Until #122 (2026-11-25) a double press turned the main light on and a single press turned it off; the ring had no button.

- Trigger: MQTT topic `zigbee2mqtt/Office Mini Switch` (was `zigbee2mqtt/Aqara E1 Switch` until #111), matched on `value_json.action`
  (Aqara Wireless mini switch E1, WXKG20LM, `0x54ef441001328ec0`)
- Light: **Office Light** (Aqara Ceiling Light T1, `0x54ef44100130d787`): main white channel and ambient ring. Mode `queued`, alias "Office: Mini Switch toggles main light and ring"
- The topic uses the Z2M friendly name. If the device is renamed in Z2M, update the triggers.

### Master Bedroom: Mini Switch toggles LED Cove and Bedlamp

`automation.master_bedroom_tradfri_button_toggles_led_cove` (id `master_bedroom_tradfri_button`),
exported to `automations/master_bedroom_tradfri_button.yaml`.

| Bedroom Mini Switch press | Action |
|---|---|
| single press (`action: "on"`) | `switch.toggle` → `switch.smart_wall_switch_z1_pro_center` (LED Cove) |
| double-click (`action: "off"`, firmware ≥ 604241926) | `light.toggle` → `light.bedlamp` with `transition: 3` (ramps up / down over 3 s; automation `master_bedroom_tradfri_double_click`, `automations/master_bedroom_tradfri_double_click.yaml`) |

- Trigger: MQTT topic `zigbee2mqtt/Bedroom Mini Switch` (was `zigbee2mqtt/TRADFRI` until 2026-11-24), `value_json.action` (IKEA E1812, `0xb4e3f9fffe249914`).
  Payloads confirmed on the old topic (2026-11-24, step 69); watch with `node scripts/mqtt-listen.mjs 'zigbee2mqtt/Bedroom Mini Switch' 60`. The automation IDs keep `tradfri`.
- Long press (`brightness_move_up` / `brightness_stop`) isn't used.

### Master Bedroom: Bedroom Switch slider dims Bedlamp

`automation.master_bedroom_bedroom_switch_slider_dims_bedlamp` (id `master_bedroom_slider_dims_bedlamp`),
exported to `automations/master_bedroom_slider_dims_bedlamp.yaml`.

- Trigger: MQTT `zigbee2mqtt/Smart wall switch Z1 Pro`, `action` in `slider_up` / `slider_down` (several messages stream per slide).
- `action_slide_speed` = displacement **delta** since the last message (signed; a full slider ≈ 0–100). Each message runs
  `light.turn_on` `light.bedlamp` with `brightness_step_pct` = that delta (0.2 s transition), mode `queued` (max 30).
- Up from off turns it on; down to 0 turns it off. The relays are not affected by sliding.

### Living Room: Display LED daily schedule

`automation.living_room_display_led_daily_schedule` (id `living_room_display_led_schedule`),
exported to `automations/living_room_display_led_schedule.yaml` (#101).

- Time triggers every day: **08:30** (`id: on`) → `light.turn_on` `light.living_room_display_led`; **09:30** (`id: off`) → `light.turn_off`. `choose` on the trigger id, mode `single`, no conditions.
- `turn_on` without brightness/colour, so it comes on at its last level (power-on behaviour `on`, on level 255).

### Living Room: walkway motion lights and midnight off

`automation.living_room_walkway_motion_lights` (id `living_room_walkway_motion_lights`) and
`automation.living_room_walkway_lights_off_at_midnight` (id `living_room_walkway_midnight_off`),
exported to `automations/living_room_walkway_*.yaml` (#114).

- Motion lights, mode `restart`, condition: the Dining Switch top rocker (Walkway, `switch.dining_switch_top`) is **on**:
  - `binary_sensor.walkway_motion_sensor_occupancy` off→on → `light.walkway_spotlights` **80 % / 3500 K**, fading up over **2 s** (`transition: 2`).
  - on→off (the sensor's own clear) → **20 % / 3500 K**, or **off** between **00:00 and 07:00**, fading over **5 s** (`transition: 5`).
- Midnight off: every day at **00:00** → `light.walkway_spotlights` off with a **5 s** fade. The rocker stays on, so the bulbs keep power and motion turns them on again.
- Neither automation switches the rocker. With the rocker off the bulbs have no power (`unavailable` ~5 min later).
- `power_outage_memory` stays **on** (user decision): after an outage or a rocker off/on the bulbs restore their last state, so after the midnight off a rocker flip leaves them **off** until motion.

### Living Room: Living Room Switch slider toggles Sofalamp

`automation.living_room_switch_slider_toggles_sofalamp` (id `living_room_switch_slider_toggles_sofalamp`),
exported to `automations/living_room_switch_slider_toggles_sofalamp.yaml` (#78).

| Slider gesture (captured) | Action |
|---|---|
| tap (`action: "slider_single"`, one message) | `light.toggle` → `light.sofalamp` (turns on at its last level) |
| slide up / down (`slider_up` / `slider_down`, several messages per slide) | `light.turn_on` `light.sofalamp`, `brightness_step_pct` = `action_slide_speed` delta (0.2 s transition) |

- Trigger: MQTT `zigbee2mqtt/Living Room Switch` (Z1 Pro, `0x54ef441001251769`). A template condition only lets through
  `slider_single`, or `slider_up`/`slider_down` with a non-zero delta (the last message of a slide has delta 0). Mode `queued` (max 30).
- Same dimming as the Bedroom slider: up from off turns it on; down to 0 turns it off.
- The relay rockers (Ceiling Fan, LED Cove, TV Light) are not touched. No double tap was seen in the capture, so none is mapped.
- The **4th (wireless) rocker** sends `action: "single_wireless"`. It does not toggle the Sofalamp (user decision: only a tap on the slider strip toggles); it runs the Movie scene (next section).
- Tap detection on the strip is unreliable (re-test #78): taps often arrive as tiny slides (dim slightly), `slider_hold` or `single_wireless`. Sliding is the reliable way to turn it on and off.

### Living Room: Living Room Switch 4th rocker runs Movie

`automation.living_room_switch_4th_rocker_runs_movie` (id `living_room_switch_4th_rocker_movie`; entity renamed from the generated doubled
`living_room_living_room_…`), exported to `automations/living_room_switch_4th_rocker_movie.yaml` (#78).

- Trigger: MQTT `zigbee2mqtt/Living Room Switch`, `value_json.action == "single_wireless"` (captured: a single press on the 4th, wireless rocker,
  which has no relay). Action: (TV Light rocker on + 3 s if it was off), then `scene.turn_on` `scene.movie`. Mode `single`.
- Movie (Living Room only since #78, 4 entities): TV Light rocker `switch.living_room_switch_bottom` on, TV Spotlights on at 50% (brightness 128, colour temp kept), Sofa Spotlights off, Sofalamp on at 50%. At the user's request it no longer touches the Master Bedroom (Main light, LED Cove, Night Curtain, Bedlamp) or the Office (ceiling light, ring).
- A scene can't sequence, and the TV Spotlights are unpowered while the TV Light rocker is off. So, like Back Home, the automation first turns the rocker on if it is off and waits 3 s for the bulbs to boot, then runs `scene.movie`.
- The NG Premium **Movie button** runs the plain scene: if the TV Light rocker was off, the TV Spotlights may miss their 50% and need a **second press**.

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

- The **Laundry Light** rocker (`switch.kitchen_switch_2_left`, Switch 2 left; it lights the Laundry Room, #60) is not touched by the kitchen automations. The Laundry Room finished automations turn it **on**, then **off** after 10 min (#47). Away turns it **off** (#74).
- Verified on the devices 2026-11-17 (presence on/off, 10 s Cabinet LED delay, bottom press, rocker LED lights with the Main Light).

### Living Room: front door opens → Back Home

| Automation (id) | Trigger | Condition | Action |
|---|---|---|---|
| `living_room_front_door_back_home` (`automation.living_room_front_door_opens_back_home`, mode `single`) | `binary_sensor.front_door_sensor_contact` off→on (door opens) | TV Light rocker (`switch.living_room_switch_bottom`) is off **or** `light.tv_spotlights` is off | If the Dining center, TV Light or Dining top (Walkway) rocker is off: all three on → 3 s (Walkway added #114). Then `scene.turn_on` **`scene.back_home`** (#82) |

- The TV Spotlights are powered by the Living Room **TV Light** rocker (`switch.living_room_switch_bottom`), and the Dining Spotlights by the Dining center rocker. The Walkway Spotlights are powered by the Dining top (Walkway) rocker (#114). The rockers go on 3 s before the scene sets the bulbs to 3500 K / 50%, so they can boot and rejoin. The condition includes the rocker because unpowered bulbs show `unavailable`, not `off`.
- Since #82 the automation **runs the scene**, so `scene.back_home` is the single definition of Back Home. It only powers the spotlight rockers first (3 s for the bulbs to boot and rejoin; unpowered bulbs show `unavailable` within ~5 min, #35), like the Movie automation.

### Living Room: Mini Switch hold runs the Away scene

| Automation (id) | Trigger | Action |
|---|---|---|
| `living_room_mini_switch_hold_away` (mode `single`) | MQTT `zigbee2mqtt/Living Room Mini Switch`, `action: hold` | `scene.turn_on` → `scene.away`: the whole house off, Night Curtain unchanged (see Scenes) |

- `hold` was captured from the device with `mqtt-listen.mjs` (2026-11-20). One long press sends one `hold` message, with no release message.
- Hold was picked over single press, which is too easy to hit by accident. Single and double press do nothing. The old double-press all-off (`living_room_mini_switch_double_all_off`, #58) was deleted in #76; it is recoverable from git history.

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

| Scene | Main light | LED Cove | Night Curtain | Bedlamp | Office (T1 white / ring) | Living Room |
|---|---|---|---|---|---|---|
| `scene.good_morning` | on | on | **open** (on) | on, 100% @ 4000 K | white on | *unchanged* |
| `scene.movie` | *unchanged* | *unchanged* | *unchanged* | *unchanged* | *unchanged* / *unchanged* | off / on, 50%; TV Light rocker on + TV Spotlights 50% (#78) |
| `scene.away` | off | off | *unchanged* | off | off / off (whole house off, see below) | off / off |
| `scene.goodnight` | *unchanged* | *unchanged* | *unchanged* | *unchanged* | off / off (see below) | off / *unchanged* |

**Goodnight** (`scene.goodnight`, reworked in #38) leaves the **Master Bedroom untouched** (no main light/cove/bedlamp change, curtain not moved) and turns **off**:
- **Living Room:** Ceiling Fan, LED Cove, TV Light rocker, TV Spotlights, Sofa Spotlights. (Sofalamp is not in Goodnight yet.)
- **Dining Room:** Spotlight rocker, Dining Spotlights, Dining Table. **Walkway is left as it is.**
- **Kitchen:** Main Light (Switch 2 right), Walkway, Cabinet LED.
- **Laundry Room:** Laundry Light (Kitchen Switch 2 left, #60).
- **Office:** Ceiling light, Ambient ring.

Notes:
- The spotlight rockers are cut too (user decision), so the bulbs lose power. The next "on" needs the rocker first; Back Home does this.
- Never included: the decoupled Kitchen bottom rocker (it mirrors the Main Light), and the Bathroom (its motion auto-off handles it).

**Away** (`scene.away`, whole house in #74) turns **off** every light, fan and load. Only the **Night Curtain is left unchanged**:
- **Master Bedroom:** Main light, LED Cove, Bedlamp.
- **Living Room:** Ceiling Fan, LED Cove, TV Light rocker, TV Spotlights, Sofa Spotlights, Sofalamp.
- **Dining Room:** Walkway, Spotlight rocker, Dining Spotlights, Dining Table.
- **Kitchen:** Main Light (Switch 2 right), Walkway, Cabinet LED.
- **Laundry Room:** Laundry Light (Kitchen Switch 2 left).
- **Bathroom:** LED Cove, Main Light (D1 left/center).
- **Office:** Ceiling light, Ambient ring.

Not included: the decoupled Kitchen bottom rocker (it mirrors the Main Light), Bath mode (`switch.bathroom_switch_d1_right`, a mode flag, not a load),
the unnamed Spotlight T3 `light.0x54ef4410011b5686` (not set up yet), the SHIELD, and config switches (lock relays, night LED, power-outage memory).

**Office-only scenes**: ceiling light colour temperature (brightness untouched) and the **ambient ring off**.

| Scene | Ceiling light (`light.aqara_ceiling_light_t1_white`) | Ambient ring (`light.aqara_ceiling_light_t1_rgb`) |
|---|---|---|
| `scene.office_hour` | on, **6000 K** (the light reports 6024 K, its nearest step) | **off** |
| `scene.after_office` | on, **4000 K** | **off** |

**Living/Dining scene**: `scene.back_home` (**Back Home**): Ceiling Fan `switch.living_room_switch_top` on, **Dining Walkway `switch.dining_switch_top` on** (#82), Dining center rocker `switch.dining_switch_center` on, TV Light rocker `switch.living_room_switch_bottom` on, `light.tv_spotlights` and `light.dining_spotlights` on at **50% (128) / 3500 K** (bulbs report 3508 K). Run by the front-door automation (after it powers the rockers) and by the Back Home tile on North Gaia. Not in NG Premium (user decision).

## Dashboard

`dashboards/home.yaml` is one responsive **sections** dashboard with built-in cards only (no HACS).

| Screen | Layout |
|---|---|
| Phone | 1 column; hourly weather; tablet header hidden |
| 10" tablet, landscape (≥1024px) | up to 4 columns; greeting/clock + daily forecast header (2 columns wide) |

| View | Sections |
|---|---|
| **Home** | tablet header (greeting, clock, weather, drybox RH) · weather (phone) · **Office** (ceiling light, ring, E1 automation, **Drybox** subsection: humidity gauge, desiccant alert >50% RH, temperature, 7-day history) · **Living Room** (Roborock controls, alerts, routines, mop settings) · Roborock map · **Master Bedroom** (Main light / LED Cove / Night Curtain toggles, Bedlamp brightness and colour temperature, power, motion, light level, Mini Switch, automation tiles, low-battery alerts) · Media (SHIELD) · Shopping list |
| **System** | Zigbee2MQTT · SLZB-MR5U coordinator · Roborock maintenance · Device health (batteries, temperatures) · Updates & backups |

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
| `node scripts/mqtt-listen.mjs <topic> [seconds]` | Print MQTT messages through HA (read-only). E.g. `'zigbee2mqtt/Bedroom Mini Switch' 60` to see button payloads |

Automations are created with the REST config API (`POST /api/config/automation/config/<id>`), then exported:

```bash
curl -s "$HA_URL/api/config/automation/config/<id>" -H "Authorization: Bearer $HA_TOKEN" \
  | ruby -rjson -ryaml -e 'puts JSON.parse(STDIN.read).to_yaml' > automations/<id>.yaml
```

## Secret scanning (gitleaks + TruffleHog)

`.pre-commit-config.yaml` runs **gitleaks** (v8.30.1, config `.gitleaks.toml`: default rules + a `home-assistant-token` rule),
**TruffleHog** (local binary, `brew install trufflehog`; staged changes only, fails on *verified* secrets so commits work offline) and
basic checks (YAML with HA `!include` tags allowed, JSON, end of file, trailing whitespace, large files, merge conflicts,
private keys) on every commit.

```bash
pre-commit install                                         # once per clone
SSL_CERT_FILE=/etc/ssl/cert.pem pre-commit run --all-files # first run downloads the hook envs; this Mac's uv Python needs the CA bundle
pre-commit run trufflehog-full --hook-stage manual          # TruffleHog over the whole git history (verified + unknown)
```

`--all-files` doesn't widen the TruffleHog hook: it always scans only the staged diff. Use `trufflehog-full` for a full scan.

- History scan (2026-11-16): 108 commits, **no leaks**.
- TruffleHog 3.100.0 (2026-11-25, #125): full git history (165 commits, 1004 chunks) and the working tree incl. git-ignored files
  (`.env*`, `.claude/settings.local.json`; `node_modules`, `premium/dist` excluded), `--no-verification`: **0 findings**.
- Verified: a staged fake GitHub token is **caught** by `trufflehog git file://. --since-commit HEAD` (exit 183).
- CI: `.github/workflows/secret-scan.yml` runs TruffleHog v3.100.0 (`--results=verified,unknown`): pushed commits on `main`, a PR's commits,
  and the **whole history** weekly (Mondays 03:17 UTC) and by hand (`workflow_dispatch`). Actions pinned to commit SHAs, image pinned with
  `version`, checkout with `persist-credentials: false`. It contacts the detectors' providers to check whether a match is live.
  False positive: add `trufflehog:ignore` on that line.
- After a history rewrite (force-push to `main`) the push run can't resolve the old commit and fails: run the workflow by hand for a full scan.
- The repo is **public**: rotate any secret that is found first, then remove it from history (ask before rewriting history).
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
