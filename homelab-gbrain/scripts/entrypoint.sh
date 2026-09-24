#!/usr/bin/env bash
set -euo pipefail

export HOME="${HOME:-/data}"
export GBRAIN_HOME="${GBRAIN_HOME:-/data}"
GBRAIN_CONFIG="$GBRAIN_HOME/.gbrain/config.json"
GBRAIN_LOCK_DIR="$GBRAIN_HOME/.gbrain/brain.pglite/.gbrain-lock"

mkdir -p "$HOME" "$GBRAIN_HOME" /brainparent/brain

if ! command -v gbrain >/dev/null 2>&1; then
  echo "gbrain command not found" >&2
  exit 127
fi

if [[ -d "$GBRAIN_LOCK_DIR" ]]; then
  case "$GBRAIN_LOCK_DIR" in
    "$GBRAIN_HOME/.gbrain/brain.pglite/.gbrain-lock")
      echo "[gbrain] removing stale PGLite lock"
      rm -rf -- "$GBRAIN_LOCK_DIR"
      ;;
    *)
      echo "[gbrain] refusing unexpected lock path: $GBRAIN_LOCK_DIR" >&2
      exit 1
      ;;
  esac
fi

if [[ ! -f "$GBRAIN_CONFIG" ]]; then
  echo "[gbrain] first init in $GBRAIN_HOME"
  if [[ -n "${OPENAI_API_KEY:-}" || -n "${ZEROENTROPY_API_KEY:-}" || -n "${VOYAGE_API_KEY:-}" ]]; then
    gbrain init --pglite
  else
    gbrain init --pglite --no-embedding
  fi
  gbrain config set search.mode conservative || true
  gbrain config set mcp.publish_skills true || true
fi

# Keep the persistent database compatible with the pinned image after both
# Umbrel updates and ordinary container restarts. This command is idempotent.
gbrain apply-migrations --force-schema --yes
gbrain config set sync.repo_path /brainparent/brain

exec "$@"
