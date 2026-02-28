// ==================== MÓDULO DE BÚSQUEDA DE FACTURAS ====================

const FacturacionModule = {
  facturas: [],
  filtros: {
  fecha_desde: null,
  fecha_hasta: null,
  cliente_id: null,
  estado: null,
  codigo_producto: null,
  },

  // ==================== INICIALIZACIÓN ====================

  init() {
  this.setupEventListeners();
  this.cargarClientes();
  this.cargarFacturas();
  },

  setupEventListeners() {
  // Botones de filtro rápido
  const btnHoy = document.getElementById("filtroHoy");
  const btnSemana = document.getElementById("filtroSemana");
  const btnMes = document.getElementById("filtroMes");
  const btnTodo = document.getElementById("filtroTodo");

  if (btnHoy)
  btnHoy.addEventListener("click", () => this.aplicarFiltroRapido("hoy"));
  if (btnSemana)
  btnSemana.addEventListener("click", () =>
  this.aplicarFiltroRapido("semana"),
  );
  if (btnMes)
  btnMes.addEventListener("click", () => this.aplicarFiltroRapido("mes"));
  if (btnTodo)
  btnTodo.addEventListener("click", () => this.aplicarFiltroRapido("todo"));

  // Formulario de filtros avanzados
  const formFiltros = document.getElementById("formFiltrosFacturas");
  if (formFiltros) {
  formFiltros.addEventListener("submit", (e) => {
  e.preventDefault();
  this.aplicarFiltros();
  });
  }

  // Limpiar filtros
  const btnLimpiar = document.getElementById("limpiarFiltros");
  if (btnLimpiar) {
  btnLimpiar.addEventListener("click", () => this.limpiarFiltros());
  }

  },

  // ==================== CARGAR DATOS ====================

  async cargarClientes() {
  try {
  const clientes = await API.Clientes.getAll();
  const select = document.getElementById("filtroCliente");

  if (!select) return;

  select.innerHTML = '<option value="">Todos los clientes</option>';

  clientes.forEach((cliente) => {
  const option = document.createElement("option");
  option.value = cliente.id;
  option.textContent =
  `${cliente.nombre} ${cliente.apellido || ""}`.trim();
  select.appendChild(option);
  });

  } catch (error) {
  console.error(" Error al cargar clientes:", error);
  }
  },

  async cargarFacturas() {
  try {
  this.mostrarCargando(true);

  // Construir filtros
  const filtros = {};
  if (this.filtros.fecha_desde)
  filtros.fecha_inicio = this.filtros.fecha_desde;
  if (this.filtros.fecha_hasta)
  filtros.fecha_fin = this.filtros.fecha_hasta;
  if (this.filtros.cliente_id) filtros.cliente_id = this.filtros.cliente_id;
  if (this.filtros.estado) filtros.estado_pago = this.filtros.estado;
  if (this.filtros.codigo_producto) filtros.codigo_producto = this.filtros.codigo_producto;

  const response = await FacturacionAPI.getAll(filtros);
  this.facturas = response.data || response;


  this.renderizarFacturas();
  this.actualizarEstadisticas();
  } catch (error) {
  console.error(" Error al cargar facturas:", error);
  this.mostrarError("Error al cargar facturas: " + error.message);
  } finally {
  this.mostrarCargando(false);
  }
  },

  // ==================== RENDERIZAR ====================

  renderizarFacturas() {
  const tbody = document.getElementById("tablaFacturas");
  if (!tbody) return;

  if (this.facturas.length === 0) {
  tbody.innerHTML = `
  <tr>
  <td colspan="8" style="text-align: center; padding: 40px; color: #7f8c8d;">
  <div style="font-size: 48px; margin-bottom: 10px;"></div>
  <p style="font-size: 16px; margin: 5px 0;">No se encontraron facturas</p>
  <p style="font-size: 14px; color: #95a5a6;">Prueba ajustando los filtros</p>
  </td>
  </tr>
  `;
  return;
  }

  tbody.innerHTML = this.facturas
.map(
  (factura) => `
  <tr style="cursor: pointer;" onclick="FacturacionModule.verDetalleFactura(${factura.id})">
  <td style="font-weight: 600; color: #3498db;">#${factura.numero_factura}</td>
  <td>${this.formatFecha(factura.fecha)}</td>
  <td>${(factura.cliente_nombre || "").trim() || "Cliente General"}</td>
  <td style="text-align: right; font-weight: 600;">
  ${parseFloat(factura.total_devuelto) > 0
    ? `<span style="text-decoration:line-through;color:#95a5a6;font-size:11px;display:block;">${this.formatCurrency(factura.total)}</span>
       <span style="color:#27ae60;">${this.formatCurrency(factura.total_neto)}</span>
       <span style="background:#c0392b;color:white;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;display:inline-block;margin-top:2px;">Dev.</span>`
    : `<span style="color:#27ae60;">${this.formatCurrency(factura.total)}</span>`
  }
  </td>
  <td style="text-align: center;">
  ${this.getBadgeTipoFactura(factura.tipo_factura)}
  </td>
  <td style="text-align: center;">
  ${this.getBadgeEstado(factura.estado)}
  </td>
  <td style="text-align: center;">
  <div class="flex-gap-sm" style="justify-content:center;">
 <button
  class="btn btn-info btn-small"
  onclick="event.stopPropagation(); FacturacionModule.verDetalleFactura(${factura.id})"
  title="Ver detalle"
  >Ver detalle</button>
  <button
  class="btn btn-primary btn-small"
  onclick="event.stopPropagation(); FacturacionModule.imprimirFactura(${factura.id})"
  title="Imprimir"
  >Imprimir</button>
  ${
  factura.estado !== "anulada" && factura.estado !== "pagada"
  ? `
  <button
  class="btn btn-success btn-small"
  onclick="event.stopPropagation(); PagosModule.mostrarModal(${factura.id})"
  title="Registrar Pago"
  style="background:#27ae60;"
  >Registrar pago</button>
  `
: ""
  }
  ${
  factura.estado !== "anulada"
  ? `
  <button
  class="btn btn-warning btn-small"
  onclick="event.stopPropagation(); DevolucionModule.mostrarModal(${factura.id})"
  title="Procesar Devolución"
  style="background:#f39c12;"
  >Devolución</button>
  <button
  class="btn btn-danger btn-small"
  onclick="event.stopPropagation(); FacturacionModule.anularFactura(${factura.id})"
  title="Anular"
  >Anular</button>
  `
: ""
  }
  </div>
  </td>
  </tr>
  `,
  )
.join("");
  },

  actualizarEstadisticas() {
  // Total facturas
  const totalFacturas = this.facturas.length;
  const totalFacturasEl = document.getElementById("totalFacturas");
  if (totalFacturasEl) totalFacturasEl.textContent = totalFacturas;

  // Total monto
  const totalMonto = this.facturas.reduce(
  (sum, f) => sum + parseFloat(f.total || 0),
  0,
  );
  const totalMontoEl = document.getElementById("totalMonto");
  if (totalMontoEl)
  totalMontoEl.textContent = this.formatCurrency(totalMonto);

  // Facturas pendientes
  const pendientes = this.facturas.filter(
  (f) => f.estado === "pendiente",
  ).length;
  const pendientesEl = document.getElementById("facturasPendientes");
  if (pendientesEl) pendientesEl.textContent = pendientes;

  // Facturas pagadas
  const pagadas = this.facturas.filter((f) => f.estado === "pagada").length;
  const pagadasEl = document.getElementById("facturasPagadas");
  if (pagadasEl) pagadasEl.textContent = pagadas;
  },

  // ==================== FILTROS ====================

  aplicarFiltroRapido(periodo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  switch (periodo) {
  case "hoy":
  this.filtros.fecha_desde = hoy.toISOString().split("T")[0];
  this.filtros.fecha_hasta = hoy.toISOString().split("T")[0];
  break;

  case "semana":
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - 7);
  this.filtros.fecha_desde = inicioSemana.toISOString().split("T")[0];
  this.filtros.fecha_hasta = hoy.toISOString().split("T")[0];
  break;

  case "mes":
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  this.filtros.fecha_desde = inicioMes.toISOString().split("T")[0];
  this.filtros.fecha_hasta = hoy.toISOString().split("T")[0];
  break;

  case "todo":
  this.filtros.fecha_desde = null;
  this.filtros.fecha_hasta = null;
  break;
  }

  // Actualizar UI de filtros
  const fechaDesde = document.getElementById("filtroFechaDesde");
  const fechaHasta = document.getElementById("filtroFechaHasta");
  if (fechaDesde) fechaDesde.value = this.filtros.fecha_desde || "";
  if (fechaHasta) fechaHasta.value = this.filtros.fecha_hasta || "";

  this.cargarFacturas();
  },

  aplicarFiltros() {
  this.filtros.fecha_desde =
  document.getElementById("filtroFechaDesde")?.value || null;
  this.filtros.fecha_hasta =
  document.getElementById("filtroFechaHasta")?.value || null;
  this.filtros.cliente_id =
  document.getElementById("filtroCliente")?.value || null;
  this.filtros.estado =
  document.getElementById("filtroEstado")?.value || null;
  this.filtros.codigo_producto =
  document.getElementById("filtroCodigoProducto")?.value.trim() || null;

  this.cargarFacturas();
  },

  limpiarFiltros() {
  this.filtros = {
  fecha_desde: null,
  fecha_hasta: null,
  cliente_id: null,
  estado: null,
  codigo_producto: null,
  };

  // Limpiar UI
  const form = document.getElementById("formFiltrosFacturas");
  if (form) form.reset();

  this.cargarFacturas();
  },

  // ==================== ACCIONES ====================

  async verDetalleFactura(facturaId) {
  try {
  const response = await FacturacionAPI.getById(facturaId);
  const factura = response.data || response;


  // Verificar que FacturaImpresion existe
  if (typeof window.FacturaImpresion === "undefined") {
  console.error(" FacturaImpresion no está cargado");
  Toast.error("Error: El módulo de impresión no está disponible");
  return;
  }

  // Verificar que tiene la función mostrarFactura
  if (typeof window.FacturaImpresion.mostrarFactura !== "function") {
  console.error(" FacturaImpresion.mostrarFactura no es una función");
  Toast.error("Error: La función de impresión no está disponible");
  return;
  }

  // Mostrar la factura
  window.FacturaImpresion.mostrarFactura(factura);
  } catch (error) {
  console.error(" Error al cargar factura:", error);
  this.mostrarError("Error al cargar factura: " + error.message);
  }
  },

  async imprimirFactura(facturaId) {
  try {
  const response = await FacturacionAPI.getById(facturaId);
  const factura = response.data || response;

  if (window.FacturaImpresion) {
  FacturaImpresion.mostrarFactura(factura);
  } else {
  window.print();
  }
  } catch (error) {
  console.error(" Error al imprimir factura:", error);
  this.mostrarError("Error al imprimir factura");
  }
  },

  async anularFactura(facturaId) {
  const motivo = prompt("Motivo de anulación:");

  if (!motivo || motivo.trim() === "") {
  Toast.warning("Debe proporcionar un motivo de anulación");
  return;
  }

  if (!confirm("¿Está seguro de anular esta factura?")) {
  return;
  }

  try {
  await FacturacionAPI.anular(facturaId, motivo);
  Toast.success("Factura anulada exitosamente");
  this.cargarFacturas();
  } catch (error) {
  console.error(" Error al anular factura:", error);
  this.mostrarError("Error al anular factura: " + error.message);
  }
  },

  // ==================== UTILIDADES ====================

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

  getBadgeTipoFactura(tipo) {
  const tipos = {
  contado:
  '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"> CONTADO</span>',
  credito:
  '<span style="background: #e67e22; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"> CRÉDITO</span>',
  };
  return tipos[tipo] || tipo;
  },

  getBadgeEstado(estado) {
  const estados = {
  pendiente:
  '<span style="background: #f39c12; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"> PENDIENTE</span>',
  pagada:
  '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"> PAGADA</span>',
  vencida:
  '<span style="background: #e74c3c; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"> VENCIDA</span>',
  anulada:
  '<span style="background: #95a5a6; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;"> ANULADA</span>',
  };
  return estados[estado] || estado;
  },

  mostrarCargando(mostrar) {
  const loader = document.getElementById("loaderFacturas");
  if (loader) {
  loader.style.display = mostrar ? "block": "none";
  }
  },

  mostrarError(mensaje) {
  Toast.error(mensaje);
  },
};

// Exportar
window.FacturacionModule = FacturacionModule;
