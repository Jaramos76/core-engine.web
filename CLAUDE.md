# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The public marketing website for **Core Engine** (`coreengine.online`) — a
provider-neutral execution foundation for tools, memory, agents, skills,
diagnostics, and intelligent systems. This repo contains **only the public
website**: a single-page Next.js site. It is separate from the main Core
Engine runtime repository and must not contain application internals,
credentials, or private infrastructure information.

## Commands

```bash
npm install          # install dependencies
npm run dev           # local dev server at http://localhost:3000, hot reload
npm run lint          # eslint (flat config, eslint-config-next)
npx tsc --noEmit       # type-check (no test suite exists)
npm run build          # production build into .next/
npm start               # run compiled app (next start); honors PORT env var
```

There is no test suite. Treat `npm run lint` and `npx tsc --noEmit` as the
correctness gate before considering a change done.

## Architecture

Next.js **App Router**, single route. Everything renders through
`app/page.tsx`, which composes section components in order:

```
Header → Hero → WhatIsCoreEngine → ArchitectureDiagram → Principles
  → DevelopmentStatus → Developers → Footer
```

Each section is a self-contained component in `app/components/`, mapped to
an anchor id used by in-page nav links (`Header.tsx`'s `links` array →
`#what-is`, `#architecture`, `#principles`, `#status`, `#developers`).
Adding, removing, or reordering a section means updating both `page.tsx`
and the nav links in `Header.tsx` together.

Components are server components by default; only add `"use client"` when
a component needs interactivity/state (e.g. `Header.tsx` for its mobile
nav toggle). Don't add a client boundary unless one is actually needed.

**Styling**: no CSS framework, no CSS modules — a single global stylesheet
(`app/globals.css`) with CSS custom properties defined on `:root` (colors,
fonts, `--max-width`) plus shared utility classes (`.container`, `.eyebrow`,
`.section-heading`, `.section-intro`, `.mono`, `.btn`, status-dot classes,
etc.). Reuse these existing tokens/classes and follow the dark,
monospace-accented design system rather than introducing inline styles or
one-off color values.

**Generated images**: `app/icon.tsx` (favicon) and `app/opengraph-image.tsx`
(OG image) use `next/og`'s `ImageResponse`, which cannot read from
`public/`. Both import `LOGO_DATA_URI` from `app/logo-data-uri.ts` — a
base64-inlined copy of `public/logo.svg`. If `public/logo.svg` changes,
regenerate this constant with `base64 -w0 public/logo.svg` and update
`logo-data-uri.ts` to match, or the favicon/OG image will drift out of
sync with the real logo.

**Security headers** are set centrally in `next.config.ts` (CSP, HSTS,
X-Frame-Options, etc.) via `headers()`. If a change requires loading a new
script/style/image/connect origin, update the CSP there rather than
disabling it.

## Deployment

No Vercel-specific APIs, no Edge Middleware, no ISR — deliberately kept
portable to any standard Node.js host. Production deploys run
`npm install && npm run build && npm start` (currently targeted at
Hostinger's Node.js hosting, which assigns `PORT` and proxies to it).
Don't introduce Vercel-only or serverless-only features without updating
this deployment story.
