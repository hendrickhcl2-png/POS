// ==================== RUTAS DE INVENTARIO CORREGIDAS ====================
const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/async-handler");
const pool = require("../database/pool");
const { requireAdmin } = require("../middleware/auth-middleware");

// ⚠️ IMPORTANTE: Las rutas específicas DEBEN ir ANTES de /:id

// ==================== ESTADÍSTICAS DE INVENTARIO ====================
// ⬇️⬇️⬇️ MOVER ESTA RUTA ANTES DE /:id ⬇️⬇️⬇️
router.get(
  "/estadisticas",
  asyncHandler(async (req, res) => {
    const estadisticas = await pool.query(`
      SELECT 
        COUNT(*) as total_productos,
        SUM(stock_actual * precio_costo) as valor_total,
        SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > 0 THEN 1 ELSE 0 END) as productos_bajo_stock,
        SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END) as productos_sin_stock
      FROM productos
    `);

    res.json({
      total_productos: parseInt(estadisticas.rows[0].total_productos) || 0,
      valor_total: parseFloat(estadisticas.rows[0].valor_total) || 0,
      productos_bajo_stock:
        parseInt(estadisticas.rows[0].productos_bajo_stock) || 0,
      productos_sin_stock:
        parseInt(estadisticas.rows[0].productos_sin_stock) || 0,
    });
  }),
);

// ==================== PRODUCTOS CON BAJO STOCK ====================
router.get(
  "/bajo-stock",
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      SELECT * FROM productos 
      WHERE stock_actual <= stock_minimo AND stock_actual > 0
      ORDER BY stock_actual ASC
    `);

    res.json(result.rows);
  }),
);

// ==================== PRODUCTOS SIN STOCK ====================
router.get(
  "/sin-stock",
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      SELECT * FROM productos 
      WHERE stock_actual = 0
      ORDER BY nombre ASC
    `);

    res.json(result.rows);
  }),
);

// ==================== VALOR TOTAL DEL INVENTARIO ====================
router.get(
  "/valor-total",
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      SELECT SUM(stock_actual * precio_costo) as valor_total
      FROM productos
    `);

    res.json({
      valor_total: parseFloat(result.rows[0].valor_total) || 0,
    });
  }),
);

// ==================== EXPORTAR INVENTARIO ====================
router.get(
  "/exportar",
  asyncHandler(async (req, res) => {
    const { formato = "json" } = req.query;

    const result = await pool.query(`
      SELECT 
        codigo_barras as codigo,
        nombre,
        categoria_id as categoria,
        stock_actual as stock,
        stock_minimo,
        stock_maximo,
        precio_costo as costo,
        precio_venta as precio,
        (stock_actual * precio_costo) as valor_total
      FROM productos
      ORDER BY nombre ASC
    `);

    if (formato === "json") {
      res.json(result.rows);
    } else if (formato === "csv") {
      const headers = Object.keys(result.rows[0] || {});
      const csv = [
        headers.join(","),
        ...result.rows.map((row) => headers.map((h) => row[h]).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=inventario.csv",
      );
      res.send(csv);
    } else {
      res.status(400).json({ error: "Formato no soportado" });
    }
  }),
);

// ==================== OBTENER INVENTARIO COMPLETO ====================
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { categoria, bajo_stock, sin_stock } = req.query;

    let query = `
      SELECT 
        p.*,
        CASE 
          WHEN p.stock_actual = 0 THEN 'sin_stock'
          WHEN p.stock_actual <= p.stock_minimo THEN 'bajo_stock'
          ELSE 'disponible'
        END as estado_stock
      FROM productos p
      WHERE activo = true
    `;

    const params = [];
    let paramCount = 0;

    if (categoria) {
      paramCount++;
      query += ` AND p.categoria_id = $${paramCount}`;
      params.push(categoria);
    }

    if (bajo_stock === "true") {
      query += ` AND p.stock_actual <= p.stock_minimo AND p.stock_actual > 0`;
    }

    if (sin_stock === "true") {
      query += ` AND p.stock_actual = 0`;
    }

    query += ` ORDER BY p.nombre ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  }),
);

// ==================== OBTENER PRODUCTO POR ID ====================
// ⚠️ Esta ruta DEBE ir DESPUÉS de todas las rutas específicas
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM productos WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  }),
);

// ==================== HISTORIAL DE MOVIMIENTOS ====================
router.get(
  "/:id/movimientos",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin, tipo } = req.query;

    try {
      let query = `
        SELECT * FROM movimientos_inventario
        WHERE producto_id = $1
      `;

      const params = [id];
      let paramCount = 1;

      if (fecha_inicio) {
        paramCount++;
        query += ` AND fecha >= $${paramCount}`;
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        query += ` AND fecha <= $${paramCount}`;
        params.push(fecha_fin);
      }

      if (tipo) {
        paramCount++;
        query += ` AND tipo_movimiento = $${paramCount}`;
        params.push(tipo);
      }

      query += ` ORDER BY fecha DESC LIMIT 100`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.log("⚠️  Tabla movimientos_inventario no existe");
      res.json([]);
    }
  }),
);

// ==================== ACTUALIZAR STOCK ====================
router.post(
  "/:id/stock",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { cantidad, tipo, motivo } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: "Cantidad inválida" });
    }

    if (!tipo || !["entrada", "salida"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de movimiento inválido" });
    }

    const productoResult = await pool.query(
      "SELECT * FROM productos WHERE id = $1",
      [id],
    );

    if (productoResult.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = productoResult.rows[0];
    let nuevoStock;

    if (tipo === "entrada") {
      nuevoStock = parseInt(producto.stock_actual) + parseInt(cantidad);
    } else {
      nuevoStock = parseInt(producto.stock_actual) - parseInt(cantidad);

      if (nuevoStock < 0) {
        return res.status(400).json({
          error: "Stock insuficiente",
          stock_actual: producto.stock_actual,
          cantidad_solicitada: cantidad,
        });
      }
    }

    const updateResult = await pool.query(
      "UPDATE productos SET stock_actual = $1 WHERE id = $2 RETURNING *",
      [nuevoStock, id],
    );

    try {
      await pool.query(
        `INSERT INTO movimientos_inventario
         (producto_id, tipo_movimiento, cantidad, motivo, usuario, fecha)
         VALUES ($1, $2, $3, $4, 'Sistema', NOW())`,
        [id, tipo, cantidad, motivo || "Ajuste manual"],
      );
    } catch (error) {
      console.log("⚠️  Tabla movimientos_inventario no existe");
    }

    if (tipo === "entrada") {
      const numResult = await pool.query(
        `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(numero_salida, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 as siguiente FROM salidas`,
      );
      const numeroSalida =
        "SAL" + String(numResult.rows[0].siguiente).padStart(8, "0");

      await pool.query(
        `INSERT INTO salidas (numero_salida, fecha, concepto, descripcion, monto, categoria_gasto)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, 'Compras')`,
        [
          numeroSalida,
          `${producto.nombre} (${producto.codigo_barras})`,
          motivo || "Entrada de inventario",
          parseInt(cantidad) * parseFloat(producto.precio_costo),
        ],
      );
    }

    res.json({
      message: "Stock actualizado exitosamente",
      producto: updateResult.rows[0],
      movimiento: {
        tipo,
        cantidad,
        stock_anterior: producto.stock_actual,
        stock_nuevo: nuevoStock,
      },
    });
  }),
);

// ==================== AJUSTAR INVENTARIO ====================
router.post(
  "/:id/ajustar",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nueva_cantidad, motivo } = req.body;

    if (nueva_cantidad === undefined || nueva_cantidad < 0) {
      return res.status(400).json({ error: "Cantidad inválida" });
    }

    if (!motivo || motivo.trim() === "") {
      return res
        .status(400)
        .json({ error: "El motivo es obligatorio para ajustes de inventario" });
    }

    const productoResult = await pool.query(
      "SELECT * FROM productos WHERE id = $1",
      [id],
    );

    if (productoResult.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = productoResult.rows[0];
    const stockAnterior = producto.stock_actual;

    const updateResult = await pool.query(
      "UPDATE productos SET stock_actual = $1 WHERE id = $2 RETURNING *",
      [nueva_cantidad, id],
    );

    try {
      await pool.query(
        `INSERT INTO movimientos_inventario 
         (producto_id, tipo_movimiento, cantidad, motivo, usuario, fecha)
         VALUES ($1, 'ajuste', $2, $3, 'Sistema', NOW())`,
        [id, Math.abs(nueva_cantidad - stockAnterior), motivo],
      );
    } catch (error) {
      console.log("⚠️  Tabla movimientos_inventario no existe");
    }

    res.json({
      message: "Inventario ajustado exitosamente",
      producto: updateResult.rows[0],
      ajuste: {
        stock_anterior: stockAnterior,
        stock_nuevo: nueva_cantidad,
        diferencia: nueva_cantidad - stockAnterior,
        motivo,
      },
    });
  }),
);

console.log("✅ Rutas de inventario cargadas");

module.exports = router;
