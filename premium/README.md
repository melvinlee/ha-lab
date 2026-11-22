# Premium dashboard

SaaS-style Home Assistant dashboard (issue #3). Vite + React + TypeScript, `home-assistant-js-websocket`,
Lucide icons, Recharts, `cmdk`, Inter (bundled, no CDN).

## Run

```bash
cd premium
npm install
npm run dev          # http://localhost:5173, logs in via HA OAuth (set VITE_HA_URL in .env.local)
npm run build        # -> dist/
```

Deploy into HA: `scripts/deploy-premium.sh` (from the repo root). It needs the HA **Samba share** app and
`smb://192.168.1.40/config` mounted at `/Volumes/config`. It copies `dist/` to `/config/www/premium/` (served at
`/local/premium/`) and creates the **NG Premium** sidebar dashboard (`/dashboard-premium`, a full-screen iframe).

## How it connects

- **Inside HA** (iframe on the same origin): reuses the HA frontend's websocket (`window.parent.hassConnection`).
  No login, no token.
- **Standalone** (dev server or `/local/premium/` opened directly): HA OAuth via `getAuth`. Tokens stay in the browser's localStorage.

## Where to change things

`src/config.ts` maps entities to rooms, KPIs, energy (tariff **SGD 0.30/kWh**), security, timeline and scenes.
Empty arrays (locks, doors, cameras, solar, room climate for rooms without a sensor; Office has one since #80) render designed empty states.

## Design system (`src/styles.css`)

- 8px spacing tokens (`--s-*`), one accent per theme (`--accent`: **Day = blue** `#2563eb`, **Night = indigo** `#7c7cf0`), neutral greys
- **Theme: Auto / Day / Night** (top-bar switch, or Cmd/Ctrl+K → "Day mode" / "Night mode"). Auto follows the device
  (`prefers-color-scheme`). The choice is saved per device in localStorage (`ng-premium-theme`) and applied before first paint
- Inter, `.num` = tabular numerals on every metric
- 1px borders + soft shadows; 150/200ms transitions; `prefers-reduced-motion` respected
- Status = colour + Lucide icon + text label (`<Badge>`)
- Skeletons while loading; banners for disconnected/reconnecting; "Unavailable"/"Not found" per entity
- Optimistic toggles/sliders (revert + toast on error, 6s timeout)
- Tablet-landscape first (4 KPIs, 2-column main), collapses to one column on phones

## Panels

| Panel | Source |
|---|---|
| Top bar | greeting, clock, `weather.home`, `person.*` presence, **Auto / Day / Night** theme switch, Search (Cmd/Ctrl+K) |
| Scenes bar | `scene.good_morning`, `scene.movie`, `scene.away`, `scene.goodnight` (never-used scenes report `unknown` but stay usable) |
| KPIs | power now (live sum + 5-min stats sparkline), energy today vs same time yesterday (stats), indoor climate (room sensors only; drybox excluded; 24 h temperature sparkline from 5-min mean stats, averaged across room sensors and scaled to the data's range, with the 24 h low–high in the footer, #86; humidity as a second dashed, muted line on its own fitted axis, and its 24 h range in the footer, #88), devices on (lights/switches; history sparkline) |
| Rooms | header badges: lights (`N on` / `All off`) + motion (`Motion` / `No motion`) + room climate when `climate.temperature` is set (`29.9°C · 78% RH`, or `Temp unknown`; Office, #80); toggles and brightness sliders; Night Curtain as **Open/Closed** (relay ON = open); Roborock start/pause/dock + **routines** (`button.press`); Bathroom **Bath mode** toggle (shows auto-off active/paused); Office **Lighting** quick scenes (Office hour / After office) + **drybox** humidity meter (Dry ≤ 40 · Watch ≤ 50 · Replace desiccant); **Laundry Room** washer + dryer (read-only: Running/Paused/Idle badge (while running the badge spinner turns and the machine icon does a gentle drum wobble; none when paused/idle or under reduced motion), job state (no power: the SmartThings value has only ever been 0 W, #84), progress meter and finish time only while running; **Energy today** total + per machine from daily utility meters, kWh to 1 decimal: the source moves in 0.1 kWh steps every 15 min; the cost today shows under the total at `TARIFF_SGD_PER_KWH`, #84) |
| Bus stops | one card per sensor in `BUS_SENSORS` (NG, Yishun MRT): title = `OriginCode`, next 3 ETAs in minutes (yellow/blue/grey tiles), badge **flashes red under 5 min** |
| Energy | 24h hourly kWh area chart (stats `change`); boxes **Today**, **Cost today** and **This month** (kWh + cost since the 1st, summed daily stats) at SGD 0.30/kWh; metered: the 5 Z1 Pro / D1 switches + Laundry Room washer and dryer in `ENERGY_SENSORS` (no whole-home meter, no solar) |
| Security | locks, doors, camera snapshot (empty states for now), recent events (logbook, 24h) |
| Command palette | every entity, grouped by domain; Enter runs toggle/activate/press; Day/Night/Auto theme commands |

## Bus data

The NG Shuttle API has no CORS headers, so HA polls it with REST sensors (`ha-config/rest.yaml`, included from `configuration.yaml`)
and the card reads the `Services` attribute. To add a stop: add a resource to `ha-config/rest.yaml`, copy it to `/Volumes/config/rest.yaml`,
call `rest.reload`, and add the sensor to `BUS_SENSORS` in `src/config.ts`. Supported stop codes: `NG`, `Yishun MRT`.
