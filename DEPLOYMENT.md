# Deployment

Production: **https://coreengine.online**

## Architecture

```
Internet
  → coreengine.online (DNS A → 2.25.81.58, the Hostinger VPS srv1816027)
  → Caddy container (openproject-op-caddy-1) — owns :80/:443, terminates TLS
  → coreengine-web:3000 on the docker network `caddy_shared`
  → Next.js standalone server (this app; no backend calls today)
```

The VPS runs several apps behind one shared Caddy. Each app is a Docker
service on the external `caddy_shared` network; Caddy reaches it by service
name. Core Engine Web follows the same pattern as `cad-audit`, `cpm`, etc.

- App checkout on the VPS: `/opt/core-engine-web`
- Compose project: `core-engine-web`, service `coreengine-web`, image
  `core-engine-web:latest`
- Port 3000 is **never** published to the host — only Caddy can reach it.
- Caddyfile: `/opt/openproject/Caddyfile` (host file, bind-mounted into the
  Caddy container). Core Engine block:

  ```
  coreengine.online {
      reverse_proxy coreengine-web:3000
  }
  www.coreengine.online {
      redir https://coreengine.online{uri} permanent
  }
  ```

## Local development

Unchanged and independent of production:

```bash
npm install
npm run dev        # http://localhost:3000
```

Correctness gate before pushing: `npx tsc --noEmit && npm run lint && npm run build`.

## Production — automatic

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`):

1. `verify`: `npm ci`, `tsc --noEmit`, `npm run lint`, `npm run build`
2. `deploy`: SSH to the VPS, run `./deploy/deploy.sh`, which:
   - snapshots the current checkout to `/opt/core-engine-web-rollbacks/<ts>`
   - tags the running image `core-engine-web:previous`
   - `git reset --hard origin/main`
   - `docker compose build` — if this fails, production is left untouched
   - `docker compose up -d`
   - polls `/api/health` for up to 60 s
   - on health failure: `git reset --hard` to the previous commit, retag the
     previous image, `docker compose up -d --force-recreate`, verify the
     rollback is healthy, exit non-zero

A broken push therefore never leaves the site down.

Deploy user: **`ceweb`** — a dedicated non-root user in the `docker` group that
owns `/opt/core-engine-web` and `/opt/core-engine-web-rollbacks`. It exists
only for this deployment; the other apps and the `tunnel` user are untouched.

### Required GitHub repository secrets

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | `2.25.81.58` |
| `DEPLOY_USER` | `ceweb` |
| `DEPLOY_SSH_KEY` | the deploy private key (public half in `/home/ceweb/.ssh/authorized_keys`) |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 2.25.81.58` |

## Production — manual (first bring-up or recovery)

```bash
ssh ceweb@2.25.81.58
cd /opt/core-engine-web
git pull
docker compose up -d --build
docker compose logs -f coreengine-web
```

Manual rollback:

```bash
cd /opt/core-engine-web
git reset --hard $(cat /opt/core-engine-web-rollbacks/<ts>/.rollback_sha)
docker compose up -d --build
```

## Server-side configuration

`/opt/core-engine-web/.env` (`ceweb`-owned, `chmod 600`, **never committed**):

```
CE_DEMO_PASSWORD=<strong value>
```

This is a temporary shared password (any username works) until real Core
Engine authentication is implemented. It is read server-side only and is
never included in client JavaScript. If it is unset in a production build,
the login endpoint returns 503 rather than allowing access.

## Restart / reboot behaviour

`restart: unless-stopped` plus Docker's own enabled `docker.service` means the
container returns after a crash and after a VPS reboot with no manual action.

## Staging (future)

`compose.staging.yaml` and a `dev.coreengine.online` Caddy block are prepared
but not active. To enable: add the DNS record, add the Caddy block, and run
`docker compose -f compose.staging.yaml up -d --build` from a `dev`-branch
checkout at `/opt/core-engine-web-staging`.

## Obsidian Vault

Out of scope and untouched. Future Vault access will be through the Core
Engine backend/API, never direct filesystem access from the browser.
