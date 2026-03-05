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

        WHERE v.fecha >= $1 AND v.fecha <= $2
          AND (f.estado IS NULL OR f.estado != 'anulada')`,
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
          AND sv.es_gratis = false
          AND (f.estado IS NULL OR f.estado != 'anulada')`,
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

  // ==================== EXCEL CUADRE DE TURNO ====================

  async exportarCuadreExcel(req, res, next) {
    try {
      const pool = require("../database/pool");
      const ReportesController = require("./reportes-controller");

      // Reusar el endpoint de cuadre para obtener los datos
      let cuadreData;
      await new Promise((resolve, reject) => {
        ReportesController.getCuadreTurno(
          { query: req.query, session: req.session },
          {
            json(data) { cuadreData = data; resolve(); },
            status() { return this; },
          },
          reject,
        );
      });

      const c = cuadreData.cuadre;
      const fmt = (n) => parseFloat(parseFloat(n || 0).toFixed(2));
      const fmtFecha = (f) => {
        if (!f) return "";
        const d = new Date(f + "T12:00:00");
        return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
      };

      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Cuadre de Turno");

      // Colores
      const CLR_HEADER  = "FF2C3E50";
      const CLR_WHITE   = "FFFFFFFF";
      const CLR_SECTION = "FF3498DB";
      const CLR_ALT     = "FFF0F4F8";
      const CLR_TOTAL   = "FF27AE60";
      const CLR_NEG     = "FFE74C3C";

      sheet.columns = [
        { width: 36 }, // A: descripción
        { width: 20 }, // B: monto
      ];

      const addTitle = (text, color = CLR_HEADER) => {
        sheet.mergeCells(`A${sheet.lastRow ? sheet.lastRow.number + 1 : 1}:B${sheet.lastRow ? sheet.lastRow.number + 1 : 1}`);
        const r = sheet.lastRow;
        r.getCell(1).value = text;
        r.getCell(1).font = { bold: true, size: 12, color: { argb: CLR_WHITE } };
        r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        r.height = 22;
      };

      const addSection = (text) => {
        sheet.addRow([]);
        addTitle(`== ${text} ==`, CLR_SECTION);
      };

      const addRow = (label, value, isNeg = false, bold = false) => {
        const r = sheet.addRow([label, value]);
        r.getCell(1).font = { bold };
        r.getCell(2).value = value;
        r.getCell(2).numFmt = "#,##0.00";
        r.getCell(2).alignment = { horizontal: "right" };
        if (isNeg) r.getCell(2).font = { color: { argb: CLR_NEG }, bold };
        else if (bold) r.getCell(2).font = { bold, color: { argb: CLR_TOTAL } };
      };

      const addTotalRow = (label, value) => {
        const r = sheet.addRow([label, value]);
        r.getCell(1).font = { bold: true, color: { argb: CLR_WHITE } };
        r.getCell(2).value = value;
        r.getCell(2).numFmt = "#,##0.00";
        r.getCell(2).alignment = { horizontal: "right" };
        r.getCell(2).font = { bold: true, color: { argb: CLR_WHITE } };
        r.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLR_TOTAL } };
        });
        r.height = 18;
      };

      // ---- ENCABEZADO ----
      addTitle(`CUADRE DE TURNO — ${fmtFecha(c.fecha)}`, CLR_HEADER);
      sheet.addRow(["Cajero:", c.cajero]);
      sheet.addRow(["Turno #:", c.turno]);
      sheet.addRow(["Cantidad de ventas:", c.cantidad_ventas]);
      sheet.addRow([]);

      // ---- RESUMEN ----
      addTitle("RESUMEN DEL DÍA", CLR_HEADER);
      addRow("Ventas Totales (neto)", fmt(c.ventas_neto), false, true);
      addRow("Ganancia", fmt(c.ganancia), c.ganancia < 0, true);
      sheet.addRow([]);

      // ---- DINERO EN CAJA ----
      addTitle("DINERO EN CAJA", CLR_HEADER);
      addRow("Fondo de Caja", fmt(c.fondo_caja));
      addRow("Ventas en Efectivo", fmt(c.ventas_efectivo));
      addRow("Abonos en Efectivo", fmt(c.pagos_efectivo));
      addRow("Salidas", fmt(c.salidas_efectivo), true);
      addRow("Dev. en Efectivo", fmt(c.dev_efectivo), true);
      addTotalRow("EFECTIVO EN CAJA", fmt(c.efectivo_en_caja));
      sheet.addRow([]);

      // ---- SALIDAS ----
      addSection("SALIDAS EFECTIVO");
      for (const s of (c.salidas || [])) {
        addRow(s.concepto || s.descripcion || "Salida", fmt(s.monto));
      }
      addTotalRow("TOTAL SALIDAS", fmt(c.total_salidas));
      sheet.addRow([]);

      // ---- VENTAS POR MÉTODO ----
      addSection("VENTAS");
      addRow("Efectivo", fmt(c.ventas_efectivo));
      addRow("Tarjeta", fmt(c.ventas_tarjeta));
      addRow("A Crédito", fmt(c.ventas_credito));
      addRow("Transferencia", fmt(c.ventas_transferencia));
      addRow("Cheque", fmt(c.ventas_cheque));
      addRow("Dev. de Ventas", fmt(c.devoluciones_total), true);
      addTotalRow("TOTAL VENTAS", fmt(c.ventas_neto));
      sheet.addRow([]);

      // ---- VENTAS POR CATEGORÍA ----
      addSection("VENTAS POR DEPTO");
      for (const cat of (c.por_categoria || [])) {
        addRow(cat.categoria.toUpperCase(), fmt(cat.total));
      }
      sheet.addRow([]);

      // ---- INGRESOS CONTADO ----
      addSection("INGRESOS CONTADO");
      addRow("Ventas Efectivo", fmt(c.ventas_efectivo));
      addRow("Pagos Clientes", fmt(c.pagos_clientes));
      addRow("Ventas Transferencia", fmt(c.ventas_transferencia));
      addRow("Abonos (Dev. Efectivo)", fmt(c.dev_efectivo), true);
      addRow("Dev. Transferencia", fmt(c.dev_transferencia), true);
      addTotalRow("TOTAL INGRESOS", fmt(c.total_ingresos));
      sheet.addRow([]);

      // ---- PAGOS DE CRÉDITOS ----
      addSection("PAGOS DE CRÉDITOS");
      for (const p of (c.pagos_credito || [])) {
        const metodoAbr = p.metodo_pago === "transferencia" ? "TRA" : p.metodo_pago?.substring(0, 3).toUpperCase();
        addRow(`${p.cliente_nombre || "—"} (${metodoAbr})`, fmt(p.monto));
      }
      sheet.addRow([]);

      // ---- DEVOLUCIONES EN EFECTIVO ----
      addSection("DEVOLUCIONES EN EFECTIVO");
      for (const d of (c.devoluciones_efectivo || [])) {
        const desc = (d.items || []).map(i => i.nombre_producto).join(", ");
        addRow(desc ? `${desc} - Ticket ${d.numero_ticket || "—"}` : `Devolución ${d.numero_devolucion}`, fmt(d.total), true);
      }
      sheet.addRow([]);

      // ---- DEVOLUCIONES POR VENTAS A CRÉDITO ----
      addSection("DEVOLUCIONES POR VENTAS A CRÉDITO");
      for (const d of (c.devoluciones_credito || [])) {
        const desc = (d.items || []).map(i => i.nombre_producto).join(", ");
        addRow(desc ? `${desc} - Ticket ${d.numero_ticket || "—"}` : `Devolución ${d.numero_devolucion}`, fmt(d.total), true);
      }

      const nombreArchivo = `cuadre_${c.fecha}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("❌ Error al exportar cuadre Excel:", error);
      next(error);
    }
  },

  // ==================== EXPORTAR SALIDAS EXCEL ====================

  async exportarSalidasExcel(req, res, next) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ success: false, message: "Debe especificar fecha_inicio y fecha_fin" });
      }

      const result = await pool.query(
        `SELECT numero_salida, fecha, concepto, descripcion, monto,
                COALESCE(categoria_gasto, 'Sin categoría') AS categoria_gasto,
                COALESCE(metodo_pago, 'No especificado') AS metodo_pago,
                COALESCE(beneficiario, '') AS beneficiario,
                COALESCE(numero_referencia, '') AS numero_referencia
         FROM salidas
         WHERE fecha >= $1 AND fecha <= $2
         ORDER BY fecha DESC, id DESC`,
        [fecha_inicio, fecha_fin],
      );

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Fifty Tech POS";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Salidas");

      // Título
      sheet.mergeCells("A1:I1");
      sheet.getCell("A1").value = `Reporte de Salidas — ${fecha_inicio} al ${fecha_fin}`;
      sheet.getCell("A1").font = { bold: true, size: 14 };
      sheet.getCell("A1").alignment = { horizontal: "center" };
      sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2c3e50" } };
      sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      sheet.addRow([]);

      // Cabeceras
      const header = sheet.addRow([
        "N° Salida", "Fecha", "Concepto", "Descripción",
        "Monto", "Categoría", "Método Pago", "Beneficiario", "Referencia",
      ]);
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3498db" } };
        cell.alignment = { horizontal: "center" };
      });

      sheet.columns = [
        { key: "numero_salida",    width: 16 },
        { key: "fecha",            width: 14 },
        { key: "concepto",         width: 30 },
        { key: "descripcion",      width: 30 },
        { key: "monto",            width: 14 },
        { key: "categoria_gasto",  width: 20 },
        { key: "metodo_pago",      width: 18 },
        { key: "beneficiario",     width: 22 },
        { key: "numero_referencia",width: 18 },
      ];

      let totalMonto = 0;
      result.rows.forEach((s, i) => {
        const row = sheet.addRow({
          numero_salida:    s.numero_salida,
          fecha:            s.fecha,
          concepto:         s.concepto,
          descripcion:      s.descripcion || "",
          monto:            parseFloat(s.monto),
          categoria_gasto:  s.categoria_gasto,
          metodo_pago:      s.metodo_pago,
          beneficiario:     s.beneficiario,
          numero_referencia:s.numero_referencia,
        });
        row.getCell("monto").numFmt = "#,##0.00";
        row.fill = i % 2 === 0
          ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } }
          : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
        totalMonto += parseFloat(s.monto);
      });

      // Fila total
      const totalRow = sheet.addRow({
        concepto: "TOTAL",
        monto: totalMonto,
      });
      totalRow.getCell("concepto").font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalRow.getCell("concepto").alignment = { horizontal: "right" };
      totalRow.getCell("monto").numFmt = "#,##0.00";
      totalRow.getCell("monto").font = { bold: true, color: { argb: "FFFFFFFF" } };
      totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2c3e50" } };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=salidas_${fecha_inicio}_${fecha_fin}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ReportesExportController;
