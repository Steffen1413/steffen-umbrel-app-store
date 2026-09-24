#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/umbrel/umbrel/app-data/homelab-gbrain"
CONTAINER="gbrain_web_1"
LOG_DIR="$APP_DIR/logs"
LOG="$LOG_DIR/monthly-audit.log"
LOCK="/tmp/homelab-gbrain-maintenance.lock"
CANONICAL_AUDIT="$APP_DIR/scripts/gbrain-canonical-audit.py"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) maintenance lock busy; monthly audit skipped" >> "$LOG"
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
    -e GBRAIN_NO_PROBE_PROMPT=1 \
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
  echo "===== $(date -Is) gbrain monthly audit start ====="
  python3 "$CANONICAL_AUDIT" "$APP_DIR/brain" || echo "canonical audit found high-priority findings"
  sudo docker stop --timeout 30 "$CONTAINER" >/dev/null
  run_gbrain doctor --json --fast || echo "doctor returned non-zero"
  run_gbrain orphans --json || echo "orphans check returned non-zero"
  LINT_RESULT="$(mktemp)"
  run_gbrain lint /brainparent/brain >"$LINT_RESULT" 2>&1 || true
  echo "Lint summary (legacy pages may lack created metadata):"
  tail -n 8 "$LINT_RESULT"
  rm -f "$LINT_RESULT"
  run_gbrain check-backlinks check /brainparent/brain || echo "backlink check reported findings"
  # The optional LLM probe can keep the PGLite service stopped for minutes,
  # and its current model has no pricing entry (the USD cost gate is disabled).
  # Run it separately on a clone after a real spend limit and timeout exist.
  echo "CONTRADICTION_PROBE_SKIPPED: separate bounded clone-based check required; structural checks completed."
  start_and_wait
  curl -fsS http://127.0.0.1:3131/health
  echo
  echo "===== $(date -Is) gbrain monthly audit finished ====="
} >> "$LOG" 2>&1

trap - EXIT
