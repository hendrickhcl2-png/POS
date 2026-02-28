// ==================== RUTAS DE PROVEEDORES ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");
const { requireAdmin } = require("../middleware/auth-middleware");

// Obtener todos los proveedores
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        COUNT(pr.id) as total_productos
      FROM proveedores p
      LEFT JOIN productos pr ON p.id = pr.proveedor_id AND pr.activo = true
      GROUP BY p.id
      ORDER BY p.nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener proveedores:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener proveedor por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        COUNT(pr.id) as total_productos
       FROM proveedores p
       LEFT JOIN productos pr ON p.id = pr.proveedor_id AND pr.activo = true
       WHERE p.id = $1
       GROUP BY p.id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener proveedor:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener productos de un proveedor
router.get("/:id/productos", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM productos 
       WHERE proveedor_id = $1 AND activo = true
       ORDER BY nombre ASC`,
      [id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener productos del proveedor:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear proveedor
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { nombre, contacto_nombre, telefono, email, direccion, rnc, notas } =
      req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    // Generar código único
    const codigoResult = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) + 1 as next_num 
       FROM proveedores 
       WHERE codigo LIKE 'PROV%'`,
    );
    const nextNum = codigoResult.rows[0].next_num;
    const codigo = `PROV${String(nextNum).padStart(4, "0")}`; // PROV0001, PROV0002, etc.

    const result = await pool.query(
      `INSERT INTO proveedores 
       (codigo, nombre, contacto_nombre, telefono, email, direccion, rnc, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [codigo, nombre, contacto_nombre, telefono, email, direccion, rnc, notas],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al crear proveedor:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar proveedor
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto_nombre, telefono, email, direccion, rnc, notas } =
      req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      `UPDATE proveedores 
       SET nombre = $1, contacto_nombre = $2, telefono = $3, 
           email = $4, direccion = $5, rnc = $6, notas = $7
       WHERE id = $8
       RETURNING *`,
      [nombre, contacto_nombre, telefono, email, direccion, rnc, notas, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar proveedor:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar proveedor
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene productos asociados
    const productos = await pool.query(
      "SELECT COUNT(*) as count FROM productos WHERE proveedor_id = $1 AND activo = true",
      [id],
    );

    if (parseInt(productos.rows[0].count) > 0) {
      return res.status(400).json({
        error:
          "No se puede eliminar el proveedor porque tiene productos asociados",
        total_productos: parseInt(productos.rows[0].count),
      });
    }

    const result = await pool.query(
      "DELETE FROM proveedores WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    res.json({
      message: "Proveedor eliminado exitosamente",
      proveedor: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error al eliminar proveedor:", error);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ Rutas de proveedores cargadas");

module.exports = router;
