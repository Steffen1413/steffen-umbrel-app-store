#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/umbrel/umbrel/app-data/homelab-gbrain"
CONTAINER="gbrain_web_1"
LOG_DIR="$APP_DIR/logs"
LOG="$LOG_DIR/maintenance.log"
LOCK="/tmp/homelab-gbrain-maintenance.lock"
RESERVATION_NAME=".gbrain-owner-430ae444967bf0680407d82932f98d8c7e6368226d2783426c9412a3db086342.json"
RESERVATION="$APP_DIR/data/.gbrain/persistence/reservations/$RESERVATION_NAME"

mkdir -p "$LOG_DIR"
sudo test -f "$RESERVATION" || { echo "missing GBrain writer reservation: $RESERVATION" >&2; exit 1; }

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) already running" >> "$LOG"
  exit 0
fi

IMAGE="$(sudo docker inspect -f '{{.Config.Image}}' "$CONTAINER" 2>/dev/null || true)"
if [[ -z "$IMAGE" ]]; then
  IMAGE="homelab-gbrain-web"
fi

run_gbrain() {
  sudo docker run --rm \
    --entrypoint gbrain \
    --env-file "$APP_DIR/secrets/gbrain.env" \
    -e HOME=/data \
    -e GBRAIN_HOME=/data \
    -e GBRAIN_NO_ONBOARD_NUDGE=1 \
    -v "$APP_DIR/data:/data" \
    -v "$APP_DIR/brain:/brain" \
    -v "$RESERVATION:/$RESERVATION_NAME:ro" \
    "$IMAGE" \
    "$@"
}

start_and_wait() {
  sudo docker start "$CONTAINER" >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3131/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

cleanup() {
  start_and_wait || true
}
trap cleanup EXIT

{
  echo "===== $(date -Is) gbrain maintenance start ====="
  sudo docker stop --time 30 "$CONTAINER" >/dev/null
  run_gbrain import /brain --no-embed
  # The current HTTP MCP does not reconcile remote Markdown links inline.
  # Legacy extraction is required while the source uses the unmanaged writer.
  writer_status="$(run_gbrain sources writer status --json)"
  if printf '%s\n' "$writer_status" | grep -Eq '"enabled"[[:space:]]*:[[:space:]]*false'; then
    run_gbrain extract --stale --catch-up
  else
    echo "ERROR: managed writer is active; link/timeline extraction needs a coordinated implementation" >&2
    exit 1
  fi
  run_gbrain embed --stale
  run_gbrain stats
  start_and_wait
  curl -fsS http://127.0.0.1:3131/health
  echo
  echo "===== $(date -Is) gbrain maintenance ok ====="
} >> "$LOG" 2>&1

trap - EXIT
