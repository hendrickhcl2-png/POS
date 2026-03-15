// ==================== MÓDULO DE REPORTES ====================

const ReportesModule = {
  periodoActual: "hoy",
  reporteActual: null,
  _pgVentas: null,
  _pgDevoluciones: null,

  init() {
    this._initTabs();
    this.setupEventListeners();
    const ciFecha = document.getElementById("ciFecha");
    if (ciFecha) ciFecha.value = new Date().toISOString().split("T")[0];
    this.cargarReporte("hoy");
    this.cargarCuadreDia();
  },

  _initTabs() {
    document.querySelectorAll("#reportes .rpt-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#reportes .rpt-tab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll("#reportes .rpt-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const panel = document.getElementById("rpt-panel-" + btn.dataset.tab);
        if (panel) panel.classList.add("active");
      });
    });
  },

  setupEventListeners() {
  // Botones de periodo
  const btnHoy = document.getElementById("reporteHoy");
  const btnSemana = document.getElementById("reporteSemana");
  const btnMes = document.getElementById("reporteMes");

  if (btnHoy)
  btnHoy.addEventListener("click", () => this.cambiarPeriodo("hoy"));
  if (btnSemana)
  btnSemana.addEventListener("click", () => this.cambiarPeriodo("semana"));
  if (btnMes)
  btnMes.addEventListener("click", () => this.cambiarPeriodo("mes"));

  },

  async cambiarPeriodo(periodo) {
  this.periodoActual = periodo;

  // Actualizar botones activos
  document.querySelectorAll(".periodo-btn").forEach((btn) => {
  btn.classList.remove("active");
  });
  document
.getElementById(
  `reporte${periodo.charAt(0).toUpperCase() + periodo.slice(1)}`,
  )
.classList.add("active");

  await this.cargarReporte(periodo);
  },

  async cargarReporte(periodo) {
  try {
  this.mostrarCargando(true);

  // Cargar ambos reportes en paralelo
  const [reporteVentas, reporteProductos] = await Promise.all([
  ReportesAPI.getReporteVentas(periodo),
  ReportesAPI.getReporteProductos(periodo),
  ]);

  this.reporteActual = {
  ventas: reporteVentas,
  productos: reporteProductos,
  };

  this.renderizarReporte();
  } catch (error) {
  console.error(" Error al cargar reporte:", error);
  this.mostrarError("Error al cargar reporte: " + error.message);
  } finally {
  this.mostrarCargando(false);
  }
  },

  renderizarReporte() {
    if (!this.reporteActual) return;
    this.renderizarResumenVentas();
    this.renderizarDesgloseGanancias();
    this.renderizarTablaVentas();
    this.renderizarTopProductos();
    this.renderizarMetodosPago();
    this.renderizarDevoluciones();
    this.renderizarVentasPorCategoria();
  },

  renderizarResumenVentas() {
  const resumen = this.reporteActual.ventas.resumen;

  // Total Ventas (neto)
  const totalVentasEl = document.getElementById("reporteTotalVentas");
  if (totalVentasEl) {
  totalVentasEl.textContent = this.formatCurrency(resumen.total_ventas);
  }
  const notaEl = document.getElementById("reporteTotalVentasNota");
  if (notaEl) {
  if (resumen.total_devoluciones > 0) {
  notaEl.innerHTML =
  `Bruto: ${this.formatCurrency(resumen.total_ventas_bruto)}<br>` +
  `Dev: −${this.formatCurrency(resumen.total_devoluciones)}`;
  notaEl.style.display = "block";
  } else {
  notaEl.style.display = "none";
  }
  }

  // Ganancias
  const gananciasEl = document.getElementById("reporteGanancias");
  if (gananciasEl) {
  gananciasEl.textContent = this.formatCurrency(resumen.ganancia);
  }

  // Cantidad de ventas
  const cantidadEl = document.getElementById("reporteCantidadVentas");
  if (cantidadEl) {
  cantidadEl.textContent = resumen.cantidad_ventas;
  }

  // Margen de ganancia
  const margenEl = document.getElementById("reporteMargen");
  if (margenEl) {
  margenEl.textContent = resumen.margen_porcentaje.toFixed(1) + "%";
  margenEl.style.color =
  resumen.margen_porcentaje > 30
  ? "#27ae60"
: resumen.margen_porcentaje > 15
  ? "#f39c12"
: "#e74c3c";
  }

  // ITBIS recaudado
  const itbisEl = document.getElementById("reporteITBIS");
  if (itbisEl) {
  itbisEl.textContent = this.formatCurrency(resumen.itbis);
  }

  // Costos Operativos (salidas)
  const costosOpEl = document.getElementById("reporteCostosOperativos");
  if (costosOpEl) {
  costosOpEl.textContent = this.formatCurrency(resumen.costos_salidas || 0);
  }
  },

  renderizarDesgloseGanancias() {
    const el = document.getElementById("rptDesglose");
    if (!el) return;

    const r = this.reporteActual.ventas.resumen;
    const f = (n) => this.formatCurrency(n || 0);
    const pct = (n, base) => base > 0 ? ((Math.abs(n) / base) * 100).toFixed(1) + "%" : "—";

    const hayDevoluciones = r.total_devoluciones > 0;
    const margenBruto = r.total_ventas > 0 ? ((r.ganancia / r.total_ventas) * 100).toFixed(1) : 0;
    const margenNeto  = r.total_ventas > 0 ? ((r.ganancia_neta / r.total_ventas) * 100).toFixed(1) : 0;

    const fila = (label, valor, opts = {}) => {
      const { color = "inherit", bold = false, indent = false, bg = "transparent", borderTop = false, large = false } = opts;
      return `
        <div style="
          display:flex; justify-content:space-between; align-items:baseline;
          padding:${large ? "10px 14px" : "7px 14px"};
          background:${bg};
          border-top:${borderTop ? "2px solid var(--clr-border)" : "none"};
          border-radius:6px; margin-bottom:2px;
        ">
          <span style="color:var(--clr-text);font-size:${large ? "14px" : "13px"};font-weight:${bold ? "700" : "400"};padding-left:${indent ? "18px" : "0"};">${label}</span>
          <span style="color:${color};font-size:${large ? "15px" : "13px"};font-weight:${bold ? "700" : "600"};white-space:nowrap;">${valor}</span>
        </div>`;
    };

    el.innerHTML = `
      ${fila("Ventas brutas", f(r.total_ventas_bruto), { bold: true })}
      ${hayDevoluciones ? fila("(−) Devoluciones", f(r.total_devoluciones), { indent: true, color: "var(--clr-danger)" }) : ""}
      ${fila("= Ventas neto", f(r.total_ventas), { bold: true, bg: "color-mix(in srgb,#3498db 8%,transparent)", borderTop: hayDevoluciones })}

      ${fila("(−) Costo de productos vendidos", f(r.costos), { indent: true, color: "var(--clr-danger)" })}

      ${fila(`= Ganancia bruta &nbsp;<small style="font-weight:400;font-size:11px;color:var(--clr-muted);">(margen ${margenBruto}%)</small>`,
        f(r.ganancia), { bold: true, bg: "color-mix(in srgb,#27ae60 8%,transparent)", borderTop: true, large: true,
        color: r.ganancia >= 0 ? "#27ae60" : "var(--clr-danger)" })}

      ${r.costos_salidas > 0 ? fila("(−) Gastos operativos (salidas)", f(r.costos_salidas), { indent: true, color: "var(--clr-danger)" }) : ""}

      ${fila(`= Ganancia neta &nbsp;<small style="font-weight:400;font-size:11px;color:var(--clr-muted);">(margen ${margenNeto}%)</small>`,
        f(r.ganancia_neta), { bold: true, bg: r.ganancia_neta >= 0 ? "color-mix(in srgb,#27ae60 12%,transparent)" : "color-mix(in srgb,#e74c3c 10%,transparent)",
        borderTop: r.costos_salidas > 0, large: true,
        color: r.ganancia_neta >= 0 ? "#27ae60" : "var(--clr-danger)" })}
    `;
  },

  renderizarTablaVentas() {
  const tbody = document.getElementById("tablaReporteVentas");
  if (!tbody) return;

  const ventas = this.reporteActual.ventas.ventas || [];
  const pagosCredito = this.reporteActual.ventas.pagos_credito || [];

  // Combinar y ordenar por fecha+hora descendente
  const filas = [
    ...ventas.map(v => ({ ...v, _tipo: "venta" })),
    ...pagosCredito.map(p => ({ ...p, _tipo: "pago" })),
  ].sort((a, b) => {
    const da = a.fecha + (a.hora || "");
    const db = b.fecha + (b.hora || "");
    return db.localeCompare(da);
  });

  if (!this._pgVentas) this._pgVentas = new Paginator('tablaReporteVentas', 20);
  this._pgVentas.render(
    filas.map((row) => {
    if (row._tipo === "pago") {
      return `
      <tr style="background:color-mix(in srgb, var(--clr-warning) 8%, transparent);">
        <td style="font-weight:600;color:var(--clr-warning);">
          ${row.numero_pago}
          <br><small style="font-size:10px;color:var(--clr-muted);font-weight:normal;">
            Pago crédito · ${row.numero_factura || ""}
          </small>
        </td>
        <td>${this.formatFecha(row.fecha)}</td>
        <td>${row.hora || "N/A"}</td>
        <td>${row.cliente_nombre || "—"}</td>
        <td style="text-align:right;">—</td>
        <td style="text-align:right;font-weight:600;color:var(--clr-success);">
          ${this.formatCurrency(row.monto)}
        </td>
        <td>${this.formatMetodoPago(row.metodo_pago)}</td>
      </tr>`;
    }
    const devuelto = parseFloat(row.monto_devuelto || 0);
    const neto = parseFloat(row.total) - devuelto;
    const tieneDevolucion = devuelto > 0;
    return `
    <tr>
    <td style="font-weight:600;color:var(--clr-primary);">${row.numero_ticket}</td>
    <td>${this.formatFecha(row.fecha)}</td>
    <td>${row.hora || "N/A"}</td>
    <td>${row.cliente_nombre || "Cliente General"}</td>
    <td style="text-align:right;">${this.formatCurrency(row.subtotal)}</td>
    <td style="text-align:right;font-weight:600;color:${tieneDevolucion ? "var(--clr-danger)" : "var(--clr-success)"};">
    ${this.formatCurrency(neto)}
    ${tieneDevolucion ? `<br><small style="font-size:10px;font-weight:normal;color:var(--clr-muted);">
    <span style="text-decoration:line-through;">${this.formatCurrency(row.total)}</span>
    &nbsp;↩ ${this.formatCurrency(devuelto)}</small>` : ""}
    </td>
    <td>${this.formatMetodoPago(row.metodo_pago)}</td>
    </tr>`;
    }),
    `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;"><p>No hay ventas en este periodo</p></td></tr>`
  );
  },

  renderizarDevoluciones() {
  const card = document.getElementById("cardDevoluciones");
  const tbody = document.getElementById("tablaReporteDevoluciones");
  const cardResumen = document.getElementById("cardDevolucionesResumen");
  const totalDevEl = document.getElementById("reporteTotalDevoluciones");
  if (!card || !tbody) return;

  const devoluciones = this.reporteActual.ventas.devoluciones || [];
  const resumen = this.reporteActual.ventas.resumen;

  if (devoluciones.length === 0) {
  card.style.display = "none";
  if (cardResumen) cardResumen.style.display = "none";
  return;
  }

  card.style.display = "block";
  if (cardResumen) cardResumen.style.display = "block";
  if (totalDevEl) totalDevEl.textContent = this.formatCurrency(resumen.total_devoluciones);

  if (!this._pgDevoluciones) this._pgDevoluciones = new Paginator('tablaReporteDevoluciones', 20);
  this._pgDevoluciones.render(
    devoluciones.map((dev) => {
    const itemsHtml = (dev.items || []).map((item) => `
    <tr style="background:#fdf9f9;">
    <td style="padding:4px 12px;color:var(--clr-muted);" colspan="2"></td>
    <td style="padding:4px 12px;color:var(--clr-muted);font-size:12px;" colspan="2">
    ↳ ${item.nombre_producto} × ${item.cantidad_devuelta}
    </td>
    <td style="padding:4px 12px;font-size:12px;color:var(--clr-muted);">
    @ ${this.formatCurrency(item.precio_unitario)}
    </td>
    <td style="padding:4px 12px;text-align:right;font-size:12px;color:var(--clr-danger);">
    −${this.formatCurrency(item.total)}
    </td>
    </tr>`).join("");

    return `
    <tr>
    <td style="font-weight:600;color:var(--clr-danger);">${dev.numero_devolucion}</td>
    <td>${dev.numero_ticket || "—"}</td>
    <td>${dev.numero_factura || "—"}</td>
    <td>${this.formatFecha(dev.fecha)}</td>
    <td>${dev.cliente_nombre || "Cliente General"}</td>
    <td style="font-size:13px;color:var(--clr-muted);">${dev.motivo}</td>
    <td style="text-align:right;font-weight:600;color:var(--clr-danger);">
    −${this.formatCurrency(dev.monto_devuelto)}
    </td>
    </tr>
    ${itemsHtml}`;
    }),
    ''
  );
  },

  renderizarTopProductos() {
  const container = document.getElementById("topProductosVendidos");
  if (!container) return;

  const resumen = this.reporteActual.ventas.resumen;
  const totalVentas = parseFloat(resumen.total_ventas) || 0;
  const gastos = parseFloat(resumen.costos_salidas) || 0;
  const gananciaNeta = totalVentas - gastos;
  const isLoss = gananciaNeta < 0;

  if (totalVentas === 0 && gastos === 0) {
  container.innerHTML = `
  <p style="text-align: center; color: #7f8c8d; padding: 40px;">
  No hay datos en este periodo
  </p>
  `;
  return;
  }

  // SVG donut chart math
  const r = 90;
  const circ = 2 * Math.PI * r;
  const base = Math.max(totalVentas, gastos) || 1;
  const seg1 = (gastos / base) * circ;
  const seg2 = (Math.max(0, gananciaNeta) / base) * circ;

  const pctOf = (val) =>
  totalVentas > 0 ? ((val / totalVentas) * 100).toFixed(1) + "%" : "0%";

  container.innerHTML = `
  <div style="display: flex; align-items: center; justify-content: center; gap: 40px; flex-wrap: wrap; padding: 10px 0 20px;">
  <div style="flex-shrink: 0;">
  <svg width="280" height="280" viewBox="0 0 300 300">
  <g transform="rotate(-90, 150, 150)">
  <circle cx="150" cy="150" r="${r}" fill="none" stroke="#ecf0f1" stroke-width="36" />
  <circle cx="150" cy="150" r="${r}" fill="none" stroke="#f7971e" stroke-width="36"
  stroke-dasharray="${seg1} ${circ - seg1}"
  stroke-dashoffset="0" />
  ${!isLoss ? `<circle cx="150" cy="150" r="${r}" fill="none" stroke="#27ae60" stroke-width="36"
  stroke-dasharray="${seg2} ${circ - seg2}"
  stroke-dashoffset="${-seg1}" />` : ""}
  </g>
  <text x="150" y="140" text-anchor="middle" font-size="13" fill="#95a5a6">Total Ventas</text>
  <text x="150" y="165" text-anchor="middle" font-size="18" font-weight="bold" fill="#2c3e50">
  ${this.formatCurrency(totalVentas)}
  </text>
  </svg>
  </div>
  <div style="display: flex; flex-direction: column; gap: 14px; min-width: 250px;">
  <div style="padding: 14px 18px; background: #fff8ee; border-left: 5px solid #f7971e; border-radius: 8px;">
  <div style="font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Gastos</div>
  <div style="font-size: 22px; font-weight: bold; color: #f7971e;">${this.formatCurrency(gastos)}</div>
  <div style="font-size: 12px; color: #95a5a6; margin-top: 2px;">${pctOf(gastos)} del total ventas</div>
  </div>
  <div style="padding: 14px 18px; background: ${isLoss ? "#fdf2f2" : "#f0faf4"}; border-left: 5px solid ${isLoss ? "#e74c3c" : "#27ae60"}; border-radius: 8px;">
  <div style="font-size: 11px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Ganancia Neta</div>
  <div style="font-size: 22px; font-weight: bold; color: ${isLoss ? "#e74c3c" : "#27ae60"};">${this.formatCurrency(gananciaNeta)}</div>
  <div style="font-size: 12px; color: #95a5a6; margin-top: 2px;">${isLoss ? "Gastos superan las ventas" : pctOf(gananciaNeta) + " del total ventas"}</div>
  </div>
  </div>
  </div>
  `;
  },

  renderizarMetodosPago() {
  const container = document.getElementById("metodosPagoChart");
  if (!container) return;

  const metodos = this.reporteActual.ventas.metodos_pago || [];

  if (metodos.length === 0) {
  container.innerHTML =
  '<p style="text-align: center; color: #7f8c8d;">No hay datos</p>';
  return;
  }

  const total = metodos.reduce(
  (sum, m) => sum + parseFloat(m.total_ventas),
  0,
  );

  container.innerHTML = metodos
.map((metodo) => {
  const porcentaje = (parseFloat(metodo.total_ventas) / total) * 100;

  return `
  <div style="margin-bottom: 20px;">
  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
  <span style="font-weight: 600;">${this.formatMetodoPago(metodo.metodo_pago)}</span>
  <span>${this.formatCurrency(metodo.total_ventas)} (${porcentaje.toFixed(1)}%)</span>
  </div>
  <div style="background: #ecf0f1; height: 30px; border-radius: 15px; overflow: hidden;">
  <div style="
  background: linear-gradient(90deg, #3498db, #2980b9);
  height: 100%;
  width: ${porcentaje}%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  ">
  ${metodo.cantidad_ventas} ventas
  </div>
  </div>
  </div>
  `;
  })
.join("");
  },

  // ==================== UTILIDADES ====================

  formatCurrency(amount) {
  return new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  }).format(amount);
  },

  formatFecha(fecha) {
  if (!fecha) return "N/A";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-DO", {
  year: "numeric",
  month: "short",
  day: "numeric",
  });
  },

  formatMetodoPago(metodo) {
  const metodos = {
  efectivo: " Efectivo",
  tarjeta: " Tarjeta",
  transferencia: " Transferencia",
  mixto: " Mixto",
  credito: "Crédito",
  };
  return metodos[metodo] || metodo;
  },

  mostrarCargando(mostrar) {
  const loader = document.getElementById("loaderReportes");
  if (loader) {
  loader.style.display = mostrar ? "block": "none";
  }
  },
  async descargarExcel() {
  try {
  const periodo = this.periodoActual || "hoy";
  const btnExcel = document.getElementById("btnDescargarExcel");

  if (btnExcel) {
  btnExcel.disabled = true;
  btnExcel.textContent = " Generando...";
  }

  const baseURL = window.API_URL || "http://localhost:3000/api";
  const url = `${baseURL}/reportes/exportar-excel?periodo=${periodo}`;

  const response = await fetch(url);

  if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || "Error al generar Excel");
  }

  const blob = await response.blob();
  const urlBlob = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = urlBlob;
  link.download = `reporte_productos_${periodo}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(urlBlob);

  } catch (error) {
  console.error(" Error al descargar Excel:", error);
  Toast.error("Error al descargar Excel: " + error.message);
  } finally {
  const btnExcel = document.getElementById("btnDescargarExcel");
  if (btnExcel) {
  btnExcel.disabled = false;
  btnExcel.textContent = " Descargar Excel";
  }
  }
  },

  async descargarExcelPersonalizado(fechaInicio, fechaFin) {
  try {
  const btnExcel = document.getElementById(
  "btnDescargarExcelPersonalizado",
  );
  if (btnExcel) {
  btnExcel.disabled = true;
  btnExcel.textContent = " Generando...";
  }

  const baseURL = window.API_URL || "http://localhost:3000/api";
  const url = `${baseURL}/reportes/exportar-excel?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;

  const response = await fetch(url);

  if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || "Error al generar Excel");
  }

  const blob = await response.blob();
  const urlBlob = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = urlBlob;
  link.download = `reporte_${fechaInicio}_${fechaFin}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(urlBlob);
  } catch (error) {
  console.error(" Error al descargar Excel:", error);
  Toast.error("Error al descargar Excel: " + error.message);
  } finally {
  const btnExcel = document.getElementById(
  "btnDescargarExcelPersonalizado",
  );
  if (btnExcel) {
  btnExcel.disabled = false;
  btnExcel.textContent = " Descargar Excel";
  }
  }
  },

  async buscarPorRango(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) {
  Toast.warning("Selecciona ambas fechas para buscar.");
  return;
  }
  try {
  this.mostrarCargando(true);
  const [reporteVentas, reporteProductos] = await Promise.all([
  ReportesAPI.getReportePersonalizado("ventas", fechaDesde, fechaHasta),
  ReportesAPI.getReportePersonalizado("productos", fechaDesde, fechaHasta),
  ]);
  this.reporteActual = { ventas: reporteVentas, productos: reporteProductos };
  this.renderizarReporte();
  } catch (error) {
  console.error(" Error al buscar reporte por rango:", error);
  this.mostrarError("Error al buscar reporte: " + error.message);
  } finally {
  this.mostrarCargando(false);
  }
  },

  mostrarError(mensaje) {
  Toast.error(mensaje);
  },

  // ==================== CUADRE DE TURNO ====================

  abrirCuadre() {
  const hoy = new Date().toISOString().split("T")[0];
  const input = document.getElementById("cuadreFecha");
  if (input && !input.value) input.value = hoy;
  document.getElementById("cuadreContenido").style.display = "none";
  document.getElementById("btnCuadreExcel").style.display = "none";
  document.getElementById("btnCuadrePrint").style.display = "none";
  abrirModal("modalCuadre");
  },

  async cargarCuadre() {
  const fecha = document.getElementById("cuadreFecha").value;
  const fondo = document.getElementById("cuadreFondo").value || 0;
  if (!fecha) { Toast.warning("Selecciona una fecha"); return; }

  document.getElementById("cuadreLoader").style.display = "block";
  document.getElementById("cuadreContenido").style.display = "none";

  try {
  const data = await ReportesAPI.getCuadreTurno(fecha, fondo);
  this._cuadreActual = data.cuadre;
  this.renderizarCuadre(data.cuadre);
  document.getElementById("cuadreContenido").style.display = "block";
  document.getElementById("btnCuadreExcel").style.display = "inline-block";
  document.getElementById("btnCuadrePrint").style.display = "inline-block";
  } catch (e) {
  Toast.error("Error al cargar cuadre: " + e.message);
  } finally {
  document.getElementById("cuadreLoader").style.display = "none";
  }
  },

  renderizarCuadre(c) {
  const f = (n) => this.formatCurrency(n || 0);
  const neg = (n) => "-" + f(Math.abs(n || 0));

  document.getElementById("cVentasNeto").textContent = f(c.ventas_neto);
  document.getElementById("cGanancia").textContent = f(c.ganancia);
  document.getElementById("cGanancia").style.color = c.ganancia < 0 ? "var(--clr-danger)" : "var(--clr-success)";
  document.getElementById("cEfectivoCaja").textContent = f(c.efectivo_en_caja);
  document.getElementById("cCantidadVentas").textContent = c.cantidad_ventas;

  // Ventas a crédito del día
  const cantidadCreditoEl = document.getElementById("cCantidadCredito");
  if (cantidadCreditoEl) cantidadCreditoEl.textContent = c.cantidad_ventas_credito || 0;
  const totalCreditoEl = document.getElementById("cTotalCreditoDia");
  if (totalCreditoEl) {
    totalCreditoEl.textContent = (c.cantidad_ventas_credito || 0) > 0
      ? f(c.total_ventas_credito)
      : "";
  }

  // Dinero en caja
  document.getElementById("cFondoCaja").textContent = f(c.fondo_caja);
  document.getElementById("cVentasEfectivo").textContent = f(c.ventas_efectivo);
  document.getElementById("cAbonos").textContent = f(c.pagos_efectivo);
  document.getElementById("cSalidas").textContent = neg(c.salidas_efectivo);
  document.getElementById("cDevEfectivo").textContent = neg(c.dev_efectivo);
  document.getElementById("cEfectivoCaja2").textContent = f(c.efectivo_en_caja);

  // Métodos de pago
  document.getElementById("cMetEfectivo").textContent = f(c.ventas_efectivo);
  document.getElementById("cMetTarjeta").textContent = f(c.ventas_tarjeta);
  document.getElementById("cMetTransferencia").textContent = f(c.ventas_transferencia);
  document.getElementById("cMetCredito").textContent = f(c.total_ventas_credito);
  document.getElementById("cMetCheque").textContent = f(c.ventas_cheque);
  document.getElementById("cDevoluciones").textContent = neg(c.devoluciones_total);
  document.getElementById("cTotalVentas").textContent = f((c.ventas_neto || 0) + (c.total_ventas_credito || 0));

  // Ingresos contado
  document.getElementById("cIngEfectivo").textContent = f(c.ventas_efectivo);
  document.getElementById("cIngPagos").textContent = f(c.pagos_clientes);
  document.getElementById("cIngTransferencia").textContent = f(c.ventas_transferencia);
  document.getElementById("cIngDevEf").textContent = neg(c.dev_efectivo);
  document.getElementById("cIngDevTra").textContent = neg(c.dev_transferencia);
  document.getElementById("cTotalIngresos").textContent = f(c.total_ingresos);

  // Categorías
  const catTabla = document.getElementById("cuadreCategorias");
  catTabla.innerHTML = (c.por_categoria || []).map(cat =>
  `<tr><td>${cat.categoria}</td><td style="text-align:right;">${f(cat.total)}</td></tr>`
  ).join("") || "<tr><td colspan='2' style='color:var(--clr-muted);'>Sin datos</td></tr>";

  // Salidas
  const salidasTabla = document.getElementById("cuadreSalidasTabla");
  salidasTabla.innerHTML = (c.salidas || []).map(s =>
  `<tr><td>${s.concepto || s.descripcion || "Salida"}</td><td style="text-align:right;color:var(--clr-danger);">${f(s.monto)}</td></tr>`
  ).join("") || "<tr><td colspan='2' style='color:var(--clr-muted);'>Sin salidas</td></tr>";
  if ((c.salidas || []).length > 0) {
  salidasTabla.innerHTML += `<tr style="font-weight:700;border-top:2px solid #ccc;">
  <td>Total Salidas</td><td style="text-align:right;">${f(c.total_salidas)}</td>
  </tr>`;
  }

  // Pagos de crédito
  const pagosTabla = document.getElementById("cuadrePagosTabla");
  pagosTabla.innerHTML = (c.pagos_credito || []).map(p => {
  const metodo = p.metodo_pago === "transferencia" ? "TRA" : (p.metodo_pago || "").substring(0, 3).toUpperCase();
  return `<tr><td>${p.cliente_nombre || "—"} (${metodo})</td><td style="text-align:right;">${f(p.monto)}</td></tr>`;
  }).join("") || "<tr><td colspan='2' style='color:var(--clr-muted);'>Sin pagos de crédito</td></tr>";

  // Devoluciones
  const devDiv = document.getElementById("cuadreDevoluciones");
  const devEf = c.devoluciones_efectivo || [];
  const devCr = c.devoluciones_credito || [];
  let devHtml = "";

  if (devEf.length > 0) {
  devHtml += `<div style="font-weight:700;margin-bottom:4px;">En Efectivo:</div>`;
  devHtml += devEf.map(d => {
  const desc = (d.items || []).map(i => i.nombre_producto).join(", ");
  return `<div style="display:flex;justify-content:space-between;padding:3px 0;">
  <span>${desc || d.numero_devolucion}${d.numero_ticket ? ` · T#${d.numero_ticket}` : ""}</span>
  <span style="color:var(--clr-danger);">-${f(d.total)}</span>
  </div>`;
  }).join("");
  }

  if (devCr.length > 0) {
  devHtml += `<div style="font-weight:700;margin-top:8px;margin-bottom:4px;">Por Ventas a Crédito:</div>`;
  devHtml += devCr.map(d => {
  const desc = (d.items || []).map(i => i.nombre_producto).join(", ");
  return `<div style="display:flex;justify-content:space-between;padding:3px 0;">
  <span>${desc || d.numero_devolucion}${d.numero_ticket ? ` · T#${d.numero_ticket}` : ""}</span>
  <span style="color:var(--clr-danger);">-${f(d.total)}</span>
  </div>`;
  }).join("");
  }

  devDiv.innerHTML = devHtml || "<span style='color:var(--clr-muted);'>Sin devoluciones</span>";

  // Ventas a crédito del día
  const creditosCuerpo = document.getElementById("cuadreCreditosCuerpo");
  const creditosCard = document.getElementById("cuadreCreditosCard");
  if (creditosCuerpo) {
    const lista = c.ventas_credito_lista || [];
    if (lista.length === 0) {
      creditosCuerpo.innerHTML = `<tr><td colspan="5" style="color:var(--clr-muted);padding:8px 0;">Sin ventas a crédito hoy</td></tr>`;
    } else {
      let totalSaldo = 0;
      creditosCuerpo.innerHTML = lista.map(v => {
        totalSaldo += parseFloat(v.saldo_pendiente || 0);
        return `<tr>
          <td style="font-weight:600;color:var(--clr-primary);">${v.numero_ticket}</td>
          <td>${v.numero_factura || "—"}</td>
          <td>${v.cliente_nombre || "—"}</td>
          <td style="text-align:right;">${f(v.total)}</td>
          <td style="text-align:right;color:var(--clr-warning);">${f(v.saldo_pendiente || 0)}</td>
        </tr>`;
      }).join("");
      creditosCuerpo.innerHTML += `<tr style="font-weight:700;border-top:2px solid #ccc;">
        <td colspan="3">Total</td>
        <td style="text-align:right;">${f(c.total_ventas_credito)}</td>
        <td style="text-align:right;color:var(--clr-warning);">${f(totalSaldo)}</td>
      </tr>`;
    }
  }
  },

  // ==================== CUADRE INLINE ====================

  async cargarCuadreDia() {
    const fechaInput = document.getElementById("ciFecha");
    const fondoInput = document.getElementById("ciFondo");
    if (!fechaInput) return;
    const fecha = fechaInput.value || new Date().toISOString().split("T")[0];
    const fondo = parseFloat(fondoInput?.value || 0) || 0;

    const loader = document.getElementById("ciLoader");
    const contenido = document.getElementById("ciContenido");
    if (loader) loader.style.display = "block";
    if (contenido) contenido.style.display = "none";

    try {
      const data = await ReportesAPI.getCuadreTurno(fecha, fondo);
      this.renderizarCuadreDia(data.cuadre);
      if (contenido) contenido.style.display = "block";
    } catch (e) {
      Toast.error("Error al cargar cuadre: " + e.message);
    } finally {
      if (loader) loader.style.display = "none";
    }
  },

  renderizarCuadreDia(c) {
    const f = (n) => this.formatCurrency(n || 0);
    const neg = (n) => "-" + f(Math.abs(n || 0));
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Stats
    set("ciCantVentas", c.cantidad_ventas);
    set("ciVentasNeto", f(c.ventas_neto));
    set("ciGanancia", f(c.ganancia));
    set("ciTotalSalidas", f(c.total_salidas));
    set("ciTotalIngresos", f(c.total_ingresos));

    const efEl = document.getElementById("ciEfectivoCaja");
    if (efEl) { efEl.textContent = f(c.efectivo_en_caja); efEl.style.color = c.efectivo_en_caja < 0 ? "var(--clr-danger)" : "var(--clr-success)"; }
    const ganEl = document.getElementById("ciGanancia");
    if (ganEl) ganEl.style.color = c.ganancia < 0 ? "var(--clr-danger)" : "var(--clr-success)";

    // Métodos de pago
    set("ciMetEfectivo", f(c.ventas_efectivo));
    set("ciMetTarjeta", f(c.ventas_tarjeta));
    set("ciMetTransferencia", f(c.ventas_transferencia));
    set("ciMetCheque", f(c.ventas_cheque));
    set("ciMetCredito", f(c.total_ventas_credito));
    set("ciMetDev", neg(c.devoluciones_total));
    set("ciMetTotal", f((c.ventas_neto || 0) + (c.total_ventas_credito || 0)));

    // Efectivo en caja desglose
    set("ciFondoCaja", f(c.fondo_caja));
    set("ciIngEfectivo", f(c.ventas_efectivo));
    set("ciAbonos", f(c.pagos_efectivo));
    set("ciSalidasEf", neg(c.salidas_efectivo));
    set("ciDevEf", neg(c.dev_efectivo));
    set("ciEfectivoCaja2", f(c.efectivo_en_caja));

    // Salidas
    const salidasEl = document.getElementById("ciSalidasLista");
    if (salidasEl) {
      const lista = c.salidas || [];
      if (lista.length === 0) {
        salidasEl.innerHTML = "<span style='color:var(--clr-muted);'>Sin salidas</span>";
      } else {
        salidasEl.innerHTML = lista.map(s =>
          `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--clr-border);">
            <span>${s.concepto || s.descripcion || "Salida"}${s.categoria_gasto ? ` <small style="color:var(--clr-muted);">(${s.categoria_gasto})</small>` : ""}</span>
            <span style="color:var(--clr-danger);font-weight:600;">${neg(s.monto)}</span>
          </div>`
        ).join("") +
        `<div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:700;">
          <span>Total</span><span style="color:var(--clr-danger);">${neg(c.total_salidas)}</span>
        </div>`;
      }
    }

    // Categorías
    const catEl = document.getElementById("ciCategorias");
    if (catEl) {
      catEl.innerHTML = (c.por_categoria || []).map(cat =>
        `<tr>
          <td style="padding:3px 0;">${cat.categoria}</td>
          <td style="text-align:right;font-weight:600;">${f(cat.total)}</td>
        </tr>`
      ).join("") || `<tr><td colspan="2" style="color:var(--clr-muted);">Sin datos</td></tr>`;
    }

    // Abonos de crédito
    const pagosEl = document.getElementById("ciPagosLista");
    if (pagosEl) {
      const pagos = c.pagos_credito || [];
      if (pagos.length === 0) {
        pagosEl.innerHTML = "<span style='color:var(--clr-muted);'>Sin abonos</span>";
      } else {
        const metLabel = m => m === "transferencia" ? "TRA" : (m || "").substring(0, 3).toUpperCase();
        pagosEl.innerHTML = pagos.map(p =>
          `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--clr-border);">
            <span>${p.cliente_nombre || "—"} <small style="color:var(--clr-muted);">(${metLabel(p.metodo_pago)})</small></span>
            <span style="font-weight:600;">${f(p.monto)}</span>
          </div>`
        ).join("") +
        `<div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:700;">
          <span>Total</span><span style="color:var(--clr-primary);">${f(c.pagos_clientes)}</span>
        </div>`;
      }
    }

    // Devoluciones
    const devEl = document.getElementById("ciDevoluciones");
    if (devEl) {
      const devEf = c.devoluciones_efectivo || [];
      const devCr = c.devoluciones_credito || [];
      if (devEf.length === 0 && devCr.length === 0) {
        devEl.innerHTML = "<span style='color:var(--clr-muted);'>Sin devoluciones</span>";
      } else {
        let html = "";
        const renderDev = (lista) => lista.map(d => {
          const desc = (d.items || []).map(i => i.nombre_producto).join(", ");
          return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--clr-border);">
            <span>${desc || d.numero_devolucion}${d.numero_ticket ? ` · T#${d.numero_ticket}` : ""}</span>
            <span style="color:var(--clr-danger);font-weight:600;">-${f(d.total)}</span>
          </div>`;
        }).join("");
        if (devEf.length > 0) html += `<div style="font-size:11px;font-weight:700;color:var(--clr-muted);text-transform:uppercase;margin-bottom:4px;">Efectivo</div>${renderDev(devEf)}`;
        if (devCr.length > 0) html += `<div style="font-size:11px;font-weight:700;color:var(--clr-muted);text-transform:uppercase;margin:6px 0 4px;">Crédito</div>${renderDev(devCr)}`;
        devEl.innerHTML = html;
      }
    }

    // Ventas a crédito
    const creditosCuerpo = document.getElementById("ciCreditosCuerpo");
    if (creditosCuerpo) {
      const lista = c.ventas_credito_lista || [];
      if (lista.length === 0) {
        creditosCuerpo.innerHTML = `<tr><td colspan="5" style="padding:8px;color:var(--clr-muted);">Sin ventas a crédito hoy</td></tr>`;
      } else {
        let totalSaldo = 0;
        creditosCuerpo.innerHTML = lista.map(v => {
          totalSaldo += parseFloat(v.saldo_pendiente || 0);
          return `<tr>
            <td style="padding:4px 8px;font-weight:600;color:var(--clr-primary);">${v.numero_ticket}</td>
            <td style="padding:4px 8px;">${v.numero_factura || "—"}</td>
            <td style="padding:4px 8px;">${v.cliente_nombre || "—"}</td>
            <td style="padding:4px 8px;text-align:right;">${f(v.total)}</td>
            <td style="padding:4px 8px;text-align:right;color:var(--clr-warning);">${f(v.saldo_pendiente || 0)}</td>
          </tr>`;
        }).join("") +
        `<tr style="font-weight:700;border-top:2px solid var(--clr-border);">
          <td colspan="3" style="padding:5px 8px;">Total</td>
          <td style="padding:5px 8px;text-align:right;">${f(c.total_ventas_credito)}</td>
          <td style="padding:5px 8px;text-align:right;color:var(--clr-warning);">${f(totalSaldo)}</td>
        </tr>`;
      }
    }
  },

  async descargarCuadreExcel() {
  const fecha = document.getElementById("cuadreFecha").value;
  const fondo = document.getElementById("cuadreFondo").value || 0;
  if (!fecha) { Toast.warning("Selecciona una fecha"); return; }

  const btn = document.getElementById("btnCuadreExcel");
  btn.disabled = true;
  btn.textContent = "Generando...";
  try {
  const baseURL = window.API_URL || "http://localhost:3000/api";
  const url = `${baseURL}/reportes/cuadre/excel?fecha=${fecha}&fondo_caja=${fondo}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Error al generar Excel");
  const blob = await response.blob();
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = `cuadre_${fecha}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  } catch (e) {
  Toast.error("Error al descargar Excel: " + e.message);
  } finally {
  btn.disabled = false;
  btn.textContent = "Descargar Excel";
  }
  },

  // ==================== REPORTE DE SALIDAS ====================

  abrirReporteSalidas() {
    const hoy = new Date().toISOString().split("T")[0];
    const desde = document.getElementById("salidasDesde");
    const hasta = document.getElementById("salidasHasta");
    if (desde && !desde.value) desde.value = hoy;
    if (hasta && !hasta.value) hasta.value = hoy;
    document.getElementById("salidasContenido").style.display = "none";
    document.getElementById("btnSalidasExcel").style.display = "none";
    abrirModal("modalReporteSalidas");
  },

  async cargarReporteSalidas() {
    const desde = document.getElementById("salidasDesde").value;
    const hasta = document.getElementById("salidasHasta").value;
    if (!desde || !hasta) { Toast.warning("Selecciona ambas fechas"); return; }

    document.getElementById("salidasLoader").style.display = "block";
    document.getElementById("salidasContenido").style.display = "none";

    try {
      const data = await ReportesAPI.getReporteSalidas(desde, hasta);
      this._salidasActual = { data, desde, hasta };
      this.renderizarReporteSalidas(data);
      document.getElementById("salidasContenido").style.display = "block";
      document.getElementById("btnSalidasExcel").style.display = "inline-block";
    } catch (e) {
      Toast.error("Error al cargar reporte: " + e.message);
    } finally {
      document.getElementById("salidasLoader").style.display = "none";
    }
  },

  renderizarReporteSalidas(data) {
    const f = (n) => this.formatCurrency(n || 0);
    const resumen = data.resumen;

    document.getElementById("sTotalSalidas").textContent = f(resumen.total_salidas);
    document.getElementById("sCantidadSalidas").textContent = resumen.cantidad_salidas;

    // Tabla principal
    const tbody = document.getElementById("salidasTabla");
    if (tbody) {
      if (data.salidas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--clr-muted);">Sin salidas en este período</td></tr>`;
      } else {
        tbody.innerHTML = data.salidas.map(s => `
          <tr>
            <td style="font-weight:600;color:var(--clr-primary);">${s.numero_salida || "—"}</td>
            <td>${this.formatFecha(s.fecha)}</td>
            <td>${s.concepto}</td>
            <td style="color:var(--clr-muted);font-size:12px;">${s.descripcion || "—"}</td>
            <td style="text-align:right;font-weight:600;color:var(--clr-danger);">${f(s.monto)}</td>
            <td>${s.categoria_gasto || "—"}</td>
            <td>${this.formatMetodoPago(s.metodo_pago)}</td>
          </tr>`).join("");
      }
    }

    // Por categoría
    const catDiv = document.getElementById("salidasPorCategoria");
    if (catDiv) {
      catDiv.innerHTML = (data.por_categoria || []).map(c => {
        const pct = resumen.total_salidas > 0 ? ((parseFloat(c.total) / resumen.total_salidas) * 100).toFixed(1) : 0;
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;">${c.categoria}</span>
              <span>${f(c.total)} (${pct}%)</span>
            </div>
            <div style="background:#ecf0f1;height:24px;border-radius:12px;overflow:hidden;">
              <div style="background:linear-gradient(90deg,#e74c3c,#c0392b);height:100%;width:${pct}%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">
                ${c.cantidad} salidas
              </div>
            </div>
          </div>`;
      }).join("") || `<p style="color:var(--clr-muted);text-align:center;">Sin datos</p>`;
    }

    // Por método de pago
    const metDiv = document.getElementById("salidasPorMetodo");
    if (metDiv) {
      metDiv.innerHTML = (data.por_metodo || []).map(m => {
        const pct = resumen.total_salidas > 0 ? ((parseFloat(m.total) / resumen.total_salidas) * 100).toFixed(1) : 0;
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;">${this.formatMetodoPago(m.metodo_pago)}</span>
              <span>${f(m.total)} (${pct}%)</span>
            </div>
            <div style="background:#ecf0f1;height:24px;border-radius:12px;overflow:hidden;">
              <div style="background:linear-gradient(90deg,#3498db,#2980b9);height:100%;width:${pct}%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">
                ${m.cantidad}
              </div>
            </div>
          </div>`;
      }).join("") || `<p style="color:var(--clr-muted);text-align:center;">Sin datos</p>`;
    }
  },

  async descargarSalidasExcel() {
    if (!this._salidasActual) { Toast.warning("Carga el reporte primero"); return; }
    const { desde, hasta } = this._salidasActual;
    const btn = document.getElementById("btnSalidasExcel");
    btn.disabled = true;
    btn.textContent = "Generando...";
    try {
      const baseURL = window.API_URL || "http://localhost:3000/api";
      const url = `${baseURL}/reportes/salidas/excel?fecha_inicio=${desde}&fecha_fin=${hasta}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al generar Excel");
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `salidas_${desde}_${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      Toast.error("Error al descargar Excel: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Descargar Excel";
    }
  },

  // ==================== REPORTE GASTOS + VENTAS CATEGORÍA (REPORTES) ====================

  async buscarRangoCompleto() {
    const desde = document.getElementById("excelFechaDesde")?.value;
    const hasta = document.getElementById("excelFechaHasta")?.value;
    if (!desde || !hasta) { Toast.warning("Selecciona ambas fechas para buscar."); return; }
    await this.buscarPorRango(desde, hasta);
    await this.cargarReporteGastos(desde, hasta);
  },

  async cargarReporteGastos(desde, hasta) {
    if (!desde) desde = document.getElementById("excelFechaDesde")?.value;
    if (!hasta) hasta = document.getElementById("excelFechaHasta")?.value;
    if (!desde || !hasta) return;
    try {
      const data = await ReportesAPI.getReporteSalidas(desde, hasta);
      const resumen = data.resumen;
      const total = parseFloat(resumen.total_salidas) || 0;

      document.getElementById("rgTotal").textContent = this.formatCurrency(total);
      document.getElementById("rgCantidad").textContent = resumen.cantidad_salidas;

      this._renderGastoBars("rgPorCategoria", data.por_categoria, total, "linear-gradient(90deg,#e74c3c,#c0392b)");
      this._renderGastoBars("rgPorMetodo", data.por_metodo, total, "linear-gradient(90deg,#3498db,#2980b9)");

      document.getElementById("rgCard").style.display = "block";
    } catch (e) {
      Toast.error("Error al cargar reporte de gastos: " + e.message);
    }
  },

  async descargarExcelCategorias() {
    const desde = document.getElementById("excelFechaDesde")?.value;
    const hasta = document.getElementById("excelFechaHasta")?.value;
    if (!desde || !hasta) { Toast.warning("Selecciona un rango de fechas primero"); return; }
    const btn = document.getElementById("rgBtnExcel");
    if (btn) { btn.disabled = true; btn.textContent = "Generando..."; }
    try {
      const baseURL = window.API_URL || "http://localhost:3000/api";
      const response = await fetch(`${baseURL}/reportes/categorias/excel?fecha_inicio=${desde}&fecha_fin=${hasta}`);
      if (!response.ok) throw new Error("Error al generar Excel");
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `categorias_${desde}_${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      Toast.error("Error al descargar: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Descargar Excel"; }
    }
  },

  renderizarVentasPorCategoria() {
    const cats = this.reporteActual?.productos?.por_categoria || [];
    const card = document.getElementById("rgVentasCatCard");
    const el = document.getElementById("rgVentasPorCategoria");
    if (!card || !el) return;

    const total = cats.reduce((sum, c) => sum + parseFloat(c.total_ventas || 0), 0);
    el.innerHTML = cats.map(c => {
      const pct = total > 0 ? ((parseFloat(c.total_ventas) / total) * 100).toFixed(1) : 0;
      const esServicio = c.tipo === 'servicio';
      const barColor = esServicio
        ? 'linear-gradient(90deg,#8e44ad,#9b59b6)'
        : 'linear-gradient(90deg,#27ae60,#2ecc71)';
      const badge = esServicio
        ? `<span style="font-size:10px;background:#8e44ad;color:#fff;border-radius:4px;padding:1px 5px;margin-left:6px;">SERV</span>`
        : '';
      const detalle = esServicio
        ? `${c.cantidad_vendida}x`
        : `${c.productos_distintos} prod.`;
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:600;">${c.categoria}${badge}</span>
            <span>${this.formatCurrency(c.total_ventas)} · ${c.cantidad_vendida} uds (${pct}%)</span>
          </div>
          <div style="background:#ecf0f1;height:24px;border-radius:12px;overflow:hidden;">
            <div style="background:${barColor};height:100%;width:${pct}%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;min-width:${pct > 0 ? '32px' : '0'};">
              ${detalle}
            </div>
          </div>
        </div>`;
    }).join("") || `<p style="color:var(--clr-muted);text-align:center;">Sin datos</p>`;

    card.style.display = cats.length > 0 ? "block" : "none";
  },

  _renderGastoBars(containerId, items, total, colorGrad) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const f = (n) => this.formatCurrency(parseFloat(n) || 0);
    el.innerHTML = (items || []).map(item => {
      const label = item.categoria || item.metodo_pago || "—";
      const pct = total > 0 ? ((parseFloat(item.total) / total) * 100).toFixed(1) : 0;
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:600;">${label}</span>
            <span>${f(item.total)} (${pct}%)</span>
          </div>
          <div style="background:#ecf0f1;height:24px;border-radius:12px;overflow:hidden;">
            <div style="background:${colorGrad};height:100%;width:${pct}%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;min-width:${pct > 0 ? '32px' : '0'};">
              ${item.cantidad}
            </div>
          </div>
        </div>`;
    }).join("") || `<p style="color:var(--clr-muted);text-align:center;">Sin datos</p>`;
  },

  async imprimirCuadre() {
  if (!this._cuadreActual) { Toast.warning("Carga el cuadre primero"); return; }

  const btn = document.getElementById("btnCuadrePrint");
  btn.disabled = true;
  btn.textContent = "Imprimiendo...";
  try {
  const config = window.configuracion || {};
  const impresora = config.nombre_impresora || "Termica";
  const baseURL = window.API_URL || "http://localhost:3000/api";
  const response = await fetch(`${baseURL}/imprimir/cuadre`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cuadre: this._cuadreActual, impresora }),
  });
  const data = await response.json();
  if (data.success) Toast.success("Cuadre enviado a impresora");
  else Toast.error(data.message || "Error al imprimir");
  } catch (e) {
  Toast.error("Error al imprimir: " + e.message);
  } finally {
  btn.disabled = false;
  btn.textContent = "Imprimir Térmica";
  }
  },
};

// Exportar
window.ReportesModule = ReportesModule;
