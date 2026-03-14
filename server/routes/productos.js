// ==================== RUTAS DE PRODUCTOS FINAL ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");
const { requireAdmin } = require("../middleware/auth-middleware");

// ==================== OBTENER TODOS LOS PRODUCTOS ====================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        c.nombre as categoria_nombre,
        pr.nombre as proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE p.activo = true AND p.stock_actual > 0
      ORDER BY p.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener productos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BUSCAR PRODUCTOS ====================
router.get("/buscar", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query parameter required" });
    }

    const result = await pool.query(
      `SELECT 
        p.*,
        c.nombre as categoria_nombre,
        pr.nombre as proveedor_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
       WHERE p.activo = true AND p.stock_actual > 0
       AND (
         LOWER(p.nombre) LIKE LOWER($1) OR
         LOWER(p.codigo_barras) LIKE LOWER($1) OR
         LOWER(p.imei) LIKE LOWER($1)
       )
       ORDER BY p.nombre
       LIMIT 20`,
      [`%${q}%`],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al buscar productos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== HISTORIAL DE PRODUCTOS VENDIDOS ====================
router.get("/vendidos", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const result = await pool.query(
      `SELECT
        dv.id, dv.producto_id, dv.nombre_producto,
        p.imei,
        dv.cantidad, dv.precio_unitario, dv.subtotal,
        v.numero_ticket, v.fecha, v.hora, v.metodo_pago,
        TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre,
        p.stock_actual AS stock_restante,
        COALESCE(SUM(dd.cantidad_devuelta), 0) AS cantidad_devuelta
      FROM detalle_venta dv
      JOIN ventas v ON dv.venta_id = v.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN productos p ON dv.producto_id = p.id
      LEFT JOIN devoluciones dev ON dev.venta_id = v.id AND dev.estado = 'procesada'
      LEFT JOIN detalle_devolucion dd ON dd.devolucion_id = dev.id AND dd.producto_id = dv.producto_id
      WHERE v.estado != 'anulada' AND dv.producto_id IS NOT NULL
        AND ($1::date IS NULL OR v.fecha >= $1)
        AND ($2::date IS NULL OR v.fecha <= $2)
      GROUP BY dv.id, dv.producto_id, dv.nombre_producto,
               p.imei, dv.cantidad, dv.precio_unitario, dv.subtotal,
               v.numero_ticket, v.fecha, v.hora, v.metodo_pago,
               c.nombre, c.apellido, p.stock_actual
      ORDER BY v.fecha DESC, dv.id DESC`,
      [fecha_inicio || null, fecha_fin || null],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener productos vendidos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== OBTENER PRODUCTO POR ID ====================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        p.*,
        c.nombre as categoria_nombre,
        pr.nombre as proveedor_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener producto:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CREAR PRODUCTO ====================
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      // Identificadores
      codigo_barras,
      imei,
      // Información básica
      nombre,
      descripcion,
      categoria_id,
      proveedor_id,
      // Precios
      precio_costo,
      precio_venta,
      precio_mayoreo,
      cantidad_mayoreo,
      // Stock
      stock_actual,
      stock_minimo,
      stock_maximo,
      // Descuentos
      descuento_porcentaje,
      descuento_monto,
      // Flags
      disponible,
      aplica_itbis,
      activo,
      // Extras
      costos,
      caracteristicas,
      // Factura del proveedor
      factura_proveedor_numero,
      factura_proveedor_fecha,
      ncf,
      // Gasto
      registrar_como_gasto,
    } = req.body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const pv = parseFloat(precio_venta);
    if (!precio_venta || pv <= 0) {
      return res.status(400).json({ error: "El precio de venta debe ser mayor a 0" });
    }
    if (descuento_porcentaje !== undefined && descuento_porcentaje !== null) {
      const dp = parseFloat(descuento_porcentaje);
      if (isNaN(dp) || dp < 0 || dp > 100) {
        return res.status(400).json({ error: "El descuento debe estar entre 0 y 100%" });
      }
    }

    const creadoPor = req.session?.usuario?.nombre || req.session?.usuario?.username || null;

    // Insertar producto (SIN sku y codigo)
    const result = await pool.query(
      `INSERT INTO productos (
        codigo_barras,
        imei,
        nombre,
        descripcion,
        categoria_id,
        proveedor_id,
        precio_costo,
        precio_venta,
        precio_mayoreo,
        cantidad_mayoreo,
        stock_actual,
        stock_minimo,
        stock_maximo,
        descuento_porcentaje,
        descuento_monto,
        disponible,
        aplica_itbis,
        activo,
        costos,
        caracteristicas,
        creado_por,
        factura_proveedor_numero,
        factura_proveedor_fecha,
        ncf
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING *`,
      [
        codigo_barras || null,
        imei || null,
        nombre,
        descripcion || null,
        categoria_id || null,
        proveedor_id || null,
        precio_costo || 0,
        precio_venta || 0,
        precio_mayoreo || null,
        cantidad_mayoreo || 5,
        stock_actual || 0,
        stock_minimo || 0,
        stock_maximo || 0,
        descuento_porcentaje || 0,
        descuento_monto || 0,
        disponible !== false,
        aplica_itbis !== false,
        activo !== false,
        costos ? JSON.stringify(costos) : null,
        caracteristicas ? JSON.stringify(caracteristicas) : null,
        creadoPor,
        factura_proveedor_numero || null,
        factura_proveedor_fecha || null,
        ncf || null,
      ],
    );

    const producto = result.rows[0];

    // Registrar cada costo como una salida (solo si el checkbox está marcado)
    if (registrar_como_gasto && Array.isArray(costos) && costos.length > 0) {
      // Obtener nombre del proveedor si existe
      let proveedorNombre = null;
      if (proveedor_id) {
        const provRes = await pool.query(
          `SELECT nombre FROM proveedores WHERE id = $1`,
          [proveedor_id],
        );
        if (provRes.rows.length > 0) proveedorNombre = provRes.rows[0].nombre;
      }

      for (const costo of costos) {
        if (!costo.concepto || !costo.monto) continue;

        const numResult = await pool.query(
          `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(numero_salida, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 as siguiente FROM salidas`,
        );
        const numeroSalida =
          "SAL" + String(numResult.rows[0].siguiente).padStart(8, "0");

        await pool.query(
          `INSERT INTO salidas (numero_salida, fecha, concepto, monto, categoria_gasto, beneficiario, ncf)
           VALUES ($1, CURRENT_DATE, $2, $3, 'Compras de Inventario', $4, $5)`,
          [
            numeroSalida,
            `${nombre} (${producto.codigo_barras || producto.imei || "s/c"}) - ${costo.concepto}`,
            parseFloat(costo.monto),
            proveedorNombre,
            ncf || null,
          ],
        );
      }
    }

    res.status(201).json(producto);
  } catch (error) {
    console.error("❌ Error al crear producto:", error);

    if (error.code === "23505") {
      const esImei = error.constraint && error.constraint.includes("imei");
      let mensaje = "Este producto ya existe";
      try {
        const existing = await pool.query(
          `SELECT nombre FROM productos WHERE (codigo_barras = $1 AND $1 IS NOT NULL) OR (imei = $2 AND $2 IS NOT NULL) LIMIT 1`,
          [codigo_barras || null, imei || null],
        );
        if (existing.rows.length > 0) {
          mensaje += ` — ${esImei ? "IMEI" : "código"} pertenece a: "${existing.rows[0].nombre}"`;
        }
      } catch (_) {}
      return res.status(409).json({ error: mensaje });
    }

    res.status(500).json({
      error: error.message,
      detail: error.detail || "Sin detalles adicionales",
    });
  }
});

// ==================== ACTUALIZAR PRODUCTO ====================
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_barras,
      imei,
      nombre,
      descripcion,
      categoria_id,
      proveedor_id,
      precio_costo,
      precio_venta,
      precio_mayoreo,
      cantidad_mayoreo,
      stock_actual,
      stock_minimo,
      stock_maximo,
      descuento_porcentaje,
      descuento_monto,
      disponible,
      costos,
      caracteristicas,
      factura_proveedor_numero,
      factura_proveedor_fecha,
      ncf,
    } = req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const pv = parseFloat(precio_venta);
    if (!precio_venta || pv <= 0) {
      return res.status(400).json({ error: "El precio de venta debe ser mayor a 0" });
    }
    if (descuento_porcentaje !== undefined && descuento_porcentaje !== null) {
      const dp = parseFloat(descuento_porcentaje);
      if (isNaN(dp) || dp < 0 || dp > 100) {
        return res.status(400).json({ error: "El descuento debe estar entre 0 y 100%" });
      }
    }

    const result = await pool.query(
      `UPDATE productos
       SET codigo_barras = $1,
           imei = $2,
           nombre = $3,
           descripcion = $4,
           categoria_id = $5,
           proveedor_id = $6,
           precio_costo = $7,
           precio_venta = $8,
           precio_mayoreo = $9,
           cantidad_mayoreo = $10,
           stock_actual = $11,
           stock_minimo = $12,
           stock_maximo = $13,
           descuento_porcentaje = $14,
           descuento_monto = $15,
           disponible = $16,
           costos = $17,
           caracteristicas = $18,
           factura_proveedor_numero = $19,
           factura_proveedor_fecha = $20,
           ncf = $21
       WHERE id = $22
       RETURNING *`,
      [
        codigo_barras,
        imei,
        nombre,
        descripcion,
        categoria_id,
        proveedor_id,
        precio_costo,
        precio_venta,
        precio_mayoreo,
        cantidad_mayoreo,
        stock_actual,
        stock_minimo,
        stock_maximo,
        descuento_porcentaje,
        descuento_monto,
        disponible,
        costos ? JSON.stringify(costos) : null,
        caracteristicas ? JSON.stringify(caracteristicas) : null,
        factura_proveedor_numero || null,
        factura_proveedor_fecha || null,
        ncf || null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar producto:", error);

    if (error.code === "23505") {
      const esImei = error.constraint && error.constraint.includes("imei");
      let mensaje = `Este ${esImei ? "IMEI" : "código de barras"} ya está en uso`;
      try {
        const existing = await pool.query(
          `SELECT nombre FROM productos WHERE ((codigo_barras = $1 AND $1 IS NOT NULL) OR (imei = $2 AND $2 IS NOT NULL)) AND id != $3 LIMIT 1`,
          [codigo_barras || null, imei || null, id],
        );
        if (existing.rows.length > 0) {
          mensaje += ` por: "${existing.rows[0].nombre}"`;
        }
      } catch (_) {}
      return res.status(409).json({ error: mensaje });
    }

    res.status(500).json({ error: error.message });
  }
});

// ==================== ELIMINAR PRODUCTO (SOFT DELETE) ====================
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE productos 
       SET activo = false, disponible = false
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      message: "Producto eliminado correctamente",
      producto: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error al eliminar producto:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ELIMINAR PRODUCTO PERMANENTEMENTE ====================
router.delete("/:id/force", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Verificar que el producto existe
    const existe = await client.query("SELECT id, nombre FROM productos WHERE id = $1", [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Bloquear si tiene ventas, créditos, devoluciones o facturas
    const conVentas = await client.query(
      `SELECT COUNT(*) FROM detalle_venta WHERE producto_id = $1
       UNION ALL SELECT COUNT(*) FROM detalle_credito WHERE producto_id = $1
       UNION ALL SELECT COUNT(*) FROM detalle_devolucion WHERE producto_id = $1
       UNION ALL SELECT COUNT(*) FROM detalle_factura WHERE producto_id = $1`,
      [id]
    );
    const tieneVentas = conVentas.rows.some((r) => parseInt(r.count) > 0);
    if (tieneVentas) {
      return res.status(409).json({
        error: "No se puede eliminar: el producto tiene ventas, créditos, devoluciones o facturas registradas.",
      });
    }

    await client.query("BEGIN");
    await client.query("DELETE FROM caracteristicas_producto WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM detalle_costo_producto WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM historial_producto WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM movimientos_inventario WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM ajustes_inventario WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM productos WHERE id = $1", [id]);
    await client.query("COMMIT");

    res.json({ success: true, message: "Producto eliminado permanentemente" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al eliminar producto permanentemente:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

console.log("✅ Rutas de productos cargadas");

module.exports = router;
