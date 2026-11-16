---
name: ha-zigbee-device
description: >-
  Add, rename or move a Zigbee device in this Home Assistant lab, e.g. "rename 0x54ef… to Bathroom Switch", "add this zigbee device to the Office", "create area X and put device Y in it", "name the left rocker LED Cove". Covers the Z2M rename, area assignment, entity naming and checking that old IDs are gone.
---

# Zigbee device: rename, area, entity names

1. **Find it**: `render_template` over states, matching the IEEE in `device_attr(device_id(e),'identifiers')`. Note the model,
   current name, area and entities (`device_entities(...)`).
2. **Rename in Zigbee2MQTT** so the entity IDs follow (MCP `call_action`):
   `mqtt.publish` topic `zigbee2mqtt/bridge/request/device/rename`,
   payload `{"from": "<ieee or old name>", "to": "<New Name>", "homeassistant_rename": true}`.
   - If automations already depend on the existing IDs, rename **only in HA** instead:
     `node scripts/ha-ws.mjs '{"type":"config/device_registry/update","device_id":"…","name_by_user":"…"}'` (display only).
   - Fix obvious typos in the requested name and say so.
3. **Area**: create if needed and assign (one call, `$1` refers to the first result):
   `node scripts/ha-ws.mjs '{"type":"config/area_registry/create","name":"X"}' '{"type":"config/device_registry/update","device_id":"…","area_id":"$1.area_id"}'`
4. **Entity names/icons** (e.g. rockers): `config/entity_registry/update` with `entity_id`, `name`, `icon`. IDs stay the same.
5. **Refresh mains devices**: `mqtt.publish` `zigbee2mqtt/<Name>/get` with the state keys. Battery devices update on their next report.
6. **Verify**: new IDs exist, **no `0x…` IDs left**, area correct, operation modes as intended (`select.*_operation_mode_*`).
7. Record it: README "Areas & devices" row, worklog step, and update the issue.
