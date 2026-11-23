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
| Scenes | 7: Good morning, Movie, Away (whole house off), Goodnight, Office hour, After office, Back Home (`scenes/`) |
| REST sensors | NG Shuttle bus arrivals for NG + Yishun MRT; Nasdaq QQQ quote `sensor.qqq_price` (`ha-config/rest.yaml`) |
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
  - **Verified** by the user with a real door open: all lights on.
- **Staged lights (user request):** the automation now brings the lights on one after another instead of all at once through the scene:
  - Dining center rocker → 3 s → **Dining Spotlights** → 3 s → **TV Light rocker** → 3 s (bulb boot) → **TV Spotlights** → 2 s → **Ceiling Fan** (lights at 3500K/50%). The TV Light rocker is delayed 3 s (user request).
  - **Verified** by the user with a real door open: all lights on, in order.
  - `scene.back_home` keeps the same end state for manual use.

### 24. README badges (#36)

- Badge row under the README title, all shields.io (no new services):
  - **Stack:** Home Assistant 2026.11, Zigbee2MQTT/SLZB-06, Claude Code (MCP), React 19, Vite 8, TypeScript 7, pre-commit/gitleaks.
  - **Repo status:** last commit, open issues, open PRs.
- **Verified:** all 10 badge URLs return an SVG with the right label; the 7 stack badges include their logo.
- No CI or license badge: the repo has no GitHub Actions and no LICENSE (open questions in #36).

### 25. Goodnight scene reworked (#38)

- `scene.goodnight` was updated via the config API (same id). The scene was **not applied**: the user will try it.
- It no longer touches the Master Bedroom (main light, cove, curtain, bedlamp removed). It now turns off:
  - Living Room: Ceiling Fan, LED Cove, TV Light rocker, TV/Sofa Spotlights.
  - Dining Room: Spotlight rocker, Dining Spotlights, Dining Table (Walkway kept).
  - Kitchen: Main Light, Walkway, Cabinet LED.
  - Office: Ceiling light, Ambient ring.
- User decisions:
  - Spotlight bulbs **and** their power rockers off.
  - Fan off.
  - Bathroom left out.
  - SLZB-06 LED switches untouched.
- NG Premium hint: "All off, curtain closed" → "Living, Dining, Kitchen, Office off".
- **Verified:** the config read-back has 13 entities, all `off`. **Not yet verified:** running it in the house.

### 26. Z2M availability for the spotlights (#35)

- User decisions: **5 min** timeout, **only the 7 Spotlight T2s**, Z2M restart OK now.
- Backup: `/config/zigbee2mqtt/configuration.yaml.bak-20261117-availability`.
- Repo record: `zigbee2mqtt/devices-availability.yaml` (the 7 device entries, which match the live config).
- `zigbee2mqtt/bridge/request/device/options` with `{"availability":{"timeout":5}}` for TV Spotlight 1/2, Sofa Spotlight 1/2 and Dining Spotlight 1–3:
  - all 7 returned `ok`, `restart_required: false`, and the config file now holds `availability: timeout: 5` under each bulb;
  - but no `…/availability` topic was published until a **Z2M restart** (`hassio.addon_restart` `45df7312_zigbee2mqtt`, about 30 s without Zigbee, approved by the user). Global availability stays off.
- **Verified (23:10):**
  - `zigbee2mqtt/<bulb>/availability` is published (retained).
  - With the TV Light and Dining center rockers **off**, all TV/Dining bulbs and `light.tv_spotlights` / `light.dining_spotlights` read **`unavailable`**; they used to read a stale `on`.
  - Bridge `online`. Other devices are fine (Office light, Kitchen, front door sensor report normally).
- **Unexpected:** the **Sofa Spotlights** (both bulbs + group) also read `unavailable`. Their power isn't on a known HA rocker, so check whether they are switched off at the wall.
- **Not yet verified:**
  - turning a rocker on brings its bulbs back to available;
  - Back Home and Goodnight still behave with unavailable bulbs.


### 27. Kitchen: lights off only after 5 min empty (#44)

- `kitchen_presence_lights`: the `clear` trigger (presence on → off) now has `for: 5 min`.
  - Once the kitchen has been empty for 5 min, Main Light + Walkway go off straight away and the Cabinet LED 10 s later.
  - Presence returning within the 5 min resets the timer. The `present` trigger is unchanged.
- Updated via the config API (same id). The export matches HA.
- **Not yet verified:** leaving the kitchen for 5 min (lights stay on, then turn off in order).

### 28. Laundry Room on NG Premium (#47)

- New **Laundry Room** card in `premium/src/config.ts` (`appliances`) with a read-only `ApplianceRow` in `Rooms.tsx`.
  - Washer and dryer (SmartThings): badge Running / Paused / Idle, job state, power (W).
  - Progress meter and "Done HH:MM" (`_completion_time`) only while running or paused.
- Entity IDs checked via `render_template` (all 10 exist; both machines `stop`, 0 W). Built and deployed; HA serves `index-BtRdkwlJ.js` containing the card.
- **Energy today**: two daily Utility Meter helpers created via the config-flow API (no YAML, no restart) on
  `sensor.laundry_room_{washer,dryer}_energy` (kWh, `total_increasing`; 83.8 / 145.6 kWh lifetime). Entity IDs renamed to
  `sensor.laundry_room_{washer,dryer}_energy_today`. Reference: `helpers/utility_meter_laundry.yaml`.
  - The card shows an "Energy today" row: washer + dryer total, per machine underneath.
  - Both read `unknown` (status `collecting`) until the source next updates; the card shows that as 0 kWh. Reset at local midnight.
- **Finished notifications**: `automations/laundry_room_{washer,dryer}_finished.yaml`. When `_machine_state` goes `run` → `stop`, `notify.send_message` goes to `notify.melvin_iphone_16_pro` + `notify.melvins_ipad_air` (HA app), then `switch.turn_on` the Kitchen **Washing Machine** rocker (`switch.kitchen_switch_2_left`), and off again after 10 min. Not fired yet; `run` is assumed from SmartThings, not yet seen live.
- **Not yet verified:** visual check on the tablet; a real wash/dry cycle (running state, progress, finish time).

### 29. README follow-up (#49)

- Laundry Room automations section moved to the end of Automations (room order), with notes: shared Washing Machine rocker overlap accepted, test notification sent, real cycle not yet verified.
- NG Premium Panels row lists the Laundry Room card.
- Back Home row, notes, file map and `scene.back_home` text now match the live staged automation (OR condition; the automation no longer calls the scene).
- Docs only; nothing changed in HA.

### 30. README Areas & devices matches live HA (#53)

- Checked against live HA: Aqara Sensor IEEE added, SHIELD moved to Living Room (`cast`), HomeKit bridge row added, Z1 Pro model noted as Z2M "quadruple rocker" (3 relay rockers wired).
- Also carries the step 29 fix for #49 (Back Home file map and scene text), which missed the PR #50 merge.
- Docs only; nothing changed in HA.

### 31. NG Premium Energy card: no Solar, This month (#55)

- Removed Solar (legend, chart line, "Solar today" box, `SOLAR_SENSORS`). Boxes are now Today · Cost today · **This month** (kWh + cost at S$0.30).
- `useDailyEnergy` also returns `month`: daily statistics `change` summed since the 1st (local).
- Laundry Room washer and dryer energy (`sensor.laundry_room_{washer,dryer}_energy`) added to `ENERGY_SENSORS`; both have recorder statistics (no change yet this month). Kitchen Switch 2 only added 0.09 kWh this month, so there is no sign the washer is metered twice.
- Footnote names the metered switches and the washer/dryer (was "Bedroom Switch only").
- Verified: build passes; HA serves `index-49x8XCos.js` with "This month" and no "Solar today"; November so far from recorder month stats = 1.80 kWh.
- Not yet verified: card on the tablet/phone.

### 32. Living Room Mini Switch: double press turns off Living, Dining, Kitchen lights (#58)

- Renamed `0x54ef4410013efd93` (Aqara Wireless mini switch E1) in Z2M to **Living Room Mini Switch** (`homeassistant_rename`), area Living Room. Entities: `sensor.living_room_mini_switch_battery` / `_voltage` / `_device_temperature`.
- Automation `living_room_mini_switch_double_all_off` (MQTT `action: double`): spotlight groups off, then LED Cove, TV Light, Dining center/bottom/top, Kitchen Cabinet LED, Walkway, Main Light (Switch 2 right; mirror keeps Switch 1 bottom LED in step). Per the user, also the **Ceiling Fan** and the Kitchen **Washing Machine** rocker; Roborock untouched.
- Defaults used (open questions on #58 unanswered): name as above; fan not off; Dining Walkway off; kitchen presence re-on accepted; single/long unused.
- Verified: rename, area, no `0x54ef4410013efd93` entity IDs left; automation created and exported.
- Not yet verified: `double` payload on this device (taken from the Office E1, same model); a real double press. Not triggered manually (would switch off real lights).

- **Verified on the device 2026-11-18 23:13** (user): real double press → trace `finished`, no error; all Living/Dining/Kitchen lights, Ceiling Fan and Washing Machine rocker read `off`. (The Dining Walkway went back on 13 s later, after the run: not by this automation.)
- Per the user, now **staged**: Dining Room → 2 s → Living Room → 2 s → Kitchen (each room: bulb groups first, then rockers). **Verified 2026-11-18 23:17** (user): trace finished after 4.0 s through all 7 steps, no error; all lights off.

### 33. NG Premium: Nasdaq QQQ card (#46)

- **REST sensor** `sensor.qqq_price`: Yahoo Finance chart `meta` for QQQ (no API key), `scan_interval: 300`, `User-Agent` header. Previous close and market time are in the attributes.
- **`rest.yaml` tracking (rule from #41):**
  - The repo copy matched live before the edit.
  - Backup on the share: `rest.yaml.bak-20261118-qqq`.
  - Edited the repo copy, copied it to live (byte-identical), `check_config` valid, `rest.reload` (no restart).
- **NG Premium:**
  - New `Stock` card (`components/Stock.tsx`, `STOCK_SENSORS` in `config.ts`), first in the bus row: price, ▲/▼ change and % vs previous close (badge colour + icon + label), "As of HH:MM".
  - Bus row: 3 columns on wide screens, 2 under 900 px, 1 under 600 px.
  - Built, deployed, and HA serves the bundle containing `qqq_price`.
- **Verified:** the sensor read 654.94 USD (previous close 661.75) on setup and 659.41 USD (previous close 656.95) later the same day, and HA serves the new bundle.
- **Not yet verified:** the card on the tablet and phone. Market-closed and weekend display (it shows the last trade and its time).

### 34. Laundry Light: Kitchen Switch 2 left rocker renamed, in the Laundry Room card and Goodnight (#60)

- The Kitchen Switch 2 **left** rocker lights the **Laundry Room**; it isn't a washing machine power switch (per the user; the washer ran at 0 W on this rocker).
- **Entity:** registry `name` **Laundry Light**, icon `mdi:ceiling-light`. Entity ID stays `switch.kitchen_switch_2_left`; the Z2M device stays "Kitchen Switch 2" (no Z2M rename), so HA shows "Kitchen Switch 2 Laundry Light".
- **Automations (text only, actions unchanged):** descriptions of `laundry_room_washer_finished`, `laundry_room_dryer_finished`, `kitchen_presence_lights`, and description + alias of `living_room_mini_switch_double_all_off`; re-exported.
- **NG Premium:** the toggle moved from Kitchen to the **Laundry Room** card ("Laundry Light", ceiling icon), above the washer/dryer rows; it counts in the room's lights badge. Goodnight hint now lists Laundry. Built, deployed.
- **Goodnight:** `switch.kitchen_switch_2_left: off` added via the scene config API; exported. Not activated.
- README: Kitchen Switch 2 row, Kitchen note, Mini Switch section, Laundry automations, Goodnight list, file map.
- **Verified:** registry update succeeded, state `friendly_name` "Kitchen Switch 2 Laundry Light", icon `mdi:ceiling-light`; automation configs equal apart from text; scene config contains the entity; HA serves the bundle containing "Laundry Light".
- **Not yet verified:** the card on the tablet/phone; Goodnight run with the Laundry Light on; next washer/dryer finish turning it on.

- **Display name:** HA 2026 prefixes the device name, so HA shows "Kitchen Switch 2 Laundry Light". User chose to keep it (option 1): NG Premium shows its own label "Laundry Light", and the North Gaia tile (`dashboards/home.yaml`) is now "Laundry Light" with `mdi:ceiling-light` (pushed).
- **Real washer cycle 2026-11-19 07:34-07:49:** `laundry_room_washer_finished` fired at 07:49:51; the user got the notification; the Laundry Light came on at 07:49:52 and turned itself off ~07:59:52 (10 min).
- **Washer energy not reported:** `sensor.laundry_room_washer_energy` stayed 83.8 kWh (unchanged since 22:18 the day before) and power 0 W during and after the cycle, so Energy today stays 0. Open item: check later whether SmartThings reports it late or not at all.

### 35. NG Premium: washer and dryer animate while running (#62)

- `ApplianceRow` (`premium/src/components/Rooms.tsx`): only while `machine_state = run`, the "Running" badge's `Loader` icon rotates (1.2 s/turn, linear) and the washer/dryer icon tile gets a gentle drum wobble (±8°, 2 s ease-in-out). Paused/idle: static. `Badge` (`ui.tsx`) gained a `spin` prop.
- `styles.css`: keyframes `badge-spin`, `drum-wobble`; classes `.badge.spin`, `.row-icon.drum`; off under `prefers-reduced-motion: reduce`.
- Deployed from a temporary local worktree with #61 merged in (before #61 merged), so the live Laundry Light stayed. Served bundle checked for both.
- **Verified:** typecheck/build; served bundle contains the new classes and "Laundry Light".
- **Not yet verified:** a real wash/dry cycle on the dashboard and on the tablet.

### 36. Living Room: Sofalamp (IKEA TRADFRI bulb) set up (#64)

- Z2M `0x04cd15fffe6bf316` (IKEA TRADFRI E26/E27 white spectrum globe, 806 lm, 2202-4000 K) renamed to **Sofalamp** with `homeassistant_rename: true`: entities `light.sofalamp`, `select.sofalamp_power_on_behavior`, `sensor.sofalamp_color_options`, `button.sofalamp_identify`, `update.sofalamp`; no `0x04cd15…` IDs left.
- Device in the **Living Room** area. `power_on_behavior` set to `previous`.
- Firmware: `update.sofalamp` off, installed = latest (65554).
- NG Premium: Sofalamp light control in the Living Room card (deployed). North Gaia: Sofalamp tile with brightness + colour temperature in the Living Room section (pushed).
- **Verified:** `/get` refresh answered (on, 255, 2702 K); rename, area, power_on_behavior = previous read back from HA; build passes; served bundle contains `light.sofalamp`; North Gaia saved.
- **Not yet verified:** on/off, brightness and colour temperature on the real bulb (user test); power-cut restore with `previous`; dashboards visually.

### 37. Automations grouped by area (#66)

- Set `area_id` on all 18 `automation.*` entities with `config/entity_registry/update` (registry only; automation configs and entity IDs unchanged). Area = name prefix: Master Bedroom 5, Office 2, Bathroom 4, Kitchen 3, Living Room 2 (Mini Switch all-off filed under Living Room, where the switch is), Laundry room 2. Mapping in the README Automations section.
- `ha-automation` skill: new automations get an area right after creation.
- **Verified:** 18/18 updates returned `success: true`; `area_name()` in `render_template` returns the expected area for every automation.
- **Not yet verified:** the Automations page grouped by area in the HA UI (user check).
- Follow-up (not done): optional HA **categories** (Button, Motion, Notification) as a second grouping.

### 38. issue-worker agent works in its own git worktree (#68)

- `.claude/agents/issue-worker.md`: step 2 now does `git fetch`, then `git worktree add -b feature/<n>-<slug> ../ha-lab-worktrees/<n>-<slug> origin/main`, and does all work there (`npm ci` for `premium/`; `.env.local` copied only if needed, never committed). The report includes the worktree path.
- issue-workflow skill: hand-offs skip `start-issue-branch.sh`; before `gh pr merge --delete-branch`, run `git worktree remove <path>`. CLAUDE.md notes the worktree location (outside the repo, so `.gitignore` is unchanged).
- **Not yet verified:** a real hand-off in a worktree, including a `premium/` build and deploy from the worktree, and the remove-then-merge step.

### 39. Master Bedroom: motion automations removed (#70)

- Deleted from HA via `DELETE /api/config/automation/config/<id>`: `master_bedroom_motion_main_light_on` (motion turns on Main light) and `master_bedroom_no_motion_lights_off` (no motion 5 min turns off Main light + LED Cove). Before deleting, the repo exports matched the live configs exactly, so both stay recoverable from git history.
- Removed `automations/` exports, the NG Premium timeline entries (`premium/src/config.ts`, rebuilt and deployed), the two North Gaia tiles (`dashboards/home.yaml`, pushed) and the README sections; Master Bedroom now has 3 automations. The P1 motion sensor stays.
- The Main light no longer follows motion. TRADFRI, double-click and slider automations are unchanged.
- **Verified:** both DELETEs returned `ok`; `/api/states/<entity>` returns 404 for both and neither is in the entity registry; deployed premium assets and the live North Gaia config contain no reference.
- **Not yet verified:** visual check of both dashboards (user).

### 40. Away scene turns off the whole house (#74)

- `scene.away` went from 5 to **21** entities (`POST /api/config/scene/config/away`, exported to `scenes/away.yaml`). It now covers every room: Living Room (incl. Ceiling Fan and Sofalamp), Dining Room (incl. Walkway), Kitchen, Laundry Room and **Bathroom**, plus the existing Master Bedroom and Office entities. Spotlight rockers are cut too, as in Goodnight.
- User decisions: include the Bathroom and the Ceiling Fan; Night Curtain stays unchanged.
- Left out: the decoupled Kitchen Switch 1 bottom (mirrored by `kitchen_main_light_indicator`), Bath mode, the unnamed Spotlight T3 `light.0x54ef4410011b5686`, SHIELD, config switches.
- **Verified:** the POST returned `ok`; the live config read back has 21 entities, all `off`, and matches the export. Activated on 2026-11-20 at ~11:40: all 21 entities read `off` after 8 s, and `kitchen_main_light_indicator` turned the decoupled Switch 1 bottom off. The house was then put back from a `scene.create` snapshot, applied twice so the bulbs behind rockers came back after the rocker. Afterwards all 22 states matched the snapshot.
- **Not yet verified:** the bulbs physically, and the NG Premium Away button (it calls the same `scene.away`; no dashboard change).

### 41. Living Room Mini Switch: hold runs the Away scene (#76)

- Captured the hold payload: `action: "hold"` (3 holds, one message each, no release). Created `living_room_mini_switch_hold_away` (MQTT trigger, `hold` → `scene.turn_on` `scene.away`, mode `single`), area **Living Room**, exported. Relies on the whole-house Away from #74.
- **Verified:** a real hold at 11:42:05 started the automation, and its trace finished. The logbook shows every Away entity switched off by it. The Kitchen Cabinet LED and Walkway came back on at 11:42:31 with no automation context, most likely from someone pressing the rocker by hand. The house was restored from a snapshot. The Office ambient ring came back on during the restore and was turned off by hand, after which all 22 states matched.
- Note: restoring a snapshot with the T1 ceiling light on can turn its ambient ring on too.
- **Double press removed** (user request): deleted `living_room_mini_switch_double_all_off` (#58) via `DELETE /api/config/automation/config/<id>`. The repo export had matched live, so it stays recoverable from git history. Removed the export and README section. The Mini Switch now only has hold → Away.
- **Verified:** DELETE `ok`; `/api/states/automation.living_room_mini_switch_double_press_turns_off_living_dining_kitchen_lights` returns 404. No dashboard referenced it.

### 42. Living Room Switch: slider controls the Sofalamp, 4th rocker runs Movie (#78)

- Captured the slider with `mqtt-listen.mjs` (2026-11-20 13:24): a tap sends one `action: "slider_single"`. A slide streams `slider_up` / `slider_down` messages with a signed `action_slide_speed` delta (e.g. up 3.5, 40.2, 49.7, 0; down -3.5, -67.3, -23.6), the same as the Bedroom Z1 Pro. No double-tap action was seen. The 4th (wireless) rocker sends `single_wireless`; it does not toggle the lamp (user decision: only the strip toggles); it runs Movie instead (see the scope extension below).
- Created `living_room_switch_slider_toggles_sofalamp` (MQTT `zigbee2mqtt/Living Room Switch`; `slider_single` → `light.toggle` `light.sofalamp`; `slider_up`/`slider_down` → `light.turn_on` with `brightness_step_pct` = delta, 0.2 s; mode `queued`, max 30), area **Living Room**, exported. Entity renamed from the generated `automation.living_room_living_room_switch_slider_toggles_sofalamp` to `automation.living_room_switch_slider_toggles_sofalamp` (`config/entity_registry/update`, `new_entity_id`); automation id unchanged.
- Decisions: a tap toggles (Q1 option a, since the Z1 Pro sends a distinct tap); sliding dims (Q2); a tap turns it on at its last level with a plain `light.toggle` (Q3 proposed default, not yet confirmed by the user). Relays untouched.
- **Verified (real switch, 2026-11-20):**
  - Sliding: logbook shows the automation turning the Sofalamp on at 13:29:11 (slide up from off), off at 13:29:15 (slide down to 0) and on at 13:29:17. Later slides dimmed and brightened it, and a slide down turned it off at 13:44:22. Traces `finished` at `action/0/default/0`.
  - Tap: the strip tap at 13:43:01 (`slider_single`) toggled the Sofalamp on, exactly once.
  - Messages from the 4th rocker (`single_wireless`) and zero-delta slide messages stop at the condition (`failed_conditions`), so nothing runs.
  - Ceiling Fan, LED Cove and TV Light relays: no state change during any test (last changed 10:52 / 11:53).
  - POST `ok`; `area_name()` = Living Room; export matches the live config. The Sofalamp was off at the start and is off at the end (13:44:22; the agent also turned it off at 13:41:34 between rounds).
- **Not yet verified / open:**
  - **Tap detection is unreliable.** In the strip re-test (13:43), only the first of the user's taps arrived as `slider_single`. The others arrived as tiny slides (`slider_down`, delta -2.5 to -5, which dim slightly instead of toggling), one `slider_hold` and, at 13:44, several `single_wireless`. A tap turning it **off** has not been seen. Follow-up to decide: also map `slider_hold`, or rely on sliding for on/off.
  - Q3 (tap turns it on at the last level, plain `light.toggle`) is the proposed default, not confirmed by the user.
- **Scope extended (user decisions): Movie on the 4th rocker.**
  - `scene.movie` updated (`POST /api/config/scene/config/movie`, re-exported) and is now **Living Room only, 4 entities**: TV Light rocker `switch.living_room_switch_bottom` on, `light.tv_spotlights` on at brightness 128 (colour temp kept), `light.sofa_spotlights` off, `light.sofalamp` on at brightness 128 (50%). At the user's request (in steps) the Office ceiling light ("don't turn off office light"), the Master Bedroom lights (Main light, LED Cove, Bedlamp), the Office ring and the Night Curtain were removed, and the TV Spotlights were added.
  - New automation `living_room_switch_4th_rocker_movie` (MQTT `single_wireless`, captured above; if the TV Light rocker is off, turn it on and wait 3 s for the bulbs to boot, like Back Home; then `scene.turn_on` `scene.movie`; mode `single`), area **Living Room**, exported. The entity was generated doubled and renamed to `automation.living_room_switch_4th_rocker_runs_movie`.
  - NG Premium Movie hint now reads "Sofalamp + TV spots 50%, sofa spots off". The dashboard button runs the plain scene, so with the TV Light rocker off it may need a second press (noted in the README). Built and deployed; the served bundle contains it.
  - **Verified:** a real 4th-rocker press at 13:49:33 (one `single_wireless` message), trace `73dea8f9…` `finished`. Logbook: Sofalamp on (128), Sofa Spotlights off, Office ceiling light off, all from the automation, and every entity read back at its Movie state. This run used an earlier, 8-entity version (the original 6 entities plus the two sofa lights; the press came before the bedroom and office entities were removed). Someone switched the Office light back on with the E1 switch at 13:49:48. The other entities were restored from a temporary pre-test snapshot (`scene.before_movie_78`, made with `scene.create`; no longer in HA) with `scene.apply`, applied twice and leaving the Office light alone. All 8 states then matched the snapshot (Sofa Spotlights on 138 @ 3508 K, Sofalamp off, Bedroom main/cove/curtain off, Bedlamp off, Office white on 255 @ 6024 K, ring off).
  - **Not yet verified:** an activation of the final 4-entity Movie, including the rocker-off path (rocker on, 3 s, TV Spotlights at 50%); its config was read back and matches the export. The NG Premium hint has not been checked visually.

### 43. Laundry energy-today statistics set to kWh (#72)

- Repairs showed **units changed** for `sensor.laundry_room_washer_energy_today` and `sensor.laundry_room_dryer_energy_today`. These are the daily utility meters from #47. HA started recording statistics before they had a unit, so the metadata was `unit_class: unitless` with no unit.
- Ran `recorder/update_statistics_metadata` (`unit_class: energy`, `unit_of_measurement: kWh`) for both via `scripts/ha-ws.mjs`. The stored data is kept (two days, all `state 0` / `sum 0`).
- CLAUDE.md gotcha: give a new utility meter or template sensor its unit before HA records statistics.
- **Verified:** both updates returned `success`. `recorder/get_statistics_metadata` shows `statistics_unit_of_measurement: kWh` and `unit_class: energy` for both. `recorder/statistics_during_period` (the call the NG Premium Energy card makes in `premium/src/lib/data.ts`) still returns rows for both ids.
- **Verified:** both repairs cleared by themselves: 0 active at 2026-11-20 09:59 SGT, about 24 h after they were raised (none cleared during the first 10 minutes of polling, so HA re-checks roughly daily).
- **Not yet verified:** the Energy card on the dashboard (user).

### 44. Office: room temperature sensor (#80)

- New Aqara WSDCGQ11LM `0x00158d008cd53909` (paired, no name/area) renamed in Z2M to **Office Temperature Sensor** (`homeassistant_rename: true`) and assigned to the **Office**. Entities: `sensor.office_temperature_sensor_temperature` / `_humidity` / `_pressure` / `_battery` / `_voltage`. Before the rename it read 29.92 °C, 77.79 % RH, 1008.7 hPa.
- NG Premium: the Office `climate` now points at the new sensor, so the **Indoor** KPI averages it (the first room sensor). Room cards show a climate badge (`°C · % RH`, or `Temp unknown` until the sensor reports). The drybox sensor stays separate.
- No `climate.*` / aircon entity exists, so there is no actual temperature *control*. That would be a separate issue.
- **Verified:** Z2M rename applied; 5 new entity IDs, 0 `0x00158d008cd53909` IDs left; device area = Office; `npm run build` passes; the sensor reported 29.41 °C / 78.07 % RH after the rename; deployed with `deploy-premium.sh`, and the served bundle (`index-Db55ysml.js`, same as the local build) contains both Office sensor IDs.
- **Not yet verified:** the Office badge and Indoor KPI visually (refresh the dashboard).

### 45. Back Home: Dining Walkway on; front door runs the scene (#82)

- `scene.back_home` now also turns on the **Dining Walkway** (`switch.dining_switch_top`), 6 entities. Otherwise it is the automation's old end state: rockers, Ceiling Fan, TV + Dining Spotlights 50% / 3500 K.
- `living_room_front_door_back_home` no longer runs its own staged steps. If the Dining center or TV Light rocker is off, it turns both on and waits 3 s, then runs `scene.back_home` (same pattern as Movie). The scene is now the one definition of Back Home. Trigger and condition are unchanged.
- User decisions: Walkway in both; the automation calls the scene.
- **Verified:** both configs saved (`ok`) and exported. Test on 2026-11-21 ~21:30: `automation.trigger` (`skip_condition: true`) with both rockers off and the bulbs `unavailable`. The trace finished at `action/1`; rockers, Ceiling Fan and both spotlight groups came on at 50% / 3508 K. The house was put back afterwards (spotlights off, then rockers off).
- **Not yet verified:** Walkway turning on from off (it was already on during the test); a real door opening.

### 46. Laundry Room card: Energy today unit and precision (#84)

- **The unit is correct.** Cumulative `sensor.laundry_room_{washer,dryer}_energy`, the daily utility meters and their recorder statistics are all `kWh` / `energy`. The amounts are realistic for kWh: a washer cycle on 2026-11-20 (11:36–13:35) used 0.7 kWh, and the dryer used 0.5 kWh on 2026-11-21. Lifetime: washer 85.0 kWh with 18,219 L of water, dryer 146.9 kWh.
- **The resolution is coarse.** SmartThings' power consumption report updates every **15 min** in **0.1 kWh steps**. The card showed 2 decimals ("0.10 kWh"), so it now shows **1 decimal** for each machine and the total. HA display precision on the 4 energy sensors was also set to 1 (entity registry `display_precision`).
- **Power is never reported.** `sensor.laundry_room_{washer,dryer}_power` has only held `0` (or `unavailable`) since it was added, including mid-cycle on 2026-11-22 with both machines running. The card showed "Rinse · 0 W"; power is now removed from the card and from `config.ts` (`Appliance.power`), so the row reads "Rinse", or "Off" when idle.
- **Cost:** the Energy today total now has the cost under it, at the same flat tariff the Energy card uses (`TARIFF_SGD_PER_KWH`, SGD 0.30/kWh), e.g. 0.3 kWh → SGD 0.09.
- **Verified:** history and statistics checked; `npm run build` passes; deployed, and the served bundle (`index-DqtN3J51.js`) formats kWh to 1 decimal, shows the cost line and has no laundry `_power` reference; registry update `success` on all 4 sensors.
- **Not yet verified:** a cycle compared against the SmartThings app's energy figure (user), and the card visually.

### 47. NG Premium: 24-hour graph in the Indoor KPI tile (#86)

- The **Indoor** tile now has a 24 h temperature sparkline along its bottom, like Power now and Devices on. Data: 5-minute `mean` statistics of the room temperature sensors (`ROOMS[].climate.temperature`; today only the Office sensor, #80), **averaged** across sensors per bucket (new `useMeanSeries` in `lib/data.ts`). The drybox stays excluded.
- `Sparkline` got a `fit` option: the y-axis spans the data's own range (±0.2) instead of starting at 0. Otherwise a 29.6–29.8 °C day would be a flat line at the top.
- The footer adds the 24 h low–high: "Average of 1 room sensor · 24 h 29.6–29.8°".
- **Verified:** `npm run typecheck` and `npm run build` pass; the Office sensor has 287 five-minute means in the last 24 h (29.64–29.75 °C); deployed, and the served bundle (`index-BmFNIw8B.js`) has the series, the fitted scale and the range text.
- **Not yet verified:** the tile visually on the dashboard.

### 48. NG Premium: humidity line in the Indoor KPI graph (#88)

- The Indoor tile's sparkline now carries **humidity** too: a second series from `useMeanSeries` over `ROOMS[].climate.humidity` (today only `sensor.office_temperature_sensor_humidity`). It is drawn as a **dashed, muted** line (`--text-3`) on its own hidden y-axis fitted to the data (±1), so the blue temperature line stays the accent.
- `Sparkline` got optional `data2` / `color2` / `pad2`; it joins the two series by timestamp in a `ComposedChart`. Single-series callers (Power now, Devices on) still use the old `AreaChart` path unchanged.
- Footer: "Average of 1 room sensor · 24 h 29.6–29.8° · 76–76% RH".
- **Found: the Office sensor has gone silent.** Its last report was 2026-11-21 15:17 (29.75 °C, 76.36 %, battery 100 %), and nothing has arrived since. The 24 h statistics are therefore one repeated value, so both lines are flat. It is still paired in Z2M (interview successful, not disabled). It probably dropped off after it was mounted. Next: press its button once; if it still doesn't report, re-pair it near a router.
- **Verified:** `npm run typecheck` and `npm run build` pass; deployed, and the served bundle (`index-WEfjKyWT.js`) has the humidity series, the dashed line and the `% RH` range.
- **Not yet verified:** the tile visually, and a moving humidity line (needs the sensor reporting again).

### 49. Office ceiling light renamed to Office Light (#90)

- The Aqara Ceiling Light T1 (`0x54ef44100130d787`) is renamed in Z2M to **Office Light**, with `homeassistant_rename: false`. The HA device name followed, so entities now show as "Office Light White" / "Office Light Rgb" etc. Area stays **Office**.
- **Name only (user decision):** the entity IDs stay `light.aqara_ceiling_light_t1_white` / `_rgb` and the other `aqara_ceiling_light_t1_*` entities. They are used by `office_e1_switch_light_on`, `office_scene_schedule`, 5 scenes (Office hour, After office, Good morning, Goodnight, Away), the North Gaia dashboard and NG Premium.
- No automation listened on the old topic `zigbee2mqtt/Aqara Ceiling Light T1`; only the `office_e1_switch_light_on` description named it. The description was updated and re-exported.
- **Verified:** device name `Office Light`, area Office, all 10 entity IDs unchanged, no `0x54ef44100130d787` IDs; a `get` on `zigbee2mqtt/Office Light` answered (white ON, 254, 250 mired, linkquality 65); the automation saved `ok` and is `on`.
- **Not yet verified:** the E1 switch press and a scene on the renamed light (the IDs and command path are unchanged).

### 50. Drybox sensor renamed to Drybox Sensor (#92)

- The Office drybox sensor (Aqara WSDCGQ11LM `0x00158d008bbd8791`, was "Aqara Sensor") is renamed in Z2M to **Drybox Sensor** with `homeassistant_rename: true`. Entity IDs moved: `sensor.aqara_sensor_{humidity,temperature,battery,pressure,voltage}` → `sensor.drybox_sensor_*`. Area stays Office.
- No automation or scene used it. The two dashboards were updated: `dashboards/home.yaml` (12 references, pushed) and `premium/src/config.ts` drybox mapping (built and deployed).
- **Verified:** device name Drybox Sensor, area Office, 5 new IDs, no `aqara_sensor_*` or `0x00158d008bbd8791` IDs left. History (113 rows since 2026-11-22) and statistics metadata moved to `sensor.drybox_sensor_humidity`. Saved North Gaia config: 12 new references, 0 old. NG Premium served bundle `index-BZKTAYQ2.js` uses only the new IDs.
- **Verified after the rename (2026-11-23):** the sensor reported under the new IDs: humidity 60.47 %, temperature 30.26 °C, battery 83 %, pressure 1010.2 hPa, voltage 2975 mV. PR review: no live automation, scene, script or config file references the old IDs or name.
- **Not yet verified:** the drybox meter on both dashboards, visually.

### 51. Office Temperature Sensor rejoined (#88)

- The sensor (`0x00158d008cd53909`) had been silent since 2026-11-21 15:17, probably after it was mounted. A short button press did nothing.
- Re-paired on 2026-11-23: Z2M `permit_join` opened for 240 s at 08:21, the user held the button ~5 s, and the device announced at 08:21:54 and 08:22:25. Pairing was closed early at 08:22:49 (`time: 0`). Nothing else joined.
- It came back under the same friendly name and entity IDs, so nothing else changed.
- **Verified:** new readings at 08:22:36: 31.09 °C, 74.34 % RH. The Indoor KPI, its 24 h graph and the Office badge are live again.
- **Not yet verified:** the battery report (sent less often), and the 24 h lines moving on the dashboard.

### 52. Junior Bedroom temperature sensor added (#96)

- New Aqara WSDCGQ11LM (battery) `0x00158d008ccfb909` renamed in Z2M to **Junior Bedroom Temperature Sensor** with `homeassistant_rename: true`, so the IDs follow: `sensor.junior_bedroom_temperature_sensor_{temperature,humidity,pressure,battery,voltage}`. Before the rename it read 29.56 °C, 66 %, 1008.9 hPa.
- New area **Junior Bedroom** (`junior_bedroom`); the device (HA `680e9e5b0b58114a0195aef4d7710093`) is assigned to it.
- NG Premium: new **Junior Bedroom** room card (after Master Bedroom, `bed` icon, no controls, `climate` = the new temperature + humidity). The card shows the temperature badge and the "No climate control" empty state.
- **Indoor KPI now averages 2 room sensors** (Office + Junior Bedroom), and so does its 24 h temperature/humidity graph. The user accepted this. North Gaia is unchanged.
- **Verified:** device name, area Junior Bedroom, all 5 new entities in the area, no `0x00158d008ccfb909` IDs left. `npm run build` passes; deployed, and the served bundle references `junior_bedroom_temperature_sensor`. The sensor reported under the new IDs at 11:10:05 (03:10 UTC): 29.56 °C, 75.59 % RH, 1008.9 hPa (MQTT listener + HA states).
- **Not yet verified:** battery and voltage (still `unknown`; the sensor sends them less often), and the Junior Bedroom card / 2-sensor Indoor KPI on the tablet, visually.
- Merged as PR #97 (rebase). A 10-min MQTT watch after the rename saw one report (11:10:05, sent twice): 29.56 °C, 75.59 %, ~1009 hPa, linkquality 61–65. It carried no battery or voltage.

### 53. Living Room Matter Smart Light renamed Display LED (#99)

- The Matter LED driver (Chuan Dian Intelligent drive power supply, serial `10021945800140`) in the Living Room was **Smart Light**. Its device `name_by_user` is now **Display LED**.
- Nothing referenced it (`search/related`: no automation, scene or script; no repo or dashboard file), so all 10 entity IDs were renamed too: `*.living_room_smart_light*` became `*.living_room_display_led*` (`light`, `select` power-on behavior, 6 `number`s, `button` identify, `update` firmware). Not on either dashboard.
- **Verified:** device name, 10 new IDs, friendly names "Display LED …", area Living Room, no `smart_light` IDs left. `light.turn_on` on the new ID succeeded while it was already on (no visible change): on, 255, 6535 K.
- **Not yet verified:** nothing on the device side. The rename does not reach the device itself, and the Matter/vendor app may still show the old name.

### 54. Display LED: NG Premium tile + daily 08:30 on / 09:30 off (#101)

- New automation `automation.living_room_display_led_daily_schedule` (id `living_room_display_led_schedule`, area Living Room). Time triggers at 08:30 (`on`) and 09:30 (`off`) every day, with `choose` on the trigger id turning `light.living_room_display_led` on or off. No conditions, mode `single`. Exported.
- NG Premium: **Display LED** light tile in the Living Room card (after Sofalamp, `strip` icon). It counts in the devices-on KPI, and the automation is in the events timeline. Built and deployed: the served bundle `index-Csq0sYrD.js` contains both IDs.
- **Verified:** automation saved (`ok`), enabled, area Living Room. The served bundle contains the new entities. `light.turn_on` on the light works (#99).
- **Not yet verified:** the first real runs (08:30 and 09:30 on 2026-11-24, checked via the trace or logbook); the tile on the tablet.

### 55. Display LED: colour temperature swatches (3500 / 4000 / 6000 K) on NG Premium (#103)

- New optional `kelvinPresets` on a room control (`config.ts`). `ControlRow` draws it as a segmented control under the brightness slider, in the theme switch `.seg` style with `role="radiogroup"`. A tap calls `light.turn_on` with `color_temp_kelvin` (turning the light on if it is off, optimistic state). A button is highlighted when the reported K is within 75 K. The buttons are **colour swatches, not text** (user request): `kelvinColor()` interpolates warm amber → cool blue-white, so 3500 is amber, 4000 warm white and 6000 cool white. The K value stays in `aria-label` and `title`. The swatch group is centred under the slider, and each swatch is centred in a fixed 32 px button (`.k-btn`, not `:has()`, which older tablet webviews ignore). The swatch border is `--border-strong` with a 12% inset ring, so the near-white 6000 K swatch stays visible on the Day theme surface.
- Display LED: `[3500, 4000, 6000]` (the light supports 2702–6535 K).
- **Verified:** build passes and is deployed (served bundle `index-GOkATxLR.js` contains the swatch class `k-swatch`). Each preset was sent live and read back: 3500 → 3508, 4000 → 4000, 6000 → 6024 (all within 1 s and inside the 75 K match). The light was put back to 6535 K at 100 %.
- **Not yet verified:** the buttons on the tablet (tap, highlight, Day/Night).

### 56. Zigbee coordinator moved to SLZB-MR5U; devices re-paired (#105, in progress)

**What happened (2026-11-23)**
- ~20:28: Z2M `configuration.yaml` was switched from the Office **SLZB-06** (`tcp://192.168.1.41:6638`, `zstack`) to the Living Room **SLZB-MR5U** (`tcp://192.168.1.42:6638`, `ember`, EmberZNet 7.4.2, firmware channel `dev`). Z2M then failed to start 5 times: `[BACKUP] Current backup file is not for EmberZNet stack`. This Z2M (2.14.3) can't restore a zstack backup onto ember.
- At the user's request `coordinator_backup.json` was renamed to `coordinator_backup-bak.json` on the share (the zstack backup, kept). Z2M then started at 20:42 with **no valid backup** and **formed a new network** from config: same channel 11, PAN, extended PAN and network key, new coordinator IEEE `0x982ac3fffe77f520`, 0 devices.
- HA dropped the old device/entity entries. Devices that rejoined were rediscovered from their Z2M friendly names, so most IDs came back unchanged. The exception was the Office Light, whose IDs are HA-only (#90): it came back as `light.office_light_*`.
- Both coordinators ran the same network identity until the SLZB-06 was shut down (~20:55). Even after that, the old routers still expected the old coordinator IEEE: constant `ROUTE_ERROR_ADDRESS_CONFLICT for "0"`, and `Delivery failed` for every unicast to the Office Light. Delivery worked once the routers had rejoined the MR5U.
- User decision: **stay on the MR5U** and re-pair everything (the alternative was going back to the SLZB-06).

**Done**
- Office Light: entity IDs renamed back to `light.aqara_ceiling_light_t1_*` (all 10 entities), twice: after the first drop, and after a forced remove + re-pair (Z2M name restored with `homeassistant_rename: false`). The Office automations (`office_e1_switch_turns_on_ceiling_light`, `office_switch_lighting_scene_by_time`) and 5 scenes resolve again; the live automation configs match the repo exports.
- **25 of 27 devices on the MR5U**, names and HA entity IDs unchanged. Most routers moved over without a reset once pairing was open. The Dining Spotlights only rejoined after a factory reset done by cycling `switch.dining_switch_center` 5× from HA (1.5 s off / 1.5 s on); a cycle from the wall rocker did not register. The TRADFRI bind failed 13× while it slept; it configured after `bridge/request/device/configure` was retried every 3 s while the user pressed it.
- Re-applied: Z2M groups 1–3 (TV / Sofa / Dining Spotlights) were empty, so members were re-added; `power_outage_memory` on for all 7 spotlights. The Bathroom Switch D1 right rocker had come back `control_relay` and was set to `decoupled` again. Kitchen Switch 1 bottom was still `decoupled`; the Living Room, Bedroom and Dining Z1 Pro rockers are `control_relay` (correct).

**Verified**
- Office Light: E1 single press = off, double press = on (21:22, delivered within a second). Reads of the Bathroom D1 and TV Spotlight 1 were answered.
- Front Door Sensor: open/close at 21:26 reported `on`/`off`. Back Home did not run on that opening because the state came from `unknown`; the next opening should trigger it.
- Drybox Sensor: full report after a button press (29.9 °C, 57.9 %, battery 83 %).
- 105 repo entity references checked against live HA; the 15 still missing are in the open items.

**Not yet verified / not done**
- Sofalamp and Aqara Motion sensor P1 not migrated.
- TRADFRI presses (single = LED Cove, double = Bedlamp) not tested.
- Bathroom Motion Sensor P1: configure timed out 3× (sleepy).
- Dining Switch operation modes read back as `unknown`.
- The Dining bulbs may be at factory brightness / colour temperature after the reset.
- Display LED (Matter over Thread) has been `unavailable` since 20:35. This may be related to the MR5U setup; not investigated.
- CLAUDE.md, README and `zigbee2mqtt/app-config.yaml` still describe the SLZB-06 / zstack.

## Open items

**Zigbee migration to the SLZB-MR5U (#105)**
- [ ] Re-pair the Sofalamp (6 power cycles) and the Aqara Motion sensor P1 (hold 5 s).
- [ ] Test the TRADFRI (single = LED Cove, double = Bedlamp); retry configure on the Bathroom Motion Sensor P1; re-read the Dining Switch operation modes.
- [ ] Stale references: 10 `*office_slzb_06*` entities (SLZB-06 off) and `binary_sensor.zigbee2mqtt_bridge_connection_state` (the new bridge entity is `_2`).
- [ ] Display LED unavailable (Thread); name the Spotlight T3 `0x54ef4410011b5686`; MR5U firmware channel `dev`.
- [ ] Docs: CLAUDE.md, README, `zigbee2mqtt/app-config.yaml` (MR5U `.42`, `ember`).

**Display LED colour presets (#103)**
- [ ] Tablet: the 3 colour swatches show under the Display LED slider and read as amber / warm / cool, a tap changes the colour, and the active one is highlighted.

**Display LED schedule (#101)**
- [ ] 2026-11-24: on at 08:30 and off at 09:30 (traces / logbook).
- [ ] Display LED tile in the NG Premium Living Room card on the tablet.

**Junior Bedroom sensor (#96)**
- [ ] Battery and voltage report (next full report from the sensor).
- [ ] Tablet: Junior Bedroom card shows and the Indoor KPI says "Average of 2 room sensors".

**Living Room Switch slider → Sofalamp (#78)**
- [ ] Strip taps often arrive as tiny slides, `slider_hold` or `single_wireless`: decide whether to also map `slider_hold`, or rely on sliding for on/off.
- [ ] Confirm Q3: a tap turns it on at the last level.
- [ ] Run the final Movie once from the 4th rocker, ideally with the TV Light rocker off (TV Spotlights should come up at 50%) and check the NG Premium Movie hint.

**Laundry Light / washer energy (#60)**
- [ ] Washer energy: did `sensor.laundry_room_washer_energy` move after the 07:49 cycle? If not, find another way to meter the washer.
- [x] Laundry Light turned itself off at ~07:59:52, 10 min after the cycle (verified 2026-11-19).

**Front door / Back Home (#32)**
- [ ] Open and close the front door once so the sensor reports (entities read `unknown` until then).
- [ ] Test the real flow: TV Spotlights off, open the door → fan, TV + Dining Spotlights on at 3500 K / 50%.
- [x] Z2M availability for the 7 spotlights (#35)

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

**Laundry Room (#47)**
- [ ] #62: check the running animation during a real cycle (and on the tablet).
- [ ] Check the card during a real washer/dryer cycle (energy today rises from 0).
- [x] "Cycle finished" notification to iPhone + iPad, plus the Laundry Light (Kitchen Switch 2 left, renamed in #60) on for 10 min (overlap between machines accepted).

**NG Premium (issue #3)**
- [ ] Visual QA on the 10" landscape tablet and a phone (Day and Night).
- [ ] Confirm the Day/Night switch changes the whole page (reported broken; selected-state visibility fixed, awaiting re-test).
- [ ] Test each scene, the Roborock routines, and the bus cards (red flash under 5 min).
- [ ] Decide whether Movie should pause the no-motion auto-off.
- [ ] PR `feature/3-premium-dashboard` → `main` after PR #2 is merged.

**Master Bedroom (issue #1 / PR #2)**
- [x] ~~Test motion → Main light on~~: fired 12:56:17. Still to check: auto-off after leaving (~5–6 min).
- [x] ~~Consider a darkness/night condition for motion → Main light~~: motion automations removed (#70).
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
