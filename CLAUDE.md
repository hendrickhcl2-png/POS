# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fifty Tech POS** is a Point-of-Sale and billing system for the Dominican Republic, built as a Node.js/Express backend serving a vanilla JavaScript SPA frontend. It manages sales, inventory, clients, invoicing (with NCF for DR fiscal compliance), credits, returns, and shift reconciliation.

## Commands

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Production process manager
pm2 start ecosystem.config.js
```

The server applies schema changes inline on startup (see `initAuth()` in `server/server.js`); there is no standalone migration step. The `init-db` npm script and `database_schema.sql` file referenced by it no longer exist in the repo — ignore them. A one-off helper SQL for the services table lives at `src/crear_tabla_servicios.sql`.

No test suite is configured.

## Environment Setup

Copy `server/.env` (or use `.env.example` as reference) with:

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=fifty_tech_pos
DB_PASSWORD=
DB_PORT=5432
PORT=3000
SESSION_SECRET=...
```

The `.env` file lives at `server/.env` (loaded via `dotenv` with explicit path). Default credentials on first run: `admin/admin123`, `cajero/cajero123`.

## Architecture

### Backend (`server/`)

- **`server/server.js`** — Entry point. Registers all routes, runs `initAuth()` on startup which creates the `usuarios` table and applies incremental `ALTER TABLE` migrations inline.
- **`server/database/pool.js`** — Singleton `pg.Pool` used directly by all controllers and routes.
- **`server/routes/`** — Thin Express routers; most delegate to a matching controller in `server/controllers/`. Some simpler routes (categorias, clientes, productos, etc.) contain their DB logic directly without a separate controller file.
- **`server/controllers/`** — Controllers only exist for complex domains: `ventas-controller.js`, `pagos-controller.js`, `devoluciones-controller.js`, `reportes-controller.js`, `reportes-export-controller.js`.
- **`server/middleware/auth-middleware.js`** — Session-based auth with `requireAuth` and `requireAdmin` guards. Session stores `req.session.usuario`.

### Frontend (`public/`)

Single-page application — no build step, no framework, no bundler. Everything is plain HTML/CSS/JS loaded directly by the browser.

- **`public/index.html`** — Shell with sidebar nav and all section containers. Sections are shown/hidden via `showSection()`. Keyboard shortcuts (`1`–`9`) map to nav sections.
- **`public/index.js`** — Main orchestrator: initializes modules, handles login/logout, section switching, and global keyboard shortcuts.
- **`public/js/api/`** — API layer. `api-client.js` exports `window.APIClient` (fetch wrapper). Each domain (ventas, productos, clientes, etc.) has its own `*-api.js` that uses `APIClient`. Responses with `{ success, data }` shape are automatically unwrapped to return `data`.
- **`public/js/modules/`** — UI modules, one per feature section (e.g. `ventas.js`, `inventario.js`, `facturacion.js`). Each exports a module object with `init()` called when its section becomes active.
- **`public/js/utils/`** — Shared utilities: `formatters.js`, `validators.js`, `toast.js`, `logger.js`, `dom-utils.js`, `barcode-scanner.js`.
- **`public/modales/`** — Modal HTML fragments (`modales.html`, `modales-clientes.html`, `modales-inventario.html`) and `modales.js` for modal lifecycle management.

### Event Logging

Every message the user sees on screen, plus server errors, is appended to `logs/app-YYYY-MM-DD.log` (gitignored, 90-day retention) as one pipe-delimited line: `fecha y hora | nivel | origen | usuario | módulo | proceso | mensaje | detalle`.

- **`public/js/utils/logger.js`** — Loads right after `toast.js` and wraps `Toast.show/success/error/warning/info`, `console.error/warn`, `window.onerror`, `unhandledrejection` and the `#loginError` element. Module and process come from the call stack. Batches events and POSTs them to `/api/logs` (errors and login events go immediately).
- **`server/utils/logger.js`** — Writes the file through a queue, intercepts server-side `console.error/warn`, and deletes logs older than 90 days on startup.
- **`public/js/modules/logs-module.js`** + **`public/js/api/logs-api.js`** — Admin-only "Registro de Eventos" section (`#logs`, nav item `nav-logs`): filters by day, level, origin and text, expandable detail, copy/download, optional 15s auto-refresh (cleared by `showSection` when leaving).
- **`server/routes/logs.js`** — `POST /api/logs` accepts browser events (allowed without a session so login failures are recorded, rate-limited to 60/min for anonymous clients; the user is always taken from the session, never from the payload). `GET /api/logs` and `GET /api/logs/:fecha?lineas=&nivel=` are admin-only.

### Key Domain Concepts

- **NCF** — Dominican Republic fiscal invoice sequence numbers. Managed in `server/routes/facturacion.js`.
- **ITBIS** — DR VAT (18%). Optional per-sale toggle on the frontend.
- **Cuadre de turno** — Shift reconciliation/cash register closing.
- **Creditos** — Credit sales tracked separately; `creditos-module.js` + `pagos-routes.js`.
- **Salidas** — Cash outflows/expenses. `salidas-module.js` + `server/routes/salidas.js`.
- **Inventario vendido** — Sold inventory tracking view (`inventario-vendido-module.js`).

### Data Flow Pattern

Frontend module → `*-api.js` → `APIClient` → Express route → (controller or inline handler) → `pool.query()` → PostgreSQL (`fifty_tech_pos` DB).

All API routes except `/api/auth` are protected by `requireAuth`. Admin-only operations use `requireAdmin`.
