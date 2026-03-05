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

// Cuadre de turno
router.get("/cuadre", ReportesController.getCuadreTurno.bind(ReportesController));
router.get("/cuadre/excel", ReportesExportController.exportarCuadreExcel.bind(ReportesExportController));

// Reporte de salidas
router.get("/salidas", ReportesController.getReporteSalidas.bind(ReportesController));
router.get("/salidas/excel", ReportesExportController.exportarSalidasExcel.bind(ReportesExportController));

// Reporte de inventario
router.get("/inventario", requireAdmin, ReportesController.getReporteInventario);

module.exports = router;
