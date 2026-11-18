---
name: issue-workflow
description: >-
  Run this repo's GitHub issue workflow, e.g. "create an issue for X", "work on issue #N, start with a new branch", "update the issue", "commit and open PR", "document everything". Covers issue writing, branching, worklog and README updates, issue progress, and PRs without attribution.
---

# Issue → branch → PR

- **Create an issue** (`gh issue create --body-file`): goal, a table of what will change, task checklist, open questions to decide, and
  **current state checked against live HA** (verify claims; fix typos in names and say so). Only create the issue unless asked to start.
- **Start work: always branch from the latest `main`.** Other PRs are often merged on GitHub in between, so never branch from a stale
  local `main` or from another feature branch. Use the script:
  `scripts/start-issue-branch.sh <n> [slug]`. The slug defaults to the issue title.
  - It refuses a dirty tree; stash or ask if so.
  - It fetches, fast-forwards `main`, checks `main` == `origin/main`, then creates `feature/<n>-<slug>`.
  - If the branch already exists, it switches to it instead.
  If `main` moves while the branch is open, merge `origin/main` into the branch (no force-push) before opening the PR. If an earlier PR was **squash-merged** (before #27; new PRs are rebase-merged), rebase
  `--onto origin/main` to drop duplicated commits (back up the branch first, force-push with lease, confirm the tree is unchanged).
- **During work**: after each meaningful step, export from HA, update `README.md` (reference) and add a numbered step to `docs/WORKLOG.md`
  (keep its Summary and Open items current), commit with a plain message (**no `Co-Authored-By` or Claude attribution**) and push.
- **Areas & devices changed** (a device added, removed, renamed or moved to another area; an area created or deleted; a Z2M group or
  helper added): update the README **Areas & devices** table in the **same branch**, with the area, name, model, IEEE/integration and
  entity IDs. Remove rows for devices that are gone. Check the rows against live HA (`device_attr(device_id(e),'identifiers')`, `area_name`).
- **Editing files HA uses directly** (Samba `/Volumes/config`: `configuration.yaml`, `rest.yaml`, `zigbee2mqtt/configuration.yaml`,
  `www/`, …): always keep them **tracked in git on the issue branch**.
  1. **Before editing:**
     - Make sure a repo copy exists: `ha-config/<file>` for `/config/*.yaml`, `zigbee2mqtt/<…>` for Z2M.
     - Refresh it from live and **commit it first**, so the PR diff shows exactly what changed.
     - Also back up on the share (`<file>.bak-<date>-<slug>`).
  2. **Edit** the live file, or apply the change via an API. Then copy the result back into the repo copy in the **same branch** and commit
     with the issue number. Changes made via an API (automations, scenes, Z2M device options) count too: export or record them.
  3. **No secrets in the repo:**
     - Never copy Z2M `advanced.network_key` / `pan_id` / `ext_pan_id`, `mqtt.password`, `secrets.yaml` or tokens.
     - Track a **redacted** or **section-only** copy instead (e.g. `zigbee2mqtt/devices-availability.yaml`).
     - When reading such files, print only the keys you need: parse them and select, rather than `cat`/`sed`.
     - gitleaks is the backstop, not the filter.
  4. **Check before the PR:** parse the live file and the repo copy, compare the tracked part, and report it under **Verified**.
- **"Update the issue"**: tick checklist items in the body (`gh issue view --json body` → edit → `gh issue edit --body-file`) and add a short
  progress comment (done / verified / not verified / next). If it's already current, say so instead of posting a duplicate.
- **"Commit and open PR"**: check the tree is clean and what's ahead of `origin/main`, then `gh pr create` with "Closes #n", what changed,
  **Verified**, **Not yet verified**, and no attribution line.
- **"Review / check PR #N"**: hand it to the `pr-reviewer` subagent (`.claude/agents/pr-reviewer.md`, Sonnet, read-only), then relay its verdict.
- **"Merge PR #N"**: **rebase and merge**, not squash: `gh pr merge <n> --rebase --delete-branch`.
  - Check the PR state first. If it's already merged, say so.
  - If it can't rebase cleanly, rebase the branch onto `origin/main`. Force-push with `--force-with-lease` only after the user agrees.
  - Then `git switch main && git pull --ff-only origin main`, and confirm the issue closed.
  - Older squash-merged PRs (up to #26) stay as they are.
- **"Document everything"**: reconcile the README (file map, sections), `premium/README.md`, and the worklog summary/open items with reality,
  then commit and push.
