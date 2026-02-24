// ==================== MÓDULO DE CLIENTES ====================
// Lógica completa de gestión de clientes en el frontend

const ClientesModule = {
  // Variables del módulo
  clientes: [],
  clientesConSaldo: [],
  clienteActual: null,

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
    <div style="background:var(--clr-bg-surface);border:1px solid var(--clr-border);border-radius:10px;padding:16px 24px;flex:1;min-width:140px;">
      <div style="font-size:12px;color:var(--clr-muted);margin-bottom:4px;">Total clientes</div>
      <div style="font-size:28px;font-weight:700;color:var(--clr-dark);">${clientes.length}</div>
    </div>
    <div style="background:var(--clr-bg-surface);border:1px solid var(--clr-border);border-radius:10px;padding:16px 24px;flex:1;min-width:140px;">
      <div style="font-size:12px;color:var(--clr-muted);margin-bottom:4px;">Al corriente</div>
      <div style="font-size:28px;font-weight:700;color:var(--clr-success);">${sinDeuda}</div>
    </div>
    <div style="background:var(--clr-bg-surface);border:1px solid var(--clr-border);border-radius:10px;padding:16px 24px;flex:1;min-width:140px;">
      <div style="font-size:12px;color:var(--clr-muted);margin-bottom:4px;">Con saldo pendiente</div>
      <div style="font-size:28px;font-weight:700;color:var(--clr-danger);">${conDeuda}</div>
    </div>`;
  },

  // ==================== ACTUALIZAR TABLA ====================

  actualizarTablaClientes(clientes) {
  const tbody = document.getElementById("tablaClientes");
  if (!tbody) return;

  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center" style="padding:48px;color:var(--clr-muted);">
          <p style="margin:0;font-size:15px;">No hay clientes registrados</p>
          <p style="margin:6px 0 0;font-size:13px;">Haz clic en "+ Nuevo Cliente" para comenzar</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = clientes.map((c) => {
    const iniciales = this.getIniciales(c.nombre, c.apellido);
    const nombreCompleto = `${c.nombre} ${c.apellido || ""}`.trim();
    const saldo = parseFloat(c.saldo_pendiente) || 0;
    const tieneDeuda = saldo > 0;

    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="
            width:40px;height:40px;border-radius:50%;flex-shrink:0;
            background:var(--clr-primary);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:14px;">
            ${iniciales}
          </div>
          <div>
            <strong style="font-size:14px;color:var(--clr-dark);">${nombreCompleto}</strong>
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
          ? `<span style="background:var(--clr-danger);color:white;padding:4px 10px;border-radius:8px;font-weight:700;font-size:13px;">
              ${Formatters.formatCurrency(saldo)}
             </span>`
          : `<span style="color:var(--clr-success);font-weight:600;font-size:13px;">Al corriente</span>`}
      </td>
      <td style="text-align:center;">
        <div style="display:flex;gap:6px;justify-content:center;">
          <button class="btn btn-secondary btn-small" onclick="ClientesModule.verDetalleCliente(${c.id})">Ver</button>
          <button class="btn btn-primary btn-small" onclick="ClientesModule.editarCliente(${c.id})">Editar</button>
          <button class="btn btn-danger btn-small" onclick="ClientesModule.confirmarEliminar(${c.id})">Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join("");
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
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px 10px 0 0; color: white; margin: -25px -25px 30px -25px;">
  <div style="display: flex; align-items: center; gap: 20px;">
  <div class="avatar" style="
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 32px;
  ">
  ${iniciales}
  </div>
  <div>
  <h2 style="margin: 0; font-size: 32px;">${nombreCompleto}</h2>
  <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">Cliente desde ${Formatters.formatFecha(cliente.created_at)}</p>
  </div>
  </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
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
  <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 30px; border-left: 4px solid #3498db;">
  <h4 style="color: #2c3e50; margin: 0 0 10px 0;"> Notas</h4>
  <p style="margin: 0;">${cliente.notas}</p>
  </div>
  `
: ""
  }

  <h4 style="color: #2c3e50; margin-bottom: 15px;"> Estadísticas</h4>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
  <div style="font-size: 28px; font-weight: bold;">${estadisticas.total_compras || 0}</div>
  <div style="opacity: 0.9; margin-top: 5px;">Compras</div>
  </div>
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
  <div style="font-size: 28px; font-weight: bold;">${Formatters.formatCurrency(estadisticas.total_gastado || 0)}</div>
  <div style="opacity: 0.9; margin-top: 5px;">Gastado</div>
  </div>
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
  <div style="font-size: 28px; font-weight: bold;">${estadisticas.total_facturas || 0}</div>
  <div style="opacity: 0.9; margin-top: 5px;">Facturas</div>
  </div>
  <div style="background: ${estadisticas.saldo_pendiente > 0 ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)": "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"}; padding: 20px; border-radius: 10px; text-align: center; color: white;">
  <div style="font-size: 28px; font-weight: bold;">${Formatters.formatCurrency(estadisticas.saldo_pendiente || 0)}</div>
  <div style="opacity: 0.9; margin-top: 5px;">Saldo Pendiente</div>
  </div>
  </div>

  <div style="display: flex; gap: 10px; justify-content: flex-end;">
  ${estadisticas.saldo_pendiente > 0
  ? `<button class="btn btn-warning" onclick="ClientesModule.verEstadoCuenta(${clienteId})">
  Ver Estado de Cuenta
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
  try {
  // Llamar al módulo de facturación para mostrar estado de cuenta
  if (window.ModalesFacturacion) {
  await ModalesFacturacion.mostrarEstadoCuenta(clienteId);
  } else {
  mostrarAlerta("El módulo de facturación no está disponible", "warning");
  }
  } catch (error) {
  console.error(" Error al mostrar estado de cuenta:", error);
  mostrarAlerta("Error al mostrar estado de cuenta", "danger");
  }
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
