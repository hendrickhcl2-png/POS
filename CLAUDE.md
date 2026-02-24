# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fifty Tech POS** - A professional point-of-sale and invoicing system for the Dominican Republic. Built with Node.js/Express backend and vanilla JS frontend, backed by PostgreSQL.

## Commands

```bash
# Development (with auto-reload)
npm run dev

# Production start
npm start

# Initialize database schema
npm run init-db        # runs: psql -U postgres -f database_schema.sql
```

No test runner or linter is configured in this project.

## Environment Setup

The `.env` file lives at `server/.env` (not project root). Required variables:

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=fifty_tech_pos
DB_PASSWORD=
DB_PORT=5432
PORT=3000
NODE_ENV=development
```

## Architecture

### Backend (`server/`)

- **`server.js`** — Entry point. Registers all routes under `/api/{resource}` and serves `public/` as static files.
- **`database/pool.js`** — Shared PostgreSQL connection pool (imported by all controllers/routes).
- **`routes/`** — Express routers. Some delegate to a controller object (`ventas`, `clientes`, `productos`, `pagos`, `devoluciones`, `gastos`, `reportes`), others handle logic inline (`facturacion`, `inventario`, `categorias`, `proveedores`, `configuracion`, `servicios`).
- **`controllers/`** — Controller objects with async methods bound to routes.
- **`middleware/async-handler.js`** — Wraps async route handlers to forward errors to Express error handler.
- **`middleware/error-handler.js`** — Central error handler: maps PostgreSQL error codes (23505 = unique, 23503 = FK) to HTTP responses.

**Database transaction pattern** — Use `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` for multi-step operations; use `pool.query()` directly for single queries.

**API response format:**
```json
{ "success": true, "data": ..., "count": N }
{ "success": false, "message": "..." }
```

### Frontend (`public/`)

Single-page application. No build step — files served directly by Express.

- **`index.html`** — Single HTML file with all sections. `showSection(name)` switches views.
- **`js/api/api-client.js`** — Base HTTP client (`window.APIClient`) wrapping `fetch` against `http://localhost:3000/api`.
- **`js/api/{resource}-api.js`** — One module per resource, each exposing methods via `window.{Resource}API`.
- **`js/api/api-global.js`** — Aggregates all API modules into `window.API` (e.g., `window.API.Ventas`).
- **`js/modules/`** — Business logic per section (ventas, facturacion, inventario, etc.).
- **`js/utils/`** — Shared utilities: `dom-utils.js`, `formatters.js`, `validators.js`.
- **`js/components/`** — Reusable UI logic: `modal.js`, `descuentos.js`, `costos.js`, `caracteristicas.js`.
- **`modales/`** — Modal HTML fragments (`modales.html`, `modales-clientes.html`, `modales-inventario.html`) and `modales.js`.

### Database

Dumped from PostgreSQL 18.0. The authoritative schema is `fifty_tech_pos_backup.sql`.

**Core tables:**
- `ventas` — Sale tickets (`numero_ticket`: `A00000001`). Payment fields support `efectivo`, `tarjeta`, `transferencia`, `credito`, `mixto`.
- `detalle_venta` — Line items per venta. Inserting a row triggers `actualizar_stock_venta()`, which decrements `productos.stock_actual` automatically.
- `facturas` — Fiscal invoices (`numero_factura`: `FAC-00000001`, `ncf`: `B02-00000001`). States: `pendiente`, `pagada`, `vencida`, `anulada`, `parcial`.
- `detalle_factura` — Line items per factura. Tracks `cantidad_devuelta` for partial returns.
- `clientes` — Customers. `codigo` auto-generated as `CLI000001`. Fields: `cedula`, `rnc`, `limite_credito`, `saldo_pendiente`, `tipo_cliente` (`individual`/`corporativo`/`mayorista`).
- `productos` — Product catalog. Key fields: `codigo_barras` (unique, partial index), `imei` (unique, partial index), `stock_actual` (live stock), `precio_costo`, `precio_venta`, `precio_mayoreo`/`cantidad_mayoreo`, `aplica_itbis`. Also has JSONB columns `costos` and `caracteristicas` as denormalized snapshots.
- `proveedores` — Suppliers. `codigo` auto-generated as `PROV00001`.
- `categorias` — Product categories (unique `nombre`).
- `servicios` — Service catalog (installation, configuration, repair, etc.). `es_gratuito` marks courtesy services.
- `servicios_venta` — Services applied to a specific venta.
- `configuracion` — Business settings (name, RNC, ITBIS %, ticket series).
- `secuencias_ncf` — NCF number sequences per `tipo_comprobante` (01, 02, 14, 15).

**Financial tables:**
- `creditos` — Credit sales (`numero_credito`: `CRE00000001`). States: `activo`/`pagado`.
- `detalle_credito` — Items within a credit.
- `abonos` — Payments against a credit. Inserting triggers `actualizar_saldo_credito()` which updates `creditos` balance and `clientes.saldo_pendiente`.
- `pagos_factura` — Payments against a factura (`numero_pago`: `PAG-00000001`). Methods: `efectivo`, `tarjeta`, `transferencia`, `cheque`, `mixto`.
- `devoluciones` — Returns (`numero_devolucion`: `DEV-00000001`). Types: `parcial`/`total`. States: `procesada`/`anulada`.
- `detalle_devolucion` — Items within a return.
- `salidas` — Business expenses/outflows (`numero_salida`: `SAL00000001`).
- `facturas_servicio` — Supplier service invoices (purchases).

**Audit/inventory tables:**
- `movimientos_inventario` — All stock movements (entrada, salida, ajuste, devolucion, manual).
- `ajustes_inventario` — Manual inventory corrections.
- `historial_producto` — Field-level change log for products.
- `detalle_costo_producto` — Cost breakdown items per product (normalized version of `productos.costos` JSONB).
- `caracteristicas_producto` — Key-value product attributes (normalized version of `productos.caracteristicas` JSONB).

**Views:**
- `creditos_pendientes` — Active credits with vencimiento status (Vigente/Por vencer/Vencido).
- `ventas_del_dia` — Today's sales.
- `servicios_mas_usados` — Services ranked by usage count and revenue.

**Key triggers:**
- `detalle_venta` INSERT → decrements `productos.stock_actual`
- `abonos` INSERT → updates `creditos.saldo_pendiente` and `clientes.saldo_pendiente`
- `updated_at` triggers on: `clientes`, `creditos`, `facturas`, `proveedores`, `ventas`, `configuracion`, `servicios`

## Key Domain Concepts

- **Venta** — A sale transaction with items and payment info. Generates a ticket number.
- **Factura** — An invoice linked to a venta. Has NCF (comprobante fiscal) for Dominican Republic tax compliance. Can be `contado` or `credito`.
- **ITBIS** — Dominican Republic VAT (18%). Included/excluded per sale.
- **NCF** — Número de Comprobante Fiscal — required for fiscal invoices.
