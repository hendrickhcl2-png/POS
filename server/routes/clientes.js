// ==================== RUTAS DE CLIENTES ====================
const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/async-handler");
const pool = require("../database/pool");

// ==================== OBTENER TODOS LOS CLIENTES ====================
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      SELECT * FROM clientes 
      ORDER BY nombre ASC
    `);
    res.json(result.rows);
  }),
);

// ==================== BUSCAR CLIENTES ====================
// ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id
router.get(
  "/buscar",
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Término de búsqueda requerido" });
    }

    const termino = `%${q}%`;
    const result = await pool.query(
      `SELECT * FROM clientes 
       WHERE nombre ILIKE $1 
          OR apellido ILIKE $1 
          OR cedula ILIKE $1 
          OR rnc ILIKE $1 
          OR telefono ILIKE $1 
          OR email ILIKE $1
       ORDER BY nombre ASC`,
      [termino],
    );

    res.json(result.rows);
  }),
);

// ==================== CLIENTES CON SALDO PENDIENTE ====================
// ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id
router.get(
  "/con-saldo-pendiente",
  asyncHandler(async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          c.id as cliente_id,
          c.nombre,
          c.apellido,
          c.rnc,
          c.cedula,
          c.telefono,
          COALESCE(SUM(f.saldo_pendiente), 0) as saldo_pendiente,
          COUNT(f.id) as facturas_pendientes
        FROM clientes c
        INNER JOIN facturas f ON c.id = f.cliente_id
        WHERE f.estado_pago IN ('pendiente', 'parcial')
        GROUP BY c.id, c.nombre, c.apellido, c.rnc, c.cedula, c.telefono
        HAVING SUM(f.saldo_pendiente) > 0
        ORDER BY saldo_pendiente DESC
      `);
      res.json(result.rows);
    } catch (error) {
      // Si la tabla facturas no existe, devolver array vacío
      console.log("⚠️  Tabla facturas no existe aún, devolviendo array vacío");
      res.json([]);
    }
  }),
);

// ==================== ESTADO DE CUENTA ====================
// ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id
router.get(
  "/:id/estado-cuenta",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Obtener datos del cliente
    const clienteResult = await pool.query(
      "SELECT * FROM clientes WHERE id = $1",
      [id],
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    try {
      // Obtener facturas del cliente
      const facturasResult = await pool.query(
        `SELECT * FROM facturas 
         WHERE cliente_id = $1 
         ORDER BY fecha_emision DESC`,
        [id],
      );

      // Calcular totales
      const totales = await pool.query(
        `SELECT 
         COUNT(*) as total_facturas,
         COALESCE(SUM(total), 0) as total_facturado,
         COALESCE(SUM(monto_pagado), 0) as total_pagado,
         COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente
       FROM facturas 
       WHERE cliente_id = $1 AND estado_pago != 'anulada'`,
        [id],
      );

      res.json({
        cliente: clienteResult.rows[0],
        facturas: facturasResult.rows,
        ...totales.rows[0],
      });
    } catch (error) {
      // Si la tabla facturas no existe, devolver datos básicos
      res.json({
        cliente: clienteResult.rows[0],
        facturas: [],
        total_facturas: 0,
        total_facturado: 0,
        total_pagado: 0,
        saldo_pendiente: 0,
      });
    }
  }),
);

// ==================== HISTORIAL DE COMPRAS ====================
// ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id
router.get(
  "/:id/historial-compras",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin, limite = 50 } = req.query;

    try {
      let query = `
        SELECT v.*, 
               COALESCE(
                 (SELECT json_agg(json_build_object(
                   'producto_id', dv.producto_id,
                   'nombre_producto', dv.nombre_producto,
                   'cantidad', dv.cantidad,
                   'precio_unitario', dv.precio_unitario,
                   'total', dv.total
                 ))
                 FROM detalle_venta dv
                 WHERE dv.venta_id = v.id), '[]'
               ) as items
        FROM ventas v
        WHERE v.cliente_id = $1
      `;

      const params = [id];
      let paramCount = 1;

      if (fecha_inicio) {
        paramCount++;
        query += ` AND v.fecha >= $${paramCount}`;
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        paramCount++;
        query += ` AND v.fecha <= $${paramCount}`;
        params.push(fecha_fin);
      }

      query += ` ORDER BY v.fecha DESC LIMIT $${paramCount + 1}`;
      params.push(limite);

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      // Si la tabla ventas no existe, devolver array vacío
      res.json([]);
    }
  }),
);

// ==================== ESTADÍSTICAS DEL CLIENTE ====================
// ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id
router.get(
  "/:id/estadisticas",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Total de compras
      const comprasResult = await pool.query(
        `SELECT COUNT(*) as total_compras, COALESCE(SUM(total), 0) as total_gastado
         FROM ventas 
         WHERE cliente_id = $1`,
        [id],
      );

      // Total de facturas
      const facturasResult = await pool.query(
        `SELECT COUNT(*) as total_facturas, 
              COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente
         FROM facturas 
         WHERE cliente_id = $1 AND estado_pago != 'anulada'`,
        [id],
      );

      // Última compra
      const ultimaCompraResult = await pool.query(
        `SELECT fecha, total 
         FROM ventas 
         WHERE cliente_id = $1 
         ORDER BY fecha DESC 
         LIMIT 1`,
        [id],
      );

      // Producto más comprado
      const productoFavoritoResult = await pool.query(
        `SELECT p.nombre, COUNT(*) as veces_comprado
         FROM detalle_venta dv
         INNER JOIN ventas v ON dv.venta_id = v.id
         INNER JOIN productos p ON dv.producto_id = p.id
         WHERE v.cliente_id = $1
         GROUP BY p.id, p.nombre
         ORDER BY veces_comprado DESC
         LIMIT 1`,
        [id],
      );

      res.json({
        total_compras: parseInt(comprasResult.rows[0].total_compras),
        total_gastado: parseFloat(comprasResult.rows[0].total_gastado),
        total_facturas: parseInt(facturasResult.rows[0].total_facturas),
        saldo_pendiente: parseFloat(facturasResult.rows[0].saldo_pendiente),
        ultima_compra: ultimaCompraResult.rows[0] || null,
        producto_favorito: productoFavoritoResult.rows[0] || null,
      });
    } catch (error) {
      // Si las tablas no existen, devolver datos vacíos
      res.json({
        total_compras: 0,
        total_gastado: 0,
        total_facturas: 0,
        saldo_pendiente: 0,
        ultima_compra: null,
        producto_favorito: null,
      });
    }
  }),
);

// ==================== OBTENER CLIENTE POR ID ====================
// ⚠️ IMPORTANTE: Esta ruta DEBE ir DESPUÉS de todas las rutas específicas
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM clientes WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(result.rows[0]);
  }),
);

// ==================== CREAR CLIENTE ====================
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { nombre, apellido, cedula, rnc, telefono, email, direccion, notas } =
      req.body;

    // Validar nombre
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    // Generar código único para el cliente
    const codigoResult = await pool.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 4) AS INTEGER)), 0) + 1 as next_num FROM clientes WHERE codigo LIKE 'CLI%'",
    );
    const nextNum = codigoResult.rows[0].next_num;
    const codigo = `CLI${String(nextNum).padStart(4, "0")}`; // CLI0001, CLI0002, etc.

    const result = await pool.query(
      `INSERT INTO clientes 
       (codigo, nombre, apellido, cedula, rnc, telefono, email, direccion, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        codigo,
        nombre,
        apellido,
        cedula,
        rnc,
        telefono,
        email,
        direccion,
        notas,
      ],
    );

    res.status(201).json(result.rows[0]);
  }),
);

// ==================== ACTUALIZAR CLIENTE ====================
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, cedula, rnc, telefono, email, direccion, notas } =
      req.body;

    // Validar nombre
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      `UPDATE clientes 
       SET nombre = $1, apellido = $2, cedula = $3, rnc = $4, 
           telefono = $5, email = $6, direccion = $7, notas = $8
       WHERE id = $9
       RETURNING *`,
      [nombre, apellido, cedula, rnc, telefono, email, direccion, notas, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(result.rows[0]);
  }),
);

// ==================== ELIMINAR CLIENTE ====================
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Verificar si el cliente tiene ventas o facturas asociadas
      const ventasResult = await pool.query(
        "SELECT COUNT(*) as count FROM ventas WHERE cliente_id = $1",
        [id],
      );

      if (parseInt(ventasResult.rows[0].count) > 0) {
        return res.status(400).json({
          error:
            "No se puede eliminar el cliente porque tiene ventas registradas",
        });
      }
    } catch (error) {
      // Si la tabla ventas no existe, continuar con la eliminación
      console.log("⚠️  Tabla ventas no existe, continuando con eliminación");
    }

    const result = await pool.query(
      "DELETE FROM clientes WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({
      message: "Cliente eliminado exitosamente",
      cliente: result.rows[0],
    });
  }),
);

console.log("✅ Rutas de clientes cargadas");

module.exports = router;
