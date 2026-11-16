---
name: ha-automation
description: Create or change a Home Assistant automation in this lab, e.g. "when the button is double-clicked toggle the lamp", "turn off the lights after 15 min without motion", "the slider should dim the bedlamp", "pause the auto-off when X is on". Covers payload capture, creation via the REST config API, testing with traces, export and docs.
---

# Automation workflow

1. **Know the trigger.** For buttons, sliders or rockers (Z2M has no press entity), capture the real payload first:
   `node scripts/mqtt-listen.mjs 'zigbee2mqtt/<Z2M name>' 90` in the background, ask the user to press, then read `action` (and `action_*`).
   Never guess payloads (`on`, `single_right`, `slider_up` were all found this way).
2. **Clarify** genuinely ambiguous scope (which lights, on vs toggle) with one short question. Otherwise pick a safe default and state it.
3. **Create/update** (same id updates in place):
   `curl -X POST "$HA_URL/api/config/automation/config/<id>" -H "Authorization: Bearer $HA_TOKEN" -H "Content-Type: application/json" -d '{…}'`
   - MQTT trigger: `{"trigger":"mqtt","topic":"zigbee2mqtt/<Name>","value_template":"{{ value_json.action }}","payload":"<action>"}`
   - Several presses in one automation: trigger `id`s + `choose` on `condition: trigger`.
   - Auto-off patterns: trigger on sensor `off` *for* N min **and** on light `on` *for* N min, with conditions (sensor off ≥ N, a light on),
     so lights switched on in an empty room are covered.
   - Re-enabling an automation doesn't re-arm `for:` triggers. Follow `automation.turn_on` with `automation.trigger` (`skip_condition: false`).
4. **Test**: real device test with the user where possible; otherwise `automation.trigger` with `skip_condition: false` and read
   traces: `node scripts/ha-ws.mjs '{"type":"trace/list","domain":"automation","item_id":"<id>"}'` (`last_step`, `script_execution`).
   Don't trigger things that would surprise people in the house without saying so.
5. **Export** to `automations/<id>.yaml` (curl GET | ruby to_yaml, see CLAUDE.md), add it to the README Automations section and file
   map, write a worklog step (verified vs not verified), add an NG Premium automation tile / timeline entity if relevant, update the issue.
