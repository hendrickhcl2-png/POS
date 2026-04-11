// ==================== MÓDULO DE CLIENTES ====================
// Lógica completa de gestión de clientes en el frontend

const ClientesModule = {
  // Variables del módulo
  clientes: [],
  clientesConSaldo: [],
  clienteActual: null,
  _paginator: null,

  // Inicializar módulo
  init() {
  this.setupEventListeners();
  this.cargarClientes();
  },

  // Configurar event listeners
  setupEventListeners() {
  const btnAgregar = document.getElementById("btnAgregarCliente");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", () => this.mostrarModalCliente());
  }

  const form = document.getElementById("formCliente");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.guardarCliente();
    });
  }
  },

  // ==================== CARGAR CLIENTES ====================

  async cargarClientes() {
  try {
    this.clientes = await ClientesAPI.getAll();
    this._renderStats(this.clientes);
    this.actualizarTablaClientes(this.clientes);
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    mostrarAlerta("Error al cargar clientes: " + error.message, "danger");
  }
  },

  // ==================== FILTRAR LOCAL ====================

  filtrarLocal(texto) {
  const q = (texto || "").toLowerCase().trim();
  if (!q) {
    this.actualizarTablaClientes(this.clientes);
    return;
  }
  const filtrados = this.clientes.filter((c) =>
    (`${c.nombre} ${c.apellido || ""}`).toLowerCase().includes(q) ||
    (c.cedula || "").toLowerCase().includes(q) ||
    (c.telefono || "").toLowerCase().includes(q) ||
    (c.email || "").toLowerCase().includes(q)
  );
  this.actualizarTablaClientes(filtrados);
  },

  // ==================== STATS BAR ====================

  _renderStats(clientes) {
  const container = document.getElementById("clientesStats");
  if (!container) return;

  const conDeuda = clientes.filter(c => parseFloat(c.saldo_pendiente) > 0).length;
  const sinDeuda = clientes.length - conDeuda;

  container.innerHTML = `
    <div class="kpi-card kpi--blue">
      <div class="kpi-card-accent"></div>
      <div class="kpi-card-label">Total clientes</div>
      <div class="kpi-card-value">${clientes.length}</div>
    </div>
    <div class="kpi-card kpi--green">
      <div class="kpi-card-accent"></div>
      <div class="kpi-card-label">Al corriente</div>
      <div class="kpi-card-value">${sinDeuda}</div>
    </div>
    <div class="kpi-card kpi--red">
      <div class="kpi-card-accent"></div>
      <div class="kpi-card-label">Con saldo pendiente</div>
      <div class="kpi-card-value">${conDeuda}</div>
    </div>`;
  },

  // ==================== ACTUALIZAR TABLA ====================

  actualizarTablaClientes(clientes) {
  if (!this._paginator) {
    this._paginator = new Paginator('tablaClientes', 20);
  }
  this._paginator.render(
    (clientes || []).map((c) => {
      const iniciales = this.getIniciales(c.nombre, c.apellido);
      const nombreCompleto = `${c.nombre} ${c.apellido || ""}`.trim();
      const saldo = parseFloat(c.saldo_pendiente) || 0;
      const tieneDeuda = saldo > 0;
      return `
        <tr>
          <td>
            <div class="client-cell">
              <div class="avatar-circle" style="font-size:14px;">${iniciales}</div>
              <div>
                <strong class="client-cell__name">${nombreCompleto}</strong>
                ${c.cedula ? `<br><small style="color:var(--clr-muted);">${c.cedula}</small>` : ""}
                ${c.rnc ? `<br><small style="color:var(--clr-muted);">RNC: ${c.rnc}</small>` : ""}
              </div>
            </div>
          </td>
          <td>
            ${c.telefono ? `<div style="font-size:13px;">${c.telefono}</div>` : ""}
            ${c.email ? `<div style="font-size:12px;color:var(--clr-muted);">${c.email}</div>` : ""}
            ${!c.telefono && !c.email ? `<span style="color:var(--clr-muted);">—</span>` : ""}
          </td>
          <td style="text-align:right;">
            ${tieneDeuda
              ? `<span style="background:var(--clr-danger);color:white;padding:4px 10px;border-radius:8px;font-weight:700;font-size:13px;">${Formatters.formatCurrency(saldo)}</span>`
              : `<span style="color:var(--clr-success);font-weight:600;font-size:13px;">Al corriente</span>`}
          </td>
          <td style="text-align:center;">
            <div class="flex-gap-sm" style="justify-content:center;">
              <button class="btn btn-secondary btn-small" onclick="ClientesModule.verDetalleCliente(${c.id})">Ver</button>
              ${window.Auth?.isAdmin() ? `<button class="btn btn-primary btn-small" onclick="ClientesModule.editarCliente(${c.id})">Editar</button>` : ""}
              ${window.Auth?.isAdmin() ? `<button class="btn btn-danger btn-small" onclick="ClientesModule.confirmarEliminar(${c.id})">Eliminar</button>` : ""}
            </div>
          </td>
        </tr>`;
    }),
    `<tr><td colspan="4" class="text-center" style="padding:48px;color:var(--clr-muted);"><p style="margin:0;font-size:15px;">No hay clientes registrados</p></td></tr>`
  );
  },

  // ==================== MOSTRAR MODAL ====================

  async mostrarModalCliente(clienteId = null) {
  const modal = document.getElementById("modalCliente");
  if (!modal) {
  console.error(" Modal de cliente no encontrado");
  mostrarAlerta("Error: Modal no encontrado", "danger");
  return;
  }

  this.clienteActual = clienteId;

  // Cambiar título
  const titulo = document.getElementById("tituloModalCliente");
  if (titulo) {
  titulo.textContent = clienteId
  ? " Editar Cliente"
: " Agregar Cliente";
  }

  // Limpiar formulario
  document.getElementById("clienteId").value = "";
  document.getElementById("clienteNombre").value = "";
  document.getElementById("clienteApellido").value = "";
  document.getElementById("clienteCedula").value = "";
  document.getElementById("clienteRnc").value = "";
  document.getElementById("clienteTelefono").value = "";
  document.getElementById("clienteEmail").value = "";
  document.getElementById("clienteDireccion").value = "";
  document.getElementById("clienteNotas").value = "";

  // Si es edición, cargar datos
  if (clienteId) {
  await this.cargarDatosCliente(clienteId);
  }

  // Mostrar modal
  modal.classList.add("active");
  },

  cerrarModalCliente() {
  const modal = document.getElementById("modalCliente");
  if (modal) {
  modal.classList.remove("active");
  this.clienteActual = null;
  }
  },

  // ==================== CARGAR DATOS CLIENTE ====================

  async cargarDatosCliente(clienteId) {
  try {
  const cliente = await ClientesAPI.getById(clienteId);

  document.getElementById("clienteId").value = cliente.id;
  document.getElementById("clienteNombre").value = cliente.nombre || "";
  document.getElementById("clienteApellido").value = cliente.apellido || "";
  document.getElementById("clienteCedula").value = cliente.cedula || "";
  document.getElementById("clienteRnc").value = cliente.rnc || "";
  document.getElementById("clienteTelefono").value = cliente.telefono || "";
  document.getElementById("clienteEmail").value = cliente.email || "";
  document.getElementById("clienteDireccion").value =
  cliente.direccion || "";
  document.getElementById("clienteNotas").value = cliente.notas || "";
  } catch (error) {
  console.error(" Error al cargar cliente:", error);
  mostrarAlerta("Error al cargar datos del cliente", "danger");
  }
  },

  // ==================== GUARDAR CLIENTE ====================

  async guardarCliente() {
  const clienteId = getValue("clienteId");

  const data = {
  nombre: getValue("clienteNombre"),
  apellido: getValue("clienteApellido"),
  cedula: getValue("clienteCedula"),
  rnc: getValue("clienteRnc"),
  telefono: getValue("clienteTelefono"),
  email: getValue("clienteEmail"),
  direccion: getValue("clienteDireccion"),
  notas: getValue("clienteNotas"),
  };

  // Validación
  if (!data.nombre || data.nombre.trim() === "") {
  mostrarAlerta("El nombre es obligatorio", "warning");
  document.getElementById("clienteNombre").focus();
  return;
  }

  try {
  if (clienteId) {
  // Actualizar
  await ClientesAPI.update(clienteId, data);
  mostrarAlerta(" Cliente actualizado exitosamente", "success");
  } else {
  // Crear
  await ClientesAPI.create(data);
  mostrarAlerta(" Cliente creado exitosamente", "success");
  }

  this.cerrarModalCliente();
  await this.cargarClientes();
  } catch (error) {
  console.error(" Error al guardar cliente:", error);
  mostrarAlerta("Error al guardar cliente: " + error.message, "danger");
  }
  },

  // ==================== VER DETALLE ====================

  async verDetalleCliente(clienteId) {
  try {
  const cliente = await ClientesAPI.getById(clienteId);
  const estadisticas = await ClientesAPI.getEstadisticas(clienteId);

  const modal = document.getElementById("modalDetalleCliente");
  if (!modal) {
  console.error(" Modal de detalle no encontrado");
  return;
  }

  const nombreCompleto =
  `${cliente.nombre} ${cliente.apellido || ""}`.trim();
  const iniciales = this.getIniciales(cliente.nombre, cliente.apellido);

  let content = `
  <div class="card-hero" style="padding:40px;margin:-25px -25px 30px -25px;">
  <div style="display: flex; align-items: center; gap: 20px;">
  <div class="hero-avatar">
  ${iniciales}
  </div>
  <div>
  <h2 style="margin: 0; font-size: 32px;">${nombreCompleto}</h2>
  <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">Cliente desde ${Formatters.formatFecha(cliente.created_at)}</p>
  </div>
  </div>
  </div>

  <div class="info-grid--2" style="gap:20px;margin-bottom:30px;">
  <div>
  <h4 style="color: #2c3e50; margin-bottom: 10px;"> Información Personal</h4>
  <p><strong>Nombre:</strong> ${cliente.nombre}</p>
  ${cliente.apellido ? `<p><strong>Apellido:</strong> ${cliente.apellido}</p>`: ""}
  ${cliente.cedula ? `<p><strong>Cédula:</strong> ${cliente.cedula}</p>`: ""}
  ${cliente.rnc ? `<p><strong>RNC:</strong> ${cliente.rnc}</p>`: ""}
  </div>
  <div>
  <h4 style="color: #2c3e50; margin-bottom: 10px;"> Contacto</h4>
  ${cliente.telefono ? `<p><strong>Teléfono:</strong> ${cliente.telefono}</p>`: ""}
  ${cliente.email ? `<p><strong>Email:</strong> ${cliente.email}</p>`: ""}
  ${cliente.direccion ? `<p><strong>Dirección:</strong> ${cliente.direccion}</p>`: ""}
  </div>
  </div>

  ${cliente.notas
  ? `
  <div class="info-panel info-panel--blue" style="margin-bottom:30px;">
  <h4 style="color: #2c3e50; margin: 0 0 10px 0;"> Notas</h4>
  <p style="margin: 0;">${cliente.notas}</p>
  </div>
  `
: ""
  }

  <h4 style="color: #2c3e50; margin-bottom: 15px;"> Estadísticas</h4>
  <div class="kpi-grid" style="margin-bottom:30px;">
  <div class="kpi-card kpi--purple">
    <div class="kpi-card-accent"></div>
    <div class="kpi-card-label">Compras</div>
    <div class="kpi-card-value">${estadisticas.total_compras || 0}</div>
  </div>
  <div class="kpi-card kpi--blue">
    <div class="kpi-card-accent"></div>
    <div class="kpi-card-label">Gastado</div>
    <div class="kpi-card-value">${Formatters.formatCurrency(estadisticas.total_gastado || 0)}</div>
  </div>
  <div class="kpi-card kpi--teal">
    <div class="kpi-card-accent"></div>
    <div class="kpi-card-label">Facturas</div>
    <div class="kpi-card-value">${estadisticas.total_facturas || 0}</div>
  </div>
  <div class="kpi-card ${estadisticas.saldo_pendiente > 0 ? 'kpi--amber' : 'kpi--green'}">
    <div class="kpi-card-accent"></div>
    <div class="kpi-card-label">Saldo Pendiente</div>
    <div class="kpi-card-value">${Formatters.formatCurrency(estadisticas.saldo_pendiente || 0)}</div>
  </div>
  </div>

  <div class="flex-end">
  ${estadisticas.saldo_pendiente > 0
  ? `<button class="btn btn-warning" onclick="ClientesModule.verEstadoCuenta(${clienteId})">
  Ver Estado de Cuenta
  </button>
  <button class="btn btn-info" onclick="ClientesModule.imprimirEstadoCuenta(${clienteId})">
  Imprimir Estado de Cuenta
  </button>`
: ""
  }
  <button class="btn btn-primary" onclick="ClientesModule.editarCliente(${clienteId}); ClientesModule.cerrarModalDetalleCliente();">
  Editar Cliente
  </button>
  <button class="btn btn-secondary" onclick="ClientesModule.cerrarModalDetalleCliente()">
  Cerrar
  </button>
  </div>
  `;

  document.getElementById("detalleClienteContent").innerHTML = content;
  modal.classList.add("active");
  } catch (error) {
  console.error(" Error al cargar detalle:", error);
  mostrarAlerta("Error al cargar detalle del cliente", "danger");
  }
  },

  cerrarModalDetalleCliente() {
  const modal = document.getElementById("modalDetalleCliente");
  if (modal) {
  modal.classList.remove("active");
  }
  },

  // ==================== EDITAR CLIENTE ====================

  async editarCliente(clienteId) {
  await this.mostrarModalCliente(clienteId);
  },

  // ==================== ELIMINAR CLIENTE ====================

  confirmarEliminar(clienteId) {
  const cliente = this.getClienteById(clienteId);
  if (!cliente) return;

  const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ""}`.trim();

  if (
  confirm(
  `¿Está seguro que desea eliminar al cliente "${nombreCompleto}"?\n\nEsta acción no se puede deshacer.`,
  )
  ) {
  this.eliminarCliente(clienteId);
  }
  },

  async eliminarCliente(clienteId) {
  try {
  await ClientesAPI.delete(clienteId);
  mostrarAlerta(" Cliente eliminado exitosamente", "success");
  await this.cargarClientes();
  } catch (error) {
  console.error(" Error al eliminar cliente:", error);
  mostrarAlerta("Error al eliminar cliente: " + error.message, "danger");
  }
  },

  // ==================== ESTADO DE CUENTA ====================

  async verEstadoCuenta(clienteId) {
  await this.imprimirEstadoCuenta(clienteId);
  },

  // ==================== IMPRIMIR ESTADO DE CUENTA ====================

  async imprimirEstadoCuenta(clienteId) {
  try {
    const data = await ClientesAPI.getReporteCredito(clienteId);
    const { cliente, facturas } = data;
    const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ""}`.trim();
    const totalOriginal = facturas.reduce((s, f) => s + parseFloat(f.total || 0), 0);
    const totalPagado = facturas.reduce((s, f) => s + parseFloat(f.monto_pagado || 0), 0);
    const totalPendiente = facturas.reduce((s, f) => s + parseFloat(f.saldo_pendiente || 0), 0);

    const cfg = window.configuracion || {};
    const config = {
      nombre: cfg.nombre_negocio || "FIFTY TECH SRL",
      rnc: cfg.rnc || "",
      direccion: cfg.direccion || "",
      telefono: cfg.telefono || "",
      nombre_impresora: cfg.nombre_impresora || "",
    };

    // Store for thermal printing
    this._edoCuentaData = { cliente, facturas, config, totalOriginal, totalPagado, totalPendiente };

    // Build all payment rows from all invoices
    const allPagos = [];
    facturas.forEach(f => {
      (f.pagos || []).forEach(p => {
        allPagos.push({ ...p, numero_factura: f.numero_factura });
      });
    });
    allPagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const formatCurrency = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(parseFloat(n) || 0);
    const formatFecha = (f) => {
      if (!f) return "—";
      const d = new Date(f);
      return d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
    };
    const hoy = new Date().toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });

    // Build invoice rows
    const filasFacturas = facturas.map(f => {
      const estadoColor = f.estado === 'pagada' ? '#27ae60' : f.estado === 'parcial' ? '#f39c12' : '#e74c3c';
      const estadoLabel = f.estado === 'pagada' ? 'Pagada' : f.estado === 'parcial' ? 'Parcial' : 'Pendiente';
      return `<tr style="border-bottom:1px solid #ecf0f1;">
        <td style="padding:8px 10px;font-size:13px;">${f.numero_factura}</td>
        <td style="padding:8px 10px;font-size:13px;">${formatFecha(f.fecha)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:13px;">${formatCurrency(f.total)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:13px;color:#27ae60;">${formatCurrency(f.monto_pagado)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:700;color:${estadoColor};">${formatCurrency(f.saldo_pendiente)}</td>
        <td style="padding:8px 10px;text-align:center;"><span style="background:${estadoColor};color:white;padding:2px 10px;border-radius:10px;font-size:11px;">${estadoLabel}</span></td>
      </tr>`;
    }).join('');

    // Build payment rows
    const filasPagos = allPagos.length > 0
      ? allPagos.map(p => `<tr style="border-bottom:1px solid #ecf0f1;">
          <td style="padding:8px 10px;font-size:13px;">${formatFecha(p.fecha)}</td>
          <td style="padding:8px 10px;font-size:12px;color:#7f8c8d;">${p.numero_pago || '—'}</td>
          <td style="padding:8px 10px;font-size:13px;">${p.numero_factura}</td>
          <td style="padding:8px 10px;text-align:right;font-weight:600;color:#27ae60;">${formatCurrency(p.monto)}</td>
          <td style="padding:8px 10px;text-align:center;font-size:12px;text-transform:capitalize;">${p.metodo_pago || '—'}</td>
          <td style="padding:8px 10px;font-size:12px;color:#7f8c8d;">${p.referencia || p.banco || '—'}</td>
        </tr>`).join('')
      : `<tr><td colspan="6" style="padding:20px;text-align:center;color:#7f8c8d;">Sin pagos registrados</td></tr>`;

    // Remove previous modal
    const prev = document.getElementById("modalEstadoCuentaImprimir");
    if (prev) prev.remove();

    const modal = document.createElement("div");
    modal.id = "modalEstadoCuentaImprimir";
    modal.className = "js-overlay";

    modal.innerHTML = `
    <div class="js-modal" style="max-width:780px;">
      <div class="no-print factura-action-bar">
        <span class="factura-action-bar__title">Estado de Cuenta — ${nombreCompleto}</span>
        <div class="flex-row flex-row--gap-10">
          <button type="button" onclick="ClientesModule._imprimirEdoCuentaTermica()" class="factura-btn factura-btn--purple">Termica</button>
          <button type="button" onclick="ClientesModule._imprimirEdoCuentaHTML()" class="factura-btn factura-btn--green">Imprimir</button>
          <button type="button" onclick="ClientesModule._imprimirEdoCuentaHTML()" class="factura-btn factura-btn--blue">PDF</button>
          <button type="button" onclick="document.getElementById('modalEstadoCuentaImprimir').remove()" class="factura-btn factura-btn--red">Cerrar</button>
        </div>
      </div>

      <div id="contenidoEstadoCuenta" class="factura-print-body">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #2c3e50;">
          <div>
            <img src="/images/Logotipo.png" alt="Logo" style="height:64px;width:auto;margin-bottom:6px;display:block;" />
            <h1 style="margin:0;font-size:24px;color:#2c3e50;">${config.nombre}</h1>
            <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">${config.direccion}</p>
            <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">Tel: ${config.telefono}</p>
            <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">RNC: ${config.rnc}</p>
          </div>
          <div style="text-align:right;">
            <div style="background:#3498db;color:white;padding:5px 15px;border-radius:20px;font-size:13px;font-weight:bold;display:inline-block;">ESTADO DE CUENTA</div>
            <p style="margin:8px 0 3px 0;color:#7f8c8d;font-size:13px;">Fecha: ${hoy}</p>
          </div>
        </div>

        <!-- Client info -->
        <div style="background:#f8f9fa;border-radius:8px;padding:12px 18px;margin-bottom:18px;">
          <strong style="color:#2c3e50;font-size:14px;">Cliente:</strong>
          <span style="color:#2c3e50;font-size:14px;margin-left:10px;">${nombreCompleto}</span>
          ${cliente.cedula ? `<span style="color:#7f8c8d;font-size:12px;margin-left:15px;">Cedula: ${cliente.cedula}</span>` : ""}
          ${cliente.rnc ? `<span style="color:#7f8c8d;font-size:12px;margin-left:15px;">RNC: ${cliente.rnc}</span>` : ""}
          ${cliente.telefono ? `<br><span style="color:#7f8c8d;font-size:12px;">Tel: ${cliente.telefono}</span>` : ""}
        </div>

        <!-- Summary -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
          <div style="background:#e3f2fd;padding:12px;border-radius:8px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#1976d2;">Monto Original</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1565c0;">${formatCurrency(totalOriginal)}</p>
          </div>
          <div style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#388e3c;">Total Pagado</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#2e7d32;">${formatCurrency(totalPagado)}</p>
          </div>
          <div style="background:${totalPendiente > 0 ? '#ffebee' : '#e8f5e9'};padding:12px;border-radius:8px;text-align:center;">
            <p style="margin:0;font-size:12px;color:${totalPendiente > 0 ? '#c62828' : '#388e3c'};">Saldo Pendiente</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${totalPendiente > 0 ? '#d32f2f' : '#2e7d32'};">${formatCurrency(totalPendiente)}</p>
          </div>
        </div>

        <!-- Invoices table -->
        <h4 style="color:#2c3e50;margin:0 0 10px;border-bottom:2px solid #3498db;padding-bottom:5px;">Facturas</h4>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#2c3e50;color:white;">
              <th style="padding:8px 10px;text-align:left;font-size:12px;">Factura</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;">Fecha</th>
              <th style="padding:8px 10px;text-align:right;font-size:12px;">Original</th>
              <th style="padding:8px 10px;text-align:right;font-size:12px;">Pagado</th>
              <th style="padding:8px 10px;text-align:right;font-size:12px;">Pendiente</th>
              <th style="padding:8px 10px;text-align:center;font-size:12px;">Estado</th>
            </tr>
          </thead>
          <tbody>${filasFacturas}</tbody>
        </table>

        <!-- Payments table -->
        <h4 style="color:#2c3e50;margin:0 0 10px;border-bottom:2px solid #27ae60;padding-bottom:5px;">Historial de Pagos</h4>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#27ae60;color:white;">
              <th style="padding:8px 10px;text-align:left;font-size:12px;">Fecha</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;"># Pago</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;">Factura</th>
              <th style="padding:8px 10px;text-align:right;font-size:12px;">Monto</th>
              <th style="padding:8px 10px;text-align:center;font-size:12px;">Metodo</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;">Referencia</th>
            </tr>
          </thead>
          <tbody>${filasPagos}</tbody>
          ${allPagos.length > 0 ? `<tfoot>
            <tr style="background:#f8f9fa;border-top:2px solid #27ae60;">
              <td colspan="3" style="padding:10px;font-weight:700;font-size:13px;">Total Pagado</td>
              <td style="padding:10px;text-align:right;font-weight:700;color:#27ae60;font-size:15px;">${formatCurrency(totalPagado)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>` : ''}
        </table>

        <!-- Footer -->
        <div style="margin-top:20px;padding-top:15px;border-top:1px dashed #bdc3c7;text-align:center;">
          <p style="margin:3px 0;color:#7f8c8d;font-size:12px;">Estado de cuenta generado el ${hoy}</p>
          <p style="margin:3px 0;color:#7f8c8d;font-size:11px;">${config.nombre} — Tel: ${config.telefono}</p>
        </div>
      </div>
    </div>`;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Error al generar estado de cuenta:", error);
    mostrarAlerta("Error al generar estado de cuenta: " + error.message, "danger");
  }
  },

  _imprimirEdoCuentaHTML() {
  const contenido = document.getElementById("contenidoEstadoCuenta");
  if (!contenido) return;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Estado de Cuenta</title>
<style>
  @page { size: auto; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; font-size: 13px; }
  .no-print { display: none !important; }
  table { border-collapse: collapse; }
</style></head>
<body>${contenido.innerHTML}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 300);
  },

  _imprimirEdoCuentaTermica() {
  const d = this._edoCuentaData;
  if (!d) return;

  fetch("/api/imprimir/estado-cuenta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cliente: d.cliente,
      facturas: d.facturas,
      config: d.config,
      totalOriginal: d.totalOriginal,
      totalPagado: d.totalPagado,
      totalPendiente: d.totalPendiente,
      impresora: d.config.nombre_impresora || "Termica",
    }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        window.Toast?.success("Imprimiendo estado de cuenta...");
      } else {
        window.Toast?.error("Error al imprimir: " + data.message);
      }
    })
    .catch(() => window.Toast?.error("No se pudo conectar con la impresora"));
  },

  // ==================== UTILIDADES ====================

  getIniciales(nombre, apellido) {
  const inicial1 = nombre ? nombre.charAt(0).toUpperCase(): "";
  const inicial2 = apellido ? apellido.charAt(0).toUpperCase(): "";
  return inicial1 + inicial2 || "??";
  },

  getClienteById(id) {
  return this.clientes.find((c) => c.id === id);
  },

  // Método para obtener clientes (usado por otros módulos)
  getClientesParaSelect() {
  return this.clientes.map((c) => ({
  id: c.id,
  nombre: `${c.nombre} ${c.apellido || ""}`.trim(),
  }));
  },
};

// Exportar módulo (sin auto-inicializar)
window.ClientesModule = ClientesModule;
