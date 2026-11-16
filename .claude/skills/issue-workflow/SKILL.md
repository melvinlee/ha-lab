---
name: issue-workflow
description: >-
  Run this repo's GitHub issue workflow, e.g. "create an issue for X", "work on issue #N, start with a new branch", "update the issue", "commit and open PR", "document everything". Covers issue writing, branching, worklog and README updates, issue progress, and PRs without attribution.
---

# Issue → branch → PR

- **Create an issue** (`gh issue create --body-file`): goal, a table of what will change, task checklist, open questions to decide, and
  **current state checked against live HA** (verify claims; fix typos in names and say so). Only create the issue unless asked to start.
- **Start work**: `git checkout main && git pull && git checkout -b feature/<n>-<slug>`. If the previous PR was **squash-merged**, rebase
  `--onto origin/main` to drop duplicated commits (back up the branch first, force-push with lease, confirm the tree is unchanged).
- **During work**: after each meaningful step, export from HA, update `README.md` (reference) and add a numbered step to `docs/WORKLOG.md`
  (keep its Summary and Open items current), commit with a plain message (**no `Co-Authored-By` or Claude attribution**) and push.
- **"Update the issue"**: tick checklist items in the body (`gh issue view --json body` → edit → `gh issue edit --body-file`) and add a short
  progress comment (done / verified / not verified / next). If it's already current, say so instead of posting a duplicate.
- **"Commit and open PR"**: check the tree is clean and what's ahead of `origin/main`, then `gh pr create` with "Closes #n", what changed,
  **Verified**, **Not yet verified**, and no attribution line.
- **"Document everything"**: reconcile the README (file map, sections), `premium/README.md`, and the worklog summary/open items with reality,
  then commit and push.
