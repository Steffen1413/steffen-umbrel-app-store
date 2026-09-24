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
BACKUP_READY=0
COMMITTED=0
STOPPED=0

rollback_on_error() {
  local status=$?
  if [[ "$status" -eq 0 || "$COMMITTED" -eq 1 ]]; then
    return
  fi
  if [[ "$BACKUP_READY" -eq 1 ]]; then
    echo "update failed; restoring pre-update app data from $BACKUP" >&2
    umbreld client apps.stop.mutate --appId "$APP_ID" >/dev/null 2>&1 || true
    if (cd "$BACKUP" && sudo sha256sum -c SHA256SUMS >/dev/null) \
      && sudo tar -C "$BASE" -xzf "$BACKUP/app-data.tgz"; then
      sudo docker image tag "$OLD_IMAGE" homelab-gbrain-web:latest
      sudo docker image tag "$OLD_IMAGE" homelab-gbrain-web
      umbreld client apps.start.mutate --appId "$APP_ID" >/dev/null 2>&1 || true
      echo "restore attempted; verify http://127.0.0.1:3131/health" >&2
    else
      echo "AUTOMATIC RESTORE FAILED; preserved backup=$BACKUP old_image=$OLD_IMAGE" >&2
    fi
  elif [[ "$STOPPED" -eq 1 ]]; then
    umbreld client apps.start.mutate --appId "$APP_ID" >/dev/null 2>&1 || true
  fi
}
trap rollback_on_error EXIT

if [[ ! -f "$BASE/docker-compose.yml" || ! -d "$BASE/data" || ! -d "$BASE/brain" || ! -f "$SOURCE/Dockerfile" || ! -f "$SOURCE/umbrel-app.yml" ]]; then
  echo "refusing unexpected app layout at $BASE" >&2
  exit 1
fi

cd "$BASE"
sudo mkdir -p "$BACKUP"

OLD_IMAGE="$(sudo docker inspect -f '{{.Image}}' "$CONTAINER")"
sudo docker image tag "$OLD_IMAGE" "codex-rollback/homelab-gbrain-web:$STAMP-before-update"

# Build before stopping production so dependency and source failures cause no outage.
VERSION="$(grep -m1 '^version:' "$SOURCE/umbrel-app.yml" | cut -d '"' -f 2)"
[[ "$VERSION" =~ ^[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+$ ]]
sudo docker build --pull=false -t homelab-gbrain-web:latest -t "homelab-gbrain-web:$VERSION" -t homelab-gbrain-web "$SOURCE"
sudo docker run --rm --entrypoint gbrain homelab-gbrain-web:latest --version

umbreld client apps.stop.mutate --appId "$APP_ID" >/dev/null
STOPPED=1

BACKUP_ITEMS=(Dockerfile docker-compose.yml umbrel-app.yml scripts secrets data brain)
if [[ -d "$BASE/brain-parent" ]]; then
  BACKUP_ITEMS+=(brain-parent)
fi
sudo tar -C "$BASE" -czf "$BACKUP/app-data.tgz" "${BACKUP_ITEMS[@]}"
sudo sha256sum "$BACKUP/app-data.tgz" | sudo tee "$BACKUP/SHA256SUMS" >/dev/null
(cd "$BACKUP" && sudo sha256sum -c SHA256SUMS >/dev/null)
BACKUP_READY=1

# The Markdown checkout retains its original host path. Only its parent
# writer-reservation directory is added, as a separate persistent mount.
sudo install -d -m 0755 "$BASE/brain-parent"

if [[ "$SOURCE" != "$BASE" ]]; then
  install -m 0664 "$SOURCE/Dockerfile" "$BASE/Dockerfile"
  install -m 0664 "$SOURCE/docker-compose.yml" "$BASE/docker-compose.yml"
  install -m 0664 "$SOURCE/umbrel-app.yml" "$BASE/umbrel-app.yml"
  install -m 0664 "$SOURCE/scripts/entrypoint.sh" "$BASE/scripts/entrypoint.sh"
  install -m 0664 "$SOURCE/scripts/gbrain-update.sh" "$BASE/scripts/gbrain-update.sh"
  install -m 0755 "$SOURCE/scripts/gbrain-maintenance.sh" "$BASE/scripts/gbrain-maintenance.sh"
  install -m 0755 "$SOURCE/scripts/gbrain-monthly-audit.sh" "$BASE/scripts/gbrain-monthly-audit.sh"
fi

run_new() {
  sudo docker run --rm \
    --entrypoint gbrain \
    --env-file "$BASE/secrets/gbrain.env" \
    -e HOME=/data \
    -e GBRAIN_HOME=/data \
    -e GBRAIN_NO_ONBOARD_NUDGE=1 \
    -v "$BASE/data:/data" \
    -v "$BASE/brain-parent:/brainparent" \
    -v "$BASE/brain:/brainparent/brain" \
    homelab-gbrain-web:latest "$@"
}

run_new apply-migrations --force-schema --yes
run_new config set sync.repo_path /brainparent/brain
if [[ ! -f "$BASE/data/.gbrain/schema-packs/homelab-gbrain-v2/pack.json" ]]; then
  run_new schema fork gbrain-base-v2 homelab-gbrain-v2
  run_new schema add-link-type related_to --pack homelab-gbrain-v2
fi
run_new config set schema_pack homelab-gbrain-v2
run_new schema validate homelab-gbrain-v2
run_new doctor --json
run_new stats

umbreld client apps.start.mutate --appId "$APP_ID" >/dev/null
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3131/health >/dev/null 2>&1; then
    COMMITTED=1
    trap - EXIT
    echo "updated_ok backup=$BACKUP rollback_image=codex-rollback/homelab-gbrain-web:$STAMP-before-update"
    exit 0
  fi
  sleep 2
done

echo "healthcheck failed; backup=$BACKUP rollback_image=codex-rollback/homelab-gbrain-web:$STAMP-before-update" >&2
exit 1
