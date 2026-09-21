//Controlador de ventas

const pool = require("../database/pool");

// Identificador del lock que serializa la numeración de ticket / factura / NCF.
// Es arbitrario, solo tiene que ser el mismo en todo el proceso.
const LOCK_NUMERACION_VENTAS = 815501;

// Los errores de validación llevan su propio status: el manejador global de
// errores usa err.status, así que estos llegan al frontend como 400 (o 404 /
// 409) en vez de confundirse con un fallo interno del servidor.
function errorCliente(mensaje, status = 400) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

const VentasController = {
  //Crear venta
  async crearVenta(req, res, next) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        cliente_id,
        subtotal,
        descuento = 0,
        itbis,
        total,
        metodo_pago,
        incluir_itbis,
        generar_factura_electronica,
        items,
        servicios,
        // Datos de pago
        monto_recibido,
        cambio,
        banco,
        referencia,
        monto_efectivo,
        monto_tarjeta,
        monto_transferencia,
        notas,
        fecha_venta,
      } = req.body;

      // Validar fecha_venta retroactiva si se provee
      let fechaVentaFinal = null;
      if (fecha_venta) {
        const hoy = new Date().toISOString().split("T")[0];
        if (fecha_venta > hoy) {
          throw errorCliente("No se puede registrar una venta con fecha futura");
        }
        fechaVentaFinal = fecha_venta;
      }

      // Validaciones
      if ((!items || items.length === 0) && (!servicios || servicios.length === 0)) {
        throw errorCliente("La venta debe tener al menos un producto o servicio");
      }

      if (!metodo_pago) {
        throw errorCliente("Debe especificar el método de pago");
      }

      // Cada línea tiene que traer una cantidad entera positiva: en 0 ensucia
      // el detalle con líneas vacías y en negativo el trigger de stock sumaría
      // unidades en lugar de restarlas.
      for (const item of items || []) {
        const cantidad = Number(item.cantidad);
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          throw errorCliente(
            "La cantidad de cada producto debe ser un número entero mayor a 0",
          );
        }
        if (parseFloat(item.precio_unitario) < 0) {
          throw errorCliente("El precio de un producto no puede ser negativo");
        }
      }

      // Descuento no puede superar el subtotal
      if (parseFloat(descuento) < 0 || parseFloat(descuento) > parseFloat(subtotal)) {
        throw errorCliente("El descuento no puede ser mayor al subtotal");
      }

      // Pago mixto: los montos parciales deben sumar el total (tolerancia 1 centavo)
      if (metodo_pago === "mixto") {
        const sumaMixto = (parseFloat(monto_efectivo) || 0)
                        + (parseFloat(monto_tarjeta) || 0)
                        + (parseFloat(monto_transferencia) || 0);
        if (Math.abs(sumaMixto - parseFloat(total)) > 0.01) {
          throw errorCliente("Los montos del pago mixto no suman el total de la venta");
        }
      }

      // Transferencia: referencia obligatoria
      if (metodo_pago === "transferencia" && (!referencia || !referencia.trim())) {
        throw errorCliente("Debe ingresar el número de referencia para pagos por transferencia");
      }

      // Crédito: exige un cliente al que cobrarle. Sin esto nace una cuenta
      // por cobrar sin dueño.
      if ((metodo_pago === "credito" || req.body.es_credito === true) && !cliente_id) {
        throw errorCliente("Debe seleccionar un cliente para las ventas a crédito");
      }

      // Numeración de ticket, factura y NCF.
      // Se toma un lock de transacción sobre la tabla de ventas para que dos
      // ventas simultáneas no calculen el mismo MAX()+1 y choquen contra la
      // restricción UNIQUE de numero_ticket. El lock se libera al COMMIT.
      await client.query("SELECT pg_advisory_xact_lock($1)", [
        LOCK_NUMERACION_VENTAS,
      ]);

      const resultTicket = await client.query(
        `SELECT COALESCE(MAX(REGEXP_REPLACE(numero_ticket, '[^0-9]', '', 'g')::integer), 0) + 1 as siguiente_ticket
         FROM ventas`,
      );
      const numeroTicket =
        "A" + String(resultTicket.rows[0].siguiente_ticket).padStart(8, "0");

      const usuarioSesion = req.session?.usuario || null;

      // Insertar venta
      const ventaResult = await client.query(
        `INSERT INTO ventas (
          numero_ticket,
          cliente_id,
          subtotal,
          descuento,
          itbis,
          total,
          metodo_pago,
          monto_efectivo,
          monto_tarjeta,
          monto_transferencia,
          banco,
          referencia,
          monto_recibido,
          cambio,
          fecha,
          hora,
          estado,
          notas,
          incluir_itbis,
          generar_factura_electronica,
          usuario_id,
          usuario_nombre
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($20::date, CURRENT_DATE), CURRENT_TIME, 'completada', $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          numeroTicket,
          cliente_id || null,
          subtotal,
          descuento,
          itbis,
          total,
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
          monto_recibido || null,
          cambio || null,
          notas || null,
          incluir_itbis !== false,
          generar_factura_electronica || false,
          usuarioSesion?.id || null,
          usuarioSesion?.nombre || null,
          fechaVentaFinal,
        ],
      );

      const venta = ventaResult.rows[0];

      // Insertar items de la venta
      for (const item of items || []) {
        const productoResult = await client.query(
          "SELECT * FROM productos WHERE id = $1 FOR UPDATE",
          [item.producto_id],
        );

        if (productoResult.rows.length === 0) {
          throw errorCliente(`Producto con ID ${item.producto_id} no encontrado`);
        }

        const producto = productoResult.rows[0];

        if (producto.activo === false) {
          throw errorCliente(
            `El producto ${producto.nombre} fue eliminado y no puede venderse`,
          );
        }

        if (producto.disponible === false) {
          throw errorCliente(
            `El producto ${producto.nombre} no está disponible para la venta`,
          );
        }

        if (producto.stock_actual < item.cantidad) {
          throw errorCliente(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}`,
          );
        }

        const itbis_item = incluir_itbis !== false ? item.subtotal * 0.18 : 0;
        const total_item = item.subtotal + itbis_item;

        // El INSERT en detalle_venta dispara el trigger 'actualizar_stock_venta'
        // que ya descuenta stock_actual automáticamente
        await client.query(
          `INSERT INTO detalle_venta (
            venta_id,
            producto_id,
            codigo_producto,
            nombre_producto,
            imei,
            cantidad,
            precio_unitario,
            precio_costo_unitario,
            descuento,
            subtotal,
            itbis,
            total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            venta.id,
            item.producto_id,
            producto.codigo_barras || producto.codigo,
            producto.nombre,
            producto.imei || null,
            item.cantidad,
            item.precio_unitario,
            producto.precio_costo || 0,
            item.descuento || 0,
            item.subtotal,
            itbis_item,
            total_item,
          ],
        );

        // Actualizar disponible después del trigger
        await client.query(
          `UPDATE productos
           SET disponible = CASE WHEN stock_actual <= 0 THEN false ELSE disponible END
           WHERE id = $1`,
          [item.producto_id],
        );

        await client.query(
          `INSERT INTO movimientos_inventario (
            producto_id,
            tipo,
            cantidad,
            motivo,
            usuario,
            fecha,
            stock_anterior,
            stock_nuevo
          ) VALUES ($1, 'salida', $2, 'Venta #' || $3, 'Sistema', CURRENT_TIMESTAMP, $4, $5)`,
          [
            item.producto_id,
            item.cantidad,
            venta.id,
            producto.stock_actual,
            producto.stock_actual - item.cantidad,
          ],
        );
      }

      // Insertar servicios si existen
      if (servicios && servicios.length > 0) {
        for (const servicio of servicios) {
          const precio = servicio.es_gratis ? 0 : parseFloat(servicio.precio);
          const itbis_servicio =
            incluir_itbis !== false && !servicio.es_gratis ? precio * 0.18 : 0;

          await client.query(
            `INSERT INTO servicios_venta (
              venta_id,
              servicio_id,
              nombre_servicio,
              precio,
              cantidad,
              es_gratuito,
              subtotal,
              itbis,
              total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              venta.id,
              servicio.servicio_id,
              servicio.nombre,
              precio,
              1,
              servicio.es_gratis || false,
              precio,
              itbis_servicio,
              precio + itbis_servicio,
            ],
          );
        }
      }

      // ==================== CREAR FACTURA AUTOMÁTICAMENTE ====================

      // Generar número de factura
      const facturaNumResult = await client.query(
        `SELECT COALESCE(MAX(REGEXP_REPLACE(numero_factura, '[^0-9]', '', 'g')::integer), 0) + 1 as siguiente
         FROM facturas`,
      );
      const numeroFactura =
        "FAC-" + String(facturaNumResult.rows[0].siguiente).padStart(8, "0");

      // Generar NCF
      const ncf =
        "B02-" + String(facturaNumResult.rows[0].siguiente).padStart(8, "0");

      // Determinar estado y tipo de factura
      let estadoFactura = "pagada";
      let tipoFactura = "contado";
      let fechaVencimiento = null;

      // Si se marca como crédito, configurar la factura como pendiente
      if (metodo_pago === "credito" || req.body.es_credito === true) {
        estadoFactura = "pendiente";
        tipoFactura = "credito";

        const diasCredito = req.body.dias_credito || 30;
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + diasCredito);
        fechaVencimiento = fecha.toISOString().split("T")[0];
      }

      // Crear factura
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
          monto_pagado,
          saldo_pendiente,
          fecha,
          fecha_vencimiento,
          estado,
          tipo_factura,
          venta_id
        ) VALUES ($1, $2, 'B02', $3, $4, $5, $6, $7::numeric,
            CASE WHEN $9 = 'pendiente' THEN 0::numeric ELSE $7::numeric END,
            CASE WHEN $9 = 'pendiente' THEN $7::numeric ELSE 0::numeric END,
            COALESCE($12::date, CURRENT_DATE), $8, $9, $10, $11)
        RETURNING *`,
        [
          numeroFactura,
          ncf,
          cliente_id || null,
          subtotal,
          descuento,
          itbis,
          total,
          fechaVencimiento,
          estadoFactura,
          tipoFactura,
          venta.id,
          fechaVentaFinal,
        ],
      );

      const factura = facturaResult.rows[0];

      // Si es a crédito, actualizar saldo pendiente
      if (tipoFactura === "credito" && cliente_id) {
        await client.query(
          `UPDATE clientes 
           SET saldo_pendiente = saldo_pendiente + $1
           WHERE id = $2`,
          [total, cliente_id],
        );
      }

      // Copiar items a detalle_factura
      for (const item of items || []) {
        const productoResult = await client.query(
          "SELECT * FROM productos WHERE id = $1",
          [item.producto_id],
        );

        const producto = productoResult.rows[0];
        const itbis_item = incluir_itbis !== false ? item.subtotal * 0.18 : 0;
        const total_item = item.subtotal + itbis_item;

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
            producto.codigo_barras || producto.codigo,
            producto.nombre,
            item.cantidad,
            item.precio_unitario,
            producto.precio_costo || 0,
            item.descuento || 0,
            item.subtotal,
            itbis_item,
            total_item,
          ],
        );
      }
      if (
        metodo_pago === "credito" &&
        monto_recibido &&
        parseFloat(monto_recibido) > 0
      ) {
        // Generar número de pago
        const pagoNumResult = await client.query(
          `SELECT COALESCE(MAX(REGEXP_REPLACE(numero_pago, '[^0-9]', '', 'g')::integer), 0) + 1 as siguiente
           FROM pagos_factura`,
        );
        const numeroPago =
          "PAG-" + String(pagoNumResult.rows[0].siguiente).padStart(8, "0");

        // Registrar pago inicial
        await client.query(
          `INSERT INTO pagos_factura (
            numero_pago,
            factura_id,
            monto,
            metodo_pago,
            monto_efectivo,
            notas
          ) VALUES ($1, $2, $3, 'efectivo', $4, 'Pago inicial en venta')`,
          [numeroPago, factura.id, monto_recibido, monto_recibido],
        );

        // Actualizar factura
        const nuevoMontoPagado = parseFloat(monto_recibido);
        const nuevoSaldo = total - nuevoMontoPagado;
        const nuevoEstado = nuevoMontoPagado >= total ? "pagada" : "parcial";

        await client.query(
          `UPDATE facturas 
           SET monto_pagado = $1,
               saldo_pendiente = $2,
               estado = $3
           WHERE id = $4`,
          [nuevoMontoPagado, nuevoSaldo, nuevoEstado, factura.id],
        );

        // Actualizar saldo del cliente
        if (cliente_id) {
          await client.query(
            `UPDATE clientes 
             SET saldo_pendiente = saldo_pendiente - $1
             WHERE id = $2`,
            [monto_recibido, cliente_id],
          );
        }

        console.log(
          `✅ Pago inicial ${numeroPago} registrado: RD$${parseFloat(monto_recibido).toFixed(2)}`,
        );
      }

      console.log(
        `✅ Factura ${numeroFactura} creada (${tipoFactura}, estado: ${estadoFactura})`,
      );

      await client.query("COMMIT");

      // Obtener venta completa con factura
      const ventaCompleta = await this.obtenerVentaPorId(venta.id);
      ventaCompleta.factura_id = factura.id;
      ventaCompleta.numero_factura = factura.numero_factura;
      ventaCompleta.ncf = factura.ncf;
      ventaCompleta.tipo_factura = factura.tipo_factura;
      ventaCompleta.estado_factura = factura.estado;

      res.status(201).json({
        success: true,
        message: `Venta y factura procesadas exitosamente (${tipoFactura})`,
        data: ventaCompleta,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error al crear venta:", error);
      next(error);
    } finally {
      client.release();
    }
  },

  // ==================== OBTENER VENTAS ====================

  async obtenerVentas(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta, cliente_id, metodo_pago } = req.query;

      let query = `
        SELECT 
          v.*,
          CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre,
          c.cedula as cliente_cedula,
          c.rnc as cliente_rnc
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (fecha_desde) {
        query += ` AND v.fecha >= $${paramCount}`;
        params.push(fecha_desde);
        paramCount++;
      }

      if (fecha_hasta) {
        query += ` AND v.fecha <= $${paramCount}`;
        params.push(fecha_hasta);
        paramCount++;
      }

      if (cliente_id) {
        query += ` AND v.cliente_id = $${paramCount}`;
        params.push(cliente_id);
        paramCount++;
      }

      if (metodo_pago) {
        query += ` AND v.metodo_pago = $${paramCount}`;
        params.push(metodo_pago);
        paramCount++;
      }

      query += " ORDER BY v.fecha DESC, v.hora DESC";

      const result = await pool.query(query, params);

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error al obtener ventas:", error);
      next(error);
    }
  },

  // ==================== OBTENER VENTA POR ID ====================

  async obtenerVentaPorId(ventaId) {
    const client = await pool.connect();

    try {
      const ventaResult = await client.query(
        `SELECT
          v.*,
          CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')) as cliente_nombre,
          c.cedula as cliente_cedula,
          c.rnc as cliente_rnc,
          c.telefono as cliente_telefono,
          c.email as cliente_email,
          f.numero_factura,
          f.ncf,
          f.tipo_comprobante,
          f.tipo_factura,
          f.estado as estado_factura,
          COALESCE(v.usuario_nombre, u.nombre) as vendedor_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN facturas f ON f.venta_id = v.id
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE v.id = $1`,
        [ventaId],
      );

      if (ventaResult.rows.length === 0) {
        throw errorCliente("Venta no encontrada", 404);
      }

      const venta = ventaResult.rows[0];

      const itemsResult = await client.query(
        `SELECT * FROM detalle_venta WHERE venta_id = $1 ORDER BY id`,
        [ventaId],
      );

      venta.items = itemsResult.rows;

      const serviciosResult = await client.query(
        `SELECT * FROM servicios_venta WHERE venta_id = $1 ORDER BY id`,
        [ventaId],
      );

      venta.servicios = serviciosResult.rows;

      const devolucionesResult = await client.query(
        `SELECT
          d.numero_devolucion,
          d.tipo,
          d.total AS monto_devuelto,
          d.motivo,
          d.fecha,
          json_agg(
            json_build_object(
              'nombre_producto', dd.nombre_producto,
              'cantidad_devuelta', dd.cantidad_devuelta,
              'precio_unitario', dd.precio_unitario,
              'total', dd.total
            ) ORDER BY dd.id
          ) AS items
        FROM devoluciones d
        JOIN detalle_devolucion dd ON dd.devolucion_id = d.id
        WHERE d.venta_id = $1 AND d.estado = 'procesada'
        GROUP BY d.id`,
        [ventaId],
      );

      venta.devoluciones = devolucionesResult.rows;
      venta.total_devuelto = devolucionesResult.rows.reduce(
        (s, d) => s + parseFloat(d.monto_devuelto), 0,
      );

      return venta;
    } finally {
      client.release();
    }
  },

  async obtenerVenta(req, res, next) {
    try {
      const { id } = req.params;
      const venta = await this.obtenerVentaPorId(id);

      res.json({
        success: true,
        data: venta,
      });
    } catch (error) {
      console.error("❌ Error al obtener venta:", error);
      next(error);
    }
  },

  // ==================== ESTADÍSTICAS ====================

  async obtenerEstadisticas(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      const hoy = new Date().toISOString().split("T")[0];

      const ventasHoyResult = await pool.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto
         FROM ventas
         WHERE fecha::date = $1`,
        [fecha_desde || hoy],
      );

      const ventasMetodoResult = await pool.query(
        `SELECT metodo_pago, COUNT(*) as cantidad, SUM(total) as monto
         FROM ventas
         WHERE fecha::date >= $1 AND fecha::date <= $2
         GROUP BY metodo_pago`,
        [fecha_desde || hoy, fecha_hasta || hoy],
      );

      const productosMasVendidosResult = await pool.query(
        `SELECT 
          dv.nombre_producto as nombre,
          dv.codigo_producto as codigo_barras,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as ingresos
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        WHERE v.fecha::date >= $1 AND v.fecha::date <= $2
        GROUP BY dv.nombre_producto, dv.codigo_producto
        ORDER BY cantidad_vendida DESC
        LIMIT 10`,
        [fecha_desde || hoy, fecha_hasta || hoy],
      );

      res.json({
        success: true,
        data: {
          ventas_hoy: ventasHoyResult.rows[0],
          ventas_por_metodo: ventasMetodoResult.rows,
          productos_mas_vendidos: productosMasVendidosResult.rows,
        },
      });
    } catch (error) {
      console.error("❌ Error al obtener estadísticas:", error);
      next(error);
    }
  },

  // ==================== ANULAR VENTA ====================

  async anularVenta(req, res, next) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { motivo } = req.body;

      const ventaResult = await client.query(
        "SELECT * FROM ventas WHERE id = $1",
        [id],
      );

      if (ventaResult.rows.length === 0) {
        throw errorCliente("Venta no encontrada", 404);
      }

      const venta = ventaResult.rows[0];

      if (venta.estado === "anulada") {
        throw errorCliente("La venta ya está anulada", 409);
      }

      // Solo vuelven al inventario las unidades que siguen en manos del
      // cliente: lo que ya entró por una devolución no se puede reponer otra
      // vez, o la anulación duplicaría ese stock.
      const itemsResult = await client.query(
        `SELECT dv.producto_id,
                SUM(dv.cantidad)::int AS cantidad,
                COALESCE((
                  SELECT SUM(COALESCE(df.cantidad_devuelta, 0))
                  FROM detalle_factura df
                  JOIN facturas f ON f.id = df.factura_id
                  WHERE f.venta_id = $1 AND df.producto_id = dv.producto_id
                ), 0)::int AS ya_devueltas
         FROM detalle_venta dv
         WHERE dv.venta_id = $1
         GROUP BY dv.producto_id`,
        [id],
      );

      for (const item of itemsResult.rows) {
        const aRestaurar = Math.max(0, item.cantidad - item.ya_devueltas);
        if (aRestaurar === 0) continue;

        const stockResult = await client.query(
          `UPDATE productos 
           SET stock_actual = stock_actual + $1,
               disponible = true
           WHERE id = $2
           RETURNING stock_actual`,
          [aRestaurar, item.producto_id],
        );

        const stockNuevo = stockResult.rows[0]?.stock_actual ?? null;

        await client.query(
          `INSERT INTO movimientos_inventario (
            producto_id,
            tipo,
            cantidad,
            motivo,
            usuario,
            fecha,
            stock_anterior,
            stock_nuevo
          ) VALUES ($1, 'entrada', $2, $3, 'Sistema', CURRENT_TIMESTAMP, $4, $5)`,
          [
            item.producto_id,
            aRestaurar,
            "Anulación de venta #" + id + ": " + (motivo || "Sin motivo"),
            stockNuevo === null ? null : stockNuevo - aRestaurar,
            stockNuevo,
          ],
        );
      }

      await client.query(
        `UPDATE ventas 
         SET estado = 'anulada',
             motivo_anulacion = $1,
             fecha_anulacion = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [motivo || "Sin motivo especificado", id],
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Venta anulada exitosamente",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error al anular venta:", error);
      next(error);
    } finally {
      client.release();
    }
  },
};

module.exports = VentasController;
