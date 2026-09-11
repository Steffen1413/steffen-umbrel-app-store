#!/usr/bin/env bash
set -Eeuo pipefail

BASE="/home/umbrel/umbrel/app-data/homelab-gbrain"
APP_ID="homelab-gbrain"
CONTAINER="gbrain_web_1"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="/home/umbrel/umbrel/app-data-update-backups"
BACKUP="$BACKUP_ROOT/gbrain-$STAMP"
export APP_DATA_DIR="$BASE"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$(cd -- "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$BASE/docker-compose.yml" || ! -d "$BASE/data" || ! -d "$BASE/brain" || ! -f "$SOURCE/Dockerfile" || ! -f "$SOURCE/umbrel-app.yml" ]]; then
  echo "refusing unexpected app layout at $BASE" >&2
  exit 1
fi

cd "$BASE"
mkdir -p "$BACKUP"

OLD_IMAGE="$(sudo docker inspect -f '{{.Image}}' "$CONTAINER")"
sudo docker image tag "$OLD_IMAGE" "codex-rollback/homelab-gbrain-web:$STAMP-before-update"

# Build before stopping production so dependency and source failures cause no outage.
VERSION="$(grep -m1 '^version:' "$SOURCE/umbrel-app.yml" | cut -d '"' -f 2)"
[[ "$VERSION" =~ ^[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+$ ]]
sudo docker build --pull=false -t homelab-gbrain-web:latest -t "homelab-gbrain-web:$VERSION" -t homelab-gbrain-web "$SOURCE"
sudo docker run --rm --entrypoint gbrain homelab-gbrain-web:latest --version

umbreld client apps.stop.mutate --appId "$APP_ID" >/dev/null
trap 'umbreld client apps.start.mutate --appId "$APP_ID" >/dev/null 2>&1 || true' EXIT

sudo tar -C "$BASE" -czf "$BACKUP/app-data.tgz" \
  Dockerfile docker-compose.yml umbrel-app.yml scripts secrets data brain
sudo sha256sum "$BACKUP/app-data.tgz" | sudo tee "$BACKUP/SHA256SUMS" >/dev/null

if [[ "$SOURCE" != "$BASE" ]]; then
  install -m 0664 "$SOURCE/Dockerfile" "$BASE/Dockerfile"
  install -m 0664 "$SOURCE/docker-compose.yml" "$BASE/docker-compose.yml"
  install -m 0664 "$SOURCE/umbrel-app.yml" "$BASE/umbrel-app.yml"
  install -m 0664 "$SOURCE/scripts/entrypoint.sh" "$BASE/scripts/entrypoint.sh"
  install -m 0664 "$SOURCE/scripts/gbrain-update.sh" "$BASE/scripts/gbrain-update.sh"
fi

sudo docker run --rm \
  --env-file "$BASE/secrets/gbrain.env" \
  -e HOME=/data \
  -e GBRAIN_HOME=/data \
  -e GBRAIN_NO_ONBOARD_NUDGE=1 \
  -v "$BASE/data:/data" \
  -v "$BASE/brain:/brain" \
  --entrypoint bash \
  homelab-gbrain-web:latest \
  -lc 'gbrain apply-migrations --force-schema --yes && gbrain jobs stats --json && gbrain doctor --json && gbrain stats'

umbreld client apps.start.mutate --appId "$APP_ID" >/dev/null
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3131/health >/dev/null 2>&1; then
    trap - EXIT
    echo "updated_ok backup=$BACKUP rollback_image=codex-rollback/homelab-gbrain-web:$STAMP-before-update"
    exit 0
  fi
  sleep 2
done

echo "healthcheck failed; backup=$BACKUP rollback_image=codex-rollback/homelab-gbrain-web:$STAMP-before-update" >&2
exit 1