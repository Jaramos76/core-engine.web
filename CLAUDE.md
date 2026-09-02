# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this repo is

**Core Engine Web** — the public site and the Agentic OS front end for Core
Engine (`coreengine.online`). It is a single Next.js (App Router) application
with three surfaces:

- `/` — the public marketing site (`app/page.tsx` + `app/components/`).
- `/login` — the Rubik's Cube authentication front page.
- `/dashboard` — the Agentic OS workspace (3D knowledge/agent graph, command
  palette, contextual inspector, Lola, attention engine, timeline).

It does not contain Core Engine runtime internals, credentials, or private
infrastructure. All `/dashboard` data is currently mock data isolated in
`lib/os/mock/`; the app makes no backend calls (only same-origin `/api/auth`).

## Commands

```bash
npm install
npm run dev            # http://localhost:3000, hot reload
npm run lint           # eslint (flat config)
npx tsc --noEmit       # type-check (no test suite)
npm run build          # production build (standalone output)
npm start              # run the compiled app
```

`npm run lint` and `npx tsc --noEmit` are the correctness gate. There is no
test suite. Both run in CI before any deploy.

## Architecture

**Marketing site** (`/`): server components composed in `app/page.tsx`
(`Header → Hero → WhatIsCoreEngine → ArchitectureDiagram → Principles →
DevelopmentStatus → Developers → Footer`). Section ids match the nav links in
`Header.tsx`.

**Agentic OS** (`/dashboard`):
- `lib/os/` — framework-agnostic domain layer: `types.ts` (entity + relationship
  model), `mock/dataset.ts` (isolated demo data — replace with an API loader
  later), `graph.ts` (entity→graph projection), `attention.ts` (scoring),
  `commands.ts` + `lola.ts` (NL command interpreter), `visual.ts` (per-category
  colour/shape).
- `app/dashboard/_os/` — the workspace UI. `OSProvider.tsx` is the single state
  store. `graph/` holds the React Three Fiber force-directed 3D graph.
- `app/dashboard/_os/graph/**` and `app/login/_cube/**` drive Three.js
  imperatively from inside `useFrame`. `eslint.config.mjs` disables
  `react-hooks/refs` and `react-hooks/immutability` for those paths only —
  keep that pattern local to the 3D code.

**Login** (`/login`): `app/login/_cube/` is the animated cube; `app/login/_auth/`
is the auth service seam; `app/api/auth/route.ts` is a temporary shared-password
endpoint (`CE_DEMO_PASSWORD`) standing in until real Core Engine auth exists.

**Styling**: no CSS framework. `app/globals.css` holds design tokens on `:root`
and shared classes; `/login` and `/dashboard` each have a scoped stylesheet
(`app/login/login.css`, `app/dashboard/os.css`) that reuses those tokens.

**3D dependencies**: `three`, `@react-three/fiber`, `@react-three/drei`,
`d3-force-3d`, `framer-motion`. The heavy canvases are `dynamic(..., { ssr:false })`.

**Security headers** (CSP, HSTS, etc.) are centralized in `next.config.ts`
`headers()`. `'unsafe-eval'` is added only in dev (Turbopack). Update the CSP
there rather than disabling it if a new origin is needed.

## Deployment

Production runs as a Docker container on the Hostinger VPS behind a shared
Caddy reverse proxy, deployed automatically on push to `main`. See
`DEPLOYMENT.md`. `output: "standalone"` in `next.config.ts` and the `Dockerfile`
exist for this — keep the app portable to a plain Node host (no Vercel-only or
serverless-only features).
