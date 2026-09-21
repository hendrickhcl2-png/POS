// ==================== RUTAS DE DEVOLUCIONES ====================

const express = require("express");
const router = express.Router();
const DevolucionesController = require("../controllers/devoluciones-controller");

// Los handlers usan `this` para llamar a los helpers del controlador, así que
// van bindeados (igual que en las rutas de ventas); sin esto GET /:id revienta
// con "this.obtenerDevolucionPorId is not a function".

// Crear devolución
router.post("/", DevolucionesController.crearDevolucion.bind(DevolucionesController));

// Obtener todas las devoluciones
router.get("/", DevolucionesController.obtenerDevoluciones.bind(DevolucionesController));

// Obtener devolución por ID
router.get("/:id", DevolucionesController.obtenerDevolucion.bind(DevolucionesController));

module.exports = router;
