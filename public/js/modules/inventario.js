// ==================== MÓDULO DE INVENTARIO ====================
// Lógica completa de gestión de inventario en el frontend

const InventarioModule = {
  // Variables del módulo
  inventario: [],
  categorias: [],
  filtroActual: {},
  productoActual: null,
  nombreProductoActual: null,

  // Inicializar módulo
  init() {
  this.setupEventListeners();
  this.cargarInventario();
  this.cargarEstadisticas();
  this.cargarCategorias();
  },

  // Configurar event listeners
  setupEventListeners() {
  // Filtro por categoría
  const filtroCategoria = document.getElementById("filtroCategoria");
  if (filtroCategoria) {
  filtroCategoria.addEventListener("change", () =>
  this.filtrarInventario(),
  );
  }

  // Búsqueda
  const filtroInventario = document.getElementById("filtroInventario");
  if (filtroInventario) {
  filtroInventario.addEventListener("keyup", () =>
  this.filtrarInventarioTabla(),
  );
  }

  // Botón actualizar
  const btnActualizarInventario = document.getElementById(
  "btnActualizarInventario",
  );
  if (btnActualizarInventario) {
  btnActualizarInventario.addEventListener("click", () => {
  this.cargarInventario();
  this.cargarEstadisticas();
  });
  }
  },

  // ==================== CARGAR INVENTARIO ====================

  async cargarInventario(filtros = {}) {
  try {
  this.inventario = await InventarioAPI.getAll(filtros);
  await this.actualizarTablaInventario();
  } catch (error) {
  console.error(" Error al cargar inventario:", error);
  mostrarAlerta("Error al cargar inventario", "danger");
  }
  },

  // ==================== CARGAR ESTADÍSTICAS ====================

  async cargarEstadisticas() {
  try {
  const stats = await InventarioAPI.getEstadisticas();

  // Actualizar cards de estadísticas
  setValueIfExists("totalProductosInv", stats.total_productos || 0);
  setValueIfExists(
  "valorInventario",
  Formatters.formatCurrency(stats.valor_total || 0),
  );
  setValueIfExists("productosBajoStock", stats.productos_bajo_stock || 0);

  // Cambiar color si hay productos bajo stock
  const bajostockEl = document.getElementById("productosBajoStock");
  if (bajostockEl) {
  bajostockEl.style.color =
  stats.productos_bajo_stock > 0 ? "#e74c3c": "#27ae60";
  }
  } catch (error) {
  console.error(" Error al cargar estadísticas:", error);
  }
  },

  // ==================== CARGAR CATEGORÍAS ====================

  async cargarCategorias() {
  try {
  // Obtener categorías únicas del inventario
  const categoriasSet = new Set(
  this.inventario.map((p) => p.categoria).filter(Boolean),
  );
  this.categorias = Array.from(categoriasSet).sort();

  // Llenar select de filtro
  const select = document.getElementById("filtroCategoria");
  if (select) {
  select.innerHTML = '<option value="">Todas las categorías</option>';
  this.categorias.forEach((cat) => {
  const option = document.createElement("option");
  option.value = cat;
  option.textContent = cat;
  select.appendChild(option);
  });
  }
  } catch (error) {
  console.error(" Error al cargar categorías:", error);
  }
  },

  // ==================== ACTUALIZAR TABLA ====================

  async actualizarTablaInventario() {
  const tbody = document.getElementById("inventarioTabla");
  if (!tbody) return;

  if (this.inventario.length === 0) {
  tbody.innerHTML = `
  <tr>
  <td colspan="7" class="text-center" style="color: #7f8c8d; padding: 40px;">
  <div style="font-size: 48px; margin-bottom: 10px;"></div>
  <p style="margin: 0; font-size: 16px;">No hay productos en inventario</p>
  <p style="margin: 5px 0 0 0; font-size: 14px; color: #95a5a6;">Agrega productos para comenzar</p>
  </td>
  </tr>
  `;
  return;
  }

  tbody.innerHTML = this.inventario
.map((producto) => {
  const stock = parseInt(producto.stock) || 0;
  const stockMin = parseInt(producto.stock_minimo) || 0;
  const costo = parseFloat(producto.costo) || 0;
  const valorTotal = stock * costo;

  // Determinar estado del stock
  let estadoStock = "";
  let colorStock = "";

  if (stock === 0) {
  estadoStock = " Sin Stock";
  colorStock = "#e74c3c";
  } else if (stock <= stockMin) {
  estadoStock = " Bajo Stock";
  colorStock = "#f39c12";
  } else {
  estadoStock = " Disponible";
  colorStock = "#27ae60";
  }

  return `
  <tr style="${stock <= stockMin ? "background: #fff3cd;": ""}">
  <td>
  <strong>${producto.codigo || "-"}</strong>
  ${producto.imei ? `<br><small style="color: #7f8c8d;">IMEI: ${producto.imei}</small>`: ""}
  </td>
  <td>
  <strong>${producto.nombre}</strong>
  ${producto.descripcion ? `<br><small style="color: #7f8c8d;">${producto.descripcion}</small>`: ""}
  </td>
  <td>${producto.categoria || "-"}</td>
  <td style="text-align: center; font-size: 20px; font-weight: bold; color: ${colorStock};">
  ${stock}
  ${stock <= stockMin ? '<br><small style="color: #e74c3c;"> Reponer</small>': ""}
  </td>
  <td style="text-align: right;">${Formatters.formatCurrency(costo)}</td>
  <td style="text-align: right; font-weight: bold;">${Formatters.formatCurrency(valorTotal)}</td>
  <td style="text-align: center;">
  <span style="color: ${colorStock}; font-weight: 600;">
  ${estadoStock}
  </span>
  </td>
  <td class="actions">
  <button class="btn btn-primary btn-small" onclick="InventarioModule.mostrarModalMovimiento(${producto.id}, 'entrada')" title="Agregar stock">
  Agregar
  </button>
  <button class="btn btn-warning btn-small" onclick="InventarioModule.mostrarModalMovimiento(${producto.id}, 'salida')" title="Quitar stock">
  Quitar
  </button>
  <button class="btn btn-info btn-small" onclick="InventarioModule.verHistorialMovimientos(${producto.id})" title="Ver historial">
  Historial
  </button>
  <button class="btn btn-secondary btn-small" onclick="InventarioModule.mostrarModalAjustar(${producto.id})" title="Ajustar inventario">
  Ajustar
  </button>
  </td>
  </tr>
  `;
  })
.join("");
  },

  // ==================== FILTRAR INVENTARIO ====================

  async filtrarInventario() {
  const categoria = getValue("filtroCategoria");

  const filtros = {};
  if (categoria) filtros.categoria = categoria;

  this.filtroActual = filtros;
  await this.cargarInventario(filtros);
  },

  filtrarInventarioTabla() {
  const termino = getValue("filtroInventario").toLowerCase();
  const tbody = document.getElementById("inventarioTabla");
  if (!tbody) return;

  const rows = tbody.getElementsByTagName("tr");

  Array.from(rows).forEach((row) => {
  const texto = row.textContent.toLowerCase();
  row.style.display = texto.includes(termino) ? "": "none";
  });
  },

  // ==================== MODAL MOVIMIENTO DE STOCK ====================

  async mostrarModalMovimiento(productoId, tipo) {
  this.productoActual = productoId;

  try {
  const producto = await InventarioAPI.getById(productoId);

  const modal = document.getElementById("modalMovimientoStock");
  if (!modal) {
  console.error(" Modal de movimiento no encontrado");
  return;
  }

  // Configurar modal según el tipo
  const titulo = document.getElementById("tituloModalMovimiento");
  const btnGuardar = document.getElementById("btnGuardarMovimiento");

  if (tipo === "entrada") {
  titulo.textContent = " Agregar Stock";
  btnGuardar.textContent = " Agregar";
  btnGuardar.className = "btn btn-success";
  } else {
  titulo.textContent = " Quitar Stock";
  btnGuardar.textContent = " Quitar";
  btnGuardar.className = "btn btn-warning";
  }

  // Guardar nombre para usarlo en mensajes
  this.nombreProductoActual = producto.nombre;

  // Mostrar información del producto
  document.getElementById("movimientoProductoInfo").innerHTML = `
  <div class="info-panel">
  <strong class="prod-info__name">${producto.nombre}</strong><br>
  <small class="prod-info__meta">Stock actual: <strong class="prod-info__stock">${producto.stock}</strong></small>
  </div>
  `;

  // Configurar tipo de movimiento
  document.getElementById("movimientoTipo").value = tipo;
  document.getElementById("movimientoCantidad").value = "";
  document.getElementById("movimientoMotivo").value = "";

  modal.classList.add("active");
  } catch (error) {
  console.error(" Error al cargar producto:", error);
  mostrarAlerta("Error al cargar producto", "danger");
  }
  },

  cerrarModalMovimiento() {
  const modal = document.getElementById("modalMovimientoStock");
  if (modal) {
  modal.classList.remove("active");
  this.productoActual = null;
  this.nombreProductoActual = null;
  }
  },

  async guardarMovimiento() {
  const cantidad = parseInt(getValue("movimientoCantidad"));
  const tipo = getValue("movimientoTipo");
  const motivo = getValue("movimientoMotivo");

  if (!cantidad || cantidad <= 0) {
  mostrarAlerta("Ingrese una cantidad válida", "warning");
  return;
  }

  try {
  await InventarioAPI.updateStock(
  this.productoActual,
  cantidad,
  tipo,
  motivo,
  );

  const nombre = this.nombreProductoActual || "producto";
  const mensaje =
  tipo === "entrada"
  ? ` Se agregaron ${cantidad} unidades a "${nombre}"`
: ` Se quitaron ${cantidad} unidades de "${nombre}"`;

  mostrarAlerta(mensaje, "success");

  this.cerrarModalMovimiento();
  await this.cargarInventario(this.filtroActual);
  await this.cargarEstadisticas();
  } catch (error) {
  console.error(" Error al guardar movimiento:", error);
  const nombre = this.nombreProductoActual || "producto";
  mostrarAlerta(`Error en "${nombre}": ${error.message}`, "danger");
  }
  },

  // ==================== MODAL AJUSTAR INVENTARIO ====================

  async mostrarModalAjustar(productoId) {
  this.productoActual = productoId;

  try {
  const producto = await InventarioAPI.getById(productoId);

  const modal = document.getElementById("modalAjustarInventario");
  if (!modal) {
  console.error(" Modal de ajuste no encontrado");
  return;
  }

  // Guardar nombre para usarlo en mensajes
  this.nombreProductoActual = producto.nombre;

  // Mostrar información del producto
  document.getElementById("ajusteProductoInfo").innerHTML = `
  <div class="info-panel">
  <strong class="prod-info__name">${producto.nombre}</strong><br>
  <small class="prod-info__meta">Stock actual: <strong class="prod-info__stock">${producto.stock}</strong></small>
  </div>
  `;

  document.getElementById("ajusteNuevaCantidad").value = producto.stock;
  document.getElementById("ajusteMotivo").value = "";

  modal.classList.add("active");
  } catch (error) {
  console.error(" Error al cargar producto:", error);
  mostrarAlerta("Error al cargar producto", "danger");
  }
  },

  cerrarModalAjustar() {
  const modal = document.getElementById("modalAjustarInventario");
  if (modal) {
  modal.classList.remove("active");
  this.productoActual = null;
  this.nombreProductoActual = null;
  }
  },

  async guardarAjuste() {
  const nuevaCantidad = parseInt(getValue("ajusteNuevaCantidad"));
  const motivo = getValue("ajusteMotivo");

  if (nuevaCantidad < 0) {
  mostrarAlerta("La cantidad no puede ser negativa", "warning");
  return;
  }

  if (!motivo || motivo.trim() === "") {
  mostrarAlerta("Debe indicar el motivo del ajuste", "warning");
  return;
  }

  try {
  await InventarioAPI.ajustarInventario(
  this.productoActual,
  nuevaCantidad,
  motivo,
  );

  const nombre = this.nombreProductoActual || "producto";
  mostrarAlerta(
  ` "${nombre}" ajustado a ${nuevaCantidad} unidades`,
  "success",
  );

  this.cerrarModalAjustar();
  await this.cargarInventario(this.filtroActual);
  await this.cargarEstadisticas();
  } catch (error) {
  console.error(" Error al ajustar inventario:", error);
  const nombre = this.nombreProductoActual || "producto";
  mostrarAlerta(`Error al ajustar "${nombre}": ${error.message}`, "danger");
  }
  },

  // ==================== VER HISTORIAL DE MOVIMIENTOS ====================

  async verHistorialMovimientos(productoId) {
  try {
  const producto = await InventarioAPI.getById(productoId);
  const movimientos =
  await InventarioAPI.getHistorialMovimientos(productoId);

  const modal = document.getElementById("modalHistorialMovimientos");
  if (!modal) {
  console.error(" Modal de historial no encontrado");
  return;
  }

  let content = `
  <div class="card-hero">
  <h2 style="margin: 0 0 10px 0; font-size: 28px;"> Historial de Movimientos</h2>
  <p style="margin: 5px 0; font-size: 18px;">${producto.nombre}</p>
  <p style="margin: 5px 0; opacity: 0.9;">Stock actual: <strong style="font-size: 24px;">${producto.stock}</strong></p>
  </div>
  `;

  if (movimientos.length === 0) {
  content += `
  <div class="empty-state">
  <h3></h3>
  <p>No hay movimientos registrados</p>
  </div>
  `;
  } else {
  content += `
  <table class="hist-table">
  <thead>
  <tr>
  <th class="fct-th">Fecha</th>
  <th class="fct-th">Tipo</th>
  <th class="fct-th">Cantidad</th>
  <th class="fct-th">Motivo</th>
  </tr>
  </thead>
  <tbody>
  ${movimientos
.map(
  (mov) => `
  <tr>
  <td>
  ${Formatters.formatFecha(mov.fecha)}<br>
  <small style="color: #7f8c8d;">${Formatters.formatHora(mov.fecha)}</small>
  </td>
  <td style="padding: 12px; text-align: center;">
  ${mov.tipo === "entrada"
  ? '<span class="badge badge-success"> Entrada</span>'
: '<span class="badge badge-warning"> Salida</span>'
  }
  </td>
  <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: ${mov.tipo === "entrada" ? "#27ae60": "#e74c3c"};">
  ${mov.tipo === "entrada" ? "+": "-"}${mov.cantidad}
  </td>
  <td>${mov.motivo || "-"}</td>
  </tr>
  `,
  )
.join("")}
  </tbody>
  </table>
  `;
  }

  content += `
  <div class="flex-end" style="margin-top:20px;">
  <button class="btn btn-secondary" onclick="InventarioModule.cerrarModalHistorial()">
  Cerrar
  </button>
  </div>
  `;

  document.getElementById("historialMovimientosContent").innerHTML =
  content;
  modal.classList.add("active");
  } catch (error) {
  console.error(" Error al cargar historial:", error);
  mostrarAlerta("Error al cargar historial", "danger");
  }
  },

  cerrarModalHistorial() {
  const modal = document.getElementById("modalHistorialMovimientos");
  if (modal) {
  modal.classList.remove("active");
  }
  },

  // ==================== UTILIDADES ====================

  getProductoById(id) {
  return this.inventario.find((p) => p.id === id);
  },
};

// Exportar módulo
window.InventarioModule = InventarioModule;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => InventarioModule.init());
} else {
  InventarioModule.init();
}

