// ==================== MÓDULO GUARDAR MÚLTIPLES PRODUCTOS ====================

const ProductosMultipleModule = {
  _filasCount: 0,

  init() {
    this.actualizarSelectProveedores();
    this.actualizarSelectCategorias();
    if (document.getElementById("tbodyLoteProductos").children.length === 0) {
      this.agregarFila();
    }
  },

  actualizarSelectProveedores() {
    const sel = document.getElementById("loteProveedor");
    if (!sel) return;
    const proveedores = window._proveedores || [];
    sel.innerHTML = `<option value="">Sin proveedor</option>` +
      proveedores.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("");
  },

  actualizarSelectCategorias() {
    const opciones = this._opcionesCategorias();
    document.querySelectorAll(".lote-categoria").forEach((sel) => {
      const val = sel.value;
      sel.innerHTML = opciones;
      sel.value = val;
    });
  },

  _opcionesCategorias() {
    const cats = window._categorias || [];
    return `<option value="">Sin categoría</option>` +
      cats.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("");
  },

  agregarFila() {
    this._filasCount++;
    const id = this._filasCount;
    const tr = document.createElement("tr");
    tr.id = `lote-fila-${id}`;
    tr.innerHTML = `
      <td><input type="text" class="lote-codigo" placeholder="Código de barras" style="width:130px"/></td>
      <td><input type="text" class="lote-nombre" placeholder="Nombre *" required style="width:200px"/></td>
      <td>
        <select class="lote-categoria" style="width:140px">
          ${this._opcionesCategorias()}
        </select>
      </td>
      <td><input type="number" class="lote-costo" step="0.01" min="0" placeholder="0.00" style="width:100px"
            oninput="ProductosMultipleModule.recalcularTotal()"/></td>
      <td><input type="number" class="lote-cantidad" value="1" min="1" style="width:70px"
            oninput="ProductosMultipleModule.recalcularTotal()"/></td>
      <td class="lote-subtotal" style="text-align:right;font-weight:600">$0.00</td>
      <td>
        <button type="button" class="btn btn-danger btn-small" onclick="ProductosMultipleModule.quitarFila(${id})">✕</button>
      </td>
    `;
    document.getElementById("tbodyLoteProductos").appendChild(tr);
  },

  recalcularTotal() {
    let total = 0;
    document.querySelectorAll("#tbodyLoteProductos tr").forEach((tr) => {
      const costo = parseFloat(tr.querySelector(".lote-costo")?.value) || 0;
      const cantidad = parseInt(tr.querySelector(".lote-cantidad")?.value) || 0;
      const subtotal = costo * cantidad;
      const subtotalEl = tr.querySelector(".lote-subtotal");
      if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
      total += subtotal;
    });
    const inputTotal = document.getElementById("loteCostoTotal");
    if (inputTotal) inputTotal.value = total.toFixed(2);
  },

  quitarFila(id) {
    const tr = document.getElementById(`lote-fila-${id}`);
    if (tr) tr.remove();
    if (document.getElementById("tbodyLoteProductos").children.length === 0) {
      this.agregarFila();
    }
    this.recalcularTotal();
  },

  limpiar() {
    document.getElementById("tbodyLoteProductos").innerHTML = "";
    this._filasCount = 0;
    document.getElementById("formProductoLote").reset();
    this.agregarFila();
  },

  async guardar(e) {
    e.preventDefault();

    const filas = document.querySelectorAll("#tbodyLoteProductos tr");
    const productos = [];

    for (const fila of filas) {
      const nombre = fila.querySelector(".lote-nombre").value.trim();
      if (!nombre) continue;
      productos.push({
        codigo_barras: fila.querySelector(".lote-codigo").value.trim() || null,
        nombre,
        categoria_id: parseInt(fila.querySelector(".lote-categoria").value) || null,
        precio_costo: parseFloat(fila.querySelector(".lote-costo").value) || 0,
        stock_actual: parseInt(fila.querySelector(".lote-cantidad").value) || 1,
      });
    }

    if (productos.length === 0) {
      Toast.warning("Agrega al menos un producto con nombre");
      return;
    }

    const costoTotalCalculado = parseFloat(document.getElementById("loteCostoTotal").value) || 0;

    const payload = {
      proveedor_id: parseInt(document.getElementById("loteProveedor").value) || null,
      factura_proveedor_numero: document.getElementById("loteFacturaNumero").value.trim() || null,
      factura_proveedor_fecha: document.getElementById("loteFacturaFecha").value || null,
      ncf: document.getElementById("loteNcf").value.trim() || null,
      costo_total_factura: costoTotalCalculado,
      registrar_como_gasto: document.getElementById("loteRegistrarGasto").checked,
      productos,
    };

    const btnSubmit = document.querySelector('#formProductoLote button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
      const res = await window.API.Productos.createLote(payload);
      const { creados, errores } = res;

      if (creados > 0) {
        Toast.success(`${creados} producto(s) guardado(s) exitosamente`);
        this.limpiar();
        // Actualizar lista de sin-precio
        if (window.actualizarTablaProductosSinPrecio) {
          await actualizarTablaProductosSinPrecio();
        }
      }

      if (errores && errores.length > 0) {
        const msgs = errores.map((e) => `• ${e.nombre}: ${e.error}`).join("\n");
        Toast.error(`${errores.length} producto(s) con error:\n${msgs}`);
      }
    } catch (err) {
      Toast.error(err?.message || "Error al guardar los productos");
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  },
};

window.ProductosMultipleModule = ProductosMultipleModule;
