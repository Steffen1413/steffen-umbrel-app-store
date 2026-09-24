#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/umbrel/umbrel/app-data/homelab-gbrain"
CONTAINER="gbrain_web_1"
LOG_DIR="$APP_DIR/logs"
LOG="$LOG_DIR/monthly-audit.log"
LOCK="/tmp/homelab-gbrain-maintenance.lock"
CANONICAL_AUDIT="$APP_DIR/scripts/gbrain-canonical-audit.py"
CONTRADICTION_CHECK="$APP_DIR/scripts/gbrain-contradiction-result-check.py"
QUERIES="$APP_DIR/scripts/gbrain-monthly-queries.jsonl"
BACKUP_ROOT="/home/umbrel/umbrel/app-data-update-backups"
SNAP=""
PROBE_CONTAINER=""

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
  if [[ "$PROBE_CONTAINER" == gbrain-monthly-probe-* ]]; then
    sudo docker rm -f "$PROBE_CONTAINER" >/dev/null 2>&1 || true
  fi
  if [[ -n "$SNAP" && -d "$SNAP" ]]; then
    local resolved
    resolved="$(realpath -e -- "$SNAP")"
    if [[ "$resolved" == "$BACKUP_ROOT"/gbrain-monthly-audit-* ]]; then
      sudo rm -rf -- "$resolved"
    else
      echo "refusing unexpected audit snapshot path: $resolved" >&2
    fi
  fi
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
  echo "Missing created metadata: $(grep -c ' missing-created:' "$LINT_RESULT" || true); date-template markers: $(grep -c ' placeholder-date:' "$LINT_RESULT" || true)"
  tail -n 8 "$LINT_RESULT"
  rm -f "$LINT_RESULT"
  run_gbrain check-backlinks check /brainparent/brain || echo "backlink check reported findings"
  # Snapshot the stopped PGLite owner, then bring production back before the
  # network-bound LLM probe. The snapshot is private and discarded afterwards.
  SNAP="$(sudo mktemp -d "$BACKUP_ROOT/gbrain-monthly-audit-XXXXXX")"
  sudo cp -a --reflink=auto "$APP_DIR/data" "$SNAP/data"
  sudo cp -a --reflink=auto "$APP_DIR/brain" "$SNAP/brain"
  sudo install -d -m 0755 "$SNAP/brain-parent"
  start_and_wait
  curl -fsS http://127.0.0.1:3131/health
  echo
  if sudo grep -Eq '^(OPENROUTER_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)=.+' "$APP_DIR/secrets/gbrain.env"; then
    PROBE_CONTAINER="gbrain-monthly-probe-$(date +%Y%m%d%H%M%S)"
    if sudo timeout --signal=TERM --kill-after=5s 180s docker run --rm \
      --name "$PROBE_CONTAINER" --entrypoint gbrain \
      --env-file "$APP_DIR/secrets/gbrain.env" \
      -e HOME=/data -e GBRAIN_HOME=/data -e GBRAIN_NO_ONBOARD_NUDGE=1 \
      -v "$SNAP/data:/data" \
      -v "$SNAP/brain-parent:/brainparent" \
      -v "$SNAP/brain:/brainparent/brain:ro" \
      -v "$QUERIES:/audit-queries.jsonl:ro" \
      "$IMAGE" eval suspected-contradictions run \
      --queries-file /audit-queries.jsonl --top-k 3 --limit 6 \
      --budget-usd 0.20 --json --yes >"$SNAP/probe-result.json"; then
      jq '{run_status, queries_evaluated, judge_errors, verdict_breakdown, cost_usd, duration_ms}' "$SNAP/probe-result.json"
      python3 "$CONTRADICTION_CHECK" "$SNAP/probe-result.json" || echo "contradiction probe result is not currently trustworthy"
    else
      echo "CONTRADICTION_PROBE_INCOMPLETE: clone-only run failed or exceeded 180s; production remains available."
    fi
  else
    echo "CONTRADICTION_PROBE_SKIPPED: no LLM provider is configured."
  fi
  echo "===== $(date -Is) gbrain monthly audit finished ====="
} >> "$LOG" 2>&1

cleanup
trap - EXIT
