#!/usr/bin/env bash
set -euo pipefail

BASE=/home/umbrel/umbrel/app-data/gbrain
STAMP=$(date +%Y%m%d-%H%M%S)
cd $BASE

mkdir -p backups
sudo tar -czf backups/gbrain-before-update-$STAMP.tgz data brain secrets docker-compose.yml Dockerfile scripts

sudo docker compose down >/dev/null 2>&1 || true
sudo rm -rf data/.gbrain/brain.pglite/.gbrain-lock

sudo docker compose build --pull

sudo rm -rf data/.gbrain/brain.pglite/.gbrain-lock
sudo docker run --rm --entrypoint sh \
  -e HOME=/data \
  -e GBRAIN_HOME=/data \
  -v $BASE/data:/data \
  local/gbrain:0.42.52 \
  -lc 'cd /opt/gbrain && gbrain apply-migrations --yes && gbrain post-upgrade || true'

sudo rm -rf data/.gbrain/brain.pglite/.gbrain-lock
sudo docker run --rm --entrypoint sh \
  -e HOME=/data \
  -e GBRAIN_HOME=/data \
  -v $BASE/data:/data \
  local/gbrain:0.42.52 \
  -lc 'cd /opt/gbrain && gbrain doctor --json' > /tmp/gbrain-doctor-$STAMP.json || {
    echo doctor_failed_backup=$BASE/backups/gbrain-before-update-$STAMP.tgz >&2
    cat /tmp/gbrain-doctor-$STAMP.json >&2 || true
    exit 1
  }

sudo rm -rf data/.gbrain/brain.pglite/.gbrain-lock
sudo docker compose up -d

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3131/health >/dev/null 2>&1; then
    echo updated_ok_backup=$BASE/backups/gbrain-before-update-$STAMP.tgz
    exit 0
  fi
  sleep 2
done

echo healthcheck_failed_backup=$BASE/backups/gbrain-before-update-$STAMP.tgz >&2
sudo docker compose ps >&2 || true
sudo docker compose logs --tail=120 gbrain >&2 || true
exit 1
