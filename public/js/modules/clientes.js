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
  // Botón agregar cliente
  const btnAgregar = document.getElementById("btnAgregarCliente");
  if (btnAgregar) {
  btnAgregar.addEventListener("click", () => this.mostrarModalCliente());
  }

  // Botón buscar
  const btnBuscar = document.getElementById("btnBuscarCliente");
  if (btnBuscar) {
  btnBuscar.addEventListener("click", () => this.buscarCliente());
  }

  // Búsqueda en tiempo real
  const inputBuscar = document.getElementById("buscarCliente");
  if (inputBuscar) {
  inputBuscar.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
  this.buscarCliente();
  }
  });
  }

  // Form submit
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
  await this.actualizarTablaClientes();
  this.actualizarContador();
  } catch (error) {
  console.error(" Error al cargar clientes:", error);
  mostrarAlerta("Error al cargar clientes: " + error.message, "danger");
  }
  },

  // ==================== ACTUALIZAR TABLA ====================

  async actualizarTablaClientes() {
  const tbody = document.getElementById("tablaClientes");
  if (!tbody) {
  console.error(" Elemento tablaClientes no encontrado");
  return;
  }

  if (this.clientes.length === 0) {
  tbody.innerHTML = `
  <tr>
  <td colspan="6" class="text-center" style="padding: 40px; color: #95a5a6;">
  <div style="font-size: 48px; margin-bottom: 10px;"></div>
  <p style="margin: 0; font-size: 16px;">No hay clientes registrados</p>
  <p style="margin: 5px 0 0 0; font-size: 14px; color: #7f8c8d;">
  Haz clic en "Agregar Cliente" para comenzar
  </p>
  </td>
  </tr>
  `;
  return;
  }

  tbody.innerHTML = this.clientes
.map((cliente) => {
  const iniciales = this.getIniciales(cliente.nombre, cliente.apellido);
  const nombreCompleto =
  `${cliente.nombre} ${cliente.apellido || ""}`.trim();
  const saldoPendiente = parseFloat(cliente.saldo_pendiente) || 0;
  const tieneDeuda = saldoPendiente > 0;

  return `
  <tr style="${tieneDeuda ? "background: #fff3cd;": ""}">
  <td>
  <div style="display: flex; align-items: center; gap: 12px;">
  <div class="avatar" style="
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  ">
  ${iniciales}
  </div>
  <div>
  <strong style="font-size: 15px;">${nombreCompleto}</strong>
  ${cliente.notas ? `<br><small style="color: #7f8c8d;">${cliente.notas}</small>`: ""}
  </div>
  </div>
  </td>
  <td>
  ${cliente.cedula ? `<div> ${cliente.cedula}</div>`: ""}
  ${cliente.rnc ? `<div> ${cliente.rnc}</div>`: ""}
  ${!cliente.cedula && !cliente.rnc ? "-": ""}
  </td>
  <td>
  ${cliente.telefono ? `<div> ${cliente.telefono}</div>`: ""}
  ${cliente.email ? `<div> ${cliente.email}</div>`: ""}
  ${!cliente.telefono && !cliente.email ? "-": ""}
  </td>
  <td>${cliente.direccion || "-"}</td>
  <td style="text-align: right;">
  ${tieneDeuda
  ? `<span class="badge" style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
  ${Formatters.formatCurrency(saldoPendiente)}
  </span>`
: `<span style="color: #27ae60; font-weight: 600;">$0.00</span>`
  }
  </td>
  <td class="actions" style="text-align: center;">
  ${tieneDeuda
  ? `<button class="btn btn-warning btn-small" onclick="ClientesModule.verEstadoCuenta(${cliente.id})" title="Estado de cuenta">
  Estado de Cuenta
  </button>`
: ""
  }
  <button class="btn btn-info btn-small" onclick="ClientesModule.verDetalleCliente(${cliente.id})" title="Ver detalle">
  Ver
  </button>
  <button class="btn btn-primary btn-small" onclick="ClientesModule.editarCliente(${cliente.id})" title="Editar">
  Editar
  </button>
  <button class="btn btn-danger btn-small" onclick="ClientesModule.confirmarEliminar(${cliente.id})" title="Eliminar">
  Eliminar
  </button>
  </td>
  </tr>
  `;
  })
.join("");
  },

  // ==================== BUSCAR CLIENTE ====================

  async buscarCliente() {
  const termino = getValue("buscarCliente");

  if (!termino || termino.trim() === "") {
  await this.cargarClientes();
  return;
  }

  try {
  this.clientes = await ClientesAPI.search(termino);
  await this.actualizarTablaClientes();
  this.actualizarContador();

  if (this.clientes.length === 0) {
  mostrarAlerta("No se encontraron clientes", "info");
  }
  } catch (error) {
  console.error(" Error al buscar:", error);
  mostrarAlerta("Error al buscar clientes", "danger");
  }
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

  actualizarContador() {
  const contador = document.getElementById("contadorClientes");
  if (contador) {
  const total = this.clientes.length;
  contador.textContent = `${total} cliente${total !== 1 ? "s": ""} registrado${total !== 1 ? "s": ""}`;
  }
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
