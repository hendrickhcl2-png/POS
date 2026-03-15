const express = require("express");
const router = express.Router();
const pool = require("../database/pool");
const asyncHandler = require("../middleware/async-handler");
const { requireAdmin } = require("../middleware/auth-middleware");

// GET - obtener todas las categorías de gasto
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT * FROM categorias_gasto ORDER BY nombre ASC`
    );
    res.json({ success: true, data: result.rows });
  })
);

// POST - crear categoría de gasto
router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }
    const result = await pool.query(
      `INSERT INTO categorias_gasto (nombre) VALUES ($1) RETURNING *`,
      [nombre.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  })
);

// DELETE - eliminar categoría de gasto
router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM categorias_gasto WHERE id=$1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }
    res.json({ success: true, message: "Categoría eliminada" });
  })
);

module.exports = router;
