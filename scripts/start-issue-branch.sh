#!/usr/bin/env bash
# Start work on a GitHub issue: branch from the latest main.
# Usage: scripts/start-issue-branch.sh <issue-number> [slug]
#   slug defaults to the issue title (needs gh), e.g. 27 -> feature/27-issue-skill-merge-prs-with-rebase
set -euo pipefail

n="${1:-}"
[[ "$n" =~ ^[0-9]+$ ]] || { echo "usage: $0 <issue-number> [slug]" >&2; exit 2; }

slug="${2:-}"
if [[ -z "$slug" ]]; then
  title="$(gh issue view "$n" --json title -q .title)"
  slug="$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-40 | sed -E 's/-+$//')"
fi
branch="feature/${n}-${slug}"

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash first:" >&2
  git status --short >&2
  exit 1
fi

if git show-ref --quiet "refs/heads/$branch"; then
  echo "Branch $branch already exists locally. Switching to it (not recreating)." >&2
  git switch "$branch"
  exit 0
fi

git fetch origin --prune
git switch main
git pull --ff-only origin main

if [[ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]]; then
  echo "main ($(git rev-parse --short main)) does not match origin/main ($(git rev-parse --short origin/main))." >&2
  exit 1
fi

git switch -c "$branch"
echo "On $branch, from main $(git rev-parse --short main)."
