// ==================== SERVER.JS ACTUALIZADO ====================
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));

// ==================== IMPORTAR RUTAS ====================
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

// ==================== REGISTRAR RUTAS ====================
app.use("/api/clientes", clientesRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/facturas", facturacionRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/devoluciones", devolucionesRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/salidas", salidasRoutes);

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

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║   🚀 FIFTY TECH POS - SERVIDOR      ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`✅ API disponible en http://localhost:${PORT}/api`);
  console.log("\n📋 Rutas disponibles:");
  console.log("   - /api/clientes");
  console.log("   - /api/productos");
  console.log("   - /api/ventas");
  console.log("   - /api/inventario");
  console.log("   - /api/servicios");
  console.log("   - /api/facturacion");
  console.log("   - /api/categorias       ⬅️ NUEVO");
  console.log("   - /api/proveedores      ⬅️ NUEVO");
  console.log("   - /api/configuracion    ⬅️ NUEVO");
  console.log("   - /api/reportes");
  console.log("\n⏰ Presiona Ctrl+C para detener el servidor\n");
});

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("\n⚠️  Señal SIGTERM recibida, cerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor cerrado correctamente");
    process.exit(0);
  });
});
