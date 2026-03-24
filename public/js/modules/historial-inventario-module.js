// ==================== MÓDULO HISTORIAL DE INVENTARIO ====================

const HistorialInventarioModule = {
  _items: [],
  _itemsFiltrados: [],
  _paginator: null,

  // ==================== INIT ====================

  init() {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fmt = (d) => d.toISOString().split("T")[0];

    const desdeEl = document.getElementById("hiFechaDesde");
    const hastaEl = document.getElementById("hiFechaHasta");
    if (desdeEl) desdeEl.value = fmt(primerDiaMes);
    if (hastaEl) hastaEl.value = fmt(hoy);

    this.cargar();
  },

  // ==================== CARGAR ====================

  async cargar() {
    const desde = document.getElementById("hiFechaDesde")?.value || "";
    const hasta = document.getElementById("hiFechaHasta")?.value || "";

    const tbody = document.getElementById("hiTbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#7f8c8d;">Cargando...</td></tr>`;

    try {
      const data = await InventarioAPI.getHistorial(desde || null, hasta || null);
      this._items = Array.isArray(data) ? data : (data.data || []);
      this._itemsFiltrados = this._items;
      this._renderizarCards();
      this.renderizar(this._itemsFiltrados);
    } catch (error) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#e74c3c;">Error al cargar: ${error.message}</td></tr>`;
      Toast.error("Error al cargar historial: " + error.message);
    }
  },

  // ==================== CARDS RESUMEN ====================

  _renderizarCards() {
    const items = this._items;
    const totalProductos = items.length;
    const totalUnidades = items.reduce((s, i) => s + parseInt(i.stock_actual || 0), 0);
    const totalVendido = items.reduce((s, i) => s + parseInt(i.total_vendido || 0), 0);
    const valorInventario = items.reduce((s, i) => s + (parseFloat(i.precio_costo || 0) * parseInt(i.stock_actual || 0)), 0);
    const valorVendido = items.reduce((s, i) => s + parseFloat(i.valor_vendido || 0), 0);

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el("hiCardProductos", totalProductos);
    el("hiCardUnidades", totalUnidades.toLocaleString());
    el("hiCardVendidas", totalVendido.toLocaleString());
    el("hiCardValorInventario", this._fmt(valorInventario));
    el("hiCardValorVendido", this._fmt(valorVendido));
  },

  // ==================== RENDERIZAR TABLA ====================

  renderizar(items) {
    if (!this._paginator) {
      this._paginator = new Paginator("hiTbody", 25);
    }
    this._paginator.render(
      (items || []).map((item) => {
        const stockActual = parseInt(item.stock_actual || 0);
        const vendido = parseInt(item.total_vendido || 0);
        const devuelto = parseInt(item.total_devuelto || 0);
        const stockInicial = parseInt(item.stock_inicial_estimado || 0);
        const imei = item.imei ? `<br><small style="color:#7f8c8d;font-size:11px;">${item.imei}</small>` : "";
        const codigo = item.codigo_barras ? `<br><small style="color:#95a5a6;font-size:11px;">${item.codigo_barras}</small>` : "";

        let stockBadge = "";
        if (stockActual === 0) {
          stockBadge = `<span style="background:#e74c3c;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">0</span>`;
        } else if (stockActual <= 5) {
          stockBadge = `<span style="background:#f39c12;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${stockActual}</span>`;
        } else {
          stockBadge = `<span style="background:#27ae60;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">${stockActual}</span>`;
        }

        return `
          <tr style="border-bottom:1px solid #ecf0f1;">
            <td style="padding:10px;"><strong>${item.nombre}</strong>${codigo}${imei}</td>
            <td style="padding:10px;">${item.categoria || "—"}</td>
            <td style="padding:10px;text-align:center;">${stockInicial}</td>
            <td style="padding:10px;text-align:center;font-weight:600;color:#2980b9;">${vendido > 0 ? vendido : "—"}</td>
            <td style="padding:10px;text-align:center;color:#e67e22;">${devuelto > 0 ? devuelto : "—"}</td>
            <td style="padding:10px;text-align:center;">${stockBadge}</td>
            <td style="padding:10px;text-align:right;">${this._fmt(item.precio_costo)}</td>
            <td style="padding:10px;text-align:right;">${this._fmt(item.precio_venta)}</td>
            <td style="padding:10px;text-align:right;font-weight:600;">${vendido > 0 ? this._fmt(item.valor_vendido) : "—"}</td>
            <td style="padding:10px;text-align:right;">${this._fmt(parseFloat(item.precio_costo || 0) * stockActual)}</td>
            <td style="padding:10px;text-align:center;">
              <button class="btn btn-warning btn-small" onclick="HistorialInventarioModule.abrirEditar(${item.id}, '${(item.nombre || '').replace(/'/g, "\\'")}', ${stockActual}, ${parseFloat(item.precio_costo || 0)}, ${parseFloat(item.precio_venta || 0)})">Editar</button>
            </td>
          </tr>`;
      }),
      `<tr><td colspan="11" style="text-align:center;padding:30px;color:#7f8c8d;">No hay productos registrados</td></tr>`
    );
  },

  // ==================== FILTRAR ====================

  filtrar() {
    const texto = (document.getElementById("hiBuscador")?.value || "").toLowerCase();
    const filtro = document.getElementById("hiFiltroStock")?.value || "todos";

    let items = this._items;

    if (texto) {
      items = items.filter((i) =>
        (i.nombre || "").toLowerCase().includes(texto) ||
        (i.codigo_barras || "").toLowerCase().includes(texto) ||
        (i.imei || "").toLowerCase().includes(texto) ||
        (i.categoria || "").toLowerCase().includes(texto)
      );
    }

    if (filtro === "con_ventas") {
      items = items.filter((i) => parseInt(i.total_vendido || 0) > 0);
    } else if (filtro === "sin_ventas") {
      items = items.filter((i) => parseInt(i.total_vendido || 0) === 0);
    } else if (filtro === "sin_stock") {
      items = items.filter((i) => parseInt(i.stock_actual || 0) === 0);
    } else if (filtro === "con_stock") {
      items = items.filter((i) => parseInt(i.stock_actual || 0) > 0);
    }

    this._itemsFiltrados = items;
    this.renderizar(items);
  },

  // ==================== EDITAR PRODUCTO ====================

  abrirEditar(productoId, nombre, stockActual, precioCosto, precioVenta) {
    const existente = document.getElementById("modalEditarHistorial");
    if (existente) existente.remove();

    const modal = document.createElement("div");
    modal.id = "modalEditarHistorial";
    modal.className = "js-overlay";
    modal.innerHTML = `
      <div class="js-modal" style="max-width:450px;">
        <div class="js-modal-header">
          <h3>Editar Producto</h3>
          <button class="js-modal-close" onclick="HistorialInventarioModule.cerrarEditar()">&times;</button>
        </div>
        <div class="js-modal-body" style="padding:20px;">
          <p style="margin-bottom:15px;font-weight:600;color:#2c3e50;font-size:16px;">${nombre}</p>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-weight:600;margin-bottom:5px;display:block;">Stock Actual:</label>
            <input type="number" id="hiEditStock" value="${stockActual}" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:15px;" />
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-weight:600;margin-bottom:5px;display:block;">Precio Costo:</label>
            <input type="number" id="hiEditCosto" value="${precioCosto}" min="0" step="0.01" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:15px;" />
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-weight:600;margin-bottom:5px;display:block;">Precio Venta:</label>
            <input type="number" id="hiEditVenta" value="${precioVenta}" min="0" step="0.01" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:15px;" />
          </div>
          <div class="form-group" style="margin-bottom:15px;">
            <label style="font-weight:600;margin-bottom:5px;display:block;">Motivo del ajuste:</label>
            <input type="text" id="hiEditMotivo" placeholder="Ej: Corrección de inventario" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:15px;" />
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn btn-secondary" onclick="HistorialInventarioModule.cerrarEditar()">Cancelar</button>
            <button class="btn btn-primary" id="hiBtnGuardar" onclick="HistorialInventarioModule.guardarEditar(${productoId}, ${stockActual})">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  cerrarEditar() {
    const modal = document.getElementById("modalEditarHistorial");
    if (modal) modal.remove();
  },

  async guardarEditar(productoId, stockAnterior) {
    const nuevoStock = parseInt(document.getElementById("hiEditStock")?.value);
    const precioCosto = parseFloat(document.getElementById("hiEditCosto")?.value);
    const precioVenta = parseFloat(document.getElementById("hiEditVenta")?.value);
    const motivo = document.getElementById("hiEditMotivo")?.value || "Ajuste desde historial";

    if (isNaN(nuevoStock) || nuevoStock < 0) {
      Toast.error("El stock debe ser 0 o mayor");
      return;
    }
    if (isNaN(precioVenta) || precioVenta <= 0) {
      Toast.error("El precio de venta debe ser mayor a 0");
      return;
    }

    const btn = document.getElementById("hiBtnGuardar");
    if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }

    try {
      // Ajustar stock si cambió
      if (nuevoStock !== stockAnterior) {
        await InventarioAPI.ajustarInventario(productoId, nuevoStock, motivo);
      }

      // Actualizar precios
      await APIClient.put(`/productos/${productoId}`, await this._getProductoData(productoId, precioCosto, precioVenta, nuevoStock));

      Toast.success("Producto actualizado exitosamente");
      this.cerrarEditar();
      this.cargar();
    } catch (error) {
      Toast.error("Error al guardar: " + error.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Guardar"; }
    }
  },

  async _getProductoData(productoId, precioCosto, precioVenta, stock) {
    // Obtener datos actuales del producto para no perder campos
    const producto = await APIClient.get(`/productos/${productoId}`);
    return {
      codigo_barras: producto.codigo_barras,
      imei: producto.imei,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria_id: producto.categoria_id,
      proveedor_id: producto.proveedor_id,
      precio_costo: precioCosto,
      precio_venta: precioVenta,
      precio_mayoreo: producto.precio_mayoreo,
      cantidad_mayoreo: producto.cantidad_mayoreo,
      stock_actual: stock,
      stock_minimo: producto.stock_minimo,
      stock_maximo: producto.stock_maximo,
      descuento_porcentaje: producto.descuento_porcentaje,
      descuento_monto: producto.descuento_monto,
      disponible: stock > 0,
      costos: producto.costos,
      caracteristicas: producto.caracteristicas,
      factura_proveedor_numero: producto.factura_proveedor_numero,
      factura_proveedor_fecha: producto.factura_proveedor_fecha,
      ncf: producto.ncf,
    };
  },

  // ==================== UTILIDADES ====================

  _fmt(amount) {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount || 0);
  },
};

window.HistorialInventarioModule = HistorialInventarioModule;
