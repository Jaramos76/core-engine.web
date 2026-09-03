#!/usr/bin/env bash
# Core Engine Web — VPS deploy / rollback.
#
# Runs on the VPS in the app checkout (default /opt/core-engine-web). Pulls the
# target branch, rebuilds the container, verifies health, and rolls back to the
# previously deployed commit + image if the build or healthcheck fails.
#
#   ./deploy/deploy.sh              # deploy origin/main
#   DEPLOY_BRANCH=dev ./deploy/deploy.sh
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/core-engine-web}"
ROLLBACK_ROOT="${ROLLBACK_ROOT:-/opt/core-engine-web-rollbacks}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
SERVICE="coreengine-web"
IMAGE="core-engine-web:latest"
HEALTH_URL="http://127.0.0.1:3000/api/health"
KEEP_ROLLBACKS="${KEEP_ROLLBACKS:-5}"
TS="$(date +%Y%m%d-%H%M%S)"

cd "$APP_DIR"
log() { printf '[deploy %s] %s\n' "$(date -Is)" "$*"; }
dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

PREV_SHA="$(git rev-parse HEAD)"
log "app dir     : $APP_DIR"
log "current sha : $PREV_SHA"

git fetch --prune origin "$BRANCH"
NEW_SHA="$(git rev-parse "origin/${BRANCH}")"
log "target sha  : $NEW_SHA (origin/${BRANCH})"

# --- rollback snapshot (code + env; this app has no data volume) -------------
mkdir -p "$ROLLBACK_ROOT"
ROLLBACK_DIR="${ROLLBACK_ROOT}/${TS}"
log "snapshot    : $ROLLBACK_DIR"
mkdir -p "$ROLLBACK_DIR"
git archive HEAD | tar -x -C "$ROLLBACK_DIR"
[ -f .env ] && cp -a .env "$ROLLBACK_DIR/.env"
echo "$PREV_SHA" > "$ROLLBACK_DIR/.rollback_sha"
# prune old snapshots
mapfile -t OLD < <(ls -1dt "${ROLLBACK_ROOT}"/*/ 2>/dev/null | tail -n +$((KEEP_ROLLBACKS + 1)) || true)
[ "${#OLD[@]}" -gt 0 ] && rm -rf "${OLD[@]}" && log "pruned ${#OLD[@]} old snapshot(s)"

# keep the current image reachable for a fast rollback
docker image tag "$IMAGE" "core-engine-web:previous" 2>/dev/null || true

# --- build (production is untouched until this succeeds) --------------------
git checkout -q "$BRANCH"
git reset --hard "origin/${BRANCH}"
log "building…"
if ! dc build; then
  log "BUILD FAILED — production left running on ${PREV_SHA}"
  git reset --hard "$PREV_SHA"
  exit 1
fi

# --- database migrations (explicit, before the new app starts) ------------
log "starting database…"
dc up -d db
log "applying migrations…"
if ! dc run --rm migrate; then
  log "MIGRATION FAILED — rolling back to ${PREV_SHA}"
  git reset --hard "$PREV_SHA"
  docker image tag "core-engine-web:previous" "$IMAGE" 2>/dev/null || true
  dc up -d
  exit 1
fi

# --- activate -------------------------------------------------------------
dc up -d

log "waiting for health…"
healthy=0
for _ in $(seq 1 30); do
  if dc exec -T "$SERVICE" wget -q -O /dev/null "$HEALTH_URL" 2>/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  log "HEALTHCHECK FAILED — rolling back to ${PREV_SHA}"
  git reset --hard "$PREV_SHA"
  docker image tag "core-engine-web:previous" "$IMAGE" 2>/dev/null || true
  dc up -d --force-recreate
  # confirm the rollback is itself healthy
  for _ in $(seq 1 20); do
    dc exec -T "$SERVICE" wget -q -O /dev/null "$HEALTH_URL" 2>/dev/null && {
      log "rollback healthy on ${PREV_SHA}"
      exit 1
    }
    sleep 2
  done
  log "ROLLBACK ALSO UNHEALTHY — manual intervention required"
  exit 2
fi

echo "$NEW_SHA" > .deployed_sha
date -Is > .deployed_stamp
log "deployed ${NEW_SHA} — healthy ✓"
