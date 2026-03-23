// ==================== SERVER.JS ====================
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fifty_tech_fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));

// ==================== IMPORTAR RUTAS ====================
const authRoutes = require("./routes/auth");
const clientesRoutes = require("./routes/clientes");
const productosRoutes = require("./routes/productos");
const ventasRoutes = require("./routes/ventas");
const inventarioRoutes = require("./routes/inventario");
const serviciosRoutes = require("./routes/servicios");
const facturacionRoutes = require("./routes/facturacion");
const categoriasRoutes = require("./routes/categorias");
const proveedoresRoutes = require("./routes/proveedores");
const configuracionRoutes = require("./routes/configuracion");
const reportesRoutes = require("./routes/reportes");
const devolucionesRoutes = require("./routes/devoluciones-routes");
const pagosRoutes = require("./routes/pagos-routes");
const salidasRoutes = require("./routes/salidas");
const categoriasGastoRoutes = require("./routes/categorias-gasto");
const imprimirRoutes = require("./routes/imprimir");

const { requireAuth } = require("./middleware/auth-middleware");

// ==================== REGISTRAR RUTAS ====================
app.use("/api/auth", authRoutes);
app.use("/api/clientes", requireAuth, clientesRoutes);
app.use("/api/productos", requireAuth, productosRoutes);
app.use("/api/ventas", requireAuth, ventasRoutes);
app.use("/api/inventario", requireAuth, inventarioRoutes);
app.use("/api/servicios", requireAuth, serviciosRoutes);
app.use("/api/facturas", requireAuth, facturacionRoutes);
app.use("/api/categorias", requireAuth, categoriasRoutes);
app.use("/api/proveedores", requireAuth, proveedoresRoutes);
app.use("/api/configuracion", requireAuth, configuracionRoutes);
app.use("/api/reportes", requireAuth, reportesRoutes);
app.use("/api/devoluciones", requireAuth, devolucionesRoutes);
app.use("/api/pagos", requireAuth, pagosRoutes);
app.use("/api/salidas", requireAuth, salidasRoutes);
app.use("/api/categorias-gasto", requireAuth, categoriasGastoRoutes);
app.use("/api/imprimir", requireAuth, imprimirRoutes);

// ==================== RUTA RAÍZ ====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ==================== HEALTH CHECK ====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ==================== MANEJADOR DE ERRORES ====================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
  });
});

// ==================== INIT AUTH (tabla + seeds) ====================
async function initAuth() {
  const pool = require("./database/pool");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(100),
        rol VARCHAR(20) NOT NULL DEFAULT 'cajero' CHECK (rol IN ('admin', 'cajero')),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const count = await pool.query("SELECT COUNT(*) FROM usuarios");
    if (parseInt(count.rows[0].count) === 0) {
      const adminHash = await bcrypt.hash("admin123", 10);
      const cajeroHash = await bcrypt.hash("cajero123", 10);
      await pool.query(
        `INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES
         ($1, $2, 'Administrador', 'admin'),
         ($3, $4, 'Cajero', 'cajero')`,
        ["admin", adminHash, "cajero", cajeroHash]
      );
      console.log("✅ Usuarios iniciales creados (admin, cajero)");
    }
    // Migración: columna creado_por en productos
    await pool.query(`
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS creado_por VARCHAR(100)
    `);
    // Migración: columnas de factura del proveedor en productos
    await pool.query(`
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS factura_proveedor_numero VARCHAR(100)
    `);
    await pool.query(`
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS factura_proveedor_fecha DATE
    `);
    await pool.query(`
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS ncf VARCHAR(19)
    `);
    // Migración: columna nombre_impresora en configuracion
    await pool.query(`
      ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS nombre_impresora VARCHAR(255)
    `);
    // Migración: columnas de usuario en ventas
    await pool.query(`
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS usuario_id INTEGER
    `);
    await pool.query(`
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS usuario_nombre VARCHAR(100)
    `);
    // Migración: columna imei en detalle_venta
    await pool.query(`
      ALTER TABLE detalle_venta ADD COLUMN IF NOT EXISTS imei VARCHAR(50)
    `);
    // Migración: columnas ncf y numero_referencia en salidas
    await pool.query(`
      ALTER TABLE salidas ADD COLUMN IF NOT EXISTS ncf VARCHAR(20)
    `);
    await pool.query(`
      ALTER TABLE salidas ADD COLUMN IF NOT EXISTS numero_referencia VARCHAR(100)
    `);

    // Migración: tabla categorías de gasto con valores por defecto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias_gasto (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL
      )
    `);
    const catGastoCount = await pool.query("SELECT COUNT(*) FROM categorias_gasto");
    if (parseInt(catGastoCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO categorias_gasto (nombre) VALUES
          ('Alquiler'), ('Servicios'), ('Salarios'),
          ('Compras de Inventario'), ('Mantenimiento'),
          ('Transporte'), ('Otros')
      `);
    }

    // Corrección: facturas de ventas a crédito que quedaron como contado/pagada por bug anterior
    const correccionCreditos = await pool.query(`
      UPDATE facturas f
      SET
        tipo_factura   = 'credito',
        estado         = 'pendiente',
        monto_pagado   = 0,
        saldo_pendiente = f.total
      FROM ventas v
      WHERE f.venta_id = v.id
        AND v.metodo_pago = 'credito'
        AND f.tipo_factura = 'contado'
        AND f.estado = 'pagada'
        AND COALESCE(f.saldo_pendiente, 0) = 0
        AND NOT EXISTS (
          SELECT 1 FROM pagos_factura pf WHERE pf.factura_id = f.id
        )
    `);
    if (correccionCreditos.rowCount > 0) {
      console.log(`✅ Corrección: ${correccionCreditos.rowCount} factura(s) de crédito actualizadas a estado pendiente`);

      // Recalcular saldo_pendiente de los clientes afectados
      await pool.query(`
        UPDATE clientes c
        SET saldo_pendiente = (
          SELECT COALESCE(SUM(f.saldo_pendiente), 0)
          FROM facturas f
          WHERE f.cliente_id = c.id
            AND f.estado IN ('pendiente', 'parcial')
        )
        WHERE c.id IN (
          SELECT DISTINCT f.cliente_id
          FROM facturas f
          JOIN ventas v ON f.venta_id = v.id
          WHERE v.metodo_pago = 'credito'
            AND f.tipo_factura = 'credito'
            AND c.id IS NOT NULL
        )
      `);
    }

    // Corrección: sincronizar facturas.fecha con ventas.fecha donde difieran
    const syncFechas = await pool.query(`
      UPDATE facturas f
      SET fecha = v.fecha
      FROM ventas v
      WHERE f.venta_id = v.id
        AND v.fecha::date != f.fecha::date
        AND v.estado != 'anulada'
    `);
    if (syncFechas.rowCount > 0) {
      console.log(`✅ Corrección: ${syncFechas.rowCount} factura(s) con fecha sincronizada`);
    }

    console.log("✅ Auth inicializado");
  } catch (error) {
    console.error("❌ Error en initAuth:", error);
  }
}

// ==================== FIX ONE-TIME: Devolver inventario de facturas anuladas hoy ====================
// [AUTO-FIX] INICIO
async function fixInventarioFacturasAnuladas() {
  try {
    const result = await pool.query(`
      SELECT f.id, f.venta_id, f.updated_at
      FROM facturas f
      WHERE f.estado = 'anulada'
        AND f.venta_id IS NOT NULL
        AND f.updated_at::date = '2026-03-23'
    `);

    if (result.rows.length === 0) {
      console.log("ℹ️  Fix inventario: No hay facturas anuladas el 2026-03-23 para corregir.");
    } else {
      for (const factura of result.rows) {
        const items = await pool.query(
          "SELECT * FROM detalle_venta WHERE venta_id = $1",
          [factura.venta_id]
        );

        for (const item of items.rows) {
          const stockActual = await pool.query(
            "SELECT stock_actual FROM productos WHERE id = $1",
            [item.producto_id]
          );
          const stockAnterior = stockActual.rows.length > 0 ? stockActual.rows[0].stock_actual : 0;

          await pool.query(
            `UPDATE productos
             SET stock_actual = stock_actual + $1,
                 disponible = true
             WHERE id = $2`,
            [item.cantidad, item.producto_id]
          );

          await pool.query(
            `INSERT INTO movimientos_inventario (
              producto_id, tipo, cantidad, motivo, usuario, fecha, stock_anterior, stock_nuevo
            ) VALUES ($1, 'entrada', $2, $3, 'Sistema', CURRENT_TIMESTAMP, $4, $5)`,
            [
              item.producto_id,
              item.cantidad,
              "Corrección: devolución de inventario por anulación de factura #" + factura.id,
              stockAnterior,
              stockAnterior + item.cantidad,
            ]
          );
        }

        console.log("✅ Fix inventario: Factura #" + factura.id + " - inventario devuelto.");
      }
    }

    // Auto-comentar este bloque para que no se ejecute de nuevo
    const serverPath = path.join(__dirname, "server.js");
    let content = fs.readFileSync(serverPath, "utf-8");
    content = content.replace(
      /\/\/ \[AUTO-FIX\] INICIO\n([\s\S]*?)\/\/ \[AUTO-FIX\] FIN/,
      "// [AUTO-FIX] YA EJECUTADO - Este bloque fue auto-comentado tras ejecutarse exitosamente"
    );
    fs.writeFileSync(serverPath, content, "utf-8");
    console.log("✅ Fix inventario: Bloque auto-comentado, no se ejecutará de nuevo.");
  } catch (error) {
    console.error("❌ Error en fix inventario facturas anuladas:", error);
  }
}
// [AUTO-FIX] FIN

// ==================== INICIAR SERVIDOR ====================
initAuth().then(async () => {
  await fixInventarioFacturasAnuladas();
  app.listen(PORT, () => {
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║   🚀 FIFTY TECH POS - SERVIDOR      ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`✅ API disponible en http://localhost:${PORT}/api`);
    console.log("\n📋 Rutas disponibles:");
    console.log("   - /api/auth");
    console.log("   - /api/clientes");
    console.log("   - /api/productos");
    console.log("   - /api/ventas");
    console.log("   - /api/inventario");
    console.log("   - /api/servicios");
    console.log("   - /api/facturacion");
    console.log("   - /api/categorias");
    console.log("   - /api/proveedores");
    console.log("   - /api/configuracion");
    console.log("   - /api/reportes");
    console.log("\n⏰ Presiona Ctrl+C para detener el servidor\n");
  });
});

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("\n⚠️  Señal SIGTERM recibida, cerrando servidor...");
  process.exit(0);
});
