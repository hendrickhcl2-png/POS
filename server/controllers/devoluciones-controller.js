// ==================== CONTROLADOR DE DEVOLUCIONES ====================

const pool = require("../database/pool");

const DevolucionesController = {
  // ==================== CREAR DEVOLUCIÓN ====================

  async crearDevolucion(req, res, next) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        factura_id,
        items, // Array de items a devolver: [{ detalle_factura_id, cantidad_devuelta }]
        motivo,
        notas,
      } = req.body;

      // Validaciones
      if (!factura_id) {
        throw new Error("Debe especificar la factura");
      }

      if (!items || items.length === 0) {
        throw new Error("Debe especificar al menos un item a devolver");
      }

      if (!motivo || motivo.trim() === "") {
        throw new Error("Debe especificar el motivo de la devolución");
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

      // Generar número de devolución
      const devNumResult = await client.query(
        `SELECT COALESCE(MAX(REGEXP_REPLACE(numero_devolucion, '[^0-9]', '', 'g')::integer), 0) + 1 as siguiente
         FROM devoluciones`,
      );
      const numeroDevolucion =
        "DEV-" + String(devNumResult.rows[0].siguiente).padStart(8, "0");

      // Procesar items
      let subtotalDevolucion = 0;
      let itbisDevolucion = 0;
      const itemsValidados = [];

      for (const item of items) {
        // Obtener detalle de factura
        const detalleResult = await client.query(
          `SELECT df.*, 
                  COALESCE(df.cantidad_devuelta, 0) as cantidad_devuelta
           FROM detalle_factura df
           WHERE df.id = $1 AND df.factura_id = $2`,
          [item.detalle_factura_id, factura_id],
        );

        if (detalleResult.rows.length === 0) {
          throw new Error(
            `Item ${item.detalle_factura_id} no encontrado en la factura`,
          );
        }

        const detalle = detalleResult.rows[0];

        // Validar cantidad disponible para devolver
        const cantidadDisponible = detalle.cantidad - detalle.cantidad_devuelta;

        if (item.cantidad_devuelta > cantidadDisponible) {
          throw new Error(
            `Cantidad a devolver de ${detalle.nombre_producto} excede la cantidad disponible (${cantidadDisponible})`,
          );
        }

        if (item.cantidad_devuelta <= 0) {
          throw new Error("La cantidad a devolver debe ser mayor a 0");
        }

        // Calcular precio efectivo por unidad (con descuento ya aplicado)
        // subtotal en detalle_factura ya refleja el precio tras descuento
        const precioEfectivo = parseFloat(detalle.subtotal) / detalle.cantidad;
        const subtotalItem = precioEfectivo * item.cantidad_devuelta;
        const itbisItem =
          parseFloat(detalle.itbis) *
          (item.cantidad_devuelta / detalle.cantidad);
        const totalItem = subtotalItem + itbisItem;

        subtotalDevolucion += subtotalItem;
        itbisDevolucion += itbisItem;

        itemsValidados.push({
          detalle_factura_id: item.detalle_factura_id,
          producto_id: detalle.producto_id,
          codigo_producto: detalle.codigo_producto,
          nombre_producto: detalle.nombre_producto,
          cantidad_devuelta: item.cantidad_devuelta,
          cantidad_original: detalle.cantidad,
          precio_unitario: precioEfectivo,
          subtotal: subtotalItem,
          itbis: itbisItem,
          total: totalItem,
        });
      }

      const totalDevolucion = subtotalDevolucion + itbisDevolucion;

      // Determinar tipo de devolución
      const itemsFacturaResult = await client.query(
        "SELECT COUNT(*) as total FROM detalle_factura WHERE factura_id = $1",
        [factura_id],
      );

      const totalItemsFactura = parseInt(itemsFacturaResult.rows[0].total);
      const tipoDevolucion =
        items.length === totalItemsFactura ? "total" : "parcial";

      // Insertar devolución
      const devolucionResult = await client.query(
        `INSERT INTO devoluciones (
          numero_devolucion,
          factura_id,
          venta_id,
          tipo,
          subtotal,
          itbis,
          total,
          motivo,
          notas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          numeroDevolucion,
          factura_id,
          factura.venta_id,
          tipoDevolucion,
          subtotalDevolucion,
          itbisDevolucion,
          totalDevolucion,
          motivo,
          notas || null,
        ],
      );

      const devolucion = devolucionResult.rows[0];

      // Insertar detalles y devolver stock
      for (const item of itemsValidados) {
        // Insertar detalle de devolución
        await client.query(
          `INSERT INTO detalle_devolucion (
            devolucion_id,
            detalle_factura_id,
            producto_id,
            codigo_producto,
            nombre_producto,
            cantidad_devuelta,
            cantidad_original,
            precio_unitario,
            subtotal,
            itbis,
            total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            devolucion.id,
            item.detalle_factura_id,
            item.producto_id,
            item.codigo_producto,
            item.nombre_producto,
            item.cantidad_devuelta,
            item.cantidad_original,
            item.precio_unitario,
            item.subtotal,
            item.itbis,
            item.total,
          ],
        );

        // Actualizar cantidad devuelta en detalle_factura
        await client.query(
          `UPDATE detalle_factura 
           SET cantidad_devuelta = cantidad_devuelta + $1
           WHERE id = $2`,
          [item.cantidad_devuelta, item.detalle_factura_id],
        );

        // Devolver stock al inventario
        await client.query(
          `UPDATE productos 
           SET stock_actual = stock_actual + $1,
               disponible = true
           WHERE id = $2`,
          [item.cantidad_devuelta, item.producto_id],
        );

        // Registrar movimiento de inventario
        await client.query(
          `INSERT INTO movimientos_inventario (
            producto_id,
            tipo,
            cantidad,
            motivo,
            usuario,
            fecha
          ) VALUES ($1, 'entrada', $2, $3, 'Sistema', CURRENT_TIMESTAMP)`,
          [
            item.producto_id,
            item.cantidad_devuelta,
            `Devolución ${numeroDevolucion} - ${motivo}`,
          ],
        );
      }

      // Si la factura tiene saldo pendiente, reducirlo por el monto devuelto
      if (parseFloat(factura.saldo_pendiente) > 0) {
        const nuevoSaldo = Math.max(
          0,
          parseFloat(factura.saldo_pendiente) - totalDevolucion,
        );
        const nuevoEstado = nuevoSaldo === 0 ? "pagada" : factura.estado;

        await client.query(
          `UPDATE facturas
           SET saldo_pendiente = $1, estado = $2
           WHERE id = $3`,
          [nuevoSaldo, nuevoEstado, factura_id],
        );

        // Si es factura de crédito, reducir también el saldo del cliente
        if (factura.tipo_factura === "credito" && factura.cliente_id) {
          await client.query(
            `UPDATE clientes
             SET saldo_pendiente = GREATEST(0, saldo_pendiente - $1)
             WHERE id = $2`,
            [totalDevolucion, factura.cliente_id],
          );
        }
      }

      await client.query("COMMIT");

      // Obtener devolución completa
      const devolucionCompleta =
        await DevolucionesController.obtenerDevolucionPorId(devolucion.id);

      res.status(201).json({
        success: true,
        message: `Devolución ${numeroDevolucion} procesada exitosamente`,
        data: devolucionCompleta,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error al crear devolución:", error);
      next(error);
    } finally {
      client.release();
    }
  },

  // ==================== OBTENER DEVOLUCIONES ====================

  async obtenerDevoluciones(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta, factura_id } = req.query;

      let query = `
        SELECT 
          d.*,
          f.numero_factura,
          CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre
        FROM devoluciones d
        LEFT JOIN facturas f ON d.factura_id = f.id
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (fecha_desde) {
        query += ` AND d.fecha >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        query += ` AND d.fecha <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      if (factura_id) {
        query += ` AND d.factura_id = $${paramCount}`;
        params.push(factura_id);
        paramCount++;
      }

      query += " ORDER BY d.fecha DESC, d.hora DESC";

      const result = await pool.query(query, params);

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error al obtener devoluciones:", error);
      next(error);
    }
  },

  // ==================== OBTENER DEVOLUCIÓN POR ID ====================

  async obtenerDevolucionPorId(devolucionId) {
    const client = await pool.connect();

    try {
      const devolucionResult = await client.query(
        `SELECT 
          d.*,
          f.numero_factura,
          f.ncf,
          CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre,
          c.cedula as cliente_cedula,
          c.rnc as cliente_rnc
        FROM devoluciones d
        LEFT JOIN facturas f ON d.factura_id = f.id
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE d.id = $1`,
        [devolucionId],
      );

      if (devolucionResult.rows.length === 0) {
        throw new Error("Devolución no encontrada");
      }

      const devolucion = devolucionResult.rows[0];

      const itemsResult = await client.query(
        `SELECT * FROM detalle_devolucion WHERE devolucion_id = $1 ORDER BY id`,
        [devolucionId],
      );

      devolucion.items = itemsResult.rows;

      return devolucion;
    } finally {
      client.release();
    }
  },

  async obtenerDevolucion(req, res, next) {
    try {
      const { id } = req.params;
      const devolucion = await this.obtenerDevolucionPorId(id);

      res.json({
        success: true,
        data: devolucion,
      });
    } catch (error) {
      console.error("❌ Error al obtener devolución:", error);
      next(error);
    }
  },
};

module.exports = DevolucionesController;
