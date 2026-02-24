const pool = require("../database/pool");
const ExcelJS = require("exceljs");

const ReportesExportController = {
  async exportarExcel(req, res, next) {
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
            const s = new Date(hoy);
            s.setDate(hoy.getDate() - 7);
            fechaInicio = s.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;
          case "mes":
            const m = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            fechaInicio = m.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
            break;
          default:
            fechaInicio = hoy.toISOString().split("T")[0];
            fechaFin = hoy.toISOString().split("T")[0];
        }
      } else {
        if (!fecha_inicio || !fecha_fin) {
          return res.status(400).json({
            success: false,
            message: "Debe especificar periodo o fecha_inicio y fecha_fin",
          });
        }
        fechaInicio = fecha_inicio;
        fechaFin = fecha_fin;
      }

      // Query productos
      const resultadoProductos = await pool.query(
        `SELECT
          COALESCE(p.codigo_barras, p.imei, CAST(p.id AS TEXT)) AS codigo_producto,
          p.nombre                                                AS descripcion_producto,
          p.precio_costo                                          AS costo_producto,
          p.costos                                                AS costos_desglose,
          p.created_at                                            AS fecha_agregado_inventario,
          v.fecha                                                 AS fecha_vendido,
          v.hora                                                  AS hora_vendido,
          dtv.cantidad,
          dtv.precio_unitario,
          dtv.subtotal - COALESCE(dr.monto_devuelto, 0)          AS subtotal_linea,
          f.numero_factura                                        AS numero_factura,
          f.tipo_factura,
          CASE
            WHEN v.cliente_id IS NULL THEN 'Cliente General'
            ELSE TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')))
          END                                                     AS nombre_cliente,
          c.telefono                                              AS telefono_cliente,
          CASE WHEN dr.producto_id IS NOT NULL THEN 'Sí' ELSE 'No' END AS fue_devuelto,
          'Producto' AS tipo_item

        FROM detalle_venta dtv
        JOIN productos   p  ON dtv.producto_id = p.id
        JOIN ventas      v  ON dtv.venta_id    = v.id
        LEFT JOIN facturas f ON v.id = f.venta_id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN (
          SELECT dd.producto_id, dev.venta_id, SUM(dd.total) AS monto_devuelto
          FROM detalle_devolucion dd
          JOIN devoluciones dev ON dd.devolucion_id = dev.id
          WHERE dev.estado != 'anulada' AND dev.venta_id IS NOT NULL
          GROUP BY dd.producto_id, dev.venta_id
        ) dr ON dr.producto_id = dtv.producto_id AND dr.venta_id = v.id

        WHERE v.fecha >= $1 AND v.fecha <= $2`,
        [fechaInicio, fechaFin],
      );

      // Query servicios
      const resultadoServicios = await pool.query(
        `SELECT
          'SERVICIO' AS codigo_producto,
          sv.nombre_servicio AS descripcion_producto,
          0 AS costo_producto,
          NULL AS fecha_agregado_inventario,
          v.fecha AS fecha_vendido,
          v.hora AS hora_vendido,
          1 AS cantidad,
          sv.precio AS precio_unitario,
          sv.precio AS subtotal_linea,
          f.numero_factura AS numero_factura,
          f.tipo_factura,
          CASE
            WHEN v.cliente_id IS NULL THEN 'Cliente General'
            ELSE TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')))
          END AS nombre_cliente,
          c.telefono AS telefono_cliente,
          'No' AS fue_devuelto,
          'Servicio' AS tipo_item

        FROM servicios_venta sv
        JOIN ventas v ON sv.venta_id = v.id
        LEFT JOIN facturas f ON v.id = f.venta_id
        LEFT JOIN clientes c ON v.cliente_id = c.id

        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND sv.es_gratis = false`,
        [fechaInicio, fechaFin],
      );

      // Combinar productos y servicios
      const filas = [
        ...resultadoProductos.rows,
        ...resultadoServicios.rows,
      ].sort((a, b) => {
        if (a.fecha_vendido !== b.fecha_vendido) {
          return b.fecha_vendido > a.fecha_vendido ? 1 : -1;
        }
        return (b.hora_vendido || "").localeCompare(a.hora_vendido || "");
      });

      if (filas.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No hay datos para el periodo seleccionado",
        });
      }

      // Crear Excel
      const workbook = new ExcelJS.Workbook();

      // ==================== HOJA 1: DETALLE ====================
      const sheet1 = workbook.addWorksheet("Detalle Productos");

      sheet1.columns = [
        { header: "Tipo", key: "tipo", width: 10 },
        { header: "Código", key: "codigo", width: 15 },
        { header: "Descripción", key: "descripcion", width: 35 },
        { header: "Costo (RD$)", key: "costo", width: 13 },
        { header: "Precio Venta (RD$)", key: "precio", width: 15 },
        { header: "Cantidad", key: "cantidad", width: 10 },
        { header: "Subtotal (RD$)", key: "subtotal", width: 13 },
        { header: "Fecha Vendido", key: "fecha", width: 13 },
        { header: "Hora", key: "hora", width: 10 },
        { header: "Fecha Agregado", key: "agregado", width: 13 },
        { header: "N° Factura", key: "factura", width: 15 },
        { header: "Tipo Factura", key: "tipoFactura", width: 10 },
        { header: "Cliente", key: "cliente", width: 25 },
        { header: "Teléfono", key: "telefono", width: 15 },
        { header: "Devuelto", key: "devuelto", width: 10 },
      ];

      sheet1.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet1.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      sheet1.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

      const formatFecha = (f) => {
        if (!f) return "";
        const d = new Date(f);
        return d.toLocaleDateString("es-DO");
      };

      filas.forEach((f) => {
        sheet1.addRow({
          tipo: f.tipo_item,
          codigo: f.codigo_producto,
          descripcion: f.descripcion_producto,
          costo: parseFloat(f.costo_producto || 0),
          precio: parseFloat(f.precio_unitario || 0),
          cantidad: parseInt(f.cantidad),
          subtotal: parseFloat(f.subtotal_linea || 0),
          fecha: formatFecha(f.fecha_vendido),
          hora: f.hora_vendido || "",
          agregado: formatFecha(f.fecha_agregado_inventario),
          factura: f.numero_factura || "",
          tipoFactura: f.tipo_factura || "",
          cliente: f.nombre_cliente,
          telefono: f.telefono_cliente || "",
          devuelto: f.fue_devuelto,
        });
      });

      sheet1.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.getCell(4).numFmt = "#,##0.00"; // Costo
          row.getCell(5).numFmt = "#,##0.00"; // Precio
          row.getCell(7).numFmt = "#,##0.00"; // Subtotal
        }
      });

      // Fila de total
      const totalSubtotal = filas.reduce(
        (sum, f) => sum + parseFloat(f.subtotal_linea || 0), 0
      );
      const lastDataRow = sheet1.lastRow.number;
      const totalRow = sheet1.addRow({});
      totalRow.getCell(6).value = "TOTAL VENTAS";
      totalRow.getCell(6).font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalRow.getCell(6).alignment = { horizontal: "right" };
      totalRow.getCell(7).value = totalSubtotal;
      totalRow.getCell(7).numFmt = "#,##0.00";
      totalRow.getCell(7).font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalRow.getCell(7).alignment = { horizontal: "right" };
      totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF27AE60" },
      };
      totalRow.height = 20;

      // ==================== HOJA 2: DESGLOSE DE COSTOS POR ARTÍCULO ====================
      const sheet2 = workbook.addWorksheet("Desglose Costos");

      sheet2.columns = [
        { width: 22 },  // A: código (solo en encabezado de artículo)
        { width: 42 },  // B: concepto del gasto
        { width: 20 },  // C: monto
      ];

      // Título
      sheet2.mergeCells("A1:C1");
      const tituloCell = sheet2.getCell("A1");
      tituloCell.value = `DESGLOSE DE COSTOS POR ARTÍCULO — ${fechaInicio} al ${fechaFin}`;
      tituloCell.font = { bold: true, size: 13, color: { argb: "FF2C3E50" } };
      tituloCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet2.getRow(1).height = 28;

      sheet2.addRow([]); // espaciador

      // Agrupar productos únicos preservando desglose de costos
      const productosUnicos = {};
      resultadoProductos.rows.forEach((f) => {
        const key = f.codigo_producto;
        if (!productosUnicos[key]) {
          productosUnicos[key] = {
            codigo: f.codigo_producto,
            nombre: f.descripcion_producto,
            costo_unitario: parseFloat(f.costo_producto || 0),
            costos_desglose: f.costos_desglose || [],
            cantidad_vendida: 0,
          };
        }
        productosUnicos[key].cantidad_vendida += parseInt(f.cantidad);
      });

      let granTotal = 0;

      Object.values(productosUnicos)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach((prod) => {
          // ── Encabezado del artículo ──────────────────────────────
          const artRow = sheet2.addRow([`${prod.codigo} — ${prod.nombre}`, "", ""]);
          const artRowNum = artRow.number;
          sheet2.mergeCells(`A${artRowNum}:C${artRowNum}`);
          const artCell = sheet2.getCell(`A${artRowNum}`);
          artCell.value = `${prod.codigo} — ${prod.nombre}`;
          artCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
          artCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C3E50" } };
          artCell.alignment = { vertical: "middle", indent: 1 };
          artRow.height = 20;

          // ── Líneas de desglose ───────────────────────────────────
          const items =
            Array.isArray(prod.costos_desglose) && prod.costos_desglose.length > 0
              ? prod.costos_desglose
              : [{ concepto: "Costo de compra", monto: prod.costo_unitario }];

          items.forEach((item) => {
            const detRow = sheet2.addRow(["", item.concepto, parseFloat(item.monto || 0)]);
            detRow.getCell(2).alignment = { indent: 3 };
            detRow.getCell(3).numFmt = '"RD$"#,##0.00';
            detRow.getCell(3).alignment = { horizontal: "right" };
          });

          // ── Total del artículo ───────────────────────────────────
          const totRow = sheet2.addRow(["", "TOTAL", prod.costo_unitario]);
          totRow.getCell(2).value = "TOTAL";
          totRow.getCell(2).font = { bold: true };
          totRow.getCell(2).alignment = { indent: 3 };
          totRow.getCell(3).numFmt = '"RD$"#,##0.00';
          totRow.getCell(3).font = { bold: true };
          totRow.getCell(3).alignment = { horizontal: "right" };
          totRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };

          granTotal += prod.costo_unitario * prod.cantidad_vendida;

          sheet2.addRow([]); // separador entre artículos
        });

      // ── Gran total ───────────────────────────────────────────────
      const granTotalRow = sheet2.addRow(["", "TOTAL GENERAL COSTOS", granTotal]);
      granTotalRow.getCell(2).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      granTotalRow.getCell(3).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      granTotalRow.getCell(3).numFmt = '"RD$"#,##0.00';
      granTotalRow.getCell(3).alignment = { horizontal: "right" };
      granTotalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF27AE60" } };
      granTotalRow.height = 22;

      const nombreArchivo = `reporte_${fechaInicio}_${fechaFin}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nombreArchivo}"`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("❌ Error al exportar Excel:", error);
      next(error);
    }
  },
};

module.exports = ReportesExportController;
