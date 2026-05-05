# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Self-hosted fork of R10Progress: React SPA + Node/Express + SQLite, packaged as a single Docker image. No Firebase.

- **Frontend** (`src/`): React 18 + TypeScript, Vite, Tailwind, served by the backend in production.
- **Backend** (`server/`): Express on Node 22, SQLite via `@libsql/client`, OpenAI for shot analysis.
- **Container**: multi-stage `Dockerfile` builds SPA + server, serves both on port 8080. SQLite persists at `/data`.

## Development Commands

Package manager: **pnpm**.

### Frontend (repo root)

- `pnpm dev` — Vite dev server + API server concurrently (port 5173 + API).
- `pnpm build` — TypeScript compile + production Vite build.
- `pnpm lint` — ESLint over `src/`.
- `pnpm preview` — Preview the production build.

### Backend (`server/`)

- `pnpm dev` — `tsx watch` on `src/index.ts`.
- `pnpm build` — TypeScript compile to `dist/`.
- `pnpm start` — Run compiled server.

### Tests

- `pnpm test` — Run all Vitest tests (from repo root).
- `pnpm test -- src/utils/utils.test.ts` — Run a single test file.
- Tests use `globals: true` and `jsdom` environment (configured in `vite.config.ts`).

## Frontend Structure

- **State**: Context providers (User, Settings, Session) + Jotai for specific atoms.
- **Styling**: Tailwind + Sass, Headless UI, Heroicons.
- **Charts/Tables**: ECharts (`echarts-for-react`), React-Vega, AG Grid.

### Context providers (order in `main.tsx`)

1. `UserProvider`
2. `SettingsProvider`
3. `SessionProvider`

### Data Types

- `GolfSwingData` — multilingual (EN/DE/ES/NL) Garmin R10 CSV shape with unit conversions.
- Located at `src/types/GolfSwingData.ts`.

### API

`src/api.ts` is a thin `fetch` wrapper for the backend at `/api/*`. The Vite dev server proxies `/api` to the local Node server.

## Project Layout

- `src/components/` — UI components, organized by feature.
- `src/views/` — Page-level components.
- `src/hooks/` — Custom hooks.
- `src/utils/` — Helpers, data processing.
- `src/provider/` — Context providers.
- `server/src/` — Express server (routes, db, OpenAI integration).

## Key Features

- Garmin R10 CSV import with multi-language support.
- Dispersion charts and shot-table analysis.
- AI-powered shot analysis via OpenAI.
- Session-based organization with goals.

## Server Environment Variables

- `OPENAI_API_KEY` — Required for `/api/analyze` (AI shot analysis).
- `PORT` — Server port (default: `8080`).
- `STATIC_DIR` — Path to built SPA (default: `{cwd}/dist`).
- `DATA_DIR` — Directory for `sqlite.db` (default: `{cwd}/data`).

## Backend Routes

All routes mounted under `/api/`:

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/sessions/:filename` | Session CRUD |
| GET | `/reports`, `/reports/:id` | AI report retrieval |
| POST | `/analyze` | Analyze shots via OpenAI (gpt-4o-mini) |
| GET/PUT | `/settings` | User settings (IQR filter, units) |

## Notes

- Self-hosted Plausible-style analytics is loaded via `index.html` and proxied through `/api/wildflower/*`.
- Sentry was used upstream but is not wired in this fork.
- The `.env.example` contains stale Firebase vars and can be ignored — the app no longer uses Firebase.
