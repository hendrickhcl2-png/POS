// ==================== RUTAS DE SERVICIOS ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");

// Obtener todos los servicios
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM servicios 
      WHERE activo = true 
      ORDER BY nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener servicios:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener servicio por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM servicios WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener servicio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear servicio
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, precio, es_gratuito } = req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre del servicio es obligatorio" });
    }
    const esGratuito = es_gratuito === true || es_gratuito === "true";
    if (!esGratuito && (!precio || parseFloat(precio) <= 0)) {
      return res.status(400).json({ error: "Los servicios de pago deben tener un precio mayor a 0" });
    }

    const result = await pool.query(
      `
      INSERT INTO servicios (nombre, descripcion, precio, es_gratuito, activo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `,
      [nombre, descripcion || null, precio || 0, es_gratuito || false],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al crear servicio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar servicio
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, es_gratuito } = req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre del servicio es obligatorio" });
    }
    const esGratuito = es_gratuito === true || es_gratuito === "true";
    if (!esGratuito && (!precio || parseFloat(precio) <= 0)) {
      return res.status(400).json({ error: "Los servicios de pago deben tener un precio mayor a 0" });
    }

    const result = await pool.query(
      `
      UPDATE servicios 
      SET nombre = $1, descripcion = $2, precio = $3, es_gratuito = $4
      WHERE id = $5
      RETURNING *
    `,
      [nombre, descripcion, precio, es_gratuito, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar servicio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar servicio (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE servicios 
      SET activo = false
      WHERE id = $1
      RETURNING *
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.json({ message: "Servicio eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar servicio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas: servicios más usados
router.get("/estadisticas/mas-usados", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM servicios_mas_usados
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
