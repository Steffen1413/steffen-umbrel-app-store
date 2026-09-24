#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/umbrel/umbrel/app-data/homelab-gbrain"
CONTAINER="gbrain_web_1"
LOG_DIR="$APP_DIR/logs"
LOG="$LOG_DIR/maintenance.log"
LOCK="/tmp/homelab-gbrain-maintenance.lock"

mkdir -p "$LOG_DIR"

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
    -v "$APP_DIR/brain-parent:/brainparent" \
    -v "$APP_DIR/brain:/brainparent/brain:ro" \
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
  # 0.54 protects the canonical checkout: direct import is refused once the
  # writer has registered it. MCP/capture writes already update the database
  # and Markdown together; reconcile exceptional file edits per page.
  run_gbrain extract --stale --catch-up
  run_gbrain embed --stale
  run_gbrain stats
  start_and_wait
  curl -fsS http://127.0.0.1:3131/health
  echo
  echo "===== $(date -Is) gbrain maintenance ok ====="
} >> "$LOG" 2>&1

trap - EXIT
