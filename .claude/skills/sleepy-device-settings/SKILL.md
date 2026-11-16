---
name: sleepy-device-settings
description: >-
  Change a setting or run a firmware (OTA) update on a battery-powered Zigbee device (Aqara P1 motion sensor, IKEA TRADFRI button, E1 switch, temperature sensor), e.g. "set the motion detection interval to 5 s", "update the TRADFRI firmware", "the setting won't apply". Explains the queue/wake behaviour and the debug route.
---

# Battery (sleepy) Zigbee devices

These devices sleep. Z2M **queues** a write until the device wakes. **Each new write supersedes the queued one**, so retry loops
guarantee failure (`Request superseded` in the Z2M debug log).

## Change a setting
1. Send it **once**: `number.set_value` / `select.select_option` / `switch.turn_*`, or `mqtt.publish zigbee2mqtt/<Name>/set {"key": value}`.
2. Ask the user to **press the device's button** (or trigger it) to wake it. Then read the entity back. Don't loop.
3. Still not applied? Set `select.zigbee2mqtt_bridge_log_level` → `debug`, run
   `node scripts/mqtt-listen.mjs zigbee2mqtt/bridge/logging 120`, send once, wake, read the error. Set the log level back to `info`.

## Firmware (OTA)
- `node scripts/ota-on-wake.mjs <Z2M name> update.<entity> 180` in the background, then ask the user to press the device once. It calls
  `update.install` exactly once when the device's message arrives.
- Expect it to be slow (TRADFRI ≈ 0.3%/min, so about 5 h). Poll `update.<entity>` (`in_progress`, `update_percentage`, `installed_version`) with a
  **bash** script (zsh doesn't word-split), every 60 s in the background, with a long enough timeout. Tell the user not to press the device
  and to keep it in range.

## Interval note
Aqara P1 occupancy clears after its detection interval (default 30 s), so "Clear" while someone is present is expected.
