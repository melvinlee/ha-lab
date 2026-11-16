#!/usr/bin/env bash
# Build the premium dashboard, copy it to HA's /config/www/premium (served at /local/premium/),
# and create/update a sidebar dashboard that shows it full-screen.
#
#   scripts/deploy-premium.sh
#
# Needs: the HA "config" share mounted on the Mac (Samba share app in HA, then
# Finder → Go → Connect to Server → smb://192.168.1.40/config), HA_TOKEN, node >= 22.
# Override the mount point with HA_CONFIG_MOUNT (default /Volumes/config).
set -euo pipefail
cd "$(dirname "$0")/.."

MOUNT="${HA_CONFIG_MOUNT:-/Volumes/config}"
if [ ! -f "$MOUNT/configuration.yaml" ]; then
  echo "HA config share not found at $MOUNT (expected configuration.yaml there)." >&2
  echo "Mount it: Finder → Go → Connect to Server → smb://192.168.1.40/config" >&2
  exit 1
fi

echo "› build"
(cd premium && npm run build --silent)

echo "› copy to $MOUNT/www/premium"
mkdir -p "$MOUNT/www/premium"
rsync -a --delete premium/dist/ "$MOUNT/www/premium/"

# Cache-bust: HA and browsers cache /local aggressively.
v=$(date +%s)
echo "› dashboard /dashboard-premium (v=$v)"
printf '{"title":"Premium","views":[{"title":"Home","path":"home","type":"panel","cards":[{"type":"iframe","url":"/local/premium/index.html?v=%s","aspect_ratio":"100%%"}]}]}' "$v" \
  | node scripts/push-dashboard.mjs dashboard-premium "Premium" mdi:view-dashboard-variant
echo "✓ open ${HA_URL:-http://192.168.1.40}/dashboard-premium"
