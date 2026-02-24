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

      // Ventas contado del periodo (excluye ventas con factura de crédito)
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
          AND COALESCE(f.tipo_factura, 'contado') != 'credito'
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
          `SELECT dv.cantidad, p.costo
           FROM detalle_venta dv
           JOIN productos p ON dv.producto_id = p.id
           WHERE dv.venta_id = $1`,
          [venta.id],
        );
        for (const item of costosResult.rows) {
          totalCostos += parseFloat(item.costo || 0) * parseInt(item.cantidad);
        }
      }

      // Sumar pagos de crédito al total bruto
      const totalPagosCredito = pagosResult.rows.reduce(
        (sum, p) => sum + parseFloat(p.monto), 0,
      );

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
      totalVentasBruto += totalPagosCredito;
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

      // Resumen por método de pago (contado + pagos crédito)
      const metodosPagoResult = await pool.query(
        `SELECT metodo_pago,
          SUM(cantidad) AS cantidad_ventas,
          SUM(total_ventas) AS total_ventas
        FROM (
          SELECT v.metodo_pago, COUNT(*) AS cantidad, SUM(v.total) AS total_ventas
          FROM ventas v
          LEFT JOIN facturas f ON v.id = f.venta_id
          WHERE v.fecha >= $1 AND v.fecha <= $2
            AND COALESCE(f.tipo_factura, 'contado') != 'credito'
          GROUP BY metodo_pago
          UNION ALL
          SELECT pf.metodo_pago, COUNT(*) AS cantidad, SUM(pf.monto) AS total_ventas
          FROM pagos_factura pf
          JOIN facturas f ON pf.factura_id = f.id
          WHERE pf.fecha >= $1 AND pf.fecha <= $2
          GROUP BY pf.metodo_pago
        ) combined
        GROUP BY metodo_pago
        ORDER BY total_ventas DESC`,
        [fechaInicio, fechaFin],
      );

      // Ventas por día (contado + pagos crédito)
      const ventasPorDiaResult = await pool.query(
        `SELECT fecha,
          SUM(cantidad) AS cantidad_ventas,
          SUM(total_ventas) AS total_ventas
        FROM (
          SELECT v.fecha, COUNT(*) AS cantidad, SUM(v.total) AS total_ventas
          FROM ventas v
          LEFT JOIN facturas f ON v.id = f.venta_id
          WHERE v.fecha >= $1 AND v.fecha <= $2
            AND COALESCE(f.tipo_factura, 'contado') != 'credito'
          GROUP BY v.fecha
          UNION ALL
          SELECT pf.fecha, COUNT(*) AS cantidad, SUM(pf.monto) AS total_ventas
          FROM pagos_factura pf
          JOIN facturas f ON pf.factura_id = f.id
          WHERE pf.fecha >= $1 AND pf.fecha <= $2
          GROUP BY pf.fecha
        ) combined
        GROUP BY fecha
        ORDER BY fecha ASC`,
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
          cantidad_ventas: ventasResult.rows.length + pagosResult.rows.length,
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

      // Productos vendidos con detalles
      const productosResult = await pool.query(
        `SELECT 
          p.id,
          p.codigo_barras,
          p.imei,
          p.nombre,
          p.costo,
          p.precio_venta,
          c.nombre as categoria_nombre,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as total_ventas,
          SUM(dv.cantidad * p.costo) as total_costo,
          SUM(dv.subtotal - (dv.cantidad * p.costo)) as ganancia,
          COUNT(DISTINCT v.id) as numero_transacciones
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.id
        JOIN ventas v ON dv.venta_id = v.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE v.fecha >= $1 AND v.fecha <= $2
        GROUP BY p.id, p.codigo_barras, p.imei, p.nombre, p.costo, p.precio_venta, c.nombre
        ORDER BY cantidad_vendida DESC`,
        [fechaInicio, fechaFin],
      );

      // Top 10 productos más vendidos
      const topProductos = productosResult.rows.slice(0, 10);

      // Resumen por categoría
      const categoriasResult = await pool.query(
        `SELECT 
          COALESCE(c.nombre, 'Sin categoría') as categoria,
          COUNT(DISTINCT p.id) as productos_distintos,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as total_ventas
        FROM detalle_venta dv
        JOIN productos p ON dv.producto_id = p.id
        JOIN ventas v ON dv.venta_id = v.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE v.fecha >= $1 AND v.fecha <= $2
        GROUP BY c.nombre
        ORDER BY total_ventas DESC`,
        [fechaInicio, fechaFin],
      );

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

      // Ganancias por día
      const gananciasPorDiaResult = await pool.query(
        `SELECT 
          v.fecha,
          SUM(v.total) as ingresos,
          SUM(dv.cantidad * p.costo) as costos,
          SUM(v.total) - SUM(dv.cantidad * p.costo) as ganancia_neta,
          COUNT(DISTINCT v.id) as num_ventas
        FROM ventas v
        JOIN detalle_venta dv ON v.id = dv.venta_id
        JOIN productos p ON dv.producto_id = p.id
        WHERE v.fecha >= $1 AND v.fecha <= $2
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
};

module.exports = ReportesController;
