// ==================== CONTROLADOR DE PAGOS ====================

const pool = require("../database/pool");

const PagosController = {
  // ==================== REGISTRAR PAGO ====================

  async registrarPago(req, res, next) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        factura_id,
        monto,
        metodo_pago,
        monto_efectivo,
        monto_tarjeta,
        monto_transferencia,
        banco,
        referencia,
        numero_cheque,
        notas,
        fecha,
      } = req.body;

      // Validaciones
      if (!factura_id) {
        throw new Error("Debe especificar la factura");
      }

      if (!monto || parseFloat(monto) <= 0) {
        throw new Error("El monto debe ser mayor a 0");
      }

      if (!metodo_pago) {
        throw new Error("Debe especificar el método de pago");
      }

      // Obtener factura
      const facturaResult = await client.query(
        "SELECT * FROM facturas WHERE id = $1",
        [factura_id],
      );

      if (facturaResult.rows.length === 0) {
        throw new Error("Factura no encontrada");
      }

      const factura = facturaResult.rows[0];

      if (factura.estado === "anulada") {
        throw new Error("No se puede registrar pagos en una factura anulada");
      }

      if (factura.estado === "pagada") {
        throw new Error("Esta factura ya está completamente pagada");
      }

      // Calcular saldo pendiente (usa el valor almacenado, que ya refleja devoluciones)
      const montoPagado = parseFloat(factura.monto_pagado || 0);
      const total = parseFloat(factura.total);
      const saldoPendiente = parseFloat(factura.saldo_pendiente);

      if (parseFloat(monto) > saldoPendiente) {
        throw new Error(
          `El monto excede el saldo pendiente (${saldoPendiente.toFixed(2)})`,
        );
      }

      // Generar número de pago
      const pagoNumResult = await client.query(
        `SELECT COALESCE(MAX(REGEXP_REPLACE(numero_pago, '[^0-9]', '', 'g')::integer), 0) + 1 as siguiente
         FROM pagos_factura`,
      );
      const numeroPago =
        "PAG-" + String(pagoNumResult.rows[0].siguiente).padStart(8, "0");

      // Insertar pago
      const pagoResult = await client.query(
        `INSERT INTO pagos_factura (
          numero_pago,
          factura_id,
          monto,
          metodo_pago,
          monto_efectivo,
          monto_tarjeta,
          monto_transferencia,
          banco,
          referencia,
          numero_cheque,
          notas,
          fecha
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          numeroPago,
          factura_id,
          monto,
          metodo_pago,
          metodo_pago === "efectivo" || metodo_pago === "mixto"
            ? monto_efectivo
            : null,
          metodo_pago === "tarjeta" || metodo_pago === "mixto"
            ? monto_tarjeta
            : null,
          metodo_pago === "transferencia" || metodo_pago === "mixto"
            ? monto_transferencia
            : null,
          banco || null,
          referencia || null,
          numero_cheque || null,
          notas || null,
          fecha || null,
        ],
      );

      const pago = pagoResult.rows[0];

      // Actualizar factura
      const nuevoMontoPagado = montoPagado + parseFloat(monto);
      const nuevoSaldo = Math.max(0, saldoPendiente - parseFloat(monto));

      let nuevoEstado = "pendiente";
      if (nuevoSaldo <= 0) {
        nuevoEstado = "pagada";
      } else if (nuevoMontoPagado > 0) {
        nuevoEstado = "parcial";
      }

      await client.query(
        `UPDATE facturas 
         SET monto_pagado = $1,
             saldo_pendiente = $2,
             estado = $3
         WHERE id = $4`,
        [nuevoMontoPagado, nuevoSaldo, nuevoEstado, factura_id],
      );

      // Si es a crédito, actualizar saldo del cliente
      if (factura.tipo_factura === "credito" && factura.cliente_id) {
        await client.query(
          `UPDATE clientes 
           SET saldo_pendiente = saldo_pendiente - $1
           WHERE id = $2`,
          [monto, factura.cliente_id],
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `Pago ${numeroPago} registrado exitosamente`,
        data: {
          pago: pago,
          nuevo_saldo: nuevoSaldo,
          nuevo_estado: nuevoEstado,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error al registrar pago:", error);
      next(error);
    } finally {
      client.release();
    }
  },

  // ==================== OBTENER PAGOS DE UNA FACTURA ====================

  async obtenerPagosPorFactura(req, res, next) {
    try {
      const { factura_id } = req.params;

      const result = await pool.query(
        `SELECT * FROM pagos_factura 
         WHERE factura_id = $1 
         ORDER BY fecha DESC, hora DESC`,
        [factura_id],
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error al obtener pagos:", error);
      next(error);
    }
  },

  // ==================== OBTENER TODOS LOS PAGOS ====================

  async obtenerPagos(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;

      let query = `
        SELECT 
          p.*,
          f.numero_factura,
          f.total as factura_total,
          f.monto_pagado as factura_monto_pagado,
          f.saldo_pendiente as factura_saldo,
          CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre
        FROM pagos_factura p
        LEFT JOIN facturas f ON p.factura_id = f.id
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (fecha_desde) {
        query += ` AND p.fecha >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        query += ` AND p.fecha <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      query += " ORDER BY p.fecha DESC, p.hora DESC";

      const result = await pool.query(query, params);

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error al obtener pagos:", error);
      next(error);
    }
  },

  // ==================== ANULAR PAGO ====================

  async anularPago(req, res, next) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { motivo } = req.body;

      // Obtener pago
      const pagoResult = await client.query(
        "SELECT * FROM pagos_factura WHERE id = $1",
        [id],
      );

      if (pagoResult.rows.length === 0) {
        throw new Error("Pago no encontrado");
      }

      const pago = pagoResult.rows[0];

      // Obtener factura
      const facturaResult = await client.query(
        "SELECT * FROM facturas WHERE id = $1",
        [pago.factura_id],
      );

      const factura = facturaResult.rows[0];

      // Eliminar pago
      await client.query("DELETE FROM pagos_factura WHERE id = $1", [id]);

      // Recalcular totales de la factura (saldo sube por el monto anulado)
      const nuevoPagado = Math.max(
        0,
        parseFloat(factura.monto_pagado) - parseFloat(pago.monto),
      );
      const nuevoSaldo = parseFloat(factura.saldo_pendiente) + parseFloat(pago.monto);

      let nuevoEstado = "pendiente";
      if (nuevoPagado >= parseFloat(factura.total)) {
        nuevoEstado = "pagada";
      } else if (nuevoPagado > 0) {
        nuevoEstado = "parcial";
      }

      await client.query(
        `UPDATE facturas 
         SET monto_pagado = $1,
             saldo_pendiente = $2,
             estado = $3
         WHERE id = $4`,
        [nuevoPagado, nuevoSaldo, nuevoEstado, pago.factura_id],
      );

      // Si es a crédito, actualizar saldo del cliente
      if (factura.tipo_factura === "credito" && factura.cliente_id) {
        await client.query(
          `UPDATE clientes 
           SET saldo_pendiente = saldo_pendiente + $1
           WHERE id = $2`,
          [pago.monto, factura.cliente_id],
        );
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Pago anulado exitosamente",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error al anular pago:", error);
      next(error);
    } finally {
      client.release();
    }
  },
};

module.exports = PagosController;
