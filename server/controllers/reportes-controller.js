// ==================== CONTROLADOR DE REPORTES ====================

const pool = require("../database/pool");

const ReportesController = {

  async getReporteVentas(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin, periodo } = req.query;

      let fechaInicio, fechaFin;

      // Calcular fechas según periodo
      if (periodo) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        switch (periodo) {
          case "hoy":
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "semana":
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - 7);
            fechaInicio = inicioSemana.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "mes":
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            fechaInicio = inicioMes.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "año":
            const inicioAño = new Date(hoy.getFullYear(), 0, 1);
            fechaInicio = inicioAño.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          default:
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
        }
      } else {
        fechaInicio = fecha_inicio;
        fechaFin = fecha_fin;
      }

      // Todas las ventas del periodo (contado y crédito)
      const ventasResult = await pool.query(
        `SELECT
          v.id,
          v.numero_ticket,
          v.fecha,
          v.hora,
          v.subtotal,
          v.itbis,
          v.total,
          v.metodo_pago,
          TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre,
          f.numero_factura,
          f.tipo_factura,
          f.estado AS factura_estado,
          COALESCE(dev.monto_devuelto, 0) AS monto_devuelto
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN facturas f ON v.id = f.venta_id
        LEFT JOIN (
          SELECT venta_id, SUM(total) AS monto_devuelto
          FROM devoluciones
          WHERE estado = 'procesada'
          GROUP BY venta_id
        ) dev ON dev.venta_id = v.id
        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND COALESCE(f.estado, 'pagada') != 'anulada'
        ORDER BY v.fecha DESC, v.hora DESC`,
        [fechaInicio, fechaFin],
      );

      // Pagos de facturas de crédito realizados en el periodo
      const pagosResult = await pool.query(
        `SELECT
          pf.id,
          pf.numero_pago,
          pf.fecha,
          pf.hora,
          pf.monto,
          pf.metodo_pago,
          f.numero_factura,
          f.estado AS factura_estado,
          v.numero_ticket,
          TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre
        FROM pagos_factura pf
        JOIN facturas f ON pf.factura_id = f.id
        LEFT JOIN ventas v ON f.venta_id = v.id
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE pf.fecha >= $1 AND pf.fecha <= $2
          AND f.estado != 'anulada'
        ORDER BY pf.fecha DESC, pf.hora DESC`,
        [fechaInicio, fechaFin],
      );

      // Calcular totales brutos
      let totalVentasBruto = 0;
      let totalSubtotal = 0;
      let totalITBIS = 0;
      let totalCostos = 0;

      for (const venta of ventasResult.rows) {
        totalVentasBruto += parseFloat(venta.total);
        totalSubtotal += parseFloat(venta.subtotal);
        totalITBIS += parseFloat(venta.itbis);

        const costosResult = await pool.query(
          `SELECT dv.cantidad, p.precio_costo
           FROM detalle_venta dv
           JOIN productos p ON dv.producto_id = p.id
           WHERE dv.venta_id = $1`,
          [venta.id],
        );
        for (const item of costosResult.rows) {
          totalCostos += parseFloat(item.precio_costo || 0) * parseInt(item.cantidad);
        }
      }

      // Devoluciones del periodo
      const devolucionesResult = await pool.query(
        `SELECT
          d.id,
          d.numero_devolucion,
          d.fecha,
          d.hora,
          d.tipo,
          d.total AS monto_devuelto,
          d.motivo,
          v.numero_ticket,
          f.numero_factura,
          TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre,
          json_agg(
            json_build_object(
              'nombre_producto', dd.nombre_producto,
              'cantidad_devuelta', dd.cantidad_devuelta,
              'precio_unitario', dd.precio_unitario,
              'total', dd.total
            ) ORDER BY dd.id
          ) AS items
        FROM devoluciones d
        LEFT JOIN ventas v ON d.venta_id = v.id
        LEFT JOIN facturas f ON d.factura_id = f.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        JOIN detalle_devolucion dd ON dd.devolucion_id = d.id
        WHERE d.fecha >= $1 AND d.fecha <= $2
          AND d.estado = 'procesada'
        GROUP BY d.id, d.numero_devolucion, d.fecha, d.hora, d.tipo, d.total,
                 d.motivo, v.numero_ticket, f.numero_factura, c.nombre, c.apellido
        ORDER BY d.fecha DESC, d.hora DESC`,
        [fechaInicio, fechaFin],
      );

      const totalDevoluciones = devolucionesResult.rows.reduce(
        (sum, d) => sum + parseFloat(d.monto_devuelto), 0,
      );
      const totalVentasNeto = totalVentasBruto - totalDevoluciones;

      // Costos operativos del periodo (salidas/gastos)
      const salidasResult = await pool.query(
        `SELECT COALESCE(SUM(monto), 0) AS total_salidas FROM salidas WHERE fecha >= $1 AND fecha <= $2`,
        [fechaInicio, fechaFin],
      );
      const totalSalidas = parseFloat(salidasResult.rows[0].total_salidas);

      const ganancia = totalVentasNeto - totalCostos;
      const gananciaNeta = totalVentasNeto - totalCostos - totalSalidas;
      const margen = totalVentasNeto > 0 ? (ganancia / totalVentasNeto) * 100 : 0;

      // Resumen por método de pago (todas las ventas, contado y crédito)
      const metodosPagoResult = await pool.query(
        `SELECT v.metodo_pago,
          COUNT(*) AS cantidad_ventas,
          SUM(v.total) AS total_ventas
        FROM ventas v
        LEFT JOIN facturas f ON v.id = f.venta_id
        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND COALESCE(f.estado, 'pagada') != 'anulada'
        GROUP BY v.metodo_pago
        ORDER BY total_ventas DESC`,
        [fechaInicio, fechaFin],
      );

      // Ventas por día (todas las ventas, contado y crédito)
      const ventasPorDiaResult = await pool.query(
        `SELECT v.fecha,
          COUNT(*) AS cantidad_ventas,
          SUM(v.total) AS total_ventas
        FROM ventas v
        LEFT JOIN facturas f ON v.id = f.venta_id
        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND COALESCE(f.estado, 'pagada') != 'anulada'
        GROUP BY v.fecha
        ORDER BY v.fecha ASC`,
        [fechaInicio, fechaFin],
      );

      res.json({
        success: true,
        periodo: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
        resumen: {
          total_ventas: parseFloat(totalVentasNeto.toFixed(2)),
          total_ventas_bruto: parseFloat(totalVentasBruto.toFixed(2)),
          total_devoluciones: parseFloat(totalDevoluciones.toFixed(2)),
          cantidad_devoluciones: devolucionesResult.rows.length,
          subtotal: parseFloat(totalSubtotal.toFixed(2)),
          itbis: parseFloat(totalITBIS.toFixed(2)),
          costos: parseFloat(totalCostos.toFixed(2)),
          costos_salidas: parseFloat(totalSalidas.toFixed(2)),
          ganancia: parseFloat(ganancia.toFixed(2)),
          ganancia_neta: parseFloat(gananciaNeta.toFixed(2)),
          margen_porcentaje: parseFloat(margen.toFixed(2)),
          cantidad_ventas: ventasResult.rows.length,
        },
        ventas: ventasResult.rows,
        pagos_credito: pagosResult.rows,
        devoluciones: devolucionesResult.rows,
        metodos_pago: metodosPagoResult.rows,
        ventas_por_dia: ventasPorDiaResult.rows,
      });
    } catch (error) {
      console.error("❌ Error al generar reporte de ventas:", error);
      next(error);
    }
  },

  // ==================== REPORTE DE PRODUCTOS VENDIDOS ====================

  async getReporteProductosVendidos(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin, periodo } = req.query;

      let fechaInicio, fechaFin;

      // Calcular fechas según periodo
      if (periodo) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        switch (periodo) {
          case "hoy":
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "semana":
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - 7);
            fechaInicio = inicioSemana.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "mes":
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            fechaInicio = inicioMes.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          default:
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
        }
      } else {
        fechaInicio = fecha_inicio;
        fechaFin = fecha_fin;
      }

      // Productos vendidos con detalles (por fecha)
      const productosResult = await pool.query(
        `SELECT
          v.fecha,
          p.id,
          p.codigo_barras,
          p.imei,
          p.nombre,
          p.precio_costo AS costo,
          p.precio_venta,
          c.nombre as categoria_nombre,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as total_ventas,
          SUM(dv.cantidad * p.precio_costo) as total_costo,
          SUM(dv.subtotal - (dv.cantidad * p.precio_costo)) as ganancia,
          COUNT(DISTINCT v.id) as numero_transacciones
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.id
        JOIN ventas v ON dv.venta_id = v.id
        LEFT JOIN facturas f ON v.id = f.venta_id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND COALESCE(f.estado, 'pagada') != 'anulada'
        GROUP BY v.fecha, p.id, p.codigo_barras, p.imei, p.nombre, p.precio_costo, p.precio_venta, c.nombre
        ORDER BY v.fecha DESC, cantidad_vendida DESC`,
        [fechaInicio, fechaFin],
      );

      // Top 10 productos más vendidos
      const topProductos = productosResult.rows.slice(0, 10);

      // Resumen por categoría (productos + servicios)
      const categoriasResult = await pool.query(
        `SELECT categoria, productos_distintos, cantidad_vendida, total_ventas, tipo
         FROM (
           SELECT
             COALESCE(c.nombre, 'Sin categoría') AS categoria,
             COUNT(DISTINCT p.id)::int AS productos_distintos,
             SUM(dv.cantidad)::int AS cantidad_vendida,
             SUM(dv.subtotal) AS total_ventas,
             'producto' AS tipo
           FROM detalle_venta dv
           JOIN productos p ON dv.producto_id = p.id
           JOIN ventas v ON dv.venta_id = v.id
           LEFT JOIN facturas f ON v.id = f.venta_id
           LEFT JOIN categorias c ON p.categoria_id = c.id
           WHERE v.fecha >= $1 AND v.fecha <= $2
             AND COALESCE(f.estado, 'pagada') != 'anulada'
           GROUP BY c.nombre
           UNION ALL
           SELECT
             'Servicios' AS categoria,
             1 AS productos_distintos,
             COUNT(sv.id)::int AS cantidad_vendida,
             SUM(sv.subtotal) AS total_ventas,
             'servicio' AS tipo
           FROM servicios_venta sv
           JOIN ventas v ON sv.venta_id = v.id
           LEFT JOIN facturas f ON v.id = f.venta_id
           WHERE v.fecha >= $1 AND v.fecha <= $2
             AND sv.es_gratuito = false
             AND COALESCE(f.estado, 'pagada') != 'anulada'
         ) t
         ORDER BY total_ventas DESC`,
        [fechaInicio, fechaFin],
      );

      // Total de servicios del periodo (costo = 0, todo es ganancia)
      const serviciosTotalesResult = await pool.query(
        `SELECT COALESCE(SUM(sv.subtotal), 0) AS total_servicios
         FROM servicios_venta sv
         JOIN ventas v ON sv.venta_id = v.id
         LEFT JOIN facturas f ON v.id = f.venta_id
         WHERE v.fecha >= $1 AND v.fecha <= $2
           AND sv.es_gratuito = false
           AND COALESCE(f.estado, 'pagada') != 'anulada'`,
        [fechaInicio, fechaFin],
      );
      const totalServicios = parseFloat(serviciosTotalesResult.rows[0].total_servicios || 0);

      // Calcular totales
      let totalUnidadesVendidas = 0;
      let totalIngresos = 0;
      let totalCostos = 0;
      let totalGanancias = 0;

      for (const producto of productosResult.rows) {
        totalUnidadesVendidas += parseInt(producto.cantidad_vendida);
        totalIngresos += parseFloat(producto.total_ventas);
        totalCostos += parseFloat(producto.total_costo || 0);
        totalGanancias += parseFloat(producto.ganancia || 0);
      }

      // Los servicios tienen costo 0, son ganancia pura
      totalIngresos += totalServicios;
      totalGanancias += totalServicios;

      res.json({
        success: true,
        periodo: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
        resumen: {
          total_productos_vendidos: productosResult.rows.length,
          total_unidades_vendidas: totalUnidadesVendidas,
          total_ingresos: parseFloat(totalIngresos.toFixed(2)),
          total_costos: parseFloat(totalCostos.toFixed(2)),
          total_ganancias: parseFloat(totalGanancias.toFixed(2)),
          margen_promedio:
            totalIngresos > 0
              ? parseFloat(((totalGanancias / totalIngresos) * 100).toFixed(2))
              : 0,
        },
        productos: productosResult.rows,
        top_10_productos: topProductos,
        por_categoria: categoriasResult.rows,
      });
    } catch (error) {
      console.error("❌ Error al generar reporte de productos:", error);
      next(error);
    }
  },

  // ==================== REPORTE COMBINADO (DASHBOARD) ====================

  async getReporteDashboard(req, res, next) {
    try {
      const { periodo = "hoy" } = req.query;

      // Reusar las funciones existentes
      const ventasReq = { query: { periodo } };
      const productosReq = { query: { periodo } };

      let ventasData, productosData;

      // Simular response object
      const mockRes = {
        json: (data) => data,
      };

      // Ejecutar reportes en paralelo
      const [reporteVentas, reporteProductos] = await Promise.all([
        this.getReporteVentas(ventasReq, mockRes, next).catch(() => null),
        this.getReporteProductosVendidos(productosReq, mockRes, next).catch(
          () => null,
        ),
      ]);

      res.json({
        success: true,
        periodo: periodo,
        ventas: reporteVentas,
        productos: reporteProductos,
      });
    } catch (error) {
      console.error("❌ Error al generar dashboard:", error);
      next(error);
    }
  },

  // ==================== REPORTE DE GANANCIAS DETALLADO ====================

  async getReporteGanancias(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin, periodo } = req.query;

      let fechaInicio, fechaFin;

      if (periodo) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        switch (periodo) {
          case "hoy":
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "semana":
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - 7);
            fechaInicio = inicioSemana.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          case "mes":
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            fechaInicio = inicioMes.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;

          default:
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
        }
      } else {
        fechaInicio = fecha_inicio;
        fechaFin = fecha_fin;
      }

      // Ganancias por día (ventas + servicios - costo productos)
      const gananciasPorDiaResult = await pool.query(
        `SELECT
          v.fecha,
          SUM(v.total)                                  AS ingresos,
          COALESCE(SUM(costos.total_costo), 0)          AS costos,
          SUM(v.total) - COALESCE(SUM(costos.total_costo), 0) AS ganancia_neta,
          COUNT(DISTINCT v.id)                          AS num_ventas
        FROM ventas v
        LEFT JOIN (
          SELECT dv.venta_id,
                 SUM(dv.cantidad * COALESCE(p.precio_costo, 0)) AS total_costo
          FROM detalle_venta dv
          JOIN productos p ON dv.producto_id = p.id
          GROUP BY dv.venta_id
        ) costos ON v.id = costos.venta_id
        LEFT JOIN facturas f ON v.id = f.venta_id
        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND COALESCE(f.estado, 'pagada') != 'anulada'
        GROUP BY v.fecha
        ORDER BY v.fecha ASC`,
        [fechaInicio, fechaFin],
      );

      res.json({
        success: true,
        periodo: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
        ganancias_por_dia: gananciasPorDiaResult.rows,
      });
    } catch (error) {
      console.error("❌ Error al generar reporte de ganancias:", error);
      next(error);
    }
  },

  // ==================== CUADRE DE TURNO ====================

  async getCuadreTurno(req, res, next) {
    try {
      const { fecha, fondo_caja = 0 } = req.query;
      const cajero = req.session?.usuario?.nombre || "Sistema";

      const hoy = new Date();
      const fechaDia = fecha || hoy.toISOString().split("T")[0];
      const fondoCaja = parseFloat(fondo_caja) || 0;

      // 1. Ventas contado del día (desglose por método)
      const ventasResult = await pool.query(
        `SELECT
          v.id, v.numero_ticket, v.metodo_pago, v.total,
          COALESCE(v.monto_efectivo, 0) AS monto_efectivo,
          COALESCE(v.monto_tarjeta, 0) AS monto_tarjeta,
          COALESCE(v.monto_transferencia, 0) AS monto_transferencia,
          TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN facturas f ON v.id = f.venta_id
        WHERE v.fecha = $1
          AND COALESCE(f.tipo_factura, 'contado') != 'credito'
          AND COALESCE(f.estado, 'pagada') != 'anulada'`,
        [fechaDia],
      );

      // 2. Costos del día (para ganancia)
      const costosResult = await pool.query(
        `SELECT
          COALESCE(SUM(dv.cantidad * COALESCE(p.precio_costo, 0)), 0) AS total_costos
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.id
        JOIN ventas v ON dv.venta_id = v.id
        LEFT JOIN facturas f ON v.id = f.venta_id
        WHERE v.fecha = $1
          AND COALESCE(f.tipo_factura, 'contado') != 'credito'
          AND COALESCE(f.estado, 'pagada') != 'anulada'`,
        [fechaDia],
      );

      // 3. Salidas del día
      const salidasResult = await pool.query(
        `SELECT concepto, descripcion, monto, metodo_pago, beneficiario
        FROM salidas
        WHERE fecha = $1
        ORDER BY id ASC`,
        [fechaDia],
      );

      // 4. Pagos de crédito del día
      const pagosResult = await pool.query(
        `SELECT
          pf.monto, pf.metodo_pago,
          TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre,
          f.numero_factura
        FROM pagos_factura pf
        JOIN facturas f ON pf.factura_id = f.id
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE pf.fecha = $1 AND f.estado != 'anulada'
        ORDER BY pf.id ASC`,
        [fechaDia],
      );

      // 5. Devoluciones del día
      const devolucionesResult = await pool.query(
        `SELECT
          d.id, d.numero_devolucion, d.total, d.tipo, d.motivo,
          v.numero_ticket, v.metodo_pago AS venta_metodo,
          json_agg(
            json_build_object(
              'nombre_producto', dd.nombre_producto,
              'cantidad_devuelta', dd.cantidad_devuelta,
              'total', dd.total
            )
          ) AS items
        FROM devoluciones d
        LEFT JOIN ventas v ON d.venta_id = v.id
        JOIN detalle_devolucion dd ON dd.devolucion_id = d.id
        WHERE d.fecha = $1 AND d.estado = 'procesada'
        GROUP BY d.id, d.numero_devolucion, d.total, d.tipo, d.motivo,
                 v.numero_ticket, v.metodo_pago
        ORDER BY d.id ASC`,
        [fechaDia],
      );

      // 6. Ventas a crédito del día
      const ventasCreditoResult = await pool.query(
        `SELECT
          v.id, v.numero_ticket, v.total, v.hora,
          TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente_nombre,
          f.numero_factura, f.saldo_pendiente
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        JOIN facturas f ON v.id = f.venta_id
        WHERE v.fecha = $1
          AND f.tipo_factura = 'credito'
          AND f.estado != 'anulada'
        ORDER BY v.id ASC`,
        [fechaDia],
      );

      // 7. Ventas por categoría (productos + servicios)
      const porCategoriaResult = await pool.query(
        `SELECT categoria, total FROM (
           SELECT
             COALESCE(cat.nombre, 'Sin categoría') AS categoria,
             COALESCE(SUM(dv.subtotal), 0) AS total
           FROM detalle_venta dv
           JOIN ventas v ON dv.venta_id = v.id
           LEFT JOIN productos p ON dv.producto_id = p.id
           LEFT JOIN categorias cat ON p.categoria_id = cat.id
           LEFT JOIN facturas f ON v.id = f.venta_id
           WHERE v.fecha = $1
             AND COALESCE(f.estado, 'pagada') != 'anulada'
             AND dv.producto_id IS NOT NULL
           GROUP BY cat.nombre
           UNION ALL
           SELECT
             'Servicios' AS categoria,
             COALESCE(SUM(sv.subtotal), 0) AS total
           FROM servicios_venta sv
           JOIN ventas v ON sv.venta_id = v.id
           LEFT JOIN facturas f ON v.id = f.venta_id
           WHERE v.fecha = $1
             AND sv.es_gratuito = false
             AND COALESCE(f.estado, 'pagada') != 'anulada'
         ) t
         ORDER BY total DESC`,
        [fechaDia],
      );

      // 8. Configuración del negocio
      const configResult = await pool.query(
        "SELECT nombre_negocio, direccion, telefono FROM configuracion ORDER BY id DESC LIMIT 1",
      );
      const config = configResult.rows[0] || {};

      // ---- Calcular totales ----
      const ventas = ventasResult.rows;
      const salidas = salidasResult.rows;
      const pagos = pagosResult.rows;
      const devoluciones = devolucionesResult.rows;
      const ventasCredito = ventasCreditoResult.rows;

      const totalVentasCreditoDia = ventasCredito.reduce((sum, v) => sum + parseFloat(v.total), 0);

      // Ventas por método (desglosando mixto)
      let totalEfectivo = 0, totalTarjeta = 0, totalTransferencia = 0;
      let totalCheque = 0, totalCredito = 0;
      let totalVentasBruto = 0;

      for (const v of ventas) {
        const t = parseFloat(v.total);
        totalVentasBruto += t;
        if (v.metodo_pago === "mixto") {
          totalEfectivo     += parseFloat(v.monto_efectivo);
          totalTarjeta      += parseFloat(v.monto_tarjeta);
          totalTransferencia += parseFloat(v.monto_transferencia);
        } else if (v.metodo_pago === "efectivo")       totalEfectivo      += t;
        else if (v.metodo_pago === "tarjeta")          totalTarjeta       += t;
        else if (v.metodo_pago === "transferencia")    totalTransferencia += t;
        else if (v.metodo_pago === "cheque")           totalCheque        += t;
        else if (v.metodo_pago === "credito")          totalCredito       += t;
      }

      // Devoluciones agrupadas por método original
      let devEfectivo = 0, devTransferencia = 0, devTotal = 0;
      const devEfectivoList = [], devCreditoList = [];
      for (const d of devoluciones) {
        const monto = parseFloat(d.total);
        devTotal += monto;
        const metodo = d.venta_metodo || "";
        if (metodo === "efectivo" || metodo === "mixto") devEfectivo += monto;
        else if (metodo === "transferencia")              devTransferencia += monto;

        if (d.tipo === "credito") devCreditoList.push(d);
        else                      devEfectivoList.push(d);
      }

      const totalVentasNeto = totalVentasBruto - devTotal;

      // Salidas efectivo
      const totalSalidasEfectivo = salidas
        .filter(s => !s.metodo_pago || s.metodo_pago === "efectivo")
        .reduce((sum, s) => sum + parseFloat(s.monto), 0);
      const totalSalidas = salidas.reduce((sum, s) => sum + parseFloat(s.monto), 0);

      // Pagos de crédito en efectivo (para calcular efectivo en caja)
      const pagosEfectivo = pagos
        .filter(p => p.metodo_pago === "efectivo")
        .reduce((sum, p) => sum + parseFloat(p.monto), 0);
      const pagosTransferencia = pagos
        .filter(p => p.metodo_pago === "transferencia")
        .reduce((sum, p) => sum + parseFloat(p.monto), 0);
      const totalPagos = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

      // Efectivo en caja
      const efectivoEnCaja = fondoCaja + totalEfectivo + pagosEfectivo - totalSalidasEfectivo - devEfectivo;

      // Ganancia bruta
      const totalCostos = parseFloat(costosResult.rows[0]?.total_costos || 0);
      const ganancia = totalVentasNeto - totalCostos;

      // Total ingresos contado
      const totalIngresos = totalEfectivo + totalPagos + totalTransferencia - devEfectivo - devTransferencia;

      // Número de turno (número de ventas acumuladas hasta hoy)
      const turnoResult = await pool.query(
        `SELECT COUNT(*) AS total FROM ventas WHERE fecha <= $1`,
        [fechaDia],
      );
      const turnoNum = parseInt(turnoResult.rows[0]?.total || 0);

      res.json({
        success: true,
        cuadre: {
          fecha: fechaDia,
          cajero,
          turno: turnoNum,
          config,
          fondo_caja: fondoCaja,
          cantidad_ventas: ventas.length,
          cantidad_ventas_credito: ventasCredito.length,
          total_ventas_credito: totalVentasCreditoDia,

          // Ventas por método
          ventas_efectivo: totalEfectivo,
          ventas_tarjeta: totalTarjeta,
          ventas_transferencia: totalTransferencia,
          ventas_cheque: totalCheque,
          ventas_credito: totalCredito,
          ventas_bruto: totalVentasBruto,
          devoluciones_total: devTotal,
          ventas_neto: totalVentasNeto,
          ganancia,

          // Dinero en caja
          pagos_efectivo: pagosEfectivo,
          salidas_efectivo: totalSalidasEfectivo,
          dev_efectivo: devEfectivo,
          efectivo_en_caja: efectivoEnCaja,

          // Ingresos contado
          pagos_clientes: totalPagos,
          pagos_transferencia: pagosTransferencia,
          dev_transferencia: devTransferencia,
          total_ingresos: totalIngresos,

          // Listas
          salidas,
          total_salidas: totalSalidas,
          pagos_credito: pagos,
          devoluciones_efectivo: devEfectivoList,
          devoluciones_credito: devCreditoList,
          por_categoria: porCategoriaResult.rows,
          ventas_credito_lista: ventasCredito,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== REPORTE DE SALIDAS ====================

  async getReporteSalidas(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ success: false, message: "Debe especificar fecha_inicio y fecha_fin" });
      }

      const salidasResult = await pool.query(
        `SELECT id, numero_salida, fecha, concepto, descripcion, monto,
                categoria_gasto, metodo_pago, beneficiario, numero_referencia
         FROM salidas
         WHERE fecha >= $1 AND fecha <= $2
         ORDER BY fecha DESC, id DESC`,
        [fecha_inicio, fecha_fin],
      );

      const porCategoriaResult = await pool.query(
        `SELECT COALESCE(categoria_gasto, 'Sin categoría') AS categoria,
                COUNT(*) AS cantidad,
                SUM(monto) AS total
         FROM salidas
         WHERE fecha >= $1 AND fecha <= $2
         GROUP BY categoria_gasto
         ORDER BY total DESC`,
        [fecha_inicio, fecha_fin],
      );

      const porMetodoResult = await pool.query(
        `SELECT COALESCE(metodo_pago, 'No especificado') AS metodo_pago,
                COUNT(*) AS cantidad,
                SUM(monto) AS total
         FROM salidas
         WHERE fecha >= $1 AND fecha <= $2
         GROUP BY metodo_pago
         ORDER BY total DESC`,
        [fecha_inicio, fecha_fin],
      );

      const total = salidasResult.rows.reduce((sum, s) => sum + parseFloat(s.monto), 0);

      res.json({
        success: true,
        periodo: { fecha_inicio, fecha_fin },
        resumen: {
          total_salidas: parseFloat(total.toFixed(2)),
          cantidad_salidas: salidasResult.rows.length,
        },
        salidas: salidasResult.rows,
        por_categoria: porCategoriaResult.rows,
        por_metodo: porMetodoResult.rows,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReporteInventario(req, res, next) {
    try {
      const result = await pool.query(`
        SELECT
          p.id,
          p.codigo_barras,
          p.imei,
          p.nombre,
          c.nombre AS categoria,
          CASE
            WHEN p.costos IS NOT NULL AND jsonb_array_length(p.costos) > 0
            THEN (
              SELECT COALESCE(SUM((elem->>'monto')::numeric), 0)
              FROM jsonb_array_elements(p.costos) AS elem
              WHERE (elem->>'monto') ~ '^[0-9]+(\\.[0-9]+)?$'
            )
            ELSE p.precio_costo
          END AS costo_total,
          CASE
            WHEN p.precio_con_descuento IS NOT NULL
              AND p.precio_con_descuento > 0
              AND (p.descuento_porcentaje > 0 OR p.descuento_monto > 0)
            THEN p.precio_con_descuento
            ELSE p.precio_venta
          END AS precio_efectivo,
          p.descuento_porcentaje,
          p.descuento_monto,
          p.disponible,
          p.stock_actual,
          p.stock_minimo,
          p.creado_por
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.activo = true AND p.disponible = true
        ORDER BY p.nombre ASC
      `);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ReportesController;
