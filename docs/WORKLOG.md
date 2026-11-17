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

### 14. TRADFRI double-click toggles Bedlamp (#5)

- TRADFRI firmware OTA finished: 587290161 → **604241926** ("Enables double-clicks"), via `scripts/ota-on-wake.mjs`.
- Captured with `mqtt-listen.mjs`: **double-click publishes `action: "off"`**, single press still `"on"`.
- New automation `master_bedroom_tradfri_double_click` (MQTT trigger `off` → `light.toggle` `light.bedlamp`), exported.
- **Verified on the device**: 4 double-click traces toggled the Bedlamp, single presses only fired the LED Cove automation (separate traces, no cross-trigger).

### 15. Bus card ETA fix + theme Auto by time (#13)

- Root cause: after the last bus the API returns **tomorrow's timetable**, shown as minutes (~519 min). The API's `ServiceNotice`
  (`NO_MORE_BUSES_TODAY`, `Message`, `NextArrival`) wasn't kept by HA.
- `rest.yaml`: `ServiceNotice` added to `json_attributes` (both stops), `rest.reload`, verified live. Backup `rest.yaml.bak-20261116-notice` on HA.
- Card: notice → "No more buses today · First bus Tmr 06:30"; ETA = minutes ≤ 60, then clock time, `Tmr HH:MM` next day;
  header "Updated HH:MM" (was `last_updated`, only changes with the next-bus time) → **Live / Timetable** from `Monitored`.
- Theme **Auto** now follows the clock (Day 07:00–18:59, Night otherwise, re-checked every minute) instead of the device dark-mode setting.
- Deployed. **Not yet verified** on the tablet/phone, or with live ETAs during service hours.

### 16. Issue skill: always branch from the latest main (#15)

- `issue-workflow` skill and `CLAUDE.md`: before a new issue branch, check the tree is clean, `git fetch`, `git pull --ff-only` on `main`,
  confirm `main` = `origin/main`, then branch. If `main` moves while a branch is open, merge `origin/main` in (no force-push) before the PR.
- Why: PR #12 conflicted twice after #11 and #14 merged.

### 17. Living Room Switch (#17)

- Z1 Pro `0x54ef441001251769` renamed in Z2M to **Living Room Switch** (`homeassistant_rename: true`), area Living Room. 0 old entities left.
- Rockers: Top **Ceiling Fan** (`mdi:ceiling-fan`), Center **LED Cove**, Bottom **TV Light**. All `control_relay`.
- **Verified**: each rocker switched off/on (TV Light on/off) from HA and restored (logbook 13:50).
- North Gaia: 3 tiles in Living Room. NG Premium: Living Room controls + power/energy sensors added (deployed).

### 18. Kitchen: switches, presence sensor, automations (#19)

- Z2M renames: **Kitchen Switch 1** (Z1 Pro), **Kitchen Switch 2** (D1), **Kitchen Presence Sensor**; area Kitchen; 0 old IDs left.
- Rockers: Switch 1 Cabinet LED / Walkway / bottom **decoupled**; Switch 2 **Left = Washing Machine, Right = Main Light** (user corrected an initial Left/Right swap).
- Automations: `kitchen_main_light_sync` (`single_bottom` → toggle Main Light), `kitchen_main_light_indicator` (two-way status mirror so the
  decoupled rocker's LED follows the Main Light), `kitchen_presence_lights` (on at all hours; off: Walkway + Main Light now, Cabinet LED +10 s).
- ⚠️ Before the Left/Right correction, testing switched the Washing Machine socket on/off 6 times (14:26–14:28); it ended off as before, 0 W.
- **Verified on the devices**: presence on/off, 10 s Cabinet LED delay, bottom press toggles Main Light, the rocker LED lights with the Main Light (user).
  **Not yet verified**: Switch 2 Right pressed by hand → Switch 1 LED follows.
- Dashboards: North Gaia Kitchen section; NG Premium Kitchen room (presence, 4 controls) + both switches in power/energy. Deployed.

### 19. NG Premium: room order, bus row, 10-min bus polling (#21, part 1)

- Room cards in the user's order: Living Room → Office → Bathroom → Kitchen → Master Bedroom (Dining requested, but no Dining area/devices yet).
- Bus cards moved below the KPI row (2 side by side, stacked < 600 px) and made compact (one line per service, compact "No more buses today").
- ETA tiles: all same-day buses in minutes (bus 3 no longer switches to clock time); "Tmr HH:MM" only for tomorrow.
- `rest.yaml`: `scan_interval` 60 → **600 s** for both stops, `rest.reload`, backup `rest.yaml.bak-20261117-interval`. The card still recounts every 15 s.
- Deployed. **Not yet verified** on the tablet/phone. The visual refresh itself (#21) is still to do.

### 20. Living Room: TV and Sofa Spotlights (#23)

- Renamed 4x Aqara Spotlight T2 in Z2M (`homeassistant_rename`): TV Spotlight 1/2, Sofa Spotlight 1/2; devices in **Living Room**. No `0x...` entity IDs left.
- `switch.*_spotlight_*_power_outage_memory` = **on** for all four (read back on).
- Z2M groups **TV Spotlights** (id 1) and **Sofa Spotlights** (id 2) -> `light.tv_spotlights`, `light.sofa_spotlights` (group devices in Living Room).
- Both groups set once to 3500 K / 50%: read back on, brightness 128, 3508 K on groups and all four bulbs. No default scene/automation (decision).
- Lovelace Living Room: two light tiles (brightness + colour temp), pushed. NG Premium: two light controls (new `spot` icon = Lucide LampWallDown), built and deployed.
- **Verified:** HA states/attributes, Z2M group membership, deployed bundle contains the new entities. **Not yet verified:** physically in sync / correct white, dashboards on the tablet, behaviour after a real power cut.

### 21. Dining Room: Dining Switch and Dining Spotlights (#25)

- New area **Dining Room** (`dining_room`). Renamed in Z2M (`homeassistant_rename`): Dining Switch (Z1 Pro), Dining Spotlight 1/2/3 (Spotlight T2); all in Dining Room. No `0x...` entity IDs left.
- Rocker names (IDs unchanged): top **Walkway**, center **Spotlight**, bottom **Dining Table**. All three stay `control_relay` (decision A: the center relay powers the bulbs, so `light.dining_spotlights` is unavailable while it is off; memory restores the last state when powered).
- `switch.dining_spotlight_*_power_outage_memory` = **on** (read back on).
- Z2M group **Dining Spotlights** (id 3) -> `light.dining_spotlights`, group device in Dining Room. Set once to 3500 K / 50%: read back on, brightness 128, 3508 K on the group and all three bulbs.
- Lovelace: new Dining Room section after Living Room (3 rocker tiles + group tile with brightness/colour temp), pushed. NG Premium: Dining Room card after Living Room (new `dining` room icon = Lucide UtensilsCrossed), Dining Switch power/energy in the KPIs; built and deployed.
- **Verified:** HA states/attributes, Z2M group responses ok, operation modes, deployed bundle contains the new entities. **Not yet verified:** bulbs physically at 3500 K / 50%, which loads Walkway/Dining Table actually switch, dashboards on the tablet, behaviour after the center rocker is switched off and on.

### 22. Fix: TV Spotlight 2 and Sofa Spotlight 2 were swapped (#29)

- In #23 two bulbs were mislabelled: `0x54ef4410012aee86` (was "Sofa Spotlight 2") is physically a TV spotlight, `0x54ef4410012ae78b` (was "TV Spotlight 2") is a sofa spotlight.
- Swapped names in Z2M (`homeassistant_rename`) via a temporary name: aee86 -> Swap Temp, ae78b -> Sofa Spotlight 2, aee86 -> TV Spotlight 2 (all responses ok).
- Swapped group membership (all responses ok): **TV Spotlights** (id 1) = 163f74 + aee86, **Sofa Spotlights** (id 2) = aee3f + ae78b (confirmed in `zigbee2mqtt/bridge/groups`).
- `light.tv_spotlight_2` -> aee86, `light.sofa_spotlight_2` -> ae78b; companions (`_power_outage_memory`, `_device_temperature`, `update.`) followed; no `swap_temp_*` or suffixed `_2_2` entities. Memory switches still **on**.
- Both groups re-applied 3500 K / 50%: all four bulbs read back on, 3508 K, 50% (aee86 was off before).
- Dashboards use the group entities only: no change, no redeploy.
- Pre-existing, not changed: disabled-by-default `sensor.0x…_linkquality` / `_power_outage_count` registry entries for all Spotlight T2s keep their `0x…` IDs.
- **Verified:** Z2M responses, group membership, HA device identifiers and states. **Not yet verified:** in the room, each group switches the correct pair.

### 23. Front door sensor opens → Back Home scene (#32)

- Renamed `0x00158d008bbf6e42` (Aqara door and window sensor, battery) in Z2M to **Front Door Sensor** (`homeassistant_rename`, sent once; applied immediately): `binary_sensor.front_door_sensor_contact`, `sensor.front_door_sensor_battery` / `_voltage` / `_device_temperature`, `button.front_door_sensor_identify`. Device assigned to **Living Room**. Disabled-by-default `sensor.0x00158d008bbf6e42_linkquality` / `_power_outage_count` / `_trigger_count` keep their `0x…` IDs (same as the Spotlight T2s).
- Scene **Back Home** (`scene.back_home`): Ceiling Fan on, Dining center rocker on, TV + Dining Spotlights 128 / 3500 K (`color_mode: color_temp`).
- Automation `living_room_front_door_back_home` (entity `automation.living_room_front_door_opens_back_home`, mode single): door off→on, only if TV Spotlights are off; actions rocker on → 3 s → wait for the dining group (max 10 s) → scene. Rocker first because the scene would otherwise send the bulb commands while the bulbs are still unpowered. `check_config` valid.
- Scene test (once, same order as the automation): before = fan on, center off, TV on 153 / 3508 K, dining group "on" 120 / 3508 K. After: center on, TV and all three dining bulbs on 128 / 3508 K. Restored: TV 153, dining 120, center off; read back identical to before.
- **Stale dining state:** with the center rocker off, `light.dining_spotlights` and all three bulbs still read `on`. Z2M availability isn't marking unpowered bulbs offline, so HA never shows them unavailable. The wait_template in the automation therefore rarely waits; the 3 s delay does the work.
- Lovelace Living Room: Front Door badge + tile, Back Home scene tile (tap = `scene.turn_on`), automation tile; pushed. NG Premium: Front Door in `DOORS`, sensor + automation in the timeline (no scene button, user decision); built and deployed.
- **Verified:** rename + entity IDs, area, scene applies (rocker first) and state restored, automation config read back, dashboards pushed/deployed. **Not yet verified:** sensor contact (unknown until the door is opened once), the automation on a real door open, bulbs physically at 3500 K / 50%.

- **Fix after the first real door test (2026-11-17 21:35):** the automation ran to the end, but the TV Spotlights stayed dark. The **TV Light rocker** (`switch.living_room_switch_bottom`) had been switched off 2 s earlier, and it powers the TV Spotlights, so the group command reached unpowered bulbs (HA still showed them `on`).
  - The automation now switches on **both** relay rockers (TV Light + Dining center), waits 3 s, then runs the scene.
  - The condition is now "TV Light rocker off **or** TV Spotlights off", because the group state goes stale while the rocker is off.
  - The scene also includes the TV Light rocker.
  - Not yet verified with a real door open.

## Open items

**Front door / Back Home (#32)**
- [ ] Open and close the front door once so the sensor reports (entities read `unknown` until then).
- [ ] Test the real flow: TV Spotlights off, open the door → fan, TV + Dining Spotlights on at 3500 K / 50%.
- [ ] Optional: enable Z2M availability so unpowered dining bulbs show unavailable instead of stale `on`.

**Dining Room (#25)**
- [ ] Check the 3 bulbs physically and the Dining tiles/card on both dashboards.
- [ ] Toggle the center rocker off/on once and confirm the bulbs return at their last state.
- [ ] Decide on automations for Walkway / Dining Table (e.g. presence), if any.

**Living Room spotlights (#23)**
- [ ] (#29) In the room: TV Spotlights and Sofa Spotlights each switch the correct pair after the swap.
- [ ] Check the 4 bulbs physically (3500 K, 50%, groups switch together) and the tiles on both dashboards.
- [ ] Optional: power-cycle to confirm power_outage_memory.

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
- [x] TRADFRI firmware update (v587290161 → v604241926, adds double-click). Done 2026-11-16.

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
