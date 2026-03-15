//Ruta de ventas
const express = require("express");
const router = express.Router();
const VentasController = require("../controllers/ventas-controller");
const { requireAdmin } = require("../middleware/auth-middleware");
const pool = require("../database/pool");


router.post("/", VentasController.crearVenta.bind(VentasController));

router.get("/", VentasController.obtenerVentas.bind(VentasController));

router.get(
  "/estadisticas/resumen",
  VentasController.obtenerEstadisticas.bind(VentasController),
);

router.get("/:id", VentasController.obtenerVenta.bind(VentasController));

router.post("/:id/anular", VentasController.anularVenta.bind(VentasController));

// Editar fecha de venta (solo admin)
router.patch("/:id/fecha", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha } = req.body;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: "Fecha inválida. Formato esperado: YYYY-MM-DD" });
    }

    const result = await pool.query(
      `UPDATE ventas SET fecha = $1 WHERE id = $2 AND estado != 'anulada' RETURNING id, fecha`,
      [fecha, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Venta no encontrada o está anulada" });
    }

    res.json({ success: true, fecha: result.rows[0].fecha });
  } catch (error) {
    console.error("❌ Error al actualizar fecha de venta:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
