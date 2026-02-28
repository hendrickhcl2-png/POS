// Generar factura
ModalesFacturacion.mostrarModalGenerarFactura(ventaId, clienteId);
ModalesFacturacion.cerrarModalGenerarFactura();
ModalesFacturacion.generarFactura();

// Detalle de factura
ModalesFacturacion.mostrarDetalleFactura(facturaId);
ModalesFacturacion.cerrarModalDetalleFactura();

// Registrar pago
ModalesFacturacion.mostrarModalRegistrarPago(facturaId, saldoPendiente);
ModalesFacturacion.cerrarModalRegistrarPago();
ModalesFacturacion.registrarPago();

// Estado de cuenta
ModalesFacturacion.mostrarEstadoCuenta(clienteId);
ModalesFacturacion.cerrarModalEstadoCuenta();

// ==================== FUNCIONES DE MODALES DE FACTURACIÓN ====================
// Este archivo maneja las interacciones de los modales de facturación

const ModalesFacturacion = {
  // ==================== GENERAR FACTURA ====================

  mostrarModalGenerarFactura(ventaId, clienteId) {
  const modal = document.getElementById("modalGenerarFactura");
  if (!modal) {
  console.error(" Modal modalGenerarFactura no encontrado");
  return;
  }

  // Establecer valores
  document.getElementById("facturaVentaId").value = ventaId;
  document.getElementById("facturaClienteId").value = clienteId;

  // Resetear formulario
  document.getElementById("formGenerarFactura").reset();

  // Configurar fecha de vencimiento por defecto (30 días)
  const hoy = new Date();
  const vencimiento = new Date(hoy.setDate(hoy.getDate() + 30));
  document.getElementById("facturaVencimiento").value = vencimiento
.toISOString()
.split("T")[0];

  // Mostrar modal
  modal.classList.add("active");

  console.log(" Modal de factura abierto para venta:", ventaId);
  },

  cerrarModalGenerarFactura() {
  const modal = document.getElementById("modalGenerarFactura");
  if (modal) {
  modal.classList.remove("active");
  document.getElementById("formGenerarFactura").reset();
  }
  },

  async generarFactura() {
  const ventaId = document.getElementById("facturaVentaId").value;
  const clienteId = document.getElementById("facturaClienteId").value;
  const tipoFactura = document.getElementById("facturaTipo").value;
  const tipoComprobante = document.getElementById("facturaComprobante").value;
  const condicionesPago = document.getElementById("facturaCondiciones").value;
  const fechaVencimiento =
  condicionesPago !== "Contado"
  ? document.getElementById("facturaVencimiento").value
: null;
  const observaciones = document.getElementById("facturaObservaciones").value;

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
  observaciones: observaciones,
  });

  mostrarAlerta(
  ` Factura generada: ${factura.numero_factura}${factura.ncf ? "\nNCF: " + factura.ncf: ""}`,
  "success",
  );

  this.cerrarModalGenerarFactura();

  // Preguntar si desea ver la factura
  if (confirm("¿Desea ver la factura generada?")) {
  this.mostrarDetalleFactura(factura.id);
  }

  // Actualizar tabla de clientes si existe
  if (typeof actualizarTablaClientes === "function") {
  actualizarTablaClientes();
  }
  } catch (error) {
  console.error(" Error al generar factura:", error);
  mostrarAlerta("Error al generar factura: " + error.message, "danger");
  }
  },

  // ==================== DETALLE DE FACTURA ====================

  async mostrarDetalleFactura(facturaId) {
  try {
  const factura = await FacturacionAPI.getById(facturaId);

  // Generar HTML del detalle
  const content = this.generarHTMLDetalleFactura(factura);

  // Insertar contenido
  document.getElementById("detalleFacturaContent").innerHTML = content;

  // Mostrar modal
  document.getElementById("modalDetalleFactura").classList.add("active");

  console.log(" Detalle de factura cargado:", facturaId);
  } catch (error) {
  console.error(" Error al cargar factura:", error);
  mostrarAlerta("Error al cargar factura", "danger");
  }
  },

  cerrarModalDetalleFactura() {
  const modal = document.getElementById("modalDetalleFactura");
  if (modal) {
  modal.classList.remove("active");
  }
  },

  generarHTMLDetalleFactura(factura) {
  const estadoBadge = this.getEstadoBadge(factura.estado_pago);

  return `
  <div class="card-hero">
  <h2 style="margin: 0 0 10px 0; font-size: 28px;"> ${factura.numero_factura}</h2>
  ${factura.ncf ? `<p style="margin: 5px 0; font-size: 16px;">NCF: <strong>${factura.ncf}</strong></p>`: ""}
  <p style="margin: 5px 0;">Fecha: ${Formatters.formatFecha(factura.fecha_emision)}</p>
  <div style="margin-top: 15px;">${estadoBadge}</div>
  </div>

  <div class="info-grid--2" style="gap:20px;margin-bottom:20px;">
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

  <div class="info-panel">
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
  <span><strong>TOTAL:</strong></span>
  <span style="font-weight: bold; color: #27ae60;">${Formatters.formatCurrency(factura.total)}</span>
  </div>
  </div>

  <h4 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;"> Estado de Pagos</h4>
  <div class="info-grid--3" style="gap:15px;margin-bottom:20px;">
  <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; text-align: center;">
  <p style="margin: 0; color: #1976d2; font-size: 12px;">Total Facturado</p>
  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1565c0;">${Formatters.formatCurrency(factura.total)}</p>
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
  <button class="btn btn-success" onclick="ModalesFacturacion.mostrarModalRegistrarPago(${factura.id}, ${factura.saldo_pendiente})">
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

  <div class="flex-end" style="margin-top:20px;">
  <button class="btn btn-secondary" onclick="ModalesFacturacion.cerrarModalDetalleFactura()">
  Cerrar
  </button>
  </div>
  `;
  },

  // ==================== REGISTRAR PAGO ====================

  mostrarModalRegistrarPago(facturaId, saldoPendiente) {
  document.getElementById("pagoFacturaId").value = facturaId;

  const montoInput = document.getElementById("pagoMonto");
  montoInput.value = "";
  montoInput.max = saldoPendiente;
  montoInput.placeholder = `Máximo: ${Formatters.formatCurrency(saldoPendiente)}`;

  document.getElementById("pagoFecha").value = new Date()
.toISOString()
.split("T")[0];
  document.getElementById("formRegistrarPago").reset();

  this.cerrarModalDetalleFactura();
  document.getElementById("modalRegistrarPago").classList.add("active");

  console.log(" Modal de pago abierto para factura:", facturaId);
  },

  cerrarModalRegistrarPago() {
  const modal = document.getElementById("modalRegistrarPago");
  if (modal) {
  modal.classList.remove("active");
  document.getElementById("formRegistrarPago").reset();
  }
  },

  async registrarPago() {
  const facturaId = document.getElementById("pagoFacturaId").value;
  const monto = parseFloat(document.getElementById("pagoMonto").value);

  if (!monto || monto <= 0) {
  mostrarAlerta("Ingrese un monto válido", "warning");
  return;
  }

  try {
  await FacturacionAPI.registrarPago(facturaId, {
  fecha_pago: document.getElementById("pagoFecha").value,
  monto: monto,
  metodo_pago: document.getElementById("pagoMetodo").value,
  referencia: document.getElementById("pagoReferencia").value || null,
  banco: document.getElementById("pagoBanco").value || null,
  observaciones:
  document.getElementById("pagoObservaciones").value || null,
  });

  mostrarAlerta(" Pago registrado correctamente", "success");
  this.cerrarModalRegistrarPago();
  this.mostrarDetalleFactura(facturaId);

  // Actualizar tabla de clientes si existe
  if (typeof actualizarTablaClientes === "function") {
  actualizarTablaClientes();
  }
  } catch (error) {
  console.error(" Error al registrar pago:", error);
  mostrarAlerta("Error al registrar pago: " + error.message, "danger");
  }
  },

  // ==================== ESTADO DE CUENTA ====================

  async mostrarEstadoCuenta(clienteId) {
  try {
  const estadoCuenta =
  await FacturacionAPI.getEstadoCuentaCliente(clienteId);

  const content = this.generarHTMLEstadoCuenta(estadoCuenta);

  document.getElementById("estadoCuentaContent").innerHTML = content;
  document.getElementById("modalEstadoCuenta").classList.add("active");

  console.log(" Estado de cuenta cargado para cliente:", clienteId);
  } catch (error) {
  console.error(" Error al cargar estado de cuenta:", error);
  mostrarAlerta("Error al cargar estado de cuenta", "danger");
  }
  },

  cerrarModalEstadoCuenta() {
  const modal = document.getElementById("modalEstadoCuenta");
  if (modal) {
  modal.classList.remove("active");
  }
  },

  generarHTMLEstadoCuenta(estadoCuenta) {
  const facturasPendientes = estadoCuenta.facturas.filter(
  (f) => f.estado_pago !== "pagada",
  ).length;
  const facturasVencidas = estadoCuenta.facturas.filter(
  (f) =>
  f.estado_pago !== "pagada" &&
  f.fecha_vencimiento &&
  new Date(f.fecha_vencimiento) < new Date(),
  ).length;

  return `
  <div class="card-hero">
  <h2 style="margin: 0 0 10px 0; font-size: 28px;"> Estado de Cuenta</h2>
  <p style="margin: 5px 0; font-size: 18px;">${estadoCuenta.cliente.nombre}</p>
  </div>

  <div class="info-grid--4" style="gap:15px;margin-bottom:20px;">
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
  <button class="btn btn-info btn-small" onclick="ModalesFacturacion.mostrarDetalleFactura(${factura.id})" title="Ver detalle"></button>
  ${
  factura.saldo_pendiente > 0
  ? `
  <button class="btn btn-success btn-small" onclick="ModalesFacturacion.mostrarModalRegistrarPago(${factura.id}, ${factura.saldo_pendiente})" title="Registrar pago"></button>
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

  <div class="flex-end" style="margin-top:20px;">
  <button class="btn btn-secondary" onclick="ModalesFacturacion.cerrarModalEstadoCuenta()">
  Cerrar
  </button>
  </div>
  `;
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

// Exportar para uso global
window.ModalesFacturacion = ModalesFacturacion;

console.log(" ModalesFacturacion cargado");
