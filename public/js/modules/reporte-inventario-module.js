// ==================== MÓDULO REPORTE INVENTARIO ====================

const ReporteInventarioModule = {
  _datos: [],
  _filtrados: [],
  _initialized: false,
  _paginator: null,

  async init() {
    if (!this._initialized) {
      this._setupEventListeners();
      this._initialized = true;
    }
    await this.cargar();
  },

  _setupEventListeners() {
    const busqueda = document.getElementById("invReporteBusqueda");
    const categoria = document.getElementById("invReporteCategoria");
    const btnExportar = document.getElementById("invReporteBtnExportar");

    if (busqueda) busqueda.addEventListener("input", () => this._aplicarFiltros());
    if (categoria) categoria.addEventListener("change", () => this._aplicarFiltros());
    if (btnExportar) btnExportar.addEventListener("click", () => this._exportarCSV());
  },

  async cargar() {
    const loader = document.getElementById("invReporteLoader");
    const tabla = document.getElementById("invReporteTablaWrap");
    if (loader) loader.style.display = "flex";
    if (tabla) tabla.style.display = "none";

    try {
      const data = await ReportesAPI.getReporteInventario();
      this._datos = Array.isArray(data) ? data : (data.data || []);
      this._filtrados = [...this._datos];
      this._poblarCategorias();
      this._renderizar();
    } catch (e) {
      Toast.error("Error al cargar el reporte de inventario");
    } finally {
      if (loader) loader.style.display = "none";
      if (tabla) tabla.style.display = "";
    }
  },

  _poblarCategorias() {
    const sel = document.getElementById("invReporteCategoria");
    if (!sel) return;
    const cats = [...new Set(this._datos.map((p) => p.categoria).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">Todas las categorías</option>`;
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  },

  _aplicarFiltros() {
    const busq = (document.getElementById("invReporteBusqueda")?.value || "").toLowerCase();
    const cat = document.getElementById("invReporteCategoria")?.value || "";

    this._filtrados = this._datos.filter((p) => {
      const matchCat = !cat || p.categoria === cat;
      const matchBusq =
        !busq ||
        p.nombre.toLowerCase().includes(busq) ||
        (p.codigo_barras || "").toLowerCase().includes(busq) ||
        (p.imei || "").toLowerCase().includes(busq);
      return matchCat && matchBusq;
    });

    this._renderizar();
  },

  _actualizarResumen() {
    // Siempre muestra totales del inventario completo (no filtrado)
    const costoTotal = this._datos.reduce((sum, p) => {
      return sum + (parseFloat(p.costo_total) || 0) * (parseInt(p.stock_actual) || 0);
    }, 0);
    const valorVenta = this._datos.reduce((sum, p) => {
      return sum + (parseFloat(p.precio_efectivo) || 0) * (parseInt(p.stock_actual) || 0);
    }, 0);
    const unidades = this._datos.reduce((sum, p) => sum + (parseInt(p.stock_actual) || 0), 0);

    const ganancia = valorVenta - costoTotal;

    const elCosto = document.getElementById("invResumenCostoTotal");
    const elProductos = document.getElementById("invResumenTotalProductos");
    const elUnidades = document.getElementById("invResumenUnidades");
    const elValorVenta = document.getElementById("invResumenValorVenta");
    const elGanancia = document.getElementById("invResumenGanancia");

    if (elCosto) elCosto.textContent = Formatters.formatCurrency(costoTotal);
    if (elProductos) elProductos.textContent = this._datos.length;
    if (elUnidades) elUnidades.textContent = unidades;
    if (elValorVenta) elValorVenta.textContent = Formatters.formatCurrency(valorVenta);
    if (elGanancia) {
      elGanancia.textContent = Formatters.formatCurrency(ganancia);
      elGanancia.style.color = ganancia >= 0 ? "var(--clr-success)" : "var(--clr-danger)";
    }
  },

  _renderizar() {
    const tbody = document.getElementById("invReporteTbody");
    const conteo = document.getElementById("invReporteConteo");
    if (!tbody) return;

    this._actualizarResumen();
    if (conteo) conteo.textContent = `${this._filtrados.length} producto(s)`;

    if (!this._paginator) this._paginator = new Paginator('invReporteTbody', 20);
    this._paginator.render(
      this._filtrados.map((p) => {
        const codigo = p.imei ? p.imei : (p.codigo_barras || "—");
        const tieneImei = !!p.imei;
        const costo = parseFloat(p.costo_total) || 0;
        const precio = parseFloat(p.precio_efectivo) || 0;
        const tieneDescuento =
          parseFloat(p.descuento_porcentaje) > 0 || parseFloat(p.descuento_monto) > 0;
        const disponible = p.disponible;
        const stock = parseInt(p.stock_actual) || 0;
        const bajStock = p.stock_minimo && stock <= parseInt(p.stock_minimo) && stock > 0;
        const sinStock = stock === 0;

        return `<tr>
          <td>
            <span class="inv-codigo${tieneImei ? " inv-codigo--imei" : ""}">${codigo}</span>
            ${tieneImei ? `<span class="inv-badge-imei">IMEI</span>` : ""}
          </td>
          <td class="inv-nombre">${p.nombre}${p.categoria ? `<span class="inv-categoria">${p.categoria}</span>` : ""}</td>
          <td class="inv-monto">${Formatters.formatCurrency(costo)}</td>
          <td class="inv-monto">
            ${Formatters.formatCurrency(precio)}
            ${tieneDescuento ? `<span class="inv-badge-desc">${parseFloat(p.descuento_porcentaje) > 0 ? `-${parseFloat(p.descuento_porcentaje)}%` : `-${Formatters.formatCurrency(parseFloat(p.descuento_monto))}`}</span>` : ""}
          </td>
          <td>
            <span class="inv-disponible inv-disponible--${disponible ? "si" : "no"}">${disponible ? "Sí" : "No"}</span>
          </td>
          <td>
            <span class="inv-stock${sinStock ? " inv-stock--cero" : bajStock ? " inv-stock--bajo" : ""}">${stock}</span>
          </td>
          <td style="color:var(--text-muted);font-size:0.85rem">${p.creado_por || "—"}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-warning btn-small" onclick="editarProducto(${p.id})" style="margin-right:4px">Editar</button>
            <button class="btn btn-danger btn-small" onclick="ReporteInventarioModule._confirmarEliminar(${p.id}, '${(p.nombre || "").replace(/'/g, "\\'")}')">Eliminar</button>
          </td>
        </tr>`;
      }),
      `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem">Sin resultados</td></tr>`
    );
  },

  async _confirmarEliminar(id, nombre) {
    if (!confirm(`¿Eliminar permanentemente "${nombre}"?\n\nEsto borrará el producto y su código del sistema. Esta acción NO se puede deshacer.`)) return;

    try {
      await window.API.Productos.forceDelete(id);
      this._datos = this._datos.filter((p) => p.id !== id);
      this._filtrados = this._filtrados.filter((p) => p.id !== id);
      this._renderizar();
      Toast.success(`"${nombre}" eliminado permanentemente`);
    } catch (e) {
      const msg = e?.message || "Error al eliminar el producto";
      Toast.error(msg);
    }
  },

  _exportarCSV() {
    if (!this._filtrados.length) {
      Toast.warning("No hay datos para exportar");
      return;
    }

    const headers = ["Codigo/IMEI", "Descripcion", "Categoria", "Costo Total", "Precio Venta", "Disponible", "Cantidad", "Agregado por"];
    const filas = this._filtrados.map((p) => [
      p.imei || p.codigo_barras || "",
      `"${(p.nombre || "").replace(/"/g, '""')}"`,
      p.categoria || "",
      parseFloat(p.costo_total) || 0,
      parseFloat(p.precio_efectivo) || 0,
      p.disponible ? "Si" : "No",
      p.stock_actual || 0,
      p.creado_por || "",
    ]);

    // Calcular resumen sobre los datos completos (no filtrados)
    const costoTotal = this._datos.reduce((sum, p) => sum + (parseFloat(p.costo_total) || 0) * (parseInt(p.stock_actual) || 0), 0);
    const valorVenta = this._datos.reduce((sum, p) => sum + (parseFloat(p.precio_efectivo) || 0) * (parseInt(p.stock_actual) || 0), 0);
    const unidades   = this._datos.reduce((sum, p) => sum + (parseInt(p.stock_actual) || 0), 0);
    const ganancia   = valorVenta - costoTotal;

    const resumen = [
      [],
      ["=== RESUMEN DEL INVENTARIO ==="],
      ["Total de Productos", this._datos.length],
      ["Unidades en Stock", unidades],
      ["Costo Total del Inventario", costoTotal.toFixed(2)],
      ["Valor Total de Venta", valorVenta.toFixed(2)],
      ["Ganancia Potencial", ganancia.toFixed(2)],
    ];

    const csv = [
      headers.join(","),
      ...filas.map((f) => f.join(",")),
      ...resumen.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-inventario-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

window.ReporteInventarioModule = ReporteInventarioModule;
