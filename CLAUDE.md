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

# Initialize DB schema manually (rarely needed — server auto-migrates on startup)
psql -U postgres -f database_schema.sql

# Production process manager
pm2 start ecosystem.config.js
```

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
- **`public/js/utils/`** — Shared utilities: `formatters.js`, `validators.js`, `toast.js`, `dom-utils.js`, `barcode-scanner.js`.
- **`public/modales/`** — Modal HTML fragments (`modales.html`, `modales-clientes.html`, `modales-inventario.html`) and `modales.js` for modal lifecycle management.

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
