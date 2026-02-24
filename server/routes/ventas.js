//Ruta de ventas
const express = require("express");
const router = express.Router();
const VentasController = require("../controllers/ventas-controller");


router.post("/", VentasController.crearVenta.bind(VentasController));

router.get("/", VentasController.obtenerVentas.bind(VentasController));

router.get(
  "/estadisticas/resumen",
  VentasController.obtenerEstadisticas.bind(VentasController),
);

router.get("/:id", VentasController.obtenerVenta.bind(VentasController));

router.post("/:id/anular", VentasController.anularVenta.bind(VentasController));

module.exports = router;
