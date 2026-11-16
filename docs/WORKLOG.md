# ha-lab work log

What was done to the Home Assistant instance (http://192.168.1.40) from Claude Code, in order.
How-to and reference details live in the [README](../README.md).

## Summary

| Area | State |
|---|---|
| Claude ↔ HA | MCP Server integration, `/api/mcp`, token in `HA_TOKEN` |
| MQTT | Mosquitto broker app + MQTT integration: **loaded** |
| Zigbee | Zigbee2MQTT 2.14.3 app: **running**; SMLIGHT SLZB-06 coordinator (192.168.1.41, Ethernet, `zstack`) |
| Areas | Office, Living Room, Master Bedroom, **Bathroom** (new), Bedroom, Kitchen (empty) |
| Zigbee devices | **Office:** E1 switch, Ceiling Light T1, drybox sensor · **Master Bedroom:** Motion sensor P1, Bedroom Switch (Z1 Pro: Main light / LED Cove / Night Curtain), TRADFRI button, Bedlamp (IKEA bulb) |
| Other devices | Roborock Qrevo 2 Breeze + dock (Living Room), SHIELD (no area), body composition scale (Bedroom) |
| Scenes | 4: Good morning, Movie, Away, Goodnight (`scenes/`) |
| REST sensors | NG Shuttle bus arrivals for NG + Yishun MRT (`ha-config/rest.yaml`) |
| Automations | 4: E1 single = office light off / double = on; TRADFRI press = toggle LED Cove; motion = Main light on; no motion 5 min = Main light + LED Cove off (Master Bedroom) |
| Dashboards | **North Gaia** `/dashboard-north-gaia` (Lovelace, `dashboards/home.yaml`) · **NG Premium** `/dashboard-premium` (app in `premium/`) |
| Repo / tracking | github.com/melvinlee/ha-lab. Issue #1 → PR #2 `feature/1-master-bedroom` (open). Issue #3 → `feature/3-premium-dashboard` (stacked on #2, no PR yet) |

---

## 2026-11-15

### 1. MCP connection and tool inventory
- Connected Claude Code to HA's built-in **Model Context Protocol Server** (see README → Setup).
- Tools available: turn on/off, live context, `call_action`, `search_actions`,
  `render_template`, entity search, media player controls, config entries
  (list/reload/search integrations), history, system log, Supervisor logs, system health,
  to-do lists, broadcast, timers, date/time.
- **Limits:** the tools can't install apps, run integration config flows, or create
  automations/dashboards. Only *exposed* entities show in `GetLiveContext`.
  `render_template` can read all entities.
- At the start only 2 entities were exposed: `media_player.shield`, `todo.shopping_list`.

### 2. Log review (no errors, warnings only)
| Finding | Assessment |
|---|---|
| 13× invalid-auth from the Mac (192.168.1.150) on `/api/mcp`, `/mcp_server/sse`, `/api/` (21:30–21:38) | Our own MCP/curl setup attempts before the token was right. If `ip_ban_enabled` is set, check `ip_bans.yaml` when locked out. |
| Custom integration `xiaomi_home` not tested by HA | Standard notice for custom integrations. Harmless. |
| Supervisor: can't connect to PulseAudio | Audio plugin not responding. Only matters for local audio. Fix: `ha audio restart`. |
| HA Core restarted ~21:17 and ~21:21 | Seen in startup output. |

### 3. Zigbee via MQTT
- Checked state: no MQTT, no ZHA, no Mosquitto app (`hassio.addon_start core_mosquitto` →
  "App is not installed"). Note that this HA version calls add-ons **Apps**.
- Documented the setup steps (README → Zigbee via MQTT). The user installed in the UI:
  1. **Mosquitto broker** app → MQTT integration (config entry `mqtt`: loaded)
  2. **SMLIGHT** integration for the SLZB-06 (config entry `smlight`: loaded)
  3. **Zigbee2MQTT** app (`45df7312_zigbee2mqtt`, image 2.14.3-1, installed 22:09)
- Coordinator identified: **SLZB-06**, TI CC2652P → `adapter: zstack`,
  `port: tcp://192.168.1.41:6638`. (SLZB-06U was briefly considered. It's the same radio.)

### 4. Zigbee2MQTT crash loop (diagnosed)
- Supervisor logs: Z2M **exited with code 1** at 22:35, 22:37, 22:41 and the watchdog restarted it each time.
- Checks:
  - SLZB-06 via SMLIGHT entities: Ethernet up, `zigbee_type = coordinator`,
    `connection_mode = eth`, core v3.3.1 / zigbee 20240710, no updates pending
  - TCP `192.168.1.41:6638` reachable from the Mac (`nc -z`): **open**
- Result: stable since the manual restart at **22:43:47**. The bridge entities are online
  (`binary_sensor.zigbee2mqtt_bridge_connection_state = on`).
- Likely cause: an incomplete config while it was being edited. **Not confirmed**, because the Z2M
  app's own log isn't reachable through MCP (only the exit code is).

### 5. Devices paired (by user, via Z2M)
| Device | Model | IEEE | Area |
|---|---|---|---|
| Aqara E1 Switch | Wireless mini switch E1 (WXKG20LM) | `0x54ef441001328ec0` | Office |
| Aqara Ceiling Light T1 | Ceiling light T1 | `0x54ef44100130d787` | Office |
| Aqara Sensor | Temperature & humidity sensor (WSDCGQ11LM), **inside the drybox** (not room climate) | n/a | Office |
| Aqara Motion sensor P1 | Motion sensor P1 (RTCGQ14LM) | `0x54ef4410013ddb88` | Master Bedroom |
| Smart wall switch Z1 Pro (HA name **Bedroom Switch**) | Smart wall switch Z1 Pro, quadruple rocker (ZNQBKG45LM) | `0x54ef4410011fd575` | Master Bedroom |
| TRADFRI | IKEA TRADFRI shortcut button (E1812) | `0xb4e3f9fffe249914` | Master Bedroom |
| Bedlamp | IKEA TRADFRI bulb E26/E27, white spectrum, 806 lm (LED2004G8) | `0x04cd15fffe73e97e` | Master Bedroom |

The T1 has two light entities: `light.aqara_ceiling_light_t1_white` (main) and `..._rgb` (ambient ring).

### 6. Automation: E1 switch → ceiling light
Created through the HA REST config API (`POST /api/config/automation/config/office_e1_switch_light_on`),
because MCP can't create automations.

| Iteration | Behaviour |
|---|---|
| v1 | single press → light on. **Verified**: fired at 22:54:18 when the user pressed it |
| v2 | double press → light on |
| v3 (current) | **double → on, single → off**, one automation with trigger ids + `choose`, mode `queued` |

- Entity: `automation.office_e1_switch_turns_on_ceiling_light`. The entity id kept the v1 name;
  the alias is now "Office: E1 switch controls ceiling light".
- Trigger: MQTT topic `zigbee2mqtt/Aqara E1 Switch` (Z2M friendly name), `value_json.action`.
- v2/v3 were saved and read back from HA. Double and single presses haven't been seen firing yet.

## 2026-11-16

### 7. Lovelace dashboard
- `dashboards/home.yaml`: one **sections** dashboard, built-in cards only (no HACS).
  - Phone: 1 column, hourly weather, tablet header hidden.
  - 10" landscape tablet (≥1024px): up to 4 columns, plus a greeting/clock/weather/sunset header and daily forecast.
  - Views: **Home** (Office, Media, Shopping list) and **System** (Zigbee2MQTT, SLZB-06,
    device health, updates & backups). Restart buttons require confirmation.
- Validated: YAML parses. Both markdown templates rendered correctly against HA.
- **Not applied in HA yet.** Steps are in README → Dashboard.

### 8. Config copies saved in repo
- `automations/office_e1_switch_light_on.yaml`: exported from HA
  (`GET /api/config/automation/config/office_e1_switch_light_on`). Matches v3.
- `zigbee2mqtt/app-config.yaml`: **reference copy**. The app options aren't readable via the HA API
  (`/api/hassio/{apps,addons}/45df7312_zigbee2mqtt/info` → 401).
- `dashboards/home.yaml` was already in the repo.

### 9. Office climate sensor added to dashboard
- New device **Aqara Sensor** (WSDCGQ11LM): `sensor.aqara_sensor_{temperature,humidity,pressure,battery,voltage}`.
- Dashboard: Office heading badges (temp, humidity), 24h line graphs for temp and humidity,
  pressure tile, Office temp badge at the top, temp/RH line in the tablet header, and battery/voltage under
  System → Device health.
- E1 switch only has battery/voltage/temperature entities. Z2M 2.x creates no press entity
  unless **experimental event entities** is turned on (pending decision).

### 10. Roborock in Living Room
- Roborock integration (`roborock`) already loaded. **Qrevo 2 Breeze** (`roborock.vacuum.a294`) and its
  dock are already assigned to the **Living Room** area. Entity prefix: `living_room_qrevo_2_breeze`.
- Dashboard → Home → **Living Room**: vacuum tile with start/pause, stop, dock and locate; battery and status badges;
  alerts shown only when active (vacuum error, dock error, water shortage, dirty water box);
  progress and current room shown while cleaning; routine buttons (living room, after meals, vac then mop,
  room cleaning); mop mode/intensity selectors; map (`image.living_room_qrevo_2_breeze_ng_29`).
- Home badge: Roborock (shown when not docked).
- Dashboard → System → **Roborock maintenance**: brush, filter, sensor and strainer hours left, totals,
  do-not-disturb, child lock, dust empty mode.
- All 62 entity ids in `dashboards/home.yaml` checked against `/api/states`: none missing.
- Note: **sensor cleaning due in ~26 h** (`sensor_time_left`).

### 11. Dashboard live in HA: "North Gaia"
- Before this: HA had only the auto-generated **Overview** (no stored config) and **Map**. home.yaml wasn't in HA.
- Added `scripts/push-dashboard.sh` + `push-dashboard.mjs`: YAML → JSON (ruby) → websocket
  `lovelace/dashboards/create` (if missing) + `lovelace/config/save`, then reads it back.
- Created storage-mode dashboard **North Gaia** at `/dashboard-north-gaia` (icon `mdi:home`, in sidebar,
  not admin-only). Read back: views Home (7 sections), System (5 sections).
- Overview and Map weren't touched. The YAML stays the source of truth, and UI edits get overwritten by the next push.

### 12. Git
- `ha-lab` is now its own repo, pushed to `git@github.com:melvinlee/ha-lab.git` (branch `main`).
  Scanned for secrets first: none found (the token comes from `$HA_TOKEN`, and `.env` is gitignored).

---

## 2026-11-16 (cont.)

### 13. Office Aqara sensor is a drybox sensor
- The Aqara temp/humidity sensor measures a **drybox**, not the office. Its readings were removed from the
  Office section and the "Office" temp badge.
- New **Drybox** section on Home: humidity gauge (green ≤40%, yellow 40–50%, red >50%), alert tile
  "Replace / recharge desiccant" when RH > 50%, 24h temperature graph, 7-day humidity history,
  temp and battery badges. The top badge is now Drybox humidity, and the tablet header shows a drybox RH status line.
- Pushed to HA (North Gaia: Home has 8 sections now).
- At the time: **58% RH**, which is above the 50% alert threshold.
- Then merged into the **Office** section under a "Drybox" subheading (Home has 7 sections again). The device was
  already in the Office area in HA.

## Open items

**Repo setup (issue #10)**
- [ ] New Claude Code session: check each skill triggers on a natural request.
- [ ] Optional: gitleaks in GitHub Actions on push/PR.

**NG Premium (issue #3)**
- [ ] Visual QA on the 10" landscape tablet and a phone (Day and Night).
- [ ] Confirm the Day/Night switch changes the whole page (reported broken; selected-state visibility fixed, awaiting re-test).
- [ ] Test each scene, the Roborock routines, and the bus cards (red flash under 5 min).
- [ ] Decide whether Movie should pause the no-motion auto-off.
- [ ] PR `feature/3-premium-dashboard` → `main` after PR #2 is merged.

**Master Bedroom (issue #1 / PR #2)**
- [x] ~~Test motion → Main light on~~: fired 12:56:17. Still to check: auto-off after leaving (~5–6 min).
- [ ] Consider a darkness/night condition for motion → Main light (e.g. illuminance below X lx, or not while sleeping).
- [ ] Merge PR #2 (closes issue #1).
- [ ] Optional: TRADFRI firmware update (v587290161 → v604241926, adds double-click). Press the button to wake it before starting.

**Office**
- [ ] Drybox at ~50% RH (58% earlier): replace/recharge the desiccant. Adjust the thresholds in `dashboards/home.yaml` if your target differs.
- [ ] Test E1 **single** (off) and **double** (on) presses after the v3 change.
- [ ] Optional: turn on Z2M **experimental event entities** so wireless buttons get a press entity for the dashboard (restarts Z2M).

**General**
- [ ] **Automatic backups aren't configured.** All backup sensors read `unknown` (Settings → System → Backups).
- [ ] HA backup of `configuration.yaml` before the REST change is on HA as `configuration.yaml.bak-20261116`. Delete it once things are stable.
- [ ] Assign `media_player.shield` to an area (e.g. Living Room). Kitchen has no devices yet.
- [ ] Optional: expose more entities to Assist (Settings → Voice assistants → Expose) so voice/`GetLiveContext` can see them.
- [ ] Optional: restart the audio plugin (`ha audio restart`) if local audio is used.
