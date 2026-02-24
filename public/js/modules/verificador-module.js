// ==================== MÓDULO VERIFICADOR DE PRECIOS ====================

const VerificadorModule = {

  init() {
    const input = document.getElementById("verificadorInput");
    if (!input) return;

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.buscar();
      }
    });
  },

  // ==================== ESCANEAR ====================

  escanear() {
    const field = document.getElementById("verificadorInput");
    if (!field) return;

    const prev = field.placeholder;
    field.value = "";
    field.focus();
    field.classList.add("scanning-mode");
    field.placeholder = "Listo — escanee el código...";

    const onEnter = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      field.classList.remove("scanning-mode");
      field.placeholder = prev;
      field.removeEventListener("keydown", onEnter);
      field.removeEventListener("blur", onBlur);
      this.buscar();
    };

    const onBlur = () => {
      field.classList.remove("scanning-mode");
      field.placeholder = prev;
      field.removeEventListener("keydown", onEnter);
    };

    field.addEventListener("keydown", onEnter);
    field.addEventListener("blur", onBlur, { once: true });
  },

  // ==================== BUSCAR ====================

  async buscar() {
    const input = document.getElementById("verificadorInput");
    const resultado = document.getElementById("verificadorResultado");
    if (!input || !resultado) return;

    const query = input.value.trim();
    if (!query) return;

    resultado.style.display = "block";
    resultado.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--clr-muted);">
        Buscando...
      </div>`;

    try {
      const productos = await API.Productos.search(query);

      if (productos.length === 0) {
        resultado.innerHTML = this.renderNoEncontrado(query);
        input.value = "";
        input.focus();
        return;
      }

      if (productos.length === 1) {
        resultado.innerHTML = this.renderProducto(productos[0]);
      } else {
        resultado.innerHTML = this.renderMultiples(productos);
      }

      input.value = "";
      input.focus();
    } catch (error) {
      console.error("Error en verificador:", error);
      resultado.innerHTML = `
        <div class="card" style="border-left:4px solid var(--clr-danger);padding:20px;">
          <p style="color:var(--clr-danger);margin:0;">Error al buscar el producto.</p>
        </div>`;
    }
  },

  // ==================== MOSTRAR PRODUCTO ====================

  renderProducto(p) {
    const descPct  = parseFloat(p.descuento_porcentaje || 0);
    const descMonto = parseFloat(p.descuento_monto || 0);
    const precio   = parseFloat(p.precio_venta);

    let precioFinal = precio;
    if (descPct > 0)   precioFinal = precio * (1 - descPct / 100);
    if (descMonto > 0) precioFinal = precioFinal - descMonto;

    const tieneDescuento = descPct > 0 || descMonto > 0;

    const stockColor = p.stock_actual <= 0
      ? "var(--clr-danger)"
      : p.stock_actual <= (p.stock_minimo || 3)
        ? "var(--clr-warning)"
        : "var(--clr-success)";

    const stockLabel = p.stock_actual <= 0
      ? "Sin stock"
      : p.stock_actual <= (p.stock_minimo || 3)
        ? `Stock bajo (${p.stock_actual})`
        : `En stock (${p.stock_actual})`;

    return `
      <div class="card" style="border-left:5px solid ${tieneDescuento ? "var(--clr-warning)" : "var(--clr-success)"};padding:24px;">

        <!-- Nombre y categoría -->
        <div style="margin-bottom:18px;">
          <h2 style="margin:0 0 6px 0;font-size:22px;color:var(--clr-dark);">${p.nombre}</h2>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            ${p.categoria_nombre
              ? `<span style="background:var(--clr-bg-surface);border:1px solid var(--clr-border);padding:3px 10px;border-radius:12px;font-size:12px;color:var(--clr-muted);">${p.categoria_nombre}</span>`
              : ""}
            <span style="background:${stockColor};color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${stockLabel}</span>
            ${p.codigo_barras || p.imei
              ? `<span style="font-size:12px;color:var(--clr-muted);">${p.codigo_barras || p.imei}</span>`
              : ""}
          </div>
        </div>

        <!-- Precio -->
        <div style="background:var(--clr-bg-surface);border-radius:10px;padding:20px;text-align:center;">
          ${tieneDescuento ? `
            <div style="margin-bottom:8px;">
              <span style="background:var(--clr-warning);color:white;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;">
                ${descPct > 0 ? `${descPct}% DESCUENTO` : ""}
                ${descMonto > 0 ? `- ${this.formatCurrency(descMonto)}` : ""}
              </span>
            </div>
            <div style="font-size:16px;color:var(--clr-muted);text-decoration:line-through;margin-bottom:4px;">
              ${this.formatCurrency(precio)}
            </div>
            <div style="font-size:42px;font-weight:800;color:var(--clr-success);line-height:1;">
              ${this.formatCurrency(precioFinal)}
            </div>
            <div style="font-size:12px;color:var(--clr-muted);margin-top:6px;">
              Precio con descuento
            </div>
          ` : `
            <div style="font-size:42px;font-weight:800;color:var(--clr-success);line-height:1;">
              ${this.formatCurrency(precio)}
            </div>
            <div style="font-size:12px;color:var(--clr-muted);margin-top:6px;">
              Precio regular
            </div>
          `}
        </div>

        ${p.descripcion ? `
          <p style="margin:14px 0 0 0;font-size:13px;color:var(--clr-muted);font-style:italic;">${p.descripcion}</p>
        ` : ""}
      </div>`;
  },

  // ==================== MÚLTIPLES RESULTADOS ====================

  renderMultiples(productos) {
    const items = productos.map(p => {
      const descPct   = parseFloat(p.descuento_porcentaje || 0);
      const descMonto = parseFloat(p.descuento_monto || 0);
      const precio    = parseFloat(p.precio_venta);
      let precioFinal = precio;
      if (descPct > 0)    precioFinal = precio * (1 - descPct / 100);
      if (descMonto > 0)  precioFinal -= descMonto;
      const tieneDescuento = descPct > 0 || descMonto > 0;

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--clr-border);">
          <div>
            <strong style="font-size:14px;">${p.nombre}</strong>
            <br><small style="color:var(--clr-muted);">${p.codigo_barras || p.imei || "—"}</small>
          </div>
          <div style="text-align:right;">
            ${tieneDescuento
              ? `<span style="text-decoration:line-through;color:var(--clr-muted);font-size:12px;">${this.formatCurrency(precio)}</span><br>
                 <strong style="color:var(--clr-success);font-size:18px;">${this.formatCurrency(precioFinal)}</strong>
                 <span style="background:var(--clr-warning);color:white;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:4px;">${descPct > 0 ? `-${descPct}%` : `-${this.formatCurrency(descMonto)}`}</span>`
              : `<strong style="color:var(--clr-success);font-size:18px;">${this.formatCurrency(precio)}</strong>`
            }
          </div>
        </div>`;
    }).join("");

    return `
      <div class="card" style="padding:20px;">
        <p style="margin:0 0 12px 0;font-size:13px;color:var(--clr-muted);">
          Se encontraron ${productos.length} productos:
        </p>
        ${items}
      </div>`;
  },

  // ==================== NO ENCONTRADO ====================

  renderNoEncontrado(query) {
    return `
      <div class="card" style="border-left:4px solid var(--clr-warning);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:10px;">🔍</div>
        <p style="margin:0;font-size:16px;font-weight:600;color:var(--clr-dark);">Producto no encontrado</p>
        <p style="margin:6px 0 0 0;font-size:13px;color:var(--clr-muted);">"${query}"</p>
      </div>`;
  },

  // ==================== UTILIDADES ====================

  formatCurrency(amount) {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount);
  },
};

window.VerificadorModule = VerificadorModule;
