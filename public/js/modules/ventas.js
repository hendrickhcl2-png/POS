// ==================== MÓDULO DE VENTAS MEJORADO ====================

const VentasModule = {
  carritoItems: [],
  serviciosEnVenta: [],
  clienteSeleccionado: null,
  metodoPagoActual: "efectivo",
  incluirITBIS: false,
  generarFacturaElectronica: false,
  _paginator: null,

  init() {
  this.cargarClientes();
  this.cargarServicios();
  this.setupEventListeners();
  this.renderizarCarrito();
  this.calcularTotales();
  this.cargarHistorialHoy();
  },

  setupEventListeners() {
  const formVenta = document.getElementById("formVenta");
  if (formVenta) {
  formVenta.addEventListener("submit", (e) => {
  e.preventDefault();
  this.procesarVenta();
  });
  }

  const buscarInput = document.getElementById("buscarProductoVenta");
  if (buscarInput) {
  buscarInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
  e.preventDefault();
  this.buscarProducto();
  }
  });
  }

  const montoRecibido = document.getElementById("montoRecibido");
  if (montoRecibido) {
  montoRecibido.addEventListener("input", () => this.calcularCambio());
  }

  const checkboxITBIS = document.getElementById("incluirITBIS");
  if (checkboxITBIS) {
  checkboxITBIS.addEventListener("change", (e) => {
  this.incluirITBIS = e.target.checked;
  this.calcularTotales();
  });
  }

  const checkboxFactura = document.getElementById(
  "generarFacturaElectronica",
  );
  if (checkboxFactura) {
  checkboxFactura.addEventListener("change", (e) => {
  this.generarFacturaElectronica = e.target.checked;
  });
  }
  const checkboxCredito = document.getElementById("ventaCredito");
  if (checkboxCredito) {
  checkboxCredito.addEventListener("change", () =>
  this.toggleCamposCredito(),
  );
  }

  const pagoInicial = document.getElementById("pagoInicialCredito");
  if (pagoInicial) {
  pagoInicial.addEventListener("input", () => this.calcularCambio());
  }

  },

  toggleCamposCredito() {
  const checkbox = document.getElementById("ventaCredito");
  const campos = document.getElementById("camposCredito");

  if (checkbox && campos) {
  campos.style.display = checkbox.checked ? "block": "none";

  if (!checkbox.checked) {
  document.getElementById("diasCredito").value = "30";
  document.getElementById("pagoInicialCredito").value = "";
  }
  }
  },

  // ==================== CARGAR DATOS ====================

  async cargarClientes() {
  try {
  const clientes = await API.Clientes.getAll();
  const select = document.getElementById("ventaCliente");

  if (!select) {
  console.warn(" Select de clientes no encontrado");
  return;
  }

  select.innerHTML = '<option value="">Cliente General</option>';

  clientes.forEach((cliente) => {
  const option = document.createElement("option");
  option.value = cliente.id;
  option.textContent =
  `${cliente.nombre} ${cliente.apellido || ""}`.trim();
  select.appendChild(option);
  });

  } catch (error) {
  console.error(" Error al cargar clientes:", error);
  this.mostrarAlerta("Error al cargar clientes", "danger");
  }
  },

  async cargarServicios() {
  try {
  const servicios = await API.Servicios.getAll();
  this.renderizarServiciosRapidos(servicios);
  } catch (error) {
  console.error(" Error al cargar servicios:", error);
  this.mostrarAlerta("Error al cargar servicios", "danger");
  }
  },

  renderizarServiciosRapidos(servicios) {
  const container = document.getElementById("serviciosRapidos");
  if (!container) return;

  container.innerHTML = servicios
.filter((s) => s.activo !== false)
.slice(0, 6)
.map(
  (servicio) => `
  <button
  type="button"
  class="btn btn-small ${servicio.es_gratuito ? "btn-info": "btn-success"}"
  onclick="VentasModule.agregarServicioRapido(${servicio.id})"
  style="font-size: 12px;"
  >
  ${servicio.es_gratuito ? "": ""} ${servicio.nombre}
  </button>
  `,
  )
.join("");
  },

  // ==================== ESCANEAR Y AGREGAR DIRECTO ====================

  escanearYAgregarProducto() {
  const field = document.getElementById("buscarProductoVenta");
  if (!field) return;

  const prev = field.placeholder;
  field.value = "";
  field.focus();
  field.classList.add("scanning-mode");
  field.placeholder = "Listo — escanee el código...";

  const onEnter = async (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  field.classList.remove("scanning-mode");
  field.placeholder = prev;
  field.removeEventListener("keydown", onEnter);
  field.removeEventListener("blur", onBlur);

  const query = field.value.trim();
  if (!query) return;

  try {
  const productos = await API.Productos.search(query);

  if (productos.length === 0) {
  this.mostrarAlerta("Producto no encontrado", "warning");
  field.value = "";
  return;
  }

  if (productos.length === 1) {
  // Coincidencia exacta — agregar directo al carrito
  const p = productos[0];
  this.agregarProductoAlCarrito({
  id: p.id,
  codigo_barras: p.codigo_barras || "",
  nombre: p.nombre,
  precio_venta: p.precio_venta,
  stock_actual: p.stock_actual,
  disponible: p.disponible,
  descuento_porcentaje: p.descuento_porcentaje || 0,
  });
  field.value = "";
  field.focus();
  } else {
  // Múltiples resultados — mostrar lista
  this.mostrarListaProductos(productos);
  }
  } catch (error) {
  console.error("Error al escanear producto:", error);
  this.mostrarAlerta("Error al buscar producto", "danger");
  }
  };

  const onBlur = () => {
  field.classList.remove("scanning-mode");
  field.placeholder = prev;
  field.removeEventListener("keydown", onEnter);
  };

  field.addEventListener("keydown", onEnter);
  field.addEventListener("blur", onBlur, { once: true });
  },

  // ==================== BÚSQUEDA CON LISTA ====================

  async buscarProducto() {
  const input = document.getElementById("buscarProductoVenta");
  const query = input.value.trim();

  if (!query) {
  this.mostrarAlerta(
  "Por favor ingrese un código o nombre de producto",
  "warning",
  );
  return;
  }

  try {
  const productos = await API.Productos.search(query);

  if (productos.length === 0) {
  // Buscar entre agotados para ofrecer opción de agregar stock
  const agotados = await API.Productos.searchAgotados(query);
  if (agotados.length > 0) {
    this.mostrarListaProductos(agotados, true);
  } else {
    this.mostrarAlerta("Producto no encontrado", "warning");
  }
  return;
  }

  // Mostrar lista de resultados
  this.mostrarListaProductos(productos);
  } catch (error) {
  console.error(" Error al buscar producto:", error);
  this.mostrarAlerta("Error al buscar producto", "danger");
  }
  },

  async agregarStockRapido(id, nombre) {
  const cantidad = prompt(`¿Cuántas unidades agregar a "${nombre}"?`);
  if (cantidad === null) return;
  const n = parseInt(cantidad);
  if (isNaN(n) || n <= 0) {
    this.mostrarAlerta("Cantidad inválida", "warning");
    return;
  }
  try {
    await API.Productos.agregarStock(id, n);
    this.cerrarListaResultados();
    this.mostrarAlerta(`Stock actualizado. Ahora puedes buscar "${nombre}" nuevamente.`, "success");
  } catch (e) {
    this.mostrarAlerta(e?.message || "Error al actualizar stock", "danger");
  }
  },

  mostrarListaProductos(productos, soloAgotados = false) {
  // Crear modal o dropdown con los productos
  const container = document.getElementById("ventaItems");
  if (!container) return;

  const titulo = soloAgotados
    ? `<h4 style="margin: 0 0 10px 0; color: #e67e22;"> Sin stock — ¿Deseas agregar unidades? (${productos.length})</h4>`
    : `<h4 style="margin: 0 0 10px 0; color: #2c3e50;"> Resultados de búsqueda (${productos.length})</h4>`;

  const resultadosHTML = `
  <div style="background: #fff; border: 2px solid ${soloAgotados ? "#e67e22" : "#3498db"}; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
  ${titulo}
  <div style="max-height: 300px; overflow-y: auto;">
  ${productos
.map(
  (p) => `
  <div style="padding: 10px; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; align-items: center;">
  <div>
  <strong>${p.nombre}</strong><br>
  <small style="color: #7f8c8d;">
  Código: ${p.codigo_barras || p.imei || "N/A"} |
  Stock: ${p.stock_actual} |
  Precio: ${this.formatCurrency(p.precio_venta)}
  </small>
  </div>
  ${soloAgotados
    ? `<button type="button" class="btn btn-warning btn-small" onclick="VentasModule.agregarStockRapido(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">+ Agregar Stock</button>`
    : `<button
  type="button"
  class="btn btn-primary btn-small"
  onclick="VentasModule.agregarProductoAlCarrito({
  id: ${p.id},
  codigo_barras: '${p.codigo_barras || ""}',
  nombre: '${p.nombre.replace(/'/g, "\\'")}',
  precio_venta: ${p.precio_venta},
  stock_actual: ${p.stock_actual},
  disponible: ${p.disponible},
  descuento_porcentaje: ${p.descuento_porcentaje || 0}
  }); VentasModule.cerrarListaResultados();"
  ${!p.disponible || p.stock_actual <= 0 ? "disabled": ""}
  >
  Agregar
  </button>`
  }
  </div>
  `,
  )
.join("")}
  </div>
  <button
  type="button"
  class="btn btn-secondary"
  style="margin-top: 10px;"
  onclick="VentasModule.cerrarListaResultados()"
  >
  Cerrar
  </button>
  </div>
  `;

  // Insertar antes del carrito actual
  const temp = document.createElement("div");
  temp.id = "listaResultadosBusqueda";
  temp.innerHTML = resultadosHTML;
  container.parentElement.insertBefore(temp, container);

  // Limpiar búsqueda
  document.getElementById("buscarProductoVenta").value = "";
  },

  cerrarListaResultados() {
  const lista = document.getElementById("listaResultadosBusqueda");
  if (lista) lista.remove();
  },

  // ==================== AGREGAR ARTÍCULO MANUAL ====================

  mostrarModalAgregarManual() {
  const modal = `
  <div id="modalAgregarManual" class="js-overlay">
  <div class="js-modal js-modal--md" style="padding: 30px;">
  <h3 style="margin: 0 0 20px 0;"> Agregar Artículo Manual</h3>

  <div style="margin-bottom: 15px;">
  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Buscar Producto:</label>
  <input
  type="text"
  id="buscarProductoManual"
  placeholder="Código de barras, IMEI o nombre..."
  style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"
  >
  </div>

  <div id="resultadosManual" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;"></div>

  <div class="flex-end">
  <button
  type="button"
  class="btn btn-secondary"
  onclick="VentasModule.cerrarModalManual()"
  >
  Cancelar
  </button>
  <button
  type="button"
  class="btn btn-primary"
  onclick="VentasModule.buscarProductoManual()"
  >
  Buscar
  </button>
  </div>
  </div>
  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modal);

  // Auto-focus en el input
  setTimeout(() => {
  const input = document.getElementById("buscarProductoManual");
  if (input) {
  input.focus();
  input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
  e.preventDefault();
  this.buscarProductoManual();
  }
  });
  }
  }, 100);
  },

  async buscarProductoManual() {
  const input = document.getElementById("buscarProductoManual");
  const query = input.value.trim();

  if (!query) {
  Toast.warning("Ingrese un término de búsqueda");
  return;
  }

  try {
  const productos = await API.Productos.search(query);
  this.mostrarResultadosManual(productos);
  } catch (error) {
  console.error("Error:", error);
  Toast.error("Error al buscar producto");
  }
  },

  mostrarResultadosManual(productos) {
  const container = document.getElementById("resultadosManual");
  if (!container) return;

  if (productos.length === 0) {
  container.innerHTML =
  '<p style="text-align: center; color: #7f8c8d;">No se encontraron productos</p>';
  return;
  }

  container.innerHTML = productos
.map(
  (p) => `
  <div style="padding: 15px; border: 1px solid #ecf0f1; border-radius: 8px; margin-bottom: 12px; ${!p.disponible || p.stock_actual <= 0 ? "opacity: 0.5; background: #f8f8f8;": "background: white;"}">
  <!-- Header con nombre y botón -->
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
  <div style="flex: 1;">
  <strong style="font-size: 18px; color: #2c3e50;">${p.nombre}</strong>
  </div>
  <button
  type="button"
  class="btn ${!p.disponible || p.stock_actual <= 0 ? "btn-secondary": "btn-success"}"
  onclick='VentasModule.agregarProductoAlCarrito(${JSON.stringify(p).replace(/'/g, "\\'")}); VentasModule.cerrarModalManual();'
  ${!p.disponible || p.stock_actual <= 0 ? "disabled": ""}
  style="min-width: 120px;"
  >
  ${!p.disponible || p.stock_actual <= 0 ? " No Disponible": " Agregar"}
  </button>
  </div>

  <!-- Información principal en grid -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
  <div>
  <small style="color: #7f8c8d; display: block; font-size: 11px; text-transform: uppercase;">Código</small>
  <strong style="color: #3498db; font-size: 14px;">${p.codigo_barras || p.imei || "N/A"}</strong>
  </div>
  <div>
  <small style="color: #7f8c8d; display: block; font-size: 11px; text-transform: uppercase;">Precio</small>
  <strong style="color: #27ae60; font-size: 16px;">${this.formatCurrency(p.precio_venta)}</strong>
  ${
  p.descuento_porcentaje > 0 || p.descuento_monto > 0
  ? `<br><small style="color: #e74c3c;"> Descuento: ${p.descuento_porcentaje > 0 ? p.descuento_porcentaje + "%": "$" + p.descuento_monto}</small>`
: ""
  }
  </div>
  <div>
  <small style="color: #7f8c8d; display: block; font-size: 11px; text-transform: uppercase;">Stock</small>
  <strong style="color: ${p.stock_actual <= p.stock_minimo ? "#e74c3c": "#2c3e50"}; font-size: 14px;">
  ${p.stock_actual} unidades
  </strong>
  ${p.stock_actual <= p.stock_minimo ? '<br><small style="color: #e74c3c;"> Stock bajo</small>': ""}
  </div>
  ${
  p.categoria_nombre
  ? `
  <div>
  <small style="color: #7f8c8d; display: block; font-size: 11px; text-transform: uppercase;">Categoría</small>
  <strong style="color: #9b59b6; font-size: 14px;"> ${p.categoria_nombre}</strong>
  </div>
  `
: ""
  }
  </div>

  <!-- Características (si existen) -->
  ${
  p.caracteristicas && p.caracteristicas.length > 0
  ? `
  <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 5px; border-left: 3px solid #2196f3;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
  <strong style="color: #1976d2; font-size: 13px;"> Características</strong>
  <button
  type="button"
  onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block': 'none'; this.textContent = this.textContent === ' Ver' ? ' Ocultar': ' Ver';"
  style="background: none; border: none; color: #1976d2; cursor: pointer; font-size: 12px; padding: 2px 8px;"
  >
  Ver
  </button>
  </div>
  <div style="display: none;">
  ${p.caracteristicas
.map(
  (c) => `
  <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #bbdefb;">
  <span style="color: #1565c0; font-weight: 500; font-size: 12px;">${c.nombre}:</span>
  <span style="color: #0d47a1; font-size: 12px;">${c.valor}</span>
  </div>
  `,
  )
.join("")}
  </div>
  </div>
  `
: ""
  }

  <!-- Descripción (si existe) -->
  ${
  p.descripcion && p.descripcion.trim() !== ""
  ? `
  <div style="margin-top: 8px; padding: 8px; background: #fff3cd; border-radius: 5px; border-left: 3px solid #ffc107;">
  <small style="color: #856404; font-size: 12px;">
  <strong> Descripción:</strong> ${p.descripcion}
  </small>
  </div>
  `
: ""
  }

  <!-- IMEI si existe -->
  ${
  p.imei && p.imei.trim() !== ""
  ? `
  <div style="margin-top: 8px; padding: 8px; background: #f3e5f5; border-radius: 5px; border-left: 3px solid #9c27b0;">
  <small style="color: #6a1b9a; font-size: 12px;">
  <strong> IMEI:</strong> ${p.imei}
  </small>
  </div>
  `
: ""
  }
  </div>
  `,
  )
.join("");
  },

  cerrarModalManual() {
  const modal = document.getElementById("modalAgregarManual");
  if (modal) modal.remove();
  },

  // ==================== CARRITO ====================

  agregarProductoAlCarrito(producto) {
  if (!producto.disponible) {
  this.mostrarAlerta("Producto no disponible", "warning");
  return;
  }

  if (producto.stock_actual <= 0) {
  this.mostrarAlerta("Producto sin stock", "warning");
  return;
  }

  const itemExistente = this.carritoItems.find(
  (item) => item.producto_id === producto.id,
  );

  if (itemExistente) {
  if (itemExistente.cantidad + 1 > producto.stock_actual) {
  this.mostrarAlerta(
  `Stock insuficiente. Solo hay ${producto.stock_actual} unidades`,
  "warning",
  );
  return;
  }
  itemExistente.cantidad++;
  } else {
  this.carritoItems.push({
  producto_id: producto.id,
  codigo: producto.codigo_barras || producto.imei || `ID-${producto.id}`,
  nombre: producto.nombre,
  precio_unitario: producto.precio_venta,
  precio_original: producto.precio_venta,
  cantidad: 1,
  stock_disponible: producto.stock_actual,
  descuento: producto.descuento_porcentaje || 0,
  });
  }

  this.renderizarCarrito();
  this.calcularTotales();

  },

  eliminarItemCarrito(index) {
  this.carritoItems.splice(index, 1);
  this.renderizarCarrito();
  this.calcularTotales();
  },

  actualizarCantidadItem(index, nuevaCantidad) {
  if (nuevaCantidad <= 0) {
  this.eliminarItemCarrito(index);
  return;
  }

  const item = this.carritoItems[index];

  if (nuevaCantidad > item.stock_disponible) {
  this.mostrarAlerta(
  `Stock insuficiente. Solo hay ${item.stock_disponible} unidades`,
  "warning",
  );
  return;
  }

  item.cantidad = nuevaCantidad;
  this.renderizarCarrito();
  this.calcularTotales();
  },

  actualizarPrecioItem(index, nuevoPrecio) {
  if (isNaN(nuevoPrecio) || nuevoPrecio < 0) return;
  this.carritoItems[index].precio_unitario = nuevoPrecio;
  this.renderizarCarrito();
  this.calcularTotales();
  },

  renderizarCarrito() {
  const container = document.getElementById("ventaItems");
  if (!container) return;

  if (this.carritoItems.length === 0) {
  container.innerHTML = `
  <div style="text-align: center; padding: 30px; color: #95a5a6;">
  <p style="font-size: 18px;"> Carrito vacío</p>
  <p style="font-size: 14px;">Busque productos para agregar a la venta</p>
  </div>
  `;
  return;
  }

  container.innerHTML = this.carritoItems
.map(
  (item, index) => `
  <div class="invoice-item" style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
  <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 80px; gap: 10px; align-items: center;">
  <div>
  <strong>${item.nombre}</strong>
  <br>
  <small style="color: #7f8c8d;">Código: ${item.codigo}</small>
  ${item.descuento > 0 ? `<br><small style="color: #e74c3c;">Descuento: ${item.descuento}%</small>`: ""}
  </div>
  <div>
  <input
  type="number"
  value="${item.cantidad}"
  min="1"
  max="${item.stock_disponible}"
  onchange="VentasModule.actualizarCantidadItem(${index}, parseInt(this.value))"
  style="width: 70px; padding: 5px; text-align: center;"
  >
  <br>
  <small style="color: #7f8c8d;">Stock: ${item.stock_disponible}</small>
  </div>
  <div style="text-align: right;">
  <input
    type="number"
    value="${item.precio_unitario}"
    step="0.01"
    min="0"
    onchange="VentasModule.actualizarPrecioItem(${index}, parseFloat(this.value))"
    style="width:90px;padding:4px 6px;text-align:right;font-weight:bold;border:1px solid #ccc;border-radius:4px;font-size:14px"
    title="Editar precio de venta"
  />
  ${item.precio_unitario < item.precio_original
    ? `<br><small style="color:#95a5a6;text-decoration:line-through">${this.formatCurrency(item.precio_original)}</small>`
    : ""}
  </div>
  <div style="text-align: right;">
  <strong style="color: #27ae60; font-size: 18px;">
  ${this.formatCurrency(this.calcularSubtotalItem(item))}
  </strong>
  </div>
  <div>
  <button
  type="button"
  class="btn btn-danger btn-small"
  onclick="VentasModule.eliminarItemCarrito(${index})"
  title="Eliminar"
  >Eliminar</button>
  </div>
  </div>
  </div>
  `,
  )
.join("");
  },

  calcularSubtotalItem(item) {
  let subtotal = item.precio_unitario * item.cantidad;
  if (item.descuento > 0) {
  subtotal = subtotal * (1 - item.descuento / 100);
  }
  return subtotal;
  },

  // ==================== SERVICIOS ====================

  _customItemCounter: 0,

  mostrarFormItemNoRegistrado() {
  const existente = document.getElementById("formItemNoRegistrado");
  if (existente) { existente.remove(); return; }

  const container = document.getElementById("serviciosEnVenta");
  if (!container) return;

  const form = document.createElement("div");
  form.id = "formItemNoRegistrado";
  form.style.cssText = "background:#fff8e1;border:2px dashed #ffc107;border-radius:8px;padding:14px;margin-bottom:10px";
  form.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
      <div style="flex:2;min-width:160px">
        <label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Descripción</label>
        <input id="itemCustomNombre" type="text" placeholder="Ej: Silla no registrada"
          style="width:100%;padding:6px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px"/>
      </div>
      <div style="flex:1;min-width:110px">
        <label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Precio de venta</label>
        <input id="itemCustomPrecio" type="number" min="0" step="0.01" placeholder="0.00"
          style="width:100%;padding:6px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px"/>
      </div>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn btn-primary btn-small"
          onclick="VentasModule.confirmarItemNoRegistrado()">Agregar</button>
        <button type="button" class="btn btn-secondary btn-small"
          onclick="document.getElementById('formItemNoRegistrado').remove()">Cancelar</button>
      </div>
    </div>
  `;
  container.insertAdjacentElement("beforebegin", form);
  document.getElementById("itemCustomNombre").focus();
  },

  confirmarItemNoRegistrado() {
  const nombre = document.getElementById("itemCustomNombre")?.value.trim();
  const precio = parseFloat(document.getElementById("itemCustomPrecio")?.value) || 0;

  if (!nombre) {
    this.mostrarAlerta("Ingresa una descripción para el ítem", "warning");
    return;
  }

  this._customItemCounter--;
  const item = {
    id: this._customItemCounter,
    servicio_id: null,
    nombre,
    descripcion: "",
    precio,
    es_gratuito: false,
    es_custom: true,
  };

  this.serviciosEnVenta.push(item);
  this.renderizarServiciosEnVenta();
  this.calcularTotales();
  document.getElementById("formItemNoRegistrado")?.remove();
  },

  actualizarNombreItemCustom(id, valor) {
  const item = this.serviciosEnVenta.find((s) => s.id === id);
  if (item) item.nombre = valor;
  },

  async agregarServicioRapido(servicioId) {
  try {
  const servicio = await API.Servicios.getById(servicioId);
  this.agregarServicioAVenta(servicio);
  } catch (error) {
  console.error(" Error al cargar servicio:", error);
  }
  },

  agregarServicioAVenta(servicio) {
  const existe = this.serviciosEnVenta.find((s) => s.id === servicio.id);
  if (existe) {
  this.mostrarAlerta("Este servicio ya está agregado", "info");
  return;
  }

  this.serviciosEnVenta.push(servicio);
  this.renderizarServiciosEnVenta();
  this.calcularTotales();
  },

  eliminarServicio(servicioId) {
  this.serviciosEnVenta = this.serviciosEnVenta.filter(
  (s) => s.id !== servicioId,
  );
  this.renderizarServiciosEnVenta();
  this.calcularTotales();
  },

  actualizarPrecioServicio(servicioId, valor) {
  const servicio = this.serviciosEnVenta.find((s) => s.id === servicioId);
  if (servicio) {
  servicio.precio = parseFloat(valor) || 0;
  this.calcularTotales();
  }
  },

  renderizarServiciosEnVenta() {
  const container = document.getElementById("serviciosEnVenta");
  if (!container) return;

  if (this.serviciosEnVenta.length === 0) {
  container.innerHTML = "";
  return;
  }

  container.innerHTML = this.serviciosEnVenta
.map(
  (servicio) => `
  <div style="background: ${servicio.es_custom ? "#fff8e1" : servicio.es_gratuito ? "#e8f5e9": "#fff3cd"}; padding: 12px; border-radius: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${servicio.es_custom ? "#ff9800" : servicio.es_gratuito ? "#4caf50": "#ffc107"};">
  <div style="flex:1;margin-right:10px">
  ${servicio.es_custom
    ? `<input type="text" value="${servicio.nombre.replace(/"/g, '&quot;')}"
         style="font-weight:bold;font-size:14px;border:1px solid #ffc107;border-radius:4px;padding:3px 7px;width:100%;max-width:260px"
         oninput="VentasModule.actualizarNombreItemCustom(${servicio.id}, this.value)"
         placeholder="Descripción del ítem"/>`
    : `<strong>${servicio.nombre}</strong>`
  }
  <br>
  <small style="color: #555;">${servicio.es_custom ? "Ítem no registrado" : (servicio.descripcion || "")}</small>
  </div>
  <div style="display: flex; align-items: center; gap: 15px;">
  ${servicio.es_gratuito
    ? `<span style="font-size: 18px; font-weight: bold; color: #4caf50;">GRATIS</span>`
    : `<input
        type="number"
        min="0"
        step="0.01"
        value="${parseFloat(servicio.precio) || 0}"
        style="width: 110px; font-size: 15px; font-weight: bold; color: #f57c00; text-align: right; border: 1px solid #ffc107; border-radius: 4px; padding: 4px 8px;"
        oninput="VentasModule.actualizarPrecioServicio(${servicio.id}, this.value)"
      />`
  }
  <button
  type="button"
  class="btn btn-danger btn-small"
  onclick="VentasModule.eliminarServicio(${servicio.id})"
  >&#x2715;</button>
  </div>
  </div>
  `,
  )
.join("");
  },

  // ==================== CÁLCULOS ====================

  calcularTotales() {
  const subtotalProductos = this.carritoItems.reduce((sum, item) => {
  return sum + this.calcularSubtotalItem(item);
  }, 0);

  const subtotalServicios = this.serviciosEnVenta
.filter((s) => !s.es_gratuito)
.reduce((sum, s) => sum + parseFloat(s.precio), 0);

  const subtotal = subtotalProductos + subtotalServicios;
  const itbis = this.incluirITBIS ? subtotal * 0.18: 0;
  const total = subtotal + itbis;

  const descuentoManual = this.carritoItems.reduce((sum, item) => {
    return sum + Math.max(0, (item.precio_original || item.precio_unitario) - item.precio_unitario) * item.cantidad;
  }, 0);

  this.actualizarTotalesUI(subtotal, itbis, total, descuentoManual);

  return { subtotal, itbis, total, descuentoManual };
  },

  actualizarTotalesUI(subtotal, itbis, total, descuentoManual = 0) {
  const subtotalEl = document.getElementById("ventaSubtotal");
  const itbisEl = document.getElementById("ventaITBIS");
  const totalEl = document.getElementById("ventaTotal");
  const descuentoEl = document.getElementById("ventaDescuento");
  const descuentoRow = document.getElementById("ventaDescuentoRow");

  if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
  if (itbisEl) itbisEl.textContent = this.formatCurrency(itbis);
  if (totalEl) totalEl.textContent = this.formatCurrency(total);
  if (descuentoEl) descuentoEl.textContent = this.formatCurrency(descuentoManual);
  if (descuentoRow) descuentoRow.style.display = descuentoManual > 0 ? "" : "none";
  },

  calcularCambio() {
  const esCredito = document.getElementById("ventaCredito")?.checked || false;

  if (esCredito) {
  // En ventas a crédito no hay cambio
  const cambioEl = document.getElementById("cambio");
  if (cambioEl) {
  cambioEl.value = "0.00";
  cambioEl.style.color = "#27ae60";
  }
  return;
  }

  // Lógica normal para ventas al contado
  const totalVenta = parseFloat(
  document
.getElementById("ventaTotal")
.textContent.replace(/[^0-9.-]+/g, ""),
  );
  const montoRecibido =
  parseFloat(document.getElementById("montoRecibido").value) || 0;
  const cambio = montoRecibido - totalVenta;

  const cambioEl = document.getElementById("cambio");
  if (cambioEl) {
  cambioEl.value = cambio > 0 ? cambio.toFixed(2): "0.00";
  cambioEl.style.color = cambio >= 0 ? "#27ae60": "#e74c3c";
  }
  },

  // ==================== MÉTODOS DE PAGO ====================

  seleccionarMetodoPago(metodo, el) {
  this.metodoPagoActual = metodo;

  document.querySelectorAll(".payment-method").forEach((btn) => {
  btn.classList.remove("active");
  });
  const boton = el?.closest?.(".payment-method") || el;
  if (boton) boton.classList.add("active");

  document.getElementById("pagoEfectivo").style.display =
  metodo === "efectivo" ? "block": "none";
  document.getElementById("pagoTarjeta").style.display =
  metodo === "tarjeta" ? "block": "none";
  document.getElementById("pagoTransferencia").style.display =
  metodo === "transferencia" ? "block": "none";
  document.getElementById("pagoMixto").style.display =
  metodo === "mixto" ? "block": "none";
  },

  // ==================== PROCESAR VENTA ====================

  async procesarVenta() {
  if (this.carritoItems.length === 0 && this.serviciosEnVenta.length === 0) {
  this.mostrarAlerta("El carrito está vacío", "warning");
  return;
  }

  const totales = this.calcularTotales();

  if (!this.validarPago(totales.total)) {
  return;
  }

  const ventaData = this.prepararDatosVenta(totales);

  try {

  const venta = await VentasAPI.create(ventaData);


  // Limpiar carrito ANTES de mostrar factura
  this.limpiarVenta();
  this.cargarHistorialHoy();

  // Mostrar mensaje según tipo de venta
  const esCredito = ventaData.es_credito;
  if (esCredito) {
  const saldoPendiente = ventaData.total - ventaData.monto_recibido;
  Toast.success(`Venta a crédito procesada exitosamente. Factura: ${venta.numero_factura} | Total: ${this.formatCurrency(ventaData.total)} | Pago inicial: ${this.formatCurrency(ventaData.monto_recibido)} | Saldo pendiente: ${this.formatCurrency(saldoPendiente)}`);
  }

  // MOSTRAR FACTURA AUTOMÁTICAMENTE
  if (window.FacturaImpresion) {
  FacturaImpresion.mostrarFactura(venta);
  } else if (!esCredito) {
  this.mostrarAlerta(
  " Venta procesada exitosamente - Ticket #" + venta.numero_ticket,
  "success",
  );
  }
  } catch (error) {
  console.error(" Error al procesar venta:", error);
  this.mostrarAlerta("Error al procesar venta: " + error.message, "danger");
  }
  },

  validarPago(totalVenta) {
  // Sincronizar método desde el DOM (fuente de verdad visual)
  if (document.getElementById("pagoMixto")?.style.display === "block") {
  this.metodoPagoActual = "mixto";
  } else if (document.getElementById("pagoTarjeta")?.style.display === "block") {
  this.metodoPagoActual = "tarjeta";
  } else if (document.getElementById("pagoTransferencia")?.style.display === "block") {
  this.metodoPagoActual = "transferencia";
  } else {
  this.metodoPagoActual = "efectivo";
  }

  const esCredito = document.getElementById("ventaCredito")?.checked || false;

  if (esCredito) {
  // Venta a crédito: validaciones especiales
  const clienteId = document.getElementById("ventaCliente").value;
  if (!clienteId) {
  this.mostrarAlerta(
  "Debe seleccionar un cliente para ventas a crédito",
  "warning",
  );
  return false;
  }

  const pagoInicial = parseFloat(
  document.getElementById("pagoInicialCredito")?.value || 0,
  );
  if (pagoInicial > totalVenta) {
  this.mostrarAlerta(
  "El pago inicial no puede ser mayor al total",
  "warning",
  );
  return false;
  }

  return true; // Pago inicial es opcional
  }

  // Validaciones normales para contado
  if (this.metodoPagoActual === "efectivo") {
  const montoRecibido =
  parseFloat(document.getElementById("montoRecibido").value) || 0;
  if (montoRecibido < totalVenta) {
  this.mostrarAlerta("El monto recibido es insuficiente", "warning");
  return false;
  }
  }

  if (this.metodoPagoActual === "tarjeta") {
  const banco = document.getElementById("bancoTarjeta").value;
  if (!banco) {
  this.mostrarAlerta("Seleccione el banco", "warning");
  return false;
  }
  }

  if (this.metodoPagoActual === "transferencia") {
  const banco = document.getElementById("bancoTransferencia").value;
  if (!banco) {
  this.mostrarAlerta("Seleccione el banco", "warning");
  return false;
  }
  }

  // Pago mixto: suma de componentes debe igualar el total
  if (this.metodoPagoActual === "mixto") {
  const ef = parseFloat(document.getElementById("montoEfectivo").value) || 0;
  const ta = parseFloat(document.getElementById("montoTarjeta").value) || 0;
  const tr = parseFloat(document.getElementById("montoTransferencia").value) || 0;
  if (Math.abs(ef + ta + tr - totalVenta) > 0.01) {
  this.mostrarAlerta(
  `Los montos del pago mixto (${this.formatCurrency(ef + ta + tr)}) no coinciden con el total (${this.formatCurrency(totalVenta)})`,
  "warning"
  );
  return false;
  }
  }

  // Transferencia: referencia obligatoria
  if (this.metodoPagoActual === "transferencia") {
  const ref = document.getElementById("referenciaTransferencia")?.value?.trim();
  if (!ref) {
  this.mostrarAlerta("Debe ingresar el número de referencia para la transferencia", "warning");
  return false;
  }
  }

  return true;
  },

  toggleFechaRetroactiva(activo) {
    const panel = document.getElementById("fechaRetroactivaPanel");
    const input = document.getElementById("fechaVentaRetroactiva");
    if (activo) {
      panel.style.display = "block";
      // Poner ayer por defecto
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      input.value = ayer.toISOString().split("T")[0];
      input.max = new Date().toISOString().split("T")[0];
    } else {
      panel.style.display = "none";
      input.value = "";
    }
  },

  prepararDatosVenta(totales) {
  // Sincronizar método desde el DOM antes de preparar datos
  if (document.getElementById("pagoMixto")?.style.display === "block") {
  this.metodoPagoActual = "mixto";
  } else if (document.getElementById("pagoTarjeta")?.style.display === "block") {
  this.metodoPagoActual = "tarjeta";
  } else if (document.getElementById("pagoTransferencia")?.style.display === "block") {
  this.metodoPagoActual = "transferencia";
  } else {
  this.metodoPagoActual = "efectivo";
  }

  const clienteId = document.getElementById("ventaCliente").value || null;
  const esCredito = document.getElementById("ventaCredito")?.checked || false;
  const fechaRetroactivaActiva = document.getElementById("activarFechaRetroactiva")?.checked || false;
  const fechaVentaRetroactiva = fechaRetroactivaActiva
    ? document.getElementById("fechaVentaRetroactiva")?.value || null
    : null;

  const ventaData = {
  cliente_id: clienteId ? parseInt(clienteId): null,
  subtotal: totales.subtotal,
  descuento: totales.descuentoManual || 0,
  itbis: totales.itbis,
  total: totales.total,
  metodo_pago: esCredito ? "credito": this.metodoPagoActual,
  incluir_itbis: this.incluirITBIS,
  generar_factura_electronica: this.generarFacturaElectronica,
  items: this.carritoItems.map((item) => ({
  producto_id: item.producto_id,
  cantidad: item.cantidad,
  precio_unitario: item.precio_unitario,
  precio_original: item.precio_original || item.precio_unitario,
  descuento: item.descuento,
  subtotal: this.calcularSubtotalItem(item),
  })),
  servicios: this.serviciosEnVenta.map((s) => ({
  servicio_id: s.es_custom ? null : s.id,
  nombre: s.nombre,
  precio: s.es_gratuito ? 0: parseFloat(s.precio),
  es_gratis: s.es_gratuito,
  })),

  // ==================== FECHA RETROACTIVA ====================
  fecha_venta: fechaVentaRetroactiva,

  // ==================== CAMPOS DE CRÉDITO ====================
  es_credito: esCredito,
  dias_credito: esCredito
  ? parseInt(document.getElementById("diasCredito")?.value || 30)
: null,
  };

  if (esCredito) {
  // Usar pago inicial como monto recibido
  const pagoInicial = parseFloat(
  document.getElementById("pagoInicialCredito")?.value || 0,
  );
  ventaData.monto_recibido = pagoInicial;
  ventaData.cambio = 0;
  } else if (this.metodoPagoActual === "efectivo") {
  ventaData.monto_recibido = parseFloat(
  document.getElementById("montoRecibido").value,
  );
  ventaData.cambio = parseFloat(document.getElementById("cambio").value);
  }

  if (this.metodoPagoActual === "tarjeta") {
  ventaData.banco = document.getElementById("bancoTarjeta").value;
  ventaData.referencia = document.getElementById("referenciaTarjeta").value;
  }

  if (this.metodoPagoActual === "transferencia") {
  ventaData.monto_recibido = parseFloat(
    document.getElementById("montoTransferenciaDirecta")?.value || 0,
  ) || totales.total;
  ventaData.banco = document.getElementById("bancoTransferencia").value;
  ventaData.referencia = document.getElementById("referenciaTransferencia").value;
  }

  if (this.metodoPagoActual === "mixto") {
  ventaData.monto_efectivo =
  parseFloat(document.getElementById("montoEfectivo").value) || 0;
  ventaData.monto_tarjeta =
  parseFloat(document.getElementById("montoTarjeta").value) || 0;
  ventaData.monto_transferencia =
  parseFloat(document.getElementById("montoTransferencia").value) || 0;
  }

  return ventaData;
  },
  async generarFactura(ventaId, clienteId) {
  try {
  if (window.ModalesFacturacion) {
  ModalesFacturacion.mostrarModalGenerarFactura(ventaId, clienteId);
  }
  } catch (error) {
  console.error(" Error al generar factura:", error);
  }
  },

  limpiarVenta() {
  this.carritoItems = [];
  this.serviciosEnVenta = [];
  this._customItemCounter = 0;
  this.incluirITBIS = false;
  this.generarFacturaElectronica = false;
  this.metodoPagoActual = "efectivo";

  document.getElementById("formVenta").reset();
  document.getElementById("ventaCliente").value = "";

  const checkITBIS = document.getElementById("incluirITBIS");
  const checkFactura = document.getElementById("generarFacturaElectronica");
  if (checkITBIS) checkITBIS.checked = false;
  if (checkFactura) checkFactura.checked = false;

  const checkFechaRetro = document.getElementById("activarFechaRetroactiva");
  if (checkFechaRetro) {
    checkFechaRetro.checked = false;
    this.toggleFechaRetroactiva(false);
  }

  document.querySelectorAll(".payment-method").forEach((el, index) => {
  el.classList.toggle("active", index === 0);
  });
  document.getElementById("pagoEfectivo").style.display = "block";
  document.getElementById("pagoTarjeta").style.display = "none";
  document.getElementById("pagoTransferencia").style.display = "none";
  document.getElementById("pagoMixto").style.display = "none";

  this.renderizarCarrito();
  this.renderizarServiciosEnVenta();
  this.calcularTotales();

  const buscarInput = document.getElementById("buscarProductoVenta");
  if (buscarInput) buscarInput.focus();

  },

  // ==================== HISTORIAL ====================

  _fechaLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  async cargarHistorialHoy() {
  const hoy = this._fechaLocal();
  const desde = document.getElementById("historialFechaDesde");
  const hasta = document.getElementById("historialFechaHasta");
  // Inicializar los inputs con la fecha de hoy si están vacíos
  if (desde && !desde.value) desde.value = hoy;
  if (hasta && !hasta.value) hasta.value = hoy;
  await this.cargarHistorialPorFechas(
    desde?.value || hoy,
    hasta?.value || hoy,
  );
  },

  async cargarHistorialPorFechas(fechaDesde, fechaHasta) {
  try {
  const response = await API.Ventas.getAll(fechaDesde, fechaHasta);
  const ventas = response.data || response;
  this.renderizarHistorial(ventas, fechaDesde, fechaHasta);
  } catch (error) {
  console.error(" Error al cargar historial:", error);
  }
  },

  renderizarHistorial(ventas, fechaDesde, fechaHasta) {
  const tbody = document.getElementById("tablaVentasHoy");
  if (!tbody) return;

  // Actualizar conteo
  const conteo = document.getElementById("historialConteo");
  if (conteo) {
    const total = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    conteo.textContent = `${ventas.length} venta(s) — Total: ${this.formatCurrency(total)}`;
  }

  const isAdmin = window.Auth?.isAdmin();
  if (!this._paginator) {
    this._paginator = new Paginator('tablaVentasHoy', 20);
  }
  this._paginator.render(
    ventas.map((venta) => {
      const fechaISO = venta.fecha ? venta.fecha.split("T")[0] : "";
      const fechaDisplay = fechaISO
        ? new Date(fechaISO + "T00:00:00").toLocaleDateString("es-DO")
        : "—";
      return `
  <tr id="historial-fila-${venta.id}">
  <td>#${venta.numero_ticket}</td>
  <td>
    <span id="historial-fecha-text-${venta.id}">${fechaDisplay}</span>
    <span id="historial-fecha-edit-${venta.id}" style="display:none">
      <input type="date" value="${fechaISO}" style="padding:2px 6px;font-size:13px;border:1px solid #ccc;border-radius:4px"
        id="historial-fecha-input-${venta.id}"/>
      <button class="btn btn-primary btn-small" onclick="VentasModule.guardarFechaVenta(${venta.id})">✓</button>
      <button class="btn btn-secondary btn-small" onclick="VentasModule.cancelarEditarFecha(${venta.id})">✕</button>
    </span>
  </td>
  <td>${venta.hora ? String(venta.hora).substring(0, 8) : new Date(venta.fecha).toLocaleTimeString("es-DO")}</td>
  <td>${venta.cliente_nombre?.trim() ? venta.cliente_nombre.trim() : '<span style="background:#ecf0f1;color:#7f8c8d;padding:2px 8px;border-radius:10px;font-size:12px;">Cliente General</span>'}</td>
  <td style="font-weight: bold; color: #27ae60;">${this.formatCurrency(venta.total)}</td>
  <td>${this.formatMetodoPago(venta.metodo_pago)}</td>
  <td>
  <button class="btn btn-info btn-small" onclick="VentasModule.verDetalleVenta(${venta.id})" title="Ver factura">Ver factura</button>
  ${isAdmin ? `<button class="btn btn-warning btn-small" onclick="VentasModule.editarFechaVenta(${venta.id})" id="historial-btn-editar-${venta.id}">Editar fecha</button>` : ""}
  </td>
  </tr>
  `;
    }),
    `<tr><td colspan="7" class="text-center" style="color: #7f8c8d;">No hay ventas en ese período</td></tr>`
  );
  },

  async verDetalleVenta(ventaId) {
  try {
  const venta = await API.Ventas.getById(ventaId);
  FacturaImpresion.mostrarFactura(venta);
  } catch (error) {
  console.error("Error al cargar detalle:", error);
  Toast.show("Error al cargar detalle de venta", "error");
  }
  },

  editarFechaVenta(ventaId) {
    document.getElementById(`historial-fecha-text-${ventaId}`).style.display = "none";
    document.getElementById(`historial-fecha-edit-${ventaId}`).style.display = "inline";
    document.getElementById(`historial-btn-editar-${ventaId}`).style.display = "none";
  },

  cancelarEditarFecha(ventaId) {
    document.getElementById(`historial-fecha-text-${ventaId}`).style.display = "";
    document.getElementById(`historial-fecha-edit-${ventaId}`).style.display = "none";
    document.getElementById(`historial-btn-editar-${ventaId}`).style.display = "";
  },

  async guardarFechaVenta(ventaId) {
    const input = document.getElementById(`historial-fecha-input-${ventaId}`);
    const fecha = input?.value;
    if (!fecha) { Toast.warning("Selecciona una fecha"); return; }
    try {
      await API.Ventas.updateFecha(ventaId, fecha);
      Toast.success("Fecha actualizada");
      // Actualizar display sin recargar toda la tabla
      const fechaDisplay = new Date(fecha + "T00:00:00").toLocaleDateString("es-DO");
      document.getElementById(`historial-fecha-text-${ventaId}`).textContent = fechaDisplay;
      this.cancelarEditarFecha(ventaId);
    } catch (err) {
      Toast.error(err?.message || "Error al actualizar la fecha");
    }
  },

  // ==================== UTILIDADES ====================

  formatCurrency(amount) {
  return new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  }).format(amount);
  },

  formatMetodoPago(metodo) {
  const metodos = {
  efectivo: " Efectivo",
  tarjeta: " Tarjeta",
  transferencia: " Transferencia",
  mixto: " Mixto",
  };
  return metodos[metodo] || metodo;
  },

  mostrarAlerta(mensaje, tipo) {
  const tipoToast = tipo === "danger" ? "error" : tipo;
  Toast.show(mensaje, tipoToast);
  },

  // ==================== MODAL SELECTOR DE SERVICIOS ====================

  async mostrarModalServicios() {
  let servicios = [];
  try {
  servicios = await API.Servicios.getAll();
  } catch (e) {
  Toast.error("Error al cargar servicios");
  return;
  }

  const filas = servicios.map((s) => {
  const precioLabel = s.es_gratuito
    ? `<span style="color:#4caf50;font-weight:bold;">GRATIS</span>`
    : `<span style="color:#f57c00;font-weight:bold;">RD$ ${parseFloat(s.precio).toFixed(2)}</span>`;
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee;">
    <div>
    <strong>${s.nombre}</strong>
    ${s.descripcion ? `<br><small style="color:#7f8c8d;">${s.descripcion}</small>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
    ${precioLabel}
    <button type="button" class="btn btn-success btn-small"
      onclick="VentasModule.agregarServicioRapido(${s.id}); document.getElementById('modalServicios').remove();">
      Agregar
    </button>
    </div>
    </div>
  `;
  }).join("");

  const html = `
  <div id="modalServicios" class="js-overlay">
  <div class="js-modal js-modal--md" style="padding:30px;">
  <h3 style="margin:0 0 20px 0;">Agregar Servicio</h3>
  <div style="max-height:400px;overflow-y:auto;">
  ${filas || '<p style="text-align:center;color:#7f8c8d;">No hay servicios disponibles</p>'}
  </div>
  <div class="flex-end" style="margin-top:20px;">
  <button type="button" class="btn btn-secondary" onclick="document.getElementById('modalServicios').remove();">Cerrar</button>
  </div>
  </div>
  </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
  },
};

// ==================== FUNCIONES GLOBALES ====================

window.VentasModule = VentasModule;
window.buscarProductoVenta = () => VentasModule.buscarProducto();
window.escanearProductoVenta = () => VentasModule.escanearYAgregarProducto();
window.selectPaymentMethod = (metodo, el) =>
  VentasModule.seleccionarMetodoPago(metodo, el);
window.cancelarVenta = () => VentasModule.limpiarVenta();
window.agregarServicioAVenta = () => VentasModule.mostrarModalServicios();

