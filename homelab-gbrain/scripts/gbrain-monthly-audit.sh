#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/umbrel/umbrel/app-data/homelab-gbrain"
CONTAINER="gbrain_web_1"
LOG_DIR="$APP_DIR/logs"
LOG="$LOG_DIR/monthly-audit.log"
LOCK="/tmp/homelab-gbrain-maintenance.lock"
QUERIES="$APP_DIR/scripts/gbrain-monthly-queries.jsonl"
CANONICAL_AUDIT="$APP_DIR/scripts/gbrain-canonical-audit.py"
CONTRADICTION_CHECK="$APP_DIR/scripts/gbrain-contradiction-result-check.py"

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
    -v "$QUERIES:/audit-queries.jsonl:ro" \
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
  if sudo grep -Eq '^(OPENROUTER_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)=' "$APP_DIR/secrets/gbrain.env"; then
    CONTRADICTION_RESULT="$(mktemp)"
    run_gbrain eval suspected-contradictions run \
      --queries-file /audit-queries.jsonl \
      --top-k 5 \
      --limit 6 \
      --budget-usd 0.20 \
      --json \
      --yes >"$CONTRADICTION_RESULT" || echo "contradiction probe command failed"
    cat "$CONTRADICTION_RESULT"
    python3 "$CONTRADICTION_CHECK" "$CONTRADICTION_RESULT" || echo "contradiction probe is not currently trustworthy"
    rm -f "$CONTRADICTION_RESULT"
  else
    echo "CONTRADICTION_PROBE_SKIPPED: no LLM provider is configured in GBrain. Structural canonical/supersession checks still ran."
  fi
  start_and_wait
  curl -fsS http://127.0.0.1:3131/health
  echo
  echo "===== $(date -Is) gbrain monthly audit finished ====="
} >> "$LOG" 2>&1

trap - EXIT
