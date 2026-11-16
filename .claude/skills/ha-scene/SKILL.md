---
name: ha-scene
description: Create or change a Home Assistant scene in this lab, e.g. "add an Office hour scene at 6000K", "Movie scene: cove on, bedlamp dim", "make the scene also turn off the ring". Covers range checks, creation via the config API, testing, export and dashboard buttons.
---

# Scene workflow

1. **Check capabilities** first (`render_template`): `min_color_temp_kelvin` / `max_color_temp_kelvin`, `supported_color_modes`, relays
   (switches) vs lights. Relays that drive curtains have custom semantics (e.g. Night Curtain: **ON = open**).
2. **Propose** the per-entity states in a table when there are several devices. Only include entities the scene should change (anything
   left out keeps its state, e.g. omit `brightness` to keep the current level).
3. **Create**: `POST $HA_URL/api/config/scene/config/<id>` with `{"id","name","icon","entities":{"light.x":{"state":"on","color_temp_kelvin":4000}}}`.
   Creating does **not** activate it. A new scene's state is `unknown` until first used (normal).
4. **Test** with `scene.turn_on` and read the states back (lights round colour temp to their own steps, e.g. 6000 → 6024 K). Leave the house
   in a sensible state and say what you left it in.
5. **Export** to `scenes/<id>.yaml`, update the README Scenes table and worklog, and add it to NG Premium (`SCENES` or a room's `routines` in
   `premium/src/config.ts`), then deploy (ng-premium-deploy skill).
