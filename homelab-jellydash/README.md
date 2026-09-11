# Jellydash on Steffen's Umbrel

This app uses the official multi-architecture Jellydash image pinned to an immutable digest and a single SQLite database.

## Persistent runtime

All writable paths are under `${APP_DATA_DIR}`:

- `data/jellydash.sqlite` — database
- `cache/` and `runtime-cache/` — application caches
- `logs/` — application logs
- `uploads/` — uploaded/imported files
- `jellydash.env` — root runtime secret created on the Umbrel host; never committed

The container uses `restart: unless-stopped`; Umbrel keeps the app enabled after installation.

## Safe updates

1. Confirm the upstream release and successful amd64/arm64 image.
2. Stop Jellydash and copy `data/jellydash.sqlite` for rollback.
3. Resolve the new `latest` manifest digest and replace both the digest in `docker-compose.yml` and the version in `umbrel-app.yml` through a reviewed GitHub PR.
4. Pre-pull the pinned target digest on the Umbrel host.
5. Update only `homelab-jellydash` through Umbrel.
6. Verify Umbrel state, container health, HTTP 200, `/healthz.php`, `/api/now-playing.php`, `/api/system-status.php`, restart policy and persistent mounts.

Never place Jellyfin API tokens in this repository and never replace the pinned digest with an unpinned mutable image for production.
