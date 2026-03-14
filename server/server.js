// ==================== SERVER.JS ====================
const express = require("express");
const cors = require("cors");
const path = require("path");
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

    console.log("✅ Auth inicializado");
  } catch (error) {
    console.error("❌ Error en initAuth:", error);
  }
}

// ==================== INICIAR SERVIDOR ====================
initAuth().then(() => {
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
