// ==================== RUTAS DE DEVOLUCIONES ====================

const express = require("express");
const router = express.Router();
const DevolucionesController = require("../controllers/devoluciones-controller");

// Crear devolución
router.post("/", DevolucionesController.crearDevolucion);

// Obtener todas las devoluciones
router.get("/", DevolucionesController.obtenerDevoluciones);

// Obtener devolución por ID
router.get("/:id", DevolucionesController.obtenerDevolucion);

module.exports = router;
