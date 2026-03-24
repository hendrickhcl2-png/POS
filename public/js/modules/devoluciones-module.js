// ==================== MÓDULO DE DEVOLUCIONES ====================

const DevolucionModule = {
  facturaActual: null,
  itemsSeleccionados: [],
  metodoDevolucion: null, // 'cambio' o 'reembolso'
  metodoReembolso: null, // 'efectivo' o 'transferencia'
  productoCambio: null, // producto seleccionado para cambio
  productoCambioCantidad: 1,
  productosDisponibles: [], // lista de productos para buscar en cambio

  // ==================== MOSTRAR MODAL DE DEVOLUCIÓN ====================

  async mostrarModal(facturaId) {
    try {
      const response = await FacturacionAPI.getById(facturaId);
      this.facturaActual = response.data || response;

      if (!this.facturaActual.items || this.facturaActual.items.length === 0) {
        Toast.warning("Esta factura no tiene items para devolver");
        return;
      }

      this.itemsSeleccionados = [];
      this.metodoDevolucion = null;
      this.metodoReembolso = null;
      this.productoCambio = null;
      this.productoCambioCantidad = 1;
      this.renderizarModal();
    } catch (error) {
      console.error("Error al cargar factura:", error);
      Toast.error("Error al cargar factura: " + error.message);
    }
  },

  renderizarModal() {
    const modalExistente = document.getElementById("modalDevolucion");
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement("div");
    modal.id = "modalDevolucion";
    modal.className = "js-overlay";
    modal.style.cssText = "overflow-y:auto;padding:20px;";

    modal.innerHTML = `
    <div class="js-modal js-modal--xl">

    <!-- HEADER -->
    <div class="js-modal__hdr js-modal__hdr--danger">
    <div>
    <h2 style="margin:0;font-size:24px;">Procesar Devolución</h2>
    <p style="margin:5px 0 0 0;font-size:14px;opacity:0.9;">Factura: ${this.facturaActual.numero_factura}</p>
    </div>
    <button
    onclick="DevolucionModule.cerrar()"
    class="js-modal__close">
    &times;
    </button>
    </div>

    <!-- BODY -->
    <div class="js-modal__body">

    <!-- INFO DE LA FACTURA -->
    <div class="info-panel">
    <div class="info-grid">
    <div>
    <strong style="color:#7f8c8d;font-size:13px;">Cliente:</strong><br>
    <span style="font-size:15px;">${this.facturaActual.cliente_nombre || "Cliente General"}</span>
    </div>
    <div>
    <strong style="color:#7f8c8d;font-size:13px;">Fecha:</strong><br>
    <span style="font-size:15px;">${this.formatFecha(this.facturaActual.fecha)}</span>
    </div>
    <div>
    <strong style="color:#7f8c8d;font-size:13px;">Total Factura:</strong><br>
    <span style="font-size:15px;font-weight:600;color:#27ae60;">${this.formatCurrency(this.facturaActual.total)}</span>
    </div>
    </div>
    </div>

    <!-- INSTRUCCIONES -->
    <div class="info-panel info-panel--warning">
    <strong style="color:#856404;">Instrucciones:</strong>
    <p style="margin:5px 0 0 0;color:#856404;font-size:14px;">
    1. Seleccione los productos a devolver. 2. Elija el tipo de devolución: cambio de producto o reembolso.
    </p>
    </div>

    <!-- TABLA DE ITEMS -->
    <h3 style="margin:0 0 15px 0;">Productos de la factura:</h3>
    <div class="tbl-scroll">
    <table style="width:100%;border-collapse:collapse;">
    <thead>
    <tr style="background:#2c3e50;color:white;">
    <th style="padding:12px;text-align:center;width:60px;">
    <input
    type="checkbox"
    id="selectAll"
    onchange="DevolucionModule.seleccionarTodos(this.checked)"
    style="width:18px;height:18px;cursor:pointer;">
    </th>
    <th style="padding:12px;text-align:left;">Producto</th>
    <th style="padding:12px;text-align:center;">Cant. Comprada</th>
    <th style="padding:12px;text-align:center;">Ya Devuelto</th>
    <th style="padding:12px;text-align:center;">Disponible</th>
    <th style="padding:12px;text-align:center;">Cant. a Devolver</th>
    <th style="padding:12px;text-align:right;">Precio Unit.</th>
    <th style="padding:12px;text-align:right;">Subtotal</th>
    </tr>
    </thead>
    <tbody>
    ${this.facturaActual.items
      .map((item, index) => {
        const cantidadDisponible = item.cantidad - (item.cantidad_devuelta || 0);
        const deshabilitado = cantidadDisponible <= 0;

        return `
    <tr style="border-bottom:1px solid #ecf0f1;${deshabilitado ? "opacity:0.5;background:#f8f9fa;" : ""}">
    <td style="padding:12px;text-align:center;">
    <input
    type="checkbox"
    id="item_${item.id}"
    data-index="${index}"
    onchange="DevolucionModule.toggleItem(${index}, this.checked)"
    ${deshabilitado ? "disabled" : ""}
    style="width:18px;height:18px;cursor:pointer;">
    </td>
    <td style="padding:12px;">
    <strong>${item.nombre_producto}</strong><br>
    <small style="color:#7f8c8d;">${item.codigo_producto || ""}</small>
    </td>
    <td style="padding:12px;text-align:center;font-weight:600;">${item.cantidad}</td>
    <td style="padding:12px;text-align:center;color:#e74c3c;">${item.cantidad_devuelta || 0}</td>
    <td style="padding:12px;text-align:center;font-weight:600;color:${deshabilitado ? "#95a5a6" : "#27ae60"};">
    ${cantidadDisponible}
    </td>
    <td style="padding:12px;text-align:center;">
    <input
    type="number"
    id="cantidad_${index}"
    min="1"
    max="${cantidadDisponible}"
    value="${cantidadDisponible}"
    ${deshabilitado ? "disabled" : ""}
    style="width:80px;padding:8px;border:2px solid #3498db;border-radius:5px;text-align:center;font-weight:600;"
    onchange="DevolucionModule.actualizarCantidad(${index}, this.value)">
    </td>
    <td style="padding:12px;text-align:right;">${this.formatCurrency(item.precio_unitario)}</td>
    <td style="padding:12px;text-align:right;font-weight:600;" id="subtotal_${index}">
    ${this.formatCurrency(item.precio_unitario * cantidadDisponible)}
    </td>
    </tr>
    `;
      })
      .join("")}
    </tbody>
    </table>
    </div>

    <!-- RESUMEN DE DEVOLUCIÓN -->
    <div style="margin-top:20px;background:#f0f7ff;border:2px solid #3498db;border-radius:8px;padding:20px;">
    <h3 style="margin:0 0 15px 0;color:#2c3e50;">Resumen de Devolución</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:15px;">
    <div style="text-align:center;">
    <strong style="color:#7f8c8d;font-size:13px;">Items Seleccionados:</strong><br>
    <span id="itemsCount" style="font-size:24px;font-weight:bold;color:#3498db;">0</span>
    </div>
    <div style="text-align:center;">
    <strong style="color:#7f8c8d;font-size:13px;">Unidades Totales:</strong><br>
    <span id="unidadesTotal" style="font-size:24px;font-weight:bold;color:#9b59b6;">0</span>
    </div>
    <div style="text-align:center;">
    <strong style="color:#7f8c8d;font-size:13px;">Monto Devolución:</strong><br>
    <span id="montoTotal" style="font-size:24px;font-weight:bold;color:#27ae60;">RD$0.00</span>
    </div>
    </div>
    </div>

    <!-- TIPO DE DEVOLUCIÓN -->
    <div id="seccionTipoDevolucion" style="margin-top:25px;">
    <h3 style="margin:0 0 15px 0;color:#2c3e50;">Tipo de Devolución</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">

    <!-- OPCIÓN: CAMBIO -->
    <div id="opcionCambio" onclick="DevolucionModule.seleccionarMetodo('cambio')"
    style="border:3px solid #bdc3c7;border-radius:10px;padding:20px;cursor:pointer;transition:all 0.3s;text-align:center;">
    <div style="font-size:36px;margin-bottom:10px;">&#x1F504;</div>
    <h4 style="margin:0 0 8px 0;color:#2c3e50;">Cambio de Producto</h4>
    <p style="margin:0;color:#7f8c8d;font-size:13px;">Devolver el equipo y seleccionar otro producto. El cliente paga la diferencia si aplica.</p>
    </div>

    <!-- OPCIÓN: REEMBOLSO -->
    <div id="opcionReembolso" onclick="DevolucionModule.seleccionarMetodo('reembolso')"
    style="border:3px solid #bdc3c7;border-radius:10px;padding:20px;cursor:pointer;transition:all 0.3s;text-align:center;">
    <div style="font-size:36px;margin-bottom:10px;">&#x1F4B0;</div>
    <h4 style="margin:0 0 8px 0;color:#2c3e50;">Reembolso</h4>
    <p style="margin:0;color:#7f8c8d;font-size:13px;">Devolver el dinero al cliente en efectivo o por transferencia bancaria.</p>
    </div>

    </div>
    </div>

    <!-- SECCIÓN CAMBIO DE PRODUCTO (oculta inicialmente) -->
    <div id="seccionCambio" style="display:none;margin-top:20px;background:#eafaf1;border:2px solid #27ae60;border-radius:8px;padding:20px;">
    <h3 style="margin:0 0 15px 0;color:#27ae60;">Seleccionar Producto de Cambio</h3>

    <div style="margin-bottom:15px;">
    <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Buscar producto:</label>
    <input
    type="text"
    id="buscarProductoCambio"
    placeholder="Escriba el nombre o código del producto..."
    oninput="DevolucionModule.buscarProductoCambio(this.value)"
    style="width:100%;padding:12px;border:2px solid #27ae60;border-radius:5px;font-size:14px;">
    </div>

    <div id="resultadosProductoCambio" style="max-height:250px;overflow-y:auto;margin-bottom:15px;">
    </div>

    <!-- Producto seleccionado para cambio -->
    <div id="productoCambioSeleccionado" style="display:none;background:white;border:2px solid #27ae60;border-radius:8px;padding:15px;margin-bottom:15px;">
    </div>

    <!-- Resumen del cambio -->
    <div id="resumenCambio" style="display:none;background:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:15px;">
    </div>
    </div>

    <!-- SECCIÓN REEMBOLSO (oculta inicialmente) -->
    <div id="seccionReembolso" style="display:none;margin-top:20px;background:#fff3e0;border:2px solid #ff9800;border-radius:8px;padding:20px;">
    <h3 style="margin:0 0 15px 0;color:#e65100;">Método de Reembolso</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">

    <!-- EFECTIVO -->
    <div id="opcionEfectivo" onclick="DevolucionModule.seleccionarMetodoReembolso('efectivo')"
    style="border:3px solid #bdc3c7;border-radius:10px;padding:20px;cursor:pointer;transition:all 0.3s;text-align:center;">
    <div style="font-size:30px;margin-bottom:8px;">&#x1F4B5;</div>
    <h4 style="margin:0 0 5px 0;color:#2c3e50;">Efectivo</h4>
    <p style="margin:0;color:#7f8c8d;font-size:13px;">Devolver el dinero en efectivo</p>
    </div>

    <!-- TRANSFERENCIA -->
    <div id="opcionTransferencia" onclick="DevolucionModule.seleccionarMetodoReembolso('transferencia')"
    style="border:3px solid #bdc3c7;border-radius:10px;padding:20px;cursor:pointer;transition:all 0.3s;text-align:center;">
    <div style="font-size:30px;margin-bottom:8px;">&#x1F3E6;</div>
    <h4 style="margin:0 0 5px 0;color:#2c3e50;">Transferencia</h4>
    <p style="margin:0;color:#7f8c8d;font-size:13px;">Devolver el dinero por transferencia bancaria</p>
    </div>

    </div>

    <!-- Campo de referencia de transferencia (oculto inicialmente) -->
    <div id="campoReferencia" style="display:none;margin-top:15px;">
    <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">
    Número de referencia de la transferencia: <span style="color:#e74c3c;">*</span>
    </label>
    <input
    type="text"
    id="referenciaTransferencia"
    placeholder="Ej: TRF-123456789"
    style="width:100%;padding:12px;border:2px solid #ff9800;border-radius:5px;font-size:14px;">
    </div>
    </div>

    <!-- MOTIVO -->
    <div style="margin-top:20px;">
    <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">
    Motivo de la devolución: <span style="color:#e74c3c;">*</span>
    </label>
    <textarea
    id="motivoDevolucion"
    rows="3"
    placeholder="Ej: Producto defectuoso, talla incorrecta, cambio de opinión..."
    style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;resize:vertical;"
    ></textarea>
    </div>

    <!-- NOTAS ADICIONALES -->
    <div style="margin-top:15px;">
    <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">
    Notas adicionales (opcional):
    </label>
    <textarea
    id="notasDevolucion"
    rows="2"
    placeholder="Información adicional sobre la devolución..."
    style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;resize:vertical;"
    ></textarea>
    </div>

    <!-- BOTONES -->
    <div class="js-modal__actions" style="margin-top:30px;gap:15px;">
    <button
    onclick="DevolucionModule.cerrar()"
    style="background:#95a5a6;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;font-weight:600;">
    Cancelar
    </button>
    <button
    id="btnProcesarDevolucion"
    onclick="DevolucionModule.procesarDevolucion()"
    style="background:#e74c3c;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;font-weight:600;">
    Procesar Devolución
    </button>
    </div>

    </div>
    </div>
    `;

    document.body.appendChild(modal);
  },

  // ==================== SELECCIÓN DE MÉTODO ====================

  seleccionarMetodo(metodo) {
    this.metodoDevolucion = metodo;
    this.metodoReembolso = null;
    this.productoCambio = null;
    this.productoCambioCantidad = 1;

    // Resaltar opción seleccionada
    const opcionCambio = document.getElementById("opcionCambio");
    const opcionReembolso = document.getElementById("opcionReembolso");
    const seccionCambio = document.getElementById("seccionCambio");
    const seccionReembolso = document.getElementById("seccionReembolso");

    if (metodo === "cambio") {
      opcionCambio.style.borderColor = "#27ae60";
      opcionCambio.style.background = "#eafaf1";
      opcionReembolso.style.borderColor = "#bdc3c7";
      opcionReembolso.style.background = "white";
      seccionCambio.style.display = "block";
      seccionReembolso.style.display = "none";
    } else {
      opcionReembolso.style.borderColor = "#ff9800";
      opcionReembolso.style.background = "#fff3e0";
      opcionCambio.style.borderColor = "#bdc3c7";
      opcionCambio.style.background = "white";
      seccionCambio.style.display = "none";
      seccionReembolso.style.display = "block";
    }
  },

  seleccionarMetodoReembolso(metodo) {
    this.metodoReembolso = metodo;

    const opcionEfectivo = document.getElementById("opcionEfectivo");
    const opcionTransferencia = document.getElementById("opcionTransferencia");
    const campoReferencia = document.getElementById("campoReferencia");

    if (metodo === "efectivo") {
      opcionEfectivo.style.borderColor = "#27ae60";
      opcionEfectivo.style.background = "#eafaf1";
      opcionTransferencia.style.borderColor = "#bdc3c7";
      opcionTransferencia.style.background = "white";
      campoReferencia.style.display = "none";
    } else {
      opcionTransferencia.style.borderColor = "#3498db";
      opcionTransferencia.style.background = "#ebf5fb";
      opcionEfectivo.style.borderColor = "#bdc3c7";
      opcionEfectivo.style.background = "white";
      campoReferencia.style.display = "block";
    }
  },

  // ==================== BÚSQUEDA DE PRODUCTO PARA CAMBIO ====================

  _buscarTimeout: null,

  async buscarProductoCambio(query) {
    clearTimeout(this._buscarTimeout);
    const contenedor = document.getElementById("resultadosProductoCambio");

    if (!query || query.length < 2) {
      contenedor.innerHTML = '<p style="color:#7f8c8d;text-align:center;padding:20px;">Escriba al menos 2 caracteres para buscar...</p>';
      return;
    }

    this._buscarTimeout = setTimeout(async () => {
      try {
        contenedor.innerHTML = '<p style="color:#7f8c8d;text-align:center;padding:20px;">Buscando...</p>';
        const productos = await ProductosAPI.search(query);
        const lista = Array.isArray(productos) ? productos : (productos.data || []);

        // Filtrar productos con stock disponible
        const disponibles = lista.filter(p => p.stock_actual > 0 && p.disponible);

        if (disponibles.length === 0) {
          contenedor.innerHTML = '<p style="color:#e74c3c;text-align:center;padding:20px;">No se encontraron productos disponibles</p>';
          return;
        }

        contenedor.innerHTML = disponibles.map(p => `
        <div onclick="DevolucionModule.seleccionarProductoCambio(${p.id}, '${(p.nombre || '').replace(/'/g, "\\'")}', ${p.precio_venta}, ${p.stock_actual})"
        style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e0e0e0;border-radius:5px;margin-bottom:8px;cursor:pointer;transition:background 0.2s;"
        onmouseover="this.style.background='#eafaf1'" onmouseout="this.style.background='white'">
        <div>
        <strong>${p.nombre}</strong><br>
        <small style="color:#7f8c8d;">${p.codigo || ''} | Stock: ${p.stock_actual}</small>
        </div>
        <div style="text-align:right;">
        <strong style="color:#27ae60;font-size:16px;">${this.formatCurrency(p.precio_venta)}</strong>
        </div>
        </div>
        `).join("");
      } catch (error) {
        contenedor.innerHTML = '<p style="color:#e74c3c;text-align:center;padding:20px;">Error al buscar productos</p>';
      }
    }, 300);
  },

  seleccionarProductoCambio(id, nombre, precio, stock) {
    this.productoCambio = { id, nombre, precio: parseFloat(precio), stock };
    this.productoCambioCantidad = 1;

    // Mostrar producto seleccionado
    const contenedor = document.getElementById("productoCambioSeleccionado");
    contenedor.style.display = "block";
    this.renderizarProductoCambioSeleccionado();

    // Limpiar búsqueda
    document.getElementById("resultadosProductoCambio").innerHTML = "";
    document.getElementById("buscarProductoCambio").value = "";

    this.actualizarResumenCambio();
  },

  renderizarProductoCambioSeleccionado() {
    const contenedor = document.getElementById("productoCambioSeleccionado");
    if (!this.productoCambio) {
      contenedor.style.display = "none";
      return;
    }

    const p = this.productoCambio;
    contenedor.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
    <div>
    <strong style="font-size:16px;">${p.nombre}</strong><br>
    <small style="color:#7f8c8d;">Stock disponible: ${p.stock}</small>
    </div>
    <div style="display:flex;align-items:center;gap:15px;">
    <div>
    <label style="font-size:12px;color:#7f8c8d;">Cantidad:</label><br>
    <input type="number" id="cantidadProductoCambio" min="1" max="${p.stock}" value="${this.productoCambioCantidad}"
    onchange="DevolucionModule.actualizarCantidadCambio(this.value)"
    style="width:70px;padding:8px;border:2px solid #27ae60;border-radius:5px;text-align:center;font-weight:600;">
    </div>
    <div style="text-align:right;">
    <small style="color:#7f8c8d;">Precio unit.</small><br>
    <strong style="color:#27ae60;font-size:18px;">${this.formatCurrency(p.precio)}</strong>
    </div>
    <button onclick="DevolucionModule.quitarProductoCambio()"
    style="background:#e74c3c;color:white;border:none;padding:8px 12px;border-radius:5px;cursor:pointer;font-size:18px;"
    title="Quitar producto">&times;</button>
    </div>
    </div>
    `;
  },

  actualizarCantidadCambio(cantidad) {
    cantidad = parseInt(cantidad);
    if (cantidad < 1) cantidad = 1;
    if (this.productoCambio && cantidad > this.productoCambio.stock) {
      cantidad = this.productoCambio.stock;
      const input = document.getElementById("cantidadProductoCambio");
      if (input) input.value = cantidad;
    }
    this.productoCambioCantidad = cantidad;
    this.actualizarResumenCambio();
  },

  quitarProductoCambio() {
    this.productoCambio = null;
    this.productoCambioCantidad = 1;
    document.getElementById("productoCambioSeleccionado").style.display = "none";
    document.getElementById("resumenCambio").style.display = "none";
  },

  actualizarResumenCambio() {
    const contenedor = document.getElementById("resumenCambio");
    if (!this.productoCambio || this.itemsSeleccionados.length === 0) {
      contenedor.style.display = "none";
      return;
    }

    const montoDevolucion = this.itemsSeleccionados.reduce(
      (sum, item) => sum + item.precio_unitario * item.cantidad_devuelta, 0
    );
    const totalProductoNuevo = this.productoCambio.precio * this.productoCambioCantidad;
    const diferencia = totalProductoNuevo - montoDevolucion;

    let mensajeDiferencia = "";
    let colorDiferencia = "";

    if (diferencia > 0) {
      mensajeDiferencia = `El cliente debe pagar: <strong>${this.formatCurrency(diferencia)}</strong>`;
      colorDiferencia = "#e74c3c";
    } else if (diferencia < 0) {
      mensajeDiferencia = `Se devuelve al cliente: <strong>${this.formatCurrency(Math.abs(diferencia))}</strong>`;
      colorDiferencia = "#27ae60";
    } else {
      mensajeDiferencia = "<strong>No hay diferencia de precio</strong>";
      colorDiferencia = "#2c3e50";
    }

    contenedor.style.display = "block";
    contenedor.innerHTML = `
    <h4 style="margin:0 0 12px 0;color:#856404;">Resumen del Cambio</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
    <div>
    <small style="color:#7f8c8d;">Valor producto(s) devuelto(s):</small><br>
    <strong style="font-size:16px;">${this.formatCurrency(montoDevolucion)}</strong>
    </div>
    <div>
    <small style="color:#7f8c8d;">Valor producto nuevo (x${this.productoCambioCantidad}):</small><br>
    <strong style="font-size:16px;">${this.formatCurrency(totalProductoNuevo)}</strong>
    </div>
    </div>
    <div style="padding:12px;background:white;border-radius:5px;text-align:center;border:2px solid ${colorDiferencia};">
    <span style="color:${colorDiferencia};font-size:16px;">${mensajeDiferencia}</span>
    </div>
    `;
  },

  // ==================== FUNCIONES DE INTERACCIÓN ====================

  toggleItem(index, checked) {
    const item = this.facturaActual.items[index];
    const cantidadDisponible = item.cantidad - (item.cantidad_devuelta || 0);
    const cantidadInput = document.getElementById(`cantidad_${index}`);

    if (checked) {
      this.itemsSeleccionados.push({
        index: index,
        detalle_factura_id: item.id,
        producto_id: item.producto_id,
        nombre: item.nombre_producto,
        precio_unitario: parseFloat(item.precio_unitario),
        cantidad_devuelta: parseInt(cantidadInput.value),
        cantidad_disponible: cantidadDisponible,
      });
    } else {
      this.itemsSeleccionados = this.itemsSeleccionados.filter(
        (i) => i.index !== index,
      );
    }

    this.actualizarResumen();
    this.actualizarResumenCambio();
  },

  seleccionarTodos(checked) {
    this.facturaActual.items.forEach((item, index) => {
      const cantidadDisponible = item.cantidad - (item.cantidad_devuelta || 0);
      if (cantidadDisponible > 0) {
        const checkbox = document.getElementById(`item_${item.id}`);
        if (checkbox) {
          checkbox.checked = checked;
          this.toggleItem(index, checked);
        }
      }
    });
  },

  actualizarCantidad(index, nuevaCantidad) {
    const item = this.itemsSeleccionados.find((i) => i.index === index);
    if (item) {
      item.cantidad_devuelta = parseInt(nuevaCantidad);
      this.actualizarResumen();
      this.actualizarResumenCambio();

      const subtotalCell = document.getElementById(`subtotal_${index}`);
      if (subtotalCell) {
        subtotalCell.textContent = this.formatCurrency(
          item.precio_unitario * nuevaCantidad,
        );
      }
    }
  },

  actualizarResumen() {
    const itemsCount = this.itemsSeleccionados.length;
    const unidadesTotal = this.itemsSeleccionados.reduce(
      (sum, item) => sum + item.cantidad_devuelta, 0
    );
    const montoTotal = this.itemsSeleccionados.reduce(
      (sum, item) => sum + item.precio_unitario * item.cantidad_devuelta, 0
    );

    document.getElementById("itemsCount").textContent = itemsCount;
    document.getElementById("unidadesTotal").textContent = unidadesTotal;
    document.getElementById("montoTotal").textContent = this.formatCurrency(montoTotal);
  },

  // ==================== PROCESAR DEVOLUCIÓN ====================

  async procesarDevolucion() {
    try {
      // Validaciones
      if (this.itemsSeleccionados.length === 0) {
        Toast.warning("Debe seleccionar al menos un producto para devolver");
        return;
      }

      const motivo = document.getElementById("motivoDevolucion").value.trim();
      if (!motivo) {
        Toast.warning("Debe especificar el motivo de la devolución");
        return;
      }

      if (!this.metodoDevolucion) {
        Toast.warning("Debe seleccionar el tipo de devolución (Cambio o Reembolso)");
        return;
      }

      // Validaciones específicas por método
      if (this.metodoDevolucion === "cambio" && !this.productoCambio) {
        Toast.warning("Debe seleccionar un producto para el cambio");
        return;
      }

      if (this.metodoDevolucion === "reembolso" && !this.metodoReembolso) {
        Toast.warning("Debe seleccionar el método de reembolso (Efectivo o Transferencia)");
        return;
      }

      if (this.metodoDevolucion === "reembolso" && this.metodoReembolso === "transferencia") {
        const referencia = document.getElementById("referenciaTransferencia").value.trim();
        if (!referencia) {
          Toast.warning("Debe especificar la referencia de la transferencia");
          return;
        }
      }

      const notas = document.getElementById("notasDevolucion").value.trim();

      // Calcular totales para confirmación
      const totalDevolucion = this.itemsSeleccionados.reduce(
        (sum, item) => sum + item.precio_unitario * item.cantidad_devuelta, 0
      );

      // Armar mensaje de confirmación
      let mensajeConfirm = `¿Confirma procesar esta devolución?\n\n`;
      mensajeConfirm += `Items: ${this.itemsSeleccionados.length}\n`;
      mensajeConfirm += `Monto devolución: ${this.formatCurrency(totalDevolucion)}\n\n`;

      if (this.metodoDevolucion === "cambio") {
        const totalNuevo = this.productoCambio.precio * this.productoCambioCantidad;
        const diferencia = totalNuevo - totalDevolucion;
        mensajeConfirm += `Tipo: CAMBIO DE PRODUCTO\n`;
        mensajeConfirm += `Producto nuevo: ${this.productoCambio.nombre} (x${this.productoCambioCantidad})\n`;
        mensajeConfirm += `Valor producto nuevo: ${this.formatCurrency(totalNuevo)}\n`;
        if (diferencia > 0) {
          mensajeConfirm += `El cliente paga: ${this.formatCurrency(diferencia)}`;
        } else if (diferencia < 0) {
          mensajeConfirm += `Se devuelve al cliente: ${this.formatCurrency(Math.abs(diferencia))}`;
        } else {
          mensajeConfirm += `Sin diferencia de precio`;
        }
      } else {
        mensajeConfirm += `Tipo: REEMBOLSO EN ${this.metodoReembolso.toUpperCase()}\n`;
        mensajeConfirm += `Monto a devolver: ${this.formatCurrency(totalDevolucion)}`;
      }

      const confirmar = confirm(mensajeConfirm);
      if (!confirmar) return;

      // Preparar datos
      const devolucionData = {
        factura_id: this.facturaActual.id,
        items: this.itemsSeleccionados.map((item) => ({
          detalle_factura_id: item.detalle_factura_id,
          cantidad_devuelta: item.cantidad_devuelta,
        })),
        motivo: motivo,
        notas: notas || null,
        metodo_devolucion: this.metodoDevolucion,
        restaurar_stock: true,
      };

      // Campos específicos por método
      if (this.metodoDevolucion === "cambio") {
        devolucionData.producto_cambio_id = this.productoCambio.id;
        devolucionData.producto_cambio_cantidad = this.productoCambioCantidad;
      } else {
        devolucionData.metodo_reembolso = this.metodoReembolso;
        if (this.metodoReembolso === "transferencia") {
          devolucionData.referencia_transferencia = document.getElementById("referenciaTransferencia").value.trim();
        }
      }

      // Enviar al backend
      const devolucion = await DevolucionesAPI.crear(devolucionData);

      Toast.success(`Devolución ${devolucion.numero_devolucion} procesada exitosamente`);

      this.cerrar();

      if (window.FacturacionModule) {
        FacturacionModule.cargarFacturas();
      }
    } catch (error) {
      console.error("Error al procesar devolución:", error);
      Toast.error("Error al procesar devolución: " + error.message);
    }
  },

  // ==================== UTILIDADES ====================

  cerrar() {
    const modal = document.getElementById("modalDevolucion");
    if (modal) modal.remove();
    this.facturaActual = null;
    this.itemsSeleccionados = [];
    this.metodoDevolucion = null;
    this.metodoReembolso = null;
    this.productoCambio = null;
    this.productoCambioCantidad = 1;
  },

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
      month: "long",
      day: "numeric",
    });
  },
};

// Exportar
window.DevolucionModule = DevolucionModule;
