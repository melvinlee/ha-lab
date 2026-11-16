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
Empty arrays (locks, doors, cameras, solar, room climate) render designed empty states.

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
| Top bar | greeting, clock, `weather.home`, `person.*` presence, Cmd/Ctrl+K |
| KPIs | power now (live sum + 5-min stats sparkline), energy today vs same time yesterday (stats), indoor climate (room sensors only), devices on (history sparkline) |
| Rooms | toggles, brightness sliders, Roborock start/pause/dock, motion badge, climate empty state |
| Energy | 24h hourly kWh area chart (stats `change`), solar series when configured, cost at tariff |
| Security | locks, doors, camera snapshot (empty states for now), recent events (logbook, 24h) |
| Scenes | `scene.good_morning`, `scene.movie`, `scene.away`, `scene.goodnight` ("Not set up" until they exist) |
| Command palette | every entity, grouped by domain; Enter runs toggle/activate/press |
