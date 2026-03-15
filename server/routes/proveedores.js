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

// Facturas de proveedores (agrupadas por número de factura)
router.get("/facturas/listado", async (req, res) => {
  try {
    const { proveedor_id } = req.query;
    let where = `p.activo = true AND p.factura_proveedor_numero IS NOT NULL AND p.factura_proveedor_numero != ''`;
    const params = [];
    if (proveedor_id) {
      params.push(proveedor_id);
      where += ` AND p.proveedor_id = $1`;
    }

    const result = await pool.query(`
      SELECT
        p.factura_proveedor_numero AS numero,
        p.factura_proveedor_fecha  AS fecha,
        p.ncf,
        p.proveedor_id,
        pr.nombre                  AS proveedor_nombre,
        COUNT(p.id)                AS cantidad_productos,
        SUM(p.precio_costo)        AS total_costo,
        MIN(p.created_at)          AS fecha_registro
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE ${where}
      GROUP BY p.factura_proveedor_numero, p.factura_proveedor_fecha,
               p.ncf, p.proveedor_id, pr.nombre
      ORDER BY p.factura_proveedor_fecha DESC NULLS LAST, MIN(p.created_at) DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener facturas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Productos de una factura específica
router.get("/facturas/:numero/productos", async (req, res) => {
  try {
    const numero = decodeURIComponent(req.params.numero);
    const result = await pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = true AND p.factura_proveedor_numero = $1
      ORDER BY p.nombre
    `, [numero]);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener productos de factura:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear proveedor
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { nombre, contacto_nombre, telefono, email, direccion, rnc, notas, descripcion } =
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
       (codigo, nombre, contacto_nombre, telefono, email, direccion, rnc, notas, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [codigo, nombre, contacto_nombre, telefono, email, direccion, rnc, notas, descripcion || null],
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
    const { nombre, contacto_nombre, telefono, email, direccion, rnc, notas, descripcion } =
      req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      `UPDATE proveedores
       SET nombre = $1, contacto_nombre = $2, telefono = $3,
           email = $4, direccion = $5, rnc = $6, notas = $7,
           descripcion = $8
       WHERE id = $9
       RETURNING *`,
      [nombre, contacto_nombre, telefono, email, direccion, rnc, notas, descripcion || null, id],
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
