// Lógica completa de facturación en el frontend

const FacturacionModule = {
  // Variables del módulo
  facturas: [],
  clientesConSaldo: [],

  // Inicializar módulo
  init() {
  this.mostrarModalGenerarFactura =
  ModalesFacturacion.mostrarModalGenerarFactura(ModalesFacturacion);
  this.verDetalleFactura =
  ModalesFacturacion.mostrarDetalleFactura(ModalesFacturacion);
  this.setupEventListeners();
  },

  // Configurar event listeners
  setupEventListeners() {
  // Los listeners específicos se configuran cuando se muestran los modales
  },

  // ==================== MOSTRAR MODAL GENERAR FACTURA ====================
  mostrarModalGenerarFactura(ventaId, clienteId) {
  const modal = document.getElementById("modalGenerarFactura");
  if (!modal) {
  console.error("Modal de factura no encontrado");
  return;
  }

  setValueIfExists("facturaVentaId", ventaId);
  setValueIfExists("facturaClienteId", clienteId);

  // Configurar fecha de vencimiento por defecto (30 días)
  const hoy = new Date();
  const vencimiento = new Date(hoy.setDate(hoy.getDate() + 30));
  setValueIfExists(
  "facturaVencimiento",
  vencimiento.toISOString().split("T")[0],
  );

  modal.classList.add("active");
  },

  cerrarModalFactura() {
  cerrarModal("modalGenerarFactura");
  },

  // ==================== GENERAR FACTURA ====================
  async generarFacturaDesdeVenta() {
  const ventaId = getValue("facturaVentaId");
  const clienteId = getValue("facturaClienteId");
  const tipoFactura = getValue("facturaTipo");
  const tipoComprobante = getValue("facturaComprobante");
  const condicionesPago = getValue("facturaCondiciones");
  let fechaVencimiento =
  condicionesPago !== "Contado" ? getValue("facturaVencimiento"): null;

  if (!ventaId || !clienteId) {
  mostrarAlerta("Datos incompletos para generar factura", "warning");
  return;
  }

  try {
  const factura = await FacturacionAPI.crearDesdeVenta({
  venta_id: parseInt(ventaId),
  cliente_id: parseInt(clienteId),
  tipo_factura: tipoFactura,
  tipo_comprobante: tipoComprobante,
  condiciones_pago: condicionesPago,
  fecha_vencimiento: fechaVencimiento,
  observaciones: getValue("facturaObservaciones"),
  });

  mostrarAlerta(
  ` Factura generada: ${factura.numero_factura}${factura.ncf ? "\nNCF: " + factura.ncf: ""}`,
  "success",
  );

  this.cerrarModalFactura();

  if (confirm("¿Desea ver la factura generada?")) {
  this.verDetalleFactura(factura.id);
  }
  } catch (error) {
  console.error("Error:", error);
  mostrarAlerta("Error al generar factura: " + error.message, "danger");
  }
  },

  // ==================== VER DETALLE DE FACTURA ====================
  async verDetalleFactura(facturaId) {
  try {
  const factura = await FacturacionAPI.getById(facturaId);

  // Formatear estado
  const estadoBadge = this.getEstadoBadge(factura.estado_pago);

  // Construir HTML del modal
  const content = `
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; margin: -20px -20px 20px -20px;">
  <h2 style="margin: 0 0 10px 0; font-size: 28px;"> ${factura.numero_factura}</h2>
  ${factura.ncf ? `<p style="margin: 5px 0; font-size: 16px;">NCF: <strong>${factura.ncf}</strong></p>`: ""}
  <p style="margin: 5px 0;">Fecha: ${Formatters.formatFecha(factura.fecha_emision)}</p>
  <div style="margin-top: 15px;">${estadoBadge}</div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
  <div>
  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;"> Cliente</h4>
  <p><strong>Nombre:</strong> ${factura.cliente_nombre}</p>
  <p><strong>RNC/Cédula:</strong> ${factura.cliente_rnc || "-"}</p>
  <p><strong>Teléfono:</strong> ${factura.cliente_telefono || "-"}</p>
  </div>
  <div>
  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;"> Detalles</h4>
  <p><strong>Tipo:</strong> ${factura.tipo_factura}</p>
  <p><strong>Comprobante:</strong> ${factura.tipo_comprobante}</p>
  <p><strong>Condiciones:</strong> ${factura.condiciones_pago}</p>
  ${factura.fecha_vencimiento ? `<p><strong>Vencimiento:</strong> ${Formatters.formatFecha(factura.fecha_vencimiento)}</p>`: ""}
  </div>
  </div>

  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;"> Artículos</h4>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <thead>
  <tr style="background: #f8f9fa;">
  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Descripción</th>
  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Cant.</th>
  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Precio Unit.</th>
  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
  </tr>
  </thead>
  <tbody>
  ${factura.items
.map(
  (item) => `
  <tr>
  <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${item.descripcion}</td>
  <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${item.cantidad}</td>
  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${Formatters.formatCurrency(item.precio_unitario)}</td>
  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${Formatters.formatCurrency(item.total)}</td>
  </tr>
  `,
  )
.join("")}
  </tbody>
  </table>

  <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
  <span>Subtotal:</span>
  <span style="font-weight: bold;">${Formatters.formatCurrency(factura.subtotal)}</span>
  </div>
  ${
  factura.descuento > 0
  ? `
  <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #e74c3c;">
  <span>Descuento:</span>
  <span style="font-weight: bold;">-${Formatters.formatCurrency(factura.descuento)}</span>
  </div>
  `
: ""
  }
  <div style="display: flex; justify-content: space-between; margin: 5px 0;">
  <span>ITBIS (18%):</span>
  <span style="font-weight: bold;">${Formatters.formatCurrency(factura.itbis)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 10px 0 0 0; padding-top: 10px; border-top: 2px solid #34495e; font-size: 20px;">
  <span><strong>${factura.total_devuelto > 0 ? "TOTAL BRUTO:" : "TOTAL:"}</strong></span>
  <span style="font-weight: bold; color: #27ae60;">${Formatters.formatCurrency(factura.total)}</span>
  </div>
  ${factura.total_devuelto > 0 ? `
  <div style="display: flex; justify-content: space-between; margin: 5px 0 0 0; padding-top: 8px; font-size: 16px; color: #c0392b;">
  <span><strong>Monto Devuelto:</strong></span>
  <span style="font-weight: bold;">-${Formatters.formatCurrency(factura.total_devuelto)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 5px 0 0 0; padding-top: 8px; border-top: 2px solid #27ae60; font-size: 20px; color: #27ae60;">
  <span><strong>TOTAL NETO:</strong></span>
  <span style="font-weight: bold;">${Formatters.formatCurrency(factura.total_neto)}</span>
  </div>
  ` : ""}
  </div>

  ${factura.devoluciones && factura.devoluciones.length > 0 ? `
  <div style="margin-top:20px;border:2px solid #c0392b;border-radius:8px;overflow:hidden;">
  <div style="background:#c0392b;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;">
  <strong style="color:white;font-size:14px;"> Devoluciones Registradas</strong>
  <span style="color:white;font-size:13px;">Total devuelto: ${Formatters.formatCurrency(factura.total_devuelto)}</span>
  </div>
  ${factura.devoluciones.map((dev, idx) => `
  <div style="padding:12px 18px;${idx > 0 ? "border-top:1px solid #f5c6cb;" : ""}background:#fff5f5;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
  <div>
  <strong style="color:#c0392b;font-size:13px;">${dev.numero_devolucion}</strong>
  <span style="background:#c0392b;color:white;padding:2px 10px;border-radius:12px;font-size:11px;margin-left:8px;">${dev.tipo === "total" ? "Total" : "Parcial"}</span>
  </div>
  <span style="color:#7f8c8d;font-size:12px;">${Formatters.formatFecha(dev.fecha)}</span>
  </div>
  ${dev.motivo ? `<p style="margin:0 0 8px 0;color:#7f8c8d;font-size:12px;font-style:italic;">"${dev.motivo}"</p>` : ""}
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
  <thead>
  <tr style="background:#f8d7da;">
  <th style="padding:6px 8px;text-align:left;color:#721c24;">Producto</th>
  <th style="padding:6px 8px;text-align:center;color:#721c24;">Cant. Devuelta</th>
  <th style="padding:6px 8px;text-align:right;color:#721c24;">Precio Unit.</th>
  <th style="padding:6px 8px;text-align:right;color:#721c24;">Total</th>
  </tr>
  </thead>
  <tbody>
  ${(dev.items || []).map(item => `
  <tr style="border-bottom:1px solid #f5c6cb;">
  <td style="padding:6px 8px;color:#2c3e50;">${item.nombre_producto}</td>
  <td style="padding:6px 8px;text-align:center;color:#2c3e50;">${item.cantidad_devuelta}</td>
  <td style="padding:6px 8px;text-align:right;color:#2c3e50;">${Formatters.formatCurrency(item.precio_unitario)}</td>
  <td style="padding:6px 8px;text-align:right;font-weight:600;color:#c0392b;">${Formatters.formatCurrency(item.total)}</td>
  </tr>
  `).join("")}
  </tbody>
  </table>
  <div style="text-align:right;padding:6px 0 0 0;">
  <strong style="color:#c0392b;font-size:13px;">Subtotal devuelto: ${Formatters.formatCurrency(dev.monto_devuelto)}</strong>
  </div>
  </div>
  `).join("")}
  </div>
  ` : ""}

  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;"> Estado de Pagos</h4>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
  <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: #1976d2; font-size: 12px;">${factura.total_devuelto > 0 ? "Total Neto" : "Total Facturado"}</p>
  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1565c0;">${Formatters.formatCurrency(factura.total_devuelto > 0 ? factura.total_neto : factura.total)}</p>
  ${factura.total_devuelto > 0 ? `<p style="margin:2px 0 0 0;font-size:11px;color:#c0392b;">Bruto: ${Formatters.formatCurrency(factura.total)}</p>` : ""}
  </div>
  <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: #388e3c; font-size: 12px;">Pagado</p>
  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #2e7d32;">${Formatters.formatCurrency(factura.monto_pagado)}</p>
  </div>
  <div style="background: ${factura.saldo_pendiente > 0 ? "#ffebee": "#f1f8e9"}; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: ${factura.saldo_pendiente > 0 ? "#c62828": "#689f38"}; font-size: 12px;">Saldo Pendiente</p>
  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${factura.saldo_pendiente > 0 ? "#d32f2f": "#558b2f"};">${Formatters.formatCurrency(factura.saldo_pendiente)}</p>
  </div>
  </div>

  ${
  factura.saldo_pendiente > 0
  ? `
  <div style="margin: 20px 0;">
  <button class="btn btn-success" onclick="FacturacionModule.mostrarModalRegistrarPago(${factura.id}, ${factura.saldo_pendiente})">
  Registrar Pago
  </button>
  </div>
  `
: ""
  }

  ${
  factura.pagos && factura.pagos.length > 0
  ? `
  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-top: 20px;"> Historial de Pagos</h4>
  <table style="width: 100%; border-collapse: collapse;">
  <thead>
  <tr style="background: #f8f9fa;">
  <th style="padding: 10px; text-align: left;">Fecha</th>
  <th style="padding: 10px; text-align: left;">Método</th>
  <th style="padding: 10px; text-align: right;">Monto</th>
  <th style="padding: 10px; text-align: left;">Referencia</th>
  </tr>
  </thead>
  <tbody>
  ${factura.pagos
.map(
  (pago) => `
  <tr>
  <td style="padding: 10px;">${Formatters.formatFecha(pago.fecha_pago)}</td>
  <td style="padding: 10px;">${Formatters.formatMetodoPago(pago.metodo_pago)}</td>
  <td style="padding: 10px; text-align: right; font-weight: bold;">${Formatters.formatCurrency(pago.monto)}</td>
  <td style="padding: 10px;">${pago.referencia || "-"}</td>
  </tr>
  `,
  )
.join("")}
  </tbody>
  </table>
  `
: ""
  }

  <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
  <button class="btn btn-secondary" onclick="FacturacionModule.cerrarModalDetalleFactura()">
  Cerrar
  </button>
  </div>
  `;

  document.getElementById("detalleFacturaContent").innerHTML = content;
  document.getElementById("modalDetalleFactura").classList.add("active");
  } catch (error) {
  console.error("Error:", error);
  mostrarAlerta("Error al cargar factura", "danger");
  }
  },

  cerrarModalDetalleFactura() {
  cerrarModal("modalDetalleFactura");
  },

  // ==================== REGISTRAR PAGO ====================
  mostrarModalRegistrarPago(facturaId, saldoPendiente) {
  setValueIfExists("pagoFacturaId", facturaId);
  setValueIfExists("pagoMonto", "");

  const montoInput = document.getElementById("pagoMonto");
  if (montoInput) {
  montoInput.max = saldoPendiente;
  montoInput.placeholder = `Máximo: ${Formatters.formatCurrency(saldoPendiente)}`;
  }

  setValueIfExists("pagoFecha", new Date().toISOString().split("T")[0]);

  this.cerrarModalDetalleFactura();
  document.getElementById("modalRegistrarPago").classList.add("active");
  },

  cerrarModalPago() {
  cerrarModal("modalRegistrarPago");
  },

  async registrarPagoFactura() {
  const facturaId = getValue("pagoFacturaId");
  const monto = parseFloat(getValue("pagoMonto"));

  if (!monto || monto <= 0) {
  mostrarAlerta("Ingrese un monto válido", "warning");
  return;
  }

  try {
  await FacturacionAPI.registrarPago(facturaId, {
  fecha_pago: getValue("pagoFecha"),
  monto: monto,
  metodo_pago: getValue("pagoMetodo"),
  referencia: getValue("pagoReferencia") || null,
  banco: getValue("pagoBanco") || null,
  observaciones: getValue("pagoObservaciones") || null,
  });

  mostrarAlerta(" Pago registrado correctamente", "success");
  this.cerrarModalPago();
  this.verDetalleFactura(facturaId);

  // Recargar clientes si el módulo está disponible
  if (
  window.ClientesModule &&
  window.ClientesModule.actualizarTablaClientes
  ) {
  await window.ClientesModule.actualizarTablaClientes();
  }
  } catch (error) {
  console.error("Error:", error);
  mostrarAlerta("Error al registrar pago: " + error.message, "danger");
  }
  },

  // ==================== ESTADO DE CUENTA CLIENTE ====================
  async verEstadoCuentaCliente(clienteId) {
  try {
  const estadoCuenta =
  await FacturacionAPI.getEstadoCuentaCliente(clienteId);

  const facturasPendientes = estadoCuenta.facturas.filter(
  (f) => f.estado_pago !== "pagada",
  ).length;
  const facturasVencidas = estadoCuenta.facturas.filter(
  (f) =>
  f.estado_pago !== "pagada" &&
  f.fecha_vencimiento &&
  new Date(f.fecha_vencimiento) < new Date(),
  ).length;

  const content = `
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; color: white; margin: -20px -20px 20px -20px;">
  <h2 style="margin: 0 0 10px 0; font-size: 28px;"> Estado de Cuenta</h2>
  <p style="margin: 5px 0; font-size: 18px;">${estadoCuenta.cliente.nombre}</p>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
  <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: #1976d2; font-size: 12px;">Total Facturas</p>
  <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #1565c0;">${estadoCuenta.total_facturas}</p>
  </div>
  <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: #388e3c; font-size: 12px;">Total Facturado</p>
  <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #2e7d32;">${Formatters.formatCurrency(estadoCuenta.total_facturado)}</p>
  </div>
  <div style="background: #fff3e0; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: #f57c00; font-size: 12px;">Total Pagado</p>
  <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #e65100;">${Formatters.formatCurrency(estadoCuenta.total_pagado)}</p>
  </div>
  <div style="background: ${estadoCuenta.saldo_pendiente > 0 ? "#ffebee": "#f1f8e9"}; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: ${estadoCuenta.saldo_pendiente > 0 ? "#c62828": "#689f38"}; font-size: 12px;">Saldo Pendiente</p>
  <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: ${estadoCuenta.saldo_pendiente > 0 ? "#d32f2f": "#558b2f"};">${Formatters.formatCurrency(estadoCuenta.saldo_pendiente)}</p>
  </div>
  </div>

  ${
  facturasVencidas > 0
  ? `
  <div style="background: #ffebee; padding: 15px; border-radius: 5px; border-left: 4px solid #d32f2f; margin-bottom: 20px;">
  <p style="margin: 0; color: #c62828; font-weight: bold;">
  ATENCIÓN: Este cliente tiene ${facturasVencidas} factura(s) vencida(s)
  </p>
  </div>
  `
: ""
  }

  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;"> Facturas</h4>
  <table style="width: 100%; border-collapse: collapse;">
  <thead>
  <tr style="background: #f8f9fa;">
  <th style="padding: 10px; text-align: left;">Número</th>
  <th style="padding: 10px; text-align: left;">Fecha</th>
  <th style="padding: 10px; text-align: right;">Total</th>
  <th style="padding: 10px; text-align: right;">Pagado</th>
  <th style="padding: 10px; text-align: right;">Saldo</th>
  <th style="padding: 10px; text-align: center;">Estado</th>
  <th style="padding: 10px; text-align: center;">Acciones</th>
  </tr>
  </thead>
  <tbody>
  ${estadoCuenta.facturas
.map((factura) => {
  const esVencida =
  factura.fecha_vencimiento &&
  new Date(factura.fecha_vencimiento) < new Date() &&
  factura.estado_pago !== "pagada";
  return `
  <tr style="${esVencida ? "background: #ffebee;": ""}">
  <td style="padding: 10px;">${factura.numero_factura}</td>
  <td style="padding: 10px;">${Formatters.formatFecha(factura.fecha_emision)}</td>
  <td style="padding: 10px; text-align: right; font-weight: bold;">${Formatters.formatCurrency(factura.total)}</td>
  <td style="padding: 10px; text-align: right;">${Formatters.formatCurrency(factura.monto_pagado)}</td>
  <td style="padding: 10px; text-align: right; font-weight: bold; color: ${factura.saldo_pendiente > 0 ? "#d32f2f": "#2e7d32"};">${Formatters.formatCurrency(factura.saldo_pendiente)}</td>
  <td style="padding: 10px; text-align: center;">${this.getEstadoBadge(factura.estado_pago)}</td>
  <td style="padding: 10px; text-align: center;">
  <button class="btn btn-info btn-small" onclick="FacturacionModule.verDetalleFactura(${factura.id})" title="Ver detalle">Ver detalle</button>
  ${
  factura.saldo_pendiente > 0
  ? `
  <button class="btn btn-success btn-small" onclick="FacturacionModule.mostrarModalRegistrarPago(${factura.id}, ${factura.saldo_pendiente})" title="Registrar pago">Registrar pago</button>
  `
: ""
  }
  </td>
  </tr>
  `;
  })
.join("")}
  </tbody>
  </table>

  <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
  <button class="btn btn-secondary" onclick="FacturacionModule.cerrarModalEstadoCuenta()">
  Cerrar
  </button>
  </div>
  `;

  document.getElementById("estadoCuentaContent").innerHTML = content;
  document.getElementById("modalEstadoCuenta").classList.add("active");
  } catch (error) {
  console.error("Error:", error);
  mostrarAlerta("Error al cargar estado de cuenta", "danger");
  }
  },

  cerrarModalEstadoCuenta() {
  cerrarModal("modalEstadoCuenta");
  },

  // ==================== UTILIDADES ====================
  getEstadoBadge(estado) {
  const badges = {
  pendiente: '<span class="badge badge-warning"> Pendiente</span>',
  parcial:
  '<span class="badge" style="background: #ff9800; color: white;"> Pago Parcial</span>',
  pagada: '<span class="badge badge-success"> Pagada</span>',
  vencida: '<span class="badge badge-danger"> Vencida</span>',
  anulada:
  '<span class="badge" style="background: #607d8b; color: white;"> Anulada</span>',
  };
  return badges[estado] || estado;
  },
};

// Exportar módulo
window.FacturacionModule = FacturacionModule;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => FacturacionModule.init());
} else {
  FacturacionModule.init();
}

