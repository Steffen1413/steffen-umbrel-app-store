#!/usr/bin/env bash
set -euo pipefail

export HOME=${HOME:-/data}
export GBRAIN_HOME=${GBRAIN_HOME:-/data}
GBRAIN_CONFIG=$GBRAIN_HOME/.gbrain/config.json

mkdir -p $HOME $GBRAIN_HOME /brain
GBRAIN_LOCK_DIR=$GBRAIN_HOME/.gbrain/brain.pglite/.gbrain-lock


if ! command -v gbrain >/dev/null 2>&1; then
  echo gbrain command not found >&2
  exit 127
fi

if [ -d $GBRAIN_LOCK_DIR ]; then
  echo [gbrain] removing stale PGLite lock
  rm -rf $GBRAIN_LOCK_DIR
fi

if [ ! -f $GBRAIN_CONFIG ]; then
  echo [gbrain] first init in $GBRAIN_HOME
  if [ -n ${OPENAI_API_KEY:-} ] || [ -n ${ZEROENTROPY_API_KEY:-} ] || [ -n ${VOYAGE_API_KEY:-} ]; then
    gbrain init --pglite
  else
    gbrain init --pglite --no-embedding
  fi
  gbrain config set search.mode conservative || true
  gbrain config set mcp.publish_skills true || true
fi

exec $@
