// ==================== RUTAS DE CATEGORÍAS ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");

// Obtener todas las categorías
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(p.id) as total_productos
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = true
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener categorías:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener categoría por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        COUNT(p.id) as total_productos
       FROM categorias c
       LEFT JOIN productos p ON c.id = p.categoria_id AND p.activo = true
       WHERE c.id = $1
       GROUP BY c.id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener categoría:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear categoría
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    // Verificar si ya existe
    const existe = await pool.query(
      "SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1)",
      [nombre],
    );

    if (existe.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe una categoría con ese nombre" });
    }

    const result = await pool.query(
      `INSERT INTO categorias (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, descripcion || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al crear categoría:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar categoría
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    // Verificar si existe otra categoría con el mismo nombre
    const existe = await pool.query(
      "SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1) AND id != $2",
      [nombre, id],
    );

    if (existe.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe una categoría con ese nombre" });
    }

    const result = await pool.query(
      `UPDATE categorias 
       SET nombre = $1, descripcion = $2
       WHERE id = $3
       RETURNING *`,
      [nombre, descripcion, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar categoría:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar categoría
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene productos asociados
    const productos = await pool.query(
      "SELECT COUNT(*) as count FROM productos WHERE categoria_id = $1 AND activo = true",
      [id],
    );

    if (parseInt(productos.rows[0].count) > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar la categoría porque tiene productos asociados",
        total_productos: parseInt(productos.rows[0].count),
      });
    }

    const result = await pool.query(
      "DELETE FROM categorias WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.json({
      message: "Categoría eliminada exitosamente",
      categoria: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error al eliminar categoría:", error);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ Rutas de categorías cargadas");

module.exports = router;
