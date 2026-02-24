// ==================== MÓDULO DE PAGOS ====================

const PagosModule = {
  facturaActual: null,

  // ==================== MOSTRAR MODAL DE REGISTRO DE PAGO ====================

  async mostrarModal(facturaId) {
  try {
  // Obtener factura completa
  const response = await FacturacionAPI.getById(facturaId);
  this.facturaActual = response.data || response;

  if (this.facturaActual.estado === "anulada") {
  Toast.warning("No se pueden registrar pagos en facturas anuladas");
  return;
  }

  if (this.facturaActual.estado === "pagada") {
  Toast.info("Esta factura ya está completamente pagada");
  return;
  }

  // Obtener historial de pagos
  const pagos = await PagosAPI.getPorFactura(facturaId);
  this.facturaActual.pagos = pagos;

  this.renderizarModal();
  } catch (error) {
  console.error(" Error al cargar factura:", error);
  Toast.error("Error al cargar factura: " + error.message);
  }
  },

  renderizarModal() {
  const modalExistente = document.getElementById("modalRegistrarPago");
  if (modalExistente) modalExistente.remove();

  const saldoPendiente = parseFloat(this.facturaActual.saldo_pendiente || 0);
  const total = parseFloat(this.facturaActual.total);
  const montoPagado = parseFloat(this.facturaActual.monto_pagado || 0);
  const porcentajePagado = (montoPagado / total) * 100;

  const modal = document.createElement("div");
  modal.id = "modalRegistrarPago";
  modal.style.cssText =
  "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;";

  modal.innerHTML = `
  <div style="background:white;width:100%;max-width:800px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">

  <!-- HEADER -->
  <div style="background:#27ae60;color:white;padding:20px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
  <div>
  <h2 style="margin:0;font-size:24px;"> Registrar Pago / Abono</h2>
  <p style="margin:5px 0 0 0;font-size:14px;opacity:0.9;">Factura: ${this.facturaActual.numero_factura}</p>
  </div>
  <button
  onclick="PagosModule.cerrar()"
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
  <strong style="color:#7f8c8d;font-size:13px;">Fecha Factura:</strong><br>
  <span style="font-size:15px;">${this.formatFecha(this.facturaActual.fecha)}</span>
  </div>
  <div>
  <strong style="color:#7f8c8d;font-size:13px;">Días Crédito:</strong><br>
  <span style="font-size:15px;">${this.facturaActual.dias_credito || 30} días</span>
  </div>
  ${
  this.facturaActual.fecha_vencimiento
  ? `
  <div>
  <strong style="color:#7f8c8d;font-size:13px;">Vencimiento:</strong><br>
  <span style="font-size:15px;color:${new Date(this.facturaActual.fecha_vencimiento) < new Date() ? "#e74c3c": "#27ae60"};">
  ${this.formatFecha(this.facturaActual.fecha_vencimiento)}
  </span>
  </div>
  `
: ""
  }
  </div>
  </div>

  <!-- RESUMEN FINANCIERO -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:12px;padding:25px;margin-bottom:25px;color:white;">
  <h3 style="margin:0 0 20px 0;font-size:18px;">Estado de la Cuenta</h3>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:20px;">
  <div style="text-align:center;">
  <div style="font-size:12px;opacity:0.8;margin-bottom:5px;">Total Factura</div>
  <div style="font-size:24px;font-weight:bold;">${this.formatCurrency(total)}</div>
  </div>
  <div style="text-align:center;">
  <div style="font-size:12px;opacity:0.8;margin-bottom:5px;">Monto Pagado</div>
  <div style="font-size:24px;font-weight:bold;color:#a8e6cf;">${this.formatCurrency(montoPagado)}</div>
  </div>
  <div style="text-align:center;">
  <div style="font-size:12px;opacity:0.8;margin-bottom:5px;">Saldo Pendiente</div>
  <div style="font-size:28px;font-weight:bold;color:#ffd93d;">${this.formatCurrency(saldoPendiente)}</div>
  </div>
  </div>

  <!-- Barra de progreso -->
  <div style="background:rgba(255,255,255,0.2);height:30px;border-radius:15px;overflow:hidden;position:relative;">
  <div style="background:linear-gradient(90deg, #a8e6cf 0%, #ffd93d 100%);height:100%;width:${porcentajePagado}%;transition:width 0.3s;display:flex;align-items:center;justify-content:center;">
  <span style="font-size:14px;font-weight:bold;">${porcentajePagado.toFixed(1)}% Pagado</span>
  </div>
  </div>
  </div>

  <!-- FORMULARIO DE PAGO -->
  <form id="formRegistrarPago" style="background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:20px;">
  <h3 style="margin:0 0 20px 0;color:#2c3e50;">Datos del Pago</h3>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
  <!-- Monto -->
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">
  Monto a Pagar: <span style="color:#e74c3c;">*</span>
  </label>
  <input
  type="number"
  id="montoPago"
  step="0.01"
  max="${saldoPendiente}"
  placeholder="0.00"
  required
  style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:16px;font-weight:600;"
  onchange="PagosModule.validarMonto(this.value)">
  <small style="color:#7f8c8d;">Máximo: ${this.formatCurrency(saldoPendiente)}</small>
  </div>

  <!-- Método de Pago -->
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">
  Método de Pago: <span style="color:#e74c3c;">*</span>
  </label>
  <select
  id="metodoPago"
  required
  onchange="PagosModule.cambiarMetodoPago(this.value)"
  style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  <option value="efectivo"> Efectivo</option>
  <option value="tarjeta"> Tarjeta</option>
  <option value="transferencia"> Transferencia</option>
  <option value="cheque"> Cheque</option>
  <option value="mixto"> Mixto</option>
  </select>
  </div>
  </div>

  <!-- Campos condicionales según método -->
  <div id="camposMetodoPago"></div>

  <!-- Notas -->
  <div style="margin-top:15px;">
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">
  Notas (opcional):
  </label>
  <textarea
  id="notasPago"
  rows="2"
  placeholder="Información adicional sobre este pago..."
  style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;resize:vertical;"
  ></textarea>
  </div>

  <!-- Botones de acción rápida -->
  <div style="margin-top:15px;display:flex;gap:10px;">
  <button
  type="button"
  onclick="PagosModule.llenarMontoCompleto()"
  style="flex:1;background:#3498db;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;font-size:14px;">
  Pagar Total
  </button>
  <button
  type="button"
  onclick="PagosModule.llenarMontoParcial(50)"
  style="flex:1;background:#9b59b6;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;font-size:14px;">
  50% del Saldo
  </button>
  </div>
  </form>

  <!-- HISTORIAL DE PAGOS -->
  ${
  this.facturaActual.pagos && this.facturaActual.pagos.length > 0
  ? `
  <div style="margin-top:25px;">
  <h3 style="margin:0 0 15px 0;color:#2c3e50;"> Historial de Pagos</h3>
  <div style="overflow-x:auto;">
  <table style="width:100%;border-collapse:collapse;">
  <thead>
  <tr style="background:#2c3e50;color:white;">
  <th style="padding:10px;text-align:left;">Fecha</th>
  <th style="padding:10px;text-align:left;">N° Pago</th>
  <th style="padding:10px;text-align:left;">Método</th>
  <th style="padding:10px;text-align:right;">Monto</th>
  <th style="padding:10px;text-align:left;">Notas</th>
  </tr>
  </thead>
  <tbody>
  ${this.facturaActual.pagos
.map(
  (pago) => `
  <tr style="border-bottom:1px solid #ecf0f1;">
  <td style="padding:10px;">${this.formatFecha(pago.fecha)}</td>
  <td style="padding:10px;font-weight:600;color:#3498db;">${pago.numero_pago}</td>
  <td style="padding:10px;">${this.formatMetodoPago(pago.metodo_pago)}</td>
  <td style="padding:10px;text-align:right;font-weight:600;color:#27ae60;">${this.formatCurrency(pago.monto)}</td>
  <td style="padding:10px;color:#7f8c8d;font-size:13px;">${pago.notas || "-"}</td>
  </tr>
  `,
  )
.join("")}
  </tbody>
  </table>
  </div>
  </div>
  `
: '<p style="color:#95a5a6;text-align:center;padding:20px;font-style:italic;">No hay pagos registrados aún</p>'
  }

  <!-- BOTONES -->
  <div style="margin-top:30px;display:flex;gap:15px;justify-content:flex-end;">
  <button
  type="button"
  onclick="PagosModule.cerrar()"
  style="background:#95a5a6;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;font-weight:600;">
  Cancelar
  </button>
  <button
  type="button"
  onclick="PagosModule.procesarPago()"
  style="background:#27ae60;color:white;border:none;padding:12px 30px;border-radius:5px;cursor:pointer;font-size:16px;font-weight:600;">
  Registrar Pago
  </button>
  </div>

  </div>
  </div>
  `;

  document.body.appendChild(modal);
  this.cambiarMetodoPago("efectivo");
  },

  // ==================== FUNCIONES DE INTERACCIÓN ====================

  validarMonto(monto) {
  const saldoPendiente = parseFloat(this.facturaActual.saldo_pendiente);
  const montoFloat = parseFloat(monto);

  if (montoFloat > saldoPendiente) {
  Toast.info(`El monto no puede exceder el saldo pendiente (${this.formatCurrency(saldoPendiente)})`);
  document.getElementById("montoPago").value = saldoPendiente;
  }
  },

  llenarMontoCompleto() {
  const saldoPendiente = parseFloat(this.facturaActual.saldo_pendiente);
  document.getElementById("montoPago").value = saldoPendiente.toFixed(2);
  },

  llenarMontoParcial(porcentaje) {
  const saldoPendiente = parseFloat(this.facturaActual.saldo_pendiente);
  const monto = (saldoPendiente * porcentaje) / 100;
  document.getElementById("montoPago").value = monto.toFixed(2);
  },

  cambiarMetodoPago(metodo) {
  const container = document.getElementById("camposMetodoPago");

  let html = "";

  if (metodo === "tarjeta" || metodo === "transferencia") {
  html = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Banco:</label>
  <input type="text" id="banco" placeholder="Nombre del banco" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Referencia:</label>
  <input type="text" id="referencia" placeholder="Número de referencia" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  </div>
  `;
  } else if (metodo === "cheque") {
  html = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Banco:</label>
  <input type="text" id="banco" placeholder="Banco emisor" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">N° Cheque:</label>
  <input type="text" id="numeroCheque" placeholder="Número de cheque" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  </div>
  `;
  } else if (metodo === "mixto") {
  html = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;">
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Efectivo:</label>
  <input type="number" id="montoEfectivo" step="0.01" placeholder="0.00" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Tarjeta:</label>
  <input type="number" id="montoTarjeta" step="0.01" placeholder="0.00" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  <div>
  <label style="display:block;margin-bottom:8px;font-weight:600;color:#2c3e50;">Transferencia:</label>
  <input type="number" id="montoTransferencia" step="0.01" placeholder="0.00" style="width:100%;padding:12px;border:2px solid #bdc3c7;border-radius:5px;font-size:14px;">
  </div>
  </div>
  `;
  }

  container.innerHTML = html;
  },

  // ==================== PROCESAR PAGO ====================

  async procesarPago() {
  try {
  const monto = document.getElementById("montoPago").value;
  const metodoPago = document.getElementById("metodoPago").value;
  const notas = document.getElementById("notasPago").value.trim();

  if (!monto || parseFloat(monto) <= 0) {
  Toast.warning("Debe especificar el monto del pago");
  return;
  }

  const pagoData = {
  factura_id: this.facturaActual.id,
  monto: parseFloat(monto),
  metodo_pago: metodoPago,
  notas: notas || null,
  };

  // Agregar campos según método
  if (metodoPago === "tarjeta" || metodoPago === "transferencia") {
  pagoData.banco = document.getElementById("banco")?.value || null;
  pagoData.referencia =
  document.getElementById("referencia")?.value || null;
  } else if (metodoPago === "cheque") {
  pagoData.banco = document.getElementById("banco")?.value || null;
  pagoData.numero_cheque =
  document.getElementById("numeroCheque")?.value || null;
  } else if (metodoPago === "mixto") {
  pagoData.monto_efectivo = parseFloat(
  document.getElementById("montoEfectivo")?.value || 0,
  );
  pagoData.monto_tarjeta = parseFloat(
  document.getElementById("montoTarjeta")?.value || 0,
  );
  pagoData.monto_transferencia = parseFloat(
  document.getElementById("montoTransferencia")?.value || 0,
  );
  }


  const resultado = await PagosAPI.registrar(pagoData);

  Toast.success(`Pago registrado exitosamente. Nuevo saldo: ${this.formatCurrency(resultado.nuevo_saldo)}`);

  this.cerrar();

  // Recargar lista de facturas
  if (window.FacturacionModule) {
  FacturacionModule.cargarFacturas();
  }
  } catch (error) {
  console.error(" Error al procesar pago:", error);
  Toast.error("Error al procesar pago: " + error.message);
  }
  },

  // ==================== UTILIDADES ====================

  cerrar() {
  const modal = document.getElementById("modalRegistrarPago");
  if (modal) modal.remove();
  this.facturaActual = null;
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
  month: "short",
  day: "numeric",
  });
  },

  formatMetodoPago(metodo) {
  const metodos = {
  efectivo: " Efectivo",
  tarjeta: " Tarjeta",
  transferencia: " Transferencia",
  cheque: " Cheque",
  mixto: " Mixto",
  };
  return metodos[metodo] || metodo;
  },
};

// Exportar
window.PagosModule = PagosModule;
