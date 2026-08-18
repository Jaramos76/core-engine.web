# Core Engine — Public Website

The public marketing website for **Core Engine** (`coreengine.online`), a
provider-neutral execution foundation for tools, memory, agents, skills,
diagnostics, and intelligent systems.

This repository contains **only the public website**. It is separate from
the main Core Engine runtime repository and contains no application
internals, credentials, or private infrastructure information.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

No CSS framework — styling is plain CSS (`app/globals.css`).

## Requirements

- Node.js 20 or later
- npm 9 or later

## Install

```bash
npm install
```

## Local development

```bash
npm run dev
```

Starts the app at `http://localhost:3000` with hot reload.

## Lint / type-check

```bash
npm run lint
npx tsc --noEmit
```

## Production build

```bash
npm run build
```

Compiles the app for production into `.next/`.

## Production start

```bash
npm start
```

Runs the compiled app with `next start`. By default it listens on port
`3000`; the port can be overridden with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

The full production path is:

```bash
npm install
npm run build
npm start
```

## Project structure

```
app/
  layout.tsx          Root layout, metadata, SEO
  page.tsx             Single-page site assembly
  globals.css           Global styles / design system
  icon.tsx              Generated favicon
  opengraph-image.tsx    Generated Open Graph image
  components/            Section components (Hero, Architecture, etc.)
public/                  Static assets
```

## GitHub deployment flow

1. Commit changes locally.
2. Push to the `main` branch (or open a pull request) on GitHub.
3. Deploy from the GitHub repository using the hosting method described
   below.

This project does not use any Vercel-specific APIs or configuration and
does not require Vercel to build or run.

## Hostinger deployment notes

This app runs as a standard Node.js server and is compatible with
Hostinger's Node.js hosting (hPanel → Node.js App).

1. In hPanel, create a Node.js application pointing at this repository
   (or upload the repository contents to the application directory).
2. Set the Node.js version to **20 or later**.
3. Set the application startup file / command so that Hostinger runs:
   - **Install command:** `npm install`
   - **Build command:** `npm run build`
   - **Start command:** `npm start`
4. Hostinger's Node.js hosting assigns a port via the `PORT` environment
   variable and proxies external traffic to it. `next start` reads `PORT`
   automatically — no code changes are required.
5. Point the domain `coreengine.online` at the Hostinger application
   (A record / Hostinger domain connection, per Hostinger's instructions).
6. Do not commit `.env` files. If environment variables are needed in the
   future, set them through hPanel's environment variable UI, not in the
   repository.

No custom server, no Vercel-only APIs (e.g. Edge Middleware, ISR on
Vercel's infrastructure), and no serverless-only features are used, so the
app is portable to any standard Node.js host.
