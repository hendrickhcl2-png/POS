// ==================== RUTAS DE PAGOS ====================

const express = require("express");
const router = express.Router();
const PagosController = require("../controllers/pagos-controller");

// Registrar nuevo pago
router.post("/", PagosController.registrarPago);

// Obtener todos los pagos
router.get("/", PagosController.obtenerPagos);

// Obtener pagos de una factura
router.get("/factura/:factura_id", PagosController.obtenerPagosPorFactura);

// Anular pago
router.delete("/:id", PagosController.anularPago);

module.exports = router;
