// ==================== CONTROLADOR DE DEVOLUCIONES ====================

const pool = require("../database/pool");

// Igual que en ventas: los errores de validación llevan su status para que el
// manejador global responda 400/404 y no un 500 de "error interno".
function errorCliente(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

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
        restaurar_stock = true,
        metodo_devolucion = "reembolso", // 'cambio', 'reembolso'
        metodo_reembolso, // 'efectivo', 'transferencia' (solo si metodo_devolucion='reembolso')
        referencia_transferencia, // referencia de transferencia (solo si metodo_reembolso='transferencia')
        producto_cambio_id, // ID del producto nuevo (solo si metodo_devolucion='cambio')
        producto_cambio_cantidad = 1, // Cantidad del producto nuevo
      } = req.body;

      // Validaciones
      if (!factura_id) {
        throw errorCliente("Debe especificar la factura");
      }

      if (!items || items.length === 0) {
        throw errorCliente("Debe especificar al menos un item a devolver");
      }

      if (!motivo || motivo.trim() === "") {
        throw errorCliente("Debe especificar el motivo de la devolución");
      }

      // Validar metodo_devolucion
      if (!["cambio", "reembolso"].includes(metodo_devolucion)) {
        throw errorCliente("Método de devolución inválido");
      }

      // Validar metodo_reembolso si es reembolso
      if (metodo_devolucion === "reembolso") {
        if (
          !metodo_reembolso ||
          !["efectivo", "transferencia"].includes(metodo_reembolso)
        ) {
          throw errorCliente(
            "Debe especificar el método de reembolso (efectivo o transferencia)",
          );
        }

        // Igual que en la venta por transferencia: sin referencia no hay
        // forma de rastrear el reembolso.
        if (
          metodo_reembolso === "transferencia" &&
          (!referencia_transferencia || !referencia_transferencia.trim())
        ) {
          throw errorCliente(
            "Debe ingresar el número de referencia para reembolsos por transferencia",
          );
        }
      }

      // Validar producto de cambio si es cambio
      let productoCambio = null;
      if (metodo_devolucion === "cambio") {
        if (!producto_cambio_id) {
          throw errorCliente("Debe seleccionar un producto para el cambio");
        }
        // Igual que en la venta: lo que decide es el stock, no la bandera.
        const prodResult = await client.query(
          "SELECT * FROM productos WHERE id = $1 AND activo = true",
          [producto_cambio_id],
        );
        if (prodResult.rows.length === 0) {
          throw errorCliente("Producto de cambio no encontrado o eliminado");
        }
        productoCambio = prodResult.rows[0];

        // Sin este chequeo una cantidad negativa pasaba la comparación de
        // stock de abajo y el descuento terminaba sumando unidades.
        const cantidadCambio = Number(producto_cambio_cantidad);
        if (!Number.isInteger(cantidadCambio) || cantidadCambio <= 0) {
          throw errorCliente(
            "La cantidad del producto de cambio debe ser un número entero mayor a 0",
          );
        }

        if (productoCambio.stock_actual < producto_cambio_cantidad) {
          throw errorCliente(
            `Stock insuficiente del producto de cambio (disponible: ${productoCambio.stock_actual})`,
          );
        }
      }

      // Obtener factura
      const facturaResult = await client.query(
        "SELECT * FROM facturas WHERE id = $1",
        [factura_id],
      );

      if (facturaResult.rows.length === 0) {
        throw errorCliente("Factura no encontrada", 404);
      }

      const factura = facturaResult.rows[0];

      // Una venta anulada ya repuso su stock: aceptar además una devolución
      // duplicaría esas unidades en el inventario.
      if (factura.venta_id) {
        const ventaResult = await client.query(
          "SELECT estado FROM ventas WHERE id = $1",
          [factura.venta_id],
        );

        if (ventaResult.rows[0]?.estado === "anulada") {
          throw errorCliente(
            "La venta de esta factura está anulada: su stock ya fue devuelto al inventario",
            409,
          );
        }
      }

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
      // La cantidad disponible se lee de la BD, así que una misma línea
      // repetida en el payload pasaba el chequeo dos veces y devolvía más
      // unidades de las vendidas. Acumulamos lo pedido en esta petición.
      const solicitadoPorLinea = new Map();

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
          throw errorCliente(
            `Item ${item.detalle_factura_id} no encontrado en la factura`,
          );
        }

        const detalle = detalleResult.rows[0];

        const cantidadDevuelta = Number(item.cantidad_devuelta);

        if (!Number.isInteger(cantidadDevuelta) || cantidadDevuelta <= 0) {
          throw errorCliente(
            "La cantidad a devolver debe ser un número entero mayor a 0",
          );
        }

        // Validar cantidad disponible para devolver, contando lo que ya pidió
        // esta misma devolución para esa línea.
        const cantidadDisponible = detalle.cantidad - detalle.cantidad_devuelta;
        const yaSolicitado = solicitadoPorLinea.get(detalle.id) || 0;

        if (yaSolicitado + cantidadDevuelta > cantidadDisponible) {
          throw errorCliente(
            `Cantidad a devolver de ${detalle.nombre_producto} excede la cantidad disponible (${cantidadDisponible})`,
          );
        }

        solicitadoPorLinea.set(detalle.id, yaSolicitado + cantidadDevuelta);

        // Calcular precio efectivo por unidad (con descuento ya aplicado)
        const precioEfectivo = parseFloat(detalle.subtotal) / detalle.cantidad;
        const subtotalItem = precioEfectivo * cantidadDevuelta;
        const itbisItem =
          parseFloat(detalle.itbis) * (cantidadDevuelta / detalle.cantidad);
        const totalItem = subtotalItem + itbisItem;

        subtotalDevolucion += subtotalItem;
        itbisDevolucion += itbisItem;

        itemsValidados.push({
          detalle_factura_id: item.detalle_factura_id,
          producto_id: detalle.producto_id,
          codigo_producto: detalle.codigo_producto,
          nombre_producto: detalle.nombre_producto,
          cantidad_devuelta: cantidadDevuelta,
          cantidad_original: detalle.cantidad,
          precio_unitario: precioEfectivo,
          subtotal: subtotalItem,
          itbis: itbisItem,
          total: totalItem,
        });
      }

      const totalDevolucion = subtotalDevolucion + itbisDevolucion;

      // Calcular diferencia de cambio si aplica
      let diferenciaCambio = 0;
      let montoClientePago = 0;
      if (metodo_devolucion === "cambio" && productoCambio) {
        const totalProductoCambio =
          parseFloat(productoCambio.precio_venta) * producto_cambio_cantidad;
        diferenciaCambio = totalProductoCambio - totalDevolucion;
        // Si diferencia > 0, el cliente paga la diferencia
        // Si diferencia < 0, se devuelve la diferencia al cliente o queda como crédito
        montoClientePago = diferenciaCambio > 0 ? diferenciaCambio : 0;
      }

      // Determinar tipo de devolución.
      // Es "total" solo cuando, contando lo ya devuelto antes más lo que se
      // devuelve ahora, no queda ninguna unidad pendiente en toda la factura.
      // Comparar la cantidad de LÍNEAS marcaba como total una devolución de 1
      // de 5 unidades en una factura de una sola línea (hallazgo H4).
      const unidadesResult = await client.query(
        `SELECT COALESCE(SUM(cantidad), 0) AS vendidas,
                COALESCE(SUM(COALESCE(cantidad_devuelta, 0)), 0) AS ya_devueltas
         FROM detalle_factura WHERE factura_id = $1`,
        [factura_id],
      );

      const unidadesVendidas = parseInt(unidadesResult.rows[0].vendidas);
      const unidadesYaDevueltas = parseInt(unidadesResult.rows[0].ya_devueltas);
      const unidadesEnEstaDevolucion = itemsValidados.reduce(
        (suma, i) => suma + parseInt(i.cantidad_devuelta),
        0,
      );

      const tipoDevolucion =
        unidadesYaDevueltas + unidadesEnEstaDevolucion >= unidadesVendidas
          ? "total"
          : "parcial";

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
          notas,
          metodo_devolucion,
          metodo_reembolso,
          referencia_transferencia,
          producto_cambio_id,
          producto_cambio_nombre,
          producto_cambio_precio,
          producto_cambio_cantidad,
          diferencia_cambio,
          monto_cliente_pago
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
          metodo_devolucion,
          metodo_reembolso || null,
          referencia_transferencia || null,
          producto_cambio_id || null,
          productoCambio ? productoCambio.nombre : null,
          productoCambio ? productoCambio.precio_venta : null,
          metodo_devolucion === "cambio" ? producto_cambio_cantidad : null,
          diferenciaCambio,
          montoClientePago,
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

        // Devolver stock al inventario (siempre para cambios, opcional para reembolsos)
        const debeRestaurarStock =
          metodo_devolucion === "cambio" || restaurar_stock !== false;
        if (debeRestaurarStock) {
          await client.query(
            `UPDATE productos
             SET stock_actual = stock_actual + $1,
                 disponible = true
             WHERE id = $2`,
            [item.cantidad_devuelta, item.producto_id],
          );

          // Registrar movimiento de inventario (entrada del producto devuelto)
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
      }

      // Si es cambio, descontar stock del producto nuevo y registrar movimiento
      if (metodo_devolucion === "cambio" && productoCambio) {
        await client.query(
          `UPDATE productos
           SET stock_actual = stock_actual - $1,
               disponible = (stock_actual - $1 > 0)
           WHERE id = $2`,
          [producto_cambio_cantidad, producto_cambio_id],
        );

        // Registrar movimiento de salida del producto nuevo
        await client.query(
          `INSERT INTO movimientos_inventario (
            producto_id,
            tipo,
            cantidad,
            motivo,
            usuario,
            fecha
          ) VALUES ($1, 'salida', $2, $3, 'Sistema', CURRENT_TIMESTAMP)`,
          [
            producto_cambio_id,
            producto_cambio_cantidad,
            `Cambio por devolución ${numeroDevolucion}`,
          ],
        );
      }

      // Si la factura tiene saldo pendiente, reducirlo por el monto devuelto
      // (solo para reembolsos, no para cambios donde se intercambia producto)
      if (
        metodo_devolucion === "reembolso" &&
        parseFloat(factura.saldo_pendiente) > 0
      ) {
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
        throw errorCliente("Devolución no encontrada", 404);
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
