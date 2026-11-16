---
name: ng-premium-deploy
description: >-
  Change, build or deploy the NG Premium dashboard (premium/ React app served inside Home Assistant), e.g. "add a card for X to the dashboard", "make the badge red", "deploy the dashboard", "the dashboard doesn't show Y". Covers config mapping, design rules, build, deploy and verifying what HA serves.
---

# NG Premium: change → build → deploy → verify

- **Where things go**: entities → `premium/src/config.ts` (rooms, controls, routines, KPIs, bus sensors, timeline). Panels in
  `src/components/`. Tokens and styles in `src/styles.css`. HA state and optimistic calls in `src/ha/store.tsx`.
- **Design rules** (issue #3): 8px grid, **one accent per theme** (Day `#2563eb`, Night `#7c7cf0`), neutral greys, Inter + `.num`
  tabular numerals, 1px borders + soft shadows, 150–200 ms transitions, skeletons, **status = colour + Lucide icon + label** (`<Badge>`),
  no emoji icons, `prefers-reduced-motion` respected, real states for unavailable/empty/disconnected. Treat `unknown` as usable for
  scenes/buttons (`isUsable`).
- **Build**: `cd premium && npm run build` (strict TS; this is the test).
- **Deploy**: `scripts/deploy-premium.sh` (needs `/Volumes/config` mounted via Samba). It rsyncs `dist/` to `/config/www/premium/` and
  re-saves `/dashboard-premium` with a cache-busting `?v=`.
- **Verify** what HA actually serves, e.g. `curl -s $HA_URL/local/premium/index.html` and grep the referenced CSS/JS for the change.
  There's no browser in this environment: say the visual check is pending and ask the user to refresh (pull to reload on the tablet).
- Browser-blocked APIs (no CORS): poll them from HA with a REST sensor (`ha-config/rest.yaml`, copy to `/Volumes/config/rest.yaml`,
  `check_config`, `rest.reload`) and read the sensor in the app.
- Then: worklog step, `premium/README.md` panels table if the UI changed, commit (no attribution), issue update.
