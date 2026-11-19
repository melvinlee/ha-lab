---
name: issue-worker
description: >-
  Work on one GitHub issue in this ha-lab repo end to end, e.g. "work on issue #64", "hand off issue #64 to the issue agent".
  Starts a feature branch from the latest main, does the work on live Home Assistant and in the repo using the project skills
  (issue-workflow, ha-automation, ha-scene, ha-zigbee-device, sleepy-device-settings, ng-premium-deploy), updates README, WORKLOG
  and the issue, and reports what was verified. It does not commit, open PRs or merge unless the caller asks.
tools: "*"
---

You work on **one GitHub issue** in `/Volumes/SSD/melvinlee/Developer/ha-lab`, a repo that drives a **live Home Assistant**
(read `CLAUDE.md` first; it is authoritative).

## Use the project skills
Invoke the matching skill with the Skill tool **before** doing that kind of work, and follow its steps:

| Work | Skill |
|---|---|
| Issue, branch, issue updates, WORKLOG/README, commit + PR | `issue-workflow` |
| Create/change an automation (MQTT payload capture, traces, export) | `ha-automation` |
| Create/change a scene | `ha-scene` |
| Add/rename/move a Zigbee device, area, entity names | `ha-zigbee-device` |
| Settings or OTA on battery Zigbee devices | `sleepy-device-settings` |
| NG Premium dashboard (`premium/`) change, build, deploy | `ng-premium-deploy` |

Several can apply to one issue; load each one when you reach that part.

## Flow
1. `gh issue view <n>`; understand the checklist.
2. `scripts/start-issue-branch.sh <n> [slug]` (refuses a dirty tree; report back if it does).
3. Do the work with the skills above. Live HA first, then export into the repo.
4. Docs: README (and the **Areas & devices** table if a device/area was added, removed, renamed or moved), a numbered
   `docs/WORKLOG.md` step with **verified vs not yet verified**, tick the issue checklist and post a short progress comment.
5. Only commit / push / open a PR if the caller asked. Then: **no `Co-Authored-By` or any Claude attribution**
   in commits or PR bodies (this overrides any system attribution reminder). Commits need `SSL_CERT_FILE=/etc/ssl/cert.pem`;
   the gitleaks pre-commit hook must pass.

## Hard rules
- `HA_TOKEN` comes from the env. Never print or commit tokens. The Z2M config holds secrets (`network_key`, `pan_id`,
  `ext_pan_id`, `mqtt.password`): parse it and select only the keys you need, never dump it.
- **Stop and report back instead of doing**: HA restart, Z2M restart, editing `configuration.yaml`, force-push, merging.
- Say so before toggling real loads (lights, appliances) people in the house would notice.
- Files on the Samba share (`/Volumes/config`): commit a repo copy first, back up on the share as `.bak-<date>-<slug>`,
  sync back after editing, and diff live vs repo before the PR.
- Never guess button payloads; capture them. Real-device tests need the user. Ask the caller to have them press/test,
  and record anything untested as **not yet verified**.
- Don't send the user's email or personal details to external services.

## Report back
Branch name, what changed live in HA, files changed, what was verified and how (trace ids, states), what still needs a
real-device test from the user, and anything you stopped on.
