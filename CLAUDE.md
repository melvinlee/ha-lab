# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A lab for driving a **live Home Assistant** instance (HA OS, `http://192.168.1.40`, HA 2026.11, SGD, Asia/Singapore) from Claude Code.
Most "code" here is HA configuration that is **applied to the live instance first** and then **exported into the repo** as the record.
The one real application is `premium/` (the NG Premium dashboard).

Ways Claude talks to HA (all need `HA_TOKEN`, optionally `HA_URL`):
- **MCP** (`.mcp.json` → HA's MCP Server at `/api/mcp`): states, `call_action`, `render_template`, logs, config entries. It **can't**
  create automations/scenes/dashboards, install apps, or edit registries.
- **REST config API**: `POST /api/config/automation/config/<id>`, `/api/config/scene/config/<id>`, `/api/config/core/check_config`.
- **Websocket** via `node scripts/ha-ws.mjs '<json>' …` (area/device/entity registry, lovelace, traces, statistics, logbook).
  A later command can reference an earlier result with `"$1.area_id"`.
- **Samba share** for files: `smb://192.168.1.40/config` mounted at `/Volumes/config` (HA `configuration.yaml`, `www/`).

`render_template` reads **all** entities; `GetLiveContext` only sees entities exposed to Assist.

## Commands

```bash
# NG Premium dashboard (premium/): Vite + React 19 + TS
cd premium && npm install
npm run dev          # local dev, logs into HA via OAuth (VITE_HA_URL in .env.local)
npm run build        # tsc -b (strict) + vite build -> dist/   (no test suite; the build is the check)
npm run typecheck

scripts/deploy-premium.sh     # build -> rsync to /Volumes/config/www/premium -> create/update /dashboard-premium (needs the Samba mount)
scripts/push-dashboard.sh     # dashboards/home.yaml -> Lovelace dashboard "North Gaia" (/dashboard-north-gaia), via websocket

node scripts/mqtt-listen.mjs 'zigbee2mqtt/<Z2M name>' 60     # watch device messages (button/slider payloads), read-only
node scripts/ota-on-wake.mjs <Z2M name> update.<entity> 180  # OTA for a sleepy device: waits for its next message, calls update.install once

pre-commit install && pre-commit run --all-files   # gitleaks + file checks; first run on this Mac needs SSL_CERT_FILE=/etc/ssl/cert.pem
```

Export an automation/scene after creating it in HA (same pattern for `scene`):
```bash
curl -s "$HA_URL/api/config/automation/config/<id>" -H "Authorization: Bearer $HA_TOKEN" \
  | ruby -rjson -ryaml -e 'puts JSON.parse(STDIN.read).to_yaml' > automations/<id>.yaml
```
(PyYAML isn't installed; ruby is used for YAML/JSON conversion.)

## Architecture

- **Source of truth is live HA.** `automations/`, `scenes/` are *exports*; `ha-config/` holds copies of files edited on the Samba
  share (`configuration.yaml` with `rest: !include rest.yaml`, `rest.yaml`); `zigbee2mqtt/app-config.yaml` is a reference copy only.
  `dashboards/home.yaml` and `premium/` are the exception: edited here, then pushed/deployed.
- **Zigbee**: Zigbee2MQTT app ← SMLIGHT SLZB-06 coordinator over TCP (`tcp://192.168.1.41:6638`, `zstack`) → Mosquitto → HA MQTT.
  Wireless buttons/sliders have **no press entity** (Z2M 2.x); automations use **MQTT triggers** on `zigbee2mqtt/<friendly name>`
  matched on `value_json.action` (e.g. `on`, `single_right`, `slider_up`). Capture payloads with `mqtt-listen.mjs` before writing them.
- **NG Premium** (`premium/`): static build served from `/config/www/premium/` (`/local/premium/`), shown full-screen in a panel-view
  iframe dashboard. When embedded it **reuses the HA frontend's websocket** (`window.parent.hassConnection`, same origin, no token);
  standalone it falls back to OAuth (`src/ha/connection.ts`). `src/ha/store.tsx` holds entity state + optimistic overrides.
  **`src/config.ts` is the single map of entities → rooms/KPIs/bus/security/scenes**; empty arrays render designed empty states.
  Design tokens live in `src/styles.css` (8px grid, one accent per theme: Day blue `#2563eb`, Night indigo `#7c7cf0`, status = colour + icon + label).
- **Bus arrivals**: the NG Shuttle API has **no CORS**, so HA polls it with REST sensors (`ha-config/rest.yaml`) and the card reads the
  `Services` attribute. New REST resources load with `rest.reload` (no restart).

## Gotchas learned the hard way

- **Rename devices in Z2M** (`zigbee2mqtt/bridge/request/device/rename` with `"homeassistant_rename": true`) so entity IDs follow.
  Renaming only in HA (`name_by_user` / entity name) is display-only. Use that when automations depend on the existing IDs.
- **Sleepy (battery) devices**: Z2M queues writes until the device wakes. Send a setting **once** and have the user press the device.
  Retrying in a loop makes each write *supersede* the queued one (`Request superseded`). For write errors, set
  `select.zigbee2mqtt_bridge_log_level` to `debug`, watch `zigbee2mqtt/bridge/logging`, then set it back to `info`.
- **Scenes/buttons report `unknown` until first used.** That isn't "unavailable" (`isUsable()` in `store.tsx`).
- **State triggers with `for:` don't re-arm when an automation is re-enabled.** After `automation.turn_on`, call `automation.trigger`
  (with `skip_condition: false`) if the condition may already be true.
- The Bash tool's shell is **zsh**: `set -- $var` doesn't word-split. Run polling scripts with `bash`.
- `scripts/ha-ws.mjs` must not `process.exit()` before stdout flushes (large outputs truncate).
- HA caches `/local`. `deploy-premium.sh` cache-busts with `?v=<timestamp>`; users may still need a refresh.
- A **HA restart** is only needed for new integration *types* in YAML; ask the user first.

## Conventions

- **No `Co-Authored-By` or Claude attribution** in commits or PR descriptions.
- One GitHub issue per piece of work → branch `feature/<issue>-<slug>` from `main` → PR to `main` with "Closes #n".
  Update the issue (checklist + comment) as work progresses.
- After each change: export what was created in HA, update `README.md` (reference) and add a numbered step to `docs/WORKLOG.md`
  (dated log + summary + open items). Record what was **verified** vs **not yet verified** on real devices.
- Confirm before hard-to-reverse or disruptive actions on the live house (HA restart, editing `configuration.yaml`, force-push).
