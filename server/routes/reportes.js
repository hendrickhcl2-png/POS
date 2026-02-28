// ==================== RUTAS DE REPORTES ====================

const express = require("express");
const router = express.Router();
const ReportesController = require("../controllers/reportes-controller");
const ReportesExportController = require("../controllers/reportes-export-controller.js");
const { requireAdmin } = require("../middleware/auth-middleware");

// Reporte de ventas y ganancias
router.get("/ventas", ReportesController.getReporteVentas);

// Reporte de productos vendidos
router.get(
  "/productos-vendidos",
  ReportesController.getReporteProductosVendidos,
);

// Reporte de ganancias detallado
router.get("/ganancias", ReportesController.getReporteGanancias);

// Dashboard combinado
router.get("/dashboard", ReportesController.getReporteDashboard);
router.get("/exportar-excel", ReportesExportController.exportarExcel);

// Reporte de inventario
router.get("/inventario", requireAdmin, ReportesController.getReporteInventario);

module.exports = router;
