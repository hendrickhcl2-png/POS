// ==================== RUTAS DE FACTURAS ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");

// ==================== OBTENER TODAS LAS FACTURAS ====================
router.get("/", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, cliente_id, estado_pago, tipo_factura, codigo_producto } =
      req.query;

    let query = `
      SELECT
        f.*,
        CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre,
        c.cedula as cliente_cedula,
        c.rnc as cliente_rnc,
        COALESCE(dev.total_devuelto, 0) AS total_devuelto,
        f.total - COALESCE(dev.total_devuelto, 0) AS total_neto
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      LEFT JOIN (
        SELECT factura_id, SUM(total) AS total_devuelto
        FROM devoluciones
        WHERE estado = 'procesada'
        GROUP BY factura_id
      ) dev ON dev.factura_id = f.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (fecha_inicio) {
      query += ` AND f.fecha >= $${paramCount}`;
      params.push(fecha_inicio);
      paramCount++;
    }

    if (fecha_fin) {
      query += ` AND f.fecha <= $${paramCount}`;
      params.push(fecha_fin);
      paramCount++;
    }

    if (cliente_id) {
      query += ` AND f.cliente_id = $${paramCount}`;
      params.push(cliente_id);
      paramCount++;
    }

    if (estado_pago) {
      query += ` AND f.estado = $${paramCount}`;
      params.push(estado_pago);
      paramCount++;
    }

    if (tipo_factura) {
      query += ` AND f.tipo_factura = $${paramCount}`;
      params.push(tipo_factura);
      paramCount++;
    }

    if (codigo_producto) {
      query += ` AND EXISTS (
        SELECT 1 FROM detalle_factura df
        LEFT JOIN productos p ON df.producto_id = p.id
        WHERE df.factura_id = f.id
          AND (
            df.codigo_producto ILIKE $${paramCount}
            OR COALESCE(p.imei, '') ILIKE $${paramCount}
          )
      )`;
      params.push(`%${codigo_producto}%`);
      paramCount++;
    }

    query += " ORDER BY f.fecha DESC, f.id DESC";

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Error al obtener facturas:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener factura
    const facturaResult = await pool.query(
      `SELECT 
        f.*,
        CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre,
        c.cedula as cliente_cedula,
        c.rnc as cliente_rnc,
        c.telefono as cliente_telefono,
        c.email as cliente_email,
        c.direccion as cliente_direccion,
        v.numero_ticket,
        v.metodo_pago,
        v.monto_recibido,
        v.cambio,
        v.banco,
        v.referencia,
        v.hora
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      LEFT JOIN ventas v ON f.venta_id = v.id
      WHERE f.id = $1`,
      [id],
    );

    if (facturaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada",
      });
    }

    const factura = facturaResult.rows[0];

    // Obtener items del detalle_factura
    const itemsResult = await pool.query(
      `SELECT * FROM detalle_factura WHERE factura_id = $1 ORDER BY id`,
      [id],
    );

    factura.items = itemsResult.rows;

    // Obtener servicios si la venta los tiene
    if (factura.venta_id) {
      const serviciosResult = await pool.query(
        `SELECT * FROM servicios_venta WHERE venta_id = $1 ORDER BY id`,
        [factura.venta_id],
      );
      factura.servicios = serviciosResult.rows;
    } else {
      factura.servicios = [];
    }

    // Obtener devoluciones asociadas a esta factura
    const devolucionesResult = await pool.query(
      `SELECT d.numero_devolucion, d.tipo, d.total AS monto_devuelto, d.motivo, d.fecha,
              json_agg(json_build_object(
                'nombre_producto', dd.nombre_producto,
                'cantidad_devuelta', dd.cantidad_devuelta,
                'precio_unitario', dd.precio_unitario,
                'total', dd.total
              ) ORDER BY dd.id) AS items
       FROM devoluciones d
       JOIN detalle_devolucion dd ON dd.devolucion_id = d.id
       WHERE d.factura_id = $1 AND d.estado = 'procesada'
       GROUP BY d.id, d.numero_devolucion, d.tipo, d.total, d.motivo, d.fecha
       ORDER BY d.fecha DESC`,
      [id],
    );
    factura.devoluciones = devolucionesResult.rows;
    factura.total_devuelto = devolucionesResult.rows.reduce(
      (sum, d) => sum + parseFloat(d.monto_devuelto), 0
    );
    factura.total_neto = parseFloat(factura.total) - factura.total_devuelto;

    res.json({
      success: true,
      data: factura,
    });
  } catch (error) {
    console.error("❌ Error al obtener factura:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ==================== CREAR FACTURA DESDE VENTA ====================
router.post("/desde-venta", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { venta_id, tipo_comprobante, dias_credito } = req.body;

    if (!venta_id) {
      throw new Error("venta_id es requerido");
    }

    // Prevenir factura duplicada para la misma venta
    const facturaExistente = await client.query(
      "SELECT id, numero_factura FROM facturas WHERE venta_id = $1 LIMIT 1",
      [venta_id]
    );
    if (facturaExistente.rows.length > 0) {
      throw new Error(`Esta venta ya tiene la factura ${facturaExistente.rows[0].numero_factura} generada`);
    }

    if (dias_credito !== undefined && dias_credito !== null) {
      const dc = parseInt(dias_credito);
      if (isNaN(dc) || dc <= 0 || dc > 365) {
        throw new Error("Los días de crédito deben estar entre 1 y 365");
      }
    }

    // Obtener venta completa
    const ventaResult = await client.query(
      "SELECT * FROM ventas WHERE id = $1",
      [venta_id],
    );

    if (ventaResult.rows.length === 0) {
      throw new Error("Venta no encontrada");
    }

    const venta = ventaResult.rows[0];

    // Generar número de factura
    const facturaNumResult = await client.query(
      `SELECT COALESCE(MAX(REGEXP_REPLACE(numero_factura, '[^0-9]', '', 'g')::integer), 0) + 1 as siguiente
       FROM facturas`,
    );
    const numeroFactura =
      "FAC-" + String(facturaNumResult.rows[0].siguiente).padStart(8, "0");

    // Generar NCF (simplificado - deberías usar tu lógica de secuencias)
    const ncf =
      tipo_comprobante +
      "-" +
      String(facturaNumResult.rows[0].siguiente).padStart(8, "0");

    // Calcular fecha de vencimiento
    const fechaVencimiento = dias_credito
      ? new Date(Date.now() + dias_credito * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : null;

    // Insertar factura
    const facturaResult = await client.query(
      `INSERT INTO facturas (
        numero_factura,
        ncf,
        tipo_comprobante,
        cliente_id,
        subtotal,
        descuento,
        itbis,
        total,
        fecha,
        fecha_vencimiento,
        estado,
        tipo_factura,
        venta_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, 'pendiente', $10, $11)
      RETURNING *`,
      [
        numeroFactura,
        ncf,
        tipo_comprobante,
        venta.cliente_id,
        venta.subtotal,
        venta.descuento || 0,
        venta.itbis,
        venta.total,
        fechaVencimiento,
        dias_credito ? "credito" : "contado",
        venta_id,
      ],
    );

    const factura = facturaResult.rows[0];

    // Copiar items de detalle_venta a detalle_factura
    const itemsResult = await client.query(
      "SELECT * FROM detalle_venta WHERE venta_id = $1",
      [venta_id],
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO detalle_factura (
          factura_id,
          producto_id,
          codigo_producto,
          nombre_producto,
          cantidad,
          precio_unitario,
          precio_costo_unitario,
          descuento,
          subtotal,
          itbis,
          total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          factura.id,
          item.producto_id,
          item.codigo_producto,
          item.nombre_producto,
          item.cantidad,
          item.precio_unitario,
          item.precio_costo_unitario || 0,
          item.descuento || 0,
          item.subtotal,
          item.itbis || 0,
          item.total,
        ],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Factura creada exitosamente",
      data: factura,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al crear factura:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// ==================== ANULAR FACTURA ====================
router.post("/:id/anular", async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;

    if (!motivo_anulacion || motivo_anulacion.trim() === "") {
      return res.status(400).json({ success: false, message: "El motivo de anulación es obligatorio" });
    }

    // Verificar que la factura existe y no está ya anulada
    const facturaActual = await pool.query(
      "SELECT estado FROM facturas WHERE id = $1", [id]
    );
    if (facturaActual.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Factura no encontrada" });
    }
    if (facturaActual.rows[0].estado === "anulada") {
      return res.status(400).json({ success: false, message: "Esta factura ya está anulada" });
    }

    const result = await pool.query(
      `UPDATE facturas
       SET estado = 'anulada',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    res.json({
      success: true,
      message: "Factura anulada exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error al anular factura:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
