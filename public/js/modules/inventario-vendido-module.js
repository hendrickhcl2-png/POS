// ==================== MÓDULO INVENTARIO VENDIDO ====================

const InventarioVendidoModule = {
  _items: [],
  _paginator: null,

  // ==================== INIT ====================

  init() {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fmt = (d) => d.toISOString().split("T")[0];

    const desdeEl = document.getElementById("ivFechaDesde");
    const hastaEl = document.getElementById("ivFechaHasta");
    if (desdeEl) desdeEl.value = fmt(primerDiaMes);
    if (hastaEl) hastaEl.value = fmt(hoy);

    this.cargar();
  },

  // ==================== CARGAR ====================

  async cargar() {
    const desde = document.getElementById("ivFechaDesde")?.value || "";
    const hasta = document.getElementById("ivFechaHasta")?.value || "";

    const tbody = document.getElementById("ivTbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#7f8c8d;">Cargando...</td></tr>`;

    try {
      const data = await ProductosAPI.getVendidos(desde || null, hasta || null);
      this._items = Array.isArray(data) ? data : (data.data || []);
      this._renderizarCards();
      this.renderizar(this._items);
    } catch (error) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#e74c3c;">Error al cargar: ${error.message}</td></tr>`;
      Toast.error("Error al cargar inventario vendido: " + error.message);
    }
  },

  // ==================== CARDS RESUMEN ====================

  _renderizarCards() {
    const items = this._items;
    const totalItems = items.length;
    const totalDevueltos = items.filter((i) => parseInt(i.cantidad_devuelta) >= parseInt(i.cantidad)).length;
    const valorVendido = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);

    const elItems = document.getElementById("ivCardItems");
    const elDev = document.getElementById("ivCardDevueltos");
    const elValor = document.getElementById("ivCardValor");
    if (elItems) elItems.textContent = totalItems;
    if (elDev) elDev.textContent = totalDevueltos;
    if (elValor) elValor.textContent = this._fmt(valorVendido);
  },

  // ==================== RENDERIZAR TABLA ====================

  renderizar(items) {
    if (!this._paginator) {
      this._paginator = new Paginator('ivTbody', 20);
    }
    this._paginator.render(
      (items || []).map((item) => {
        const cantVendida = parseInt(item.cantidad);
        const cantDev = parseInt(item.cantidad_devuelta || 0);
        let estadoBadge = "";
        if (cantDev >= cantVendida) {
          estadoBadge = `<span style="background:#e74c3c;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">Devuelto</span>`;
        } else if (cantDev > 0) {
          estadoBadge = `<span style="background:#f39c12;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">Parcial</span>`;
        } else {
          estadoBadge = `<span style="background:#27ae60;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">Vendido</span>`;
        }
        const fecha = item.fecha ? item.fecha.split("T")[0] : "";
        const imei = item.imei ? `<br><small style="color:#7f8c8d;font-size:11px;">${item.imei}</small>` : "";
        return `
          <tr style="border-bottom:1px solid #ecf0f1;">
            <td style="padding:10px;font-family:monospace;font-size:13px;">${item.numero_ticket || "—"}</td>
            <td style="padding:10px;">${fecha}</td>
            <td style="padding:10px;"><strong>${item.nombre_producto}</strong>${imei}</td>
            <td style="padding:10px;text-align:center;">${cantVendida}</td>
            <td style="padding:10px;text-align:center;">${cantDev > 0 ? cantDev : "—"}</td>
            <td style="padding:10px;text-align:right;">${this._fmt(item.precio_unitario)}</td>
            <td style="padding:10px;text-align:right;font-weight:600;">${this._fmt(item.subtotal)}</td>
            <td style="padding:10px;">${item.cliente_nombre && item.cliente_nombre.trim() ? item.cliente_nombre : "General"}</td>
            <td style="padding:10px;text-align:center;">${item.metodo_pago || "—"}</td>
            <td style="padding:10px;text-align:center;">${estadoBadge}</td>
          </tr>`;
      }),
      `<tr><td colspan="10" style="text-align:center;padding:30px;color:#7f8c8d;">No hay registros para el período seleccionado</td></tr>`
    );
  },

  // ==================== FILTRAR (client-side) ====================

  filtrar() {
    const texto = (document.getElementById("ivBuscador")?.value || "").toLowerCase();
    if (!texto) {
      this.renderizar(this._items);
      return;
    }
    const filtrados = this._items.filter((i) =>
      (i.nombre_producto || "").toLowerCase().includes(texto) ||
      (i.numero_ticket || "").toLowerCase().includes(texto) ||
      (i.cliente_nombre || "").toLowerCase().includes(texto) ||
      (i.imei || "").toLowerCase().includes(texto)
    );
    this.renderizar(filtrados);
  },

  // ==================== UTILIDADES ====================

  _fmt(amount) {
    return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount || 0);
  },
};

window.InventarioVendidoModule = InventarioVendidoModule;
