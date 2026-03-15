// ==================== MÓDULO FACTURAS DE PROVEEDORES ====================

const FacturasProveedoresModule = {
  _data: [],

  async cargar() {
    const tbody = document.getElementById("tablaFacturasProveedores");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="text-center tabla-cargando">Cargando...</td></tr>`;

    try {
      this._data = await window.API.Proveedores.getFacturas(null);
      this._renderFiltrado();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">Error al cargar facturas</td></tr>`;
    }
  },

  _renderFiltrado() {
    const tbody = document.getElementById("tablaFacturasProveedores");
    if (!tbody) return;

    const q = (document.getElementById("facturasBusqueda")?.value || "").toLowerCase().trim();
    const data = q
      ? this._data.filter((f) =>
          (f.numero || "").toLowerCase().includes(q) ||
          (f.proveedor_nombre || "").toLowerCase().includes(q)
        )
      : this._data;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center tabla-vacia-mensaje">${q ? "No se encontraron facturas" : "No hay facturas registradas"}</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((f) => {
      const fecha = f.fecha ? new Date(f.fecha + "T00:00:00").toLocaleDateString("es-DO") : "—";
      const costo = parseFloat(f.total_costo) || 0;
      return `
        <tr>
          <td><strong>${f.numero}</strong></td>
          <td>${f.proveedor_nombre || '<span style="color:var(--text-muted)">Sin proveedor</span>'}</td>
          <td>${fecha}</td>
          <td>${f.ncf || "—"}</td>
          <td style="text-align:center">${f.cantidad_productos}</td>
          <td style="font-weight:600;color:var(--clr-danger)">$${costo.toFixed(2)}</td>
          <td>
            <button class="btn btn-info btn-small"
              onclick="FacturasProveedoresModule.verDetalle('${f.numero.replace(/'/g, "\\'")}', '${(f.proveedor_nombre || "").replace(/'/g, "\\'")}', '${f.fecha || ""}')">
              Ver productos
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  filtrarPorProveedor(nombre) {
    const input = document.getElementById("facturasBusqueda");
    if (input) input.value = nombre;
    this._renderFiltrado();
    document.getElementById("tablaFacturasProveedores")
      ?.closest(".card")
      ?.scrollIntoView({ behavior: "smooth" });
  },

  async verDetalle(numero, proveedor, fecha) {
    const modal = document.getElementById("modalDetalleFactura");
    const titulo = document.getElementById("modalFacturaTitulo");
    const contenido = document.getElementById("modalFacturaContenido");
    if (!modal) return;

    const fechaStr = fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-DO") : "";
    titulo.textContent = `Factura ${numero}${proveedor ? " — " + proveedor : ""}${fechaStr ? " (" + fechaStr + ")" : ""}`;
    contenido.innerHTML = `<p style="color:var(--text-muted)">Cargando productos...</p>`;
    modal.style.display = "flex";

    try {
      const productos = await window.API.Proveedores.getProductosFactura(numero);

      if (!productos || productos.length === 0) {
        contenido.innerHTML = `<p style="color:var(--text-muted)">No se encontraron productos.</p>`;
        return;
      }

      const totalCosto = productos.reduce((s, p) => s + parseFloat(p.precio_costo || 0), 0);
      const totalVenta = productos.reduce((s, p) => s + parseFloat(p.precio_venta || 0), 0);

      contenido.innerHTML = `
        <div class="tabla-scroll-horizontal">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Costo</th>
                <th>Precio Venta</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              ${productos.map((p) => `
                <tr>
                  <td>${p.codigo_barras || p.imei || "—"}</td>
                  <td>${p.nombre}</td>
                  <td>${p.categoria_nombre || "—"}</td>
                  <td>$${parseFloat(p.precio_costo || 0).toFixed(2)}</td>
                  <td>${parseFloat(p.precio_venta || 0) > 0 ? "$" + parseFloat(p.precio_venta).toFixed(2) : '<span style="color:var(--clr-warning)">Sin precio</span>'}</td>
                  <td>${p.stock_actual}</td>
                </tr>
              `).join("")}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;background:var(--clr-bg-page)">
                <td colspan="3">Total (${productos.length} productos)</td>
                <td>$${totalCosto.toFixed(2)}</td>
                <td>${totalVenta > 0 ? "$" + totalVenta.toFixed(2) : "—"}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } catch (e) {
      contenido.innerHTML = `<p style="color:var(--clr-danger)">Error al cargar productos.</p>`;
    }
  },

  // Kept for backwards compatibility (called from index.js)
  actualizarFiltroProveedores() {},
};

window.FacturasProveedoresModule = FacturasProveedoresModule;
