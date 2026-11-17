---
name: issue-workflow
description: >-
  Run this repo's GitHub issue workflow, e.g. "create an issue for X", "work on issue #N, start with a new branch", "update the issue", "commit and open PR", "document everything". Covers issue writing, branching, worklog and README updates, issue progress, and PRs without attribution.
---

# Issue → branch → PR

- **Create an issue** (`gh issue create --body-file`): goal, a table of what will change, task checklist, open questions to decide, and
  **current state checked against live HA** (verify claims; fix typos in names and say so). Only create the issue unless asked to start.
- **Start work: always branch from the latest `main`.** Other PRs are often merged on GitHub in between, so never branch from a stale
  local `main` or from another feature branch:
  `git fetch origin && git switch main && git pull --ff-only origin main && git switch -c feature/<n>-<slug>`.
  Check `git status` is clean first (stash or ask if not), and confirm `git log -1 main` matches `origin/main` before branching.
  If `main` moves while the branch is open, merge `origin/main` into the branch (no force-push) before opening the PR. If an earlier PR was **squash-merged** (before #27; new PRs are rebase-merged), rebase
  `--onto origin/main` to drop duplicated commits (back up the branch first, force-push with lease, confirm the tree is unchanged).
- **During work**: after each meaningful step, export from HA, update `README.md` (reference) and add a numbered step to `docs/WORKLOG.md`
  (keep its Summary and Open items current), commit with a plain message (**no `Co-Authored-By` or Claude attribution**) and push.
- **"Update the issue"**: tick checklist items in the body (`gh issue view --json body` → edit → `gh issue edit --body-file`) and add a short
  progress comment (done / verified / not verified / next). If it's already current, say so instead of posting a duplicate.
- **"Commit and open PR"**: check the tree is clean and what's ahead of `origin/main`, then `gh pr create` with "Closes #n", what changed,
  **Verified**, **Not yet verified**, and no attribution line.
- **"Merge PR #N"**: **rebase and merge**, not squash: `gh pr merge <n> --rebase --delete-branch`.
  - Check the PR state first. If it's already merged, say so.
  - If it can't rebase cleanly, rebase the branch onto `origin/main`. Force-push with `--force-with-lease` only after the user agrees.
  - Then `git switch main && git pull --ff-only origin main`, and confirm the issue closed.
  - Older squash-merged PRs (up to #26) stay as they are.
- **"Document everything"**: reconcile the README (file map, sections), `premium/README.md`, and the worklog summary/open items with reality,
  then commit and push.
