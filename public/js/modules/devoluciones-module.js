// ==================== MÓDULO DE DEVOLUCIONES ====================

const DevolucionModule = {
  facturaActual: null,
  itemsSeleccionados: [],

  // ==================== MOSTRAR MODAL DE DEVOLUCIÓN ====================

  async mostrarModal(facturaId) {
  try {
  // Obtener factura completa con items
  const response = await FacturacionAPI.getById(facturaId);
  this.facturaActual = response.data || response;

  if (!this.facturaActual.items || this.facturaActual.items.length === 0) {
  Toast.warning("Esta factura no tiene items para devolver");
  return;
  }

  this.itemsSeleccionados = [];
  this.renderizarModal();
  } catch (error) {
  console.error(" Error al cargar factura:", error);
  Toast.error("Error al cargar factura: " + error.message);
  }
  },

  renderizarModal() {
  // Cerrar modal existente
  const modalExistente = document.getElementById("modalDevolucion");
  if (modalExistente) modalExistente.remove();

  const modal = document.createElement("div");
  modal.id = "modalDevolucion";
  modal.style.cssText =
  "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;";

  modal.innerHTML = `
  <div style="background:white;width:100%;max-width:900px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">

  <!-- HEADER -->
  <div style="background:#e74c3c;color:white;padding:20px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
  <div>
  <h2 style="margin:0;font-size:24px;"> Procesar Devolución</h2>
  <p style="margin:5px 0 0 0;font-size:14px;opacity:0.9;">Factura: ${this.facturaActual.numero_factura}</p>
  </div>
  <button
  onclick="DevolucionModule.cerrar()"
  style="background:rgba(255,255,255,0.2);border:none;color:white;font-size:24px;width:40px;height:40px;border-radius:50%;cursor:pointer;">

  </button>
  </div>

  <!-- BODY -->
  <div style="padding:30px;">

  <!-- INFO DE LA FACTURA -->
  <div style="background:#f8f9fa;border-radius:8px;padding:15px;margin-bottom:20px;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
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
  <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 15px;margin-bottom:20px;">
  <strong style="color:#856404;"> Instrucciones:</strong>
  <p style="margin:5px 0 0 0;color:#856404;font-size:14px;">
  Seleccione los productos que desea devolver y especifique la cantidad.
  Puede devolver productos individuales o toda la factura.
  </p>
  </div>

  <!-- TABLA DE ITEMS -->
  <h3 style="margin:0 0 15px 0;">Productos de la factura:</h3>
  <div style="overflow-x:auto;">
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
  <th style="padding:12px;text-align:center;">Cantidad Comprada</th>
  <th style="padding:12px;text-align:center;">Ya Devuelto</th>
  <th style="padding:12px;text-align:center;">Disponible</th>
  <th style="padding:12px;text-align:center;">Cantidad a Devolver</th>
  <th style="padding:12px;text-align:right;">Precio Unit.</th>
  <th style="padding:12px;text-align:right;">Subtotal</th>
  </tr>
  </thead>
  <tbody>
  ${this.facturaActual.items
.map((item, index) => {
  const cantidadDisponible =
  item.cantidad - (item.cantidad_devuelta || 0);
  const deshabilitado = cantidadDisponible <= 0;

  return `
  <tr style="border-bottom:1px solid #ecf0f1;${deshabilitado ? "opacity:0.5;background:#f8f9fa;": ""}">
  <td style="padding:12px;text-align:center;">
  <input
  type="checkbox"
  id="item_${item.id}"
  data-index="${index}"
  onchange="DevolucionModule.toggleItem(${index}, this.checked)"
  ${deshabilitado ? "disabled": ""}
  style="width:18px;height:18px;cursor:pointer;">
  </td>
  <td style="padding:12px;">
  <strong>${item.nombre_producto}</strong><br>
  <small style="color:#7f8c8d;">${item.codigo_producto || ""}</small>
  </td>
  <td style="padding:12px;text-align:center;font-weight:600;">${item.cantidad}</td>
  <td style="padding:12px;text-align:center;color:#e74c3c;">${item.cantidad_devuelta || 0}</td>
  <td style="padding:12px;text-align:center;font-weight:600;color:${deshabilitado ? "#95a5a6": "#27ae60"};">
  ${cantidadDisponible}
  </td>
  <td style="padding:12px;text-align:center;">
  <input
  type="number"
  id="cantidad_${index}"
  min="1"
  max="${cantidadDisponible}"
  value="${cantidadDisponible}"
  ${deshabilitado ? "disabled": ""}
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
  <h3 style="margin:0 0 15px 0;color:#2c3e50;"> Resumen de Devolución</h3>
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
  <strong style="color:#7f8c8d;font-size:13px;">Monto a Devolver:</strong><br>
  <span id="montoTotal" style="font-size:24px;font-weight:bold;color:#27ae60;">RD$0.00</span>
  </div>
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
  <div style="margin-top:30px;display:flex;gap:15px;justify-content:flex-end;">
  <button
  onclick="DevolucionModule.cerrar()"
  style="background:#95a5a6;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;font-weight:600;">
  Cancelar
  </button>
  <button
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

  // Actualizar subtotal en la tabla
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
  (sum, item) => sum + item.cantidad_devuelta,
  0,
  );
  const montoTotal = this.itemsSeleccionados.reduce(
  (sum, item) => sum + item.precio_unitario * item.cantidad_devuelta,
  0,
  );

  document.getElementById("itemsCount").textContent = itemsCount;
  document.getElementById("unidadesTotal").textContent = unidadesTotal;
  document.getElementById("montoTotal").textContent =
  this.formatCurrency(montoTotal);
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

  const notas = document.getElementById("notasDevolucion").value.trim();

  // Confirmar
  const totalDevolucion = this.itemsSeleccionados.reduce(
  (sum, item) => sum + item.precio_unitario * item.cantidad_devuelta,
  0,
  );

  const confirmar = confirm(
  `¿Confirma procesar esta devolución?\n\n` +
  `Items: ${this.itemsSeleccionados.length}\n` +
  `Monto a devolver: ${this.formatCurrency(totalDevolucion)}\n\n` +
  `Esta acción devolverá los productos al inventario.`,
  );

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
  };


  // Enviar al backend
  const devolucion = await DevolucionesAPI.crear(devolucionData);


  Toast.success(`Devolución ${devolucion.numero_devolucion} procesada exitosamente`);

  this.cerrar();

  // Recargar lista de facturas si existe el módulo
  if (window.FacturacionModule) {
  FacturacionModule.cargarFacturas();
  }
  } catch (error) {
  console.error(" Error al procesar devolución:", error);
  Toast.error("Error al procesar devolución: " + error.message);
  }
  },

  // ==================== UTILIDADES ====================

  cerrar() {
  const modal = document.getElementById("modalDevolucion");
  if (modal) modal.remove();
  this.facturaActual = null;
  this.itemsSeleccionados = [];
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
