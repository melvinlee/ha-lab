#!/usr/bin/env bash
# Push dashboards/home.yaml (or another file) to Home Assistant.
#   scripts/push-dashboard.sh [file] [url_path] [title] [icon]
# Defaults: dashboards/home.yaml dashboard-north-gaia "North Gaia" mdi:home
# Needs: HA_TOKEN, ruby (YAML -> JSON), node >= 22.
set -euo pipefail
cd "$(dirname "$0")/.."
file="${1:-dashboards/home.yaml}"
ruby -ryaml -rjson -e 'puts JSON.generate(YAML.load_file(ARGV[0]))' "$file" \
  | node scripts/push-dashboard.mjs "${2:-dashboard-north-gaia}" "${3:-North Gaia}" "${4:-mdi:home}"
