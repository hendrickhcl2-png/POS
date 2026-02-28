// ==================== VARIABLES GLOBALES ====================
let productos = [];
let categorias = [];
let proveedores = [];
let clientes = [];
let configuracion = {};
let metodoPagoSeleccionado = "efectivo";
let ventaItems = [];
let contadorCostos = 0;
let contadorCaracteristicas = 0;
let productoEnEdicion = null;
let ventas = [];
let serviciosDisponibles = [];
let serviciosEnVenta = [];

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", async function () {

  if (!window.API) {
    Toast.error("Error: No se pudo conectar con el servidor.");
    return;
  }

  const autenticado = await Auth.init();
  if (!autenticado) return;

  await inicializarApp();

});

// Expuesta globalmente para que Auth.login() la llame después del login
window.inicializarApp = async function inicializarApp() {
  if (window._appInitialized) return;
  window._appInitialized = true;

  await cargarDatosIniciales();

  const hoy = new Date().toISOString().split("T")[0];
  setValueIfExists("salidaFecha", hoy);
  setValueIfExists("fechaReporteDiario", hoy);

  setupEventListeners();
  agregarLineaCosto();
  agregarCaracteristica();
  agregarItemVenta();
  actualizarSelectsVentaProductos();

  // Inicializar sección activa
  const activeSection = document.querySelector(".section.active");
  if (activeSection) {
    initializeModule(activeSection.id);
  }
};

// ==================== CARGAR DATOS INICIALES ====================
async function cargarDatosIniciales() {
  try {

    [clientes, productos, categorias, proveedores, configuracion] =
      await Promise.all([
        window.API.Clientes.getAll().catch(() => []),
        window.API.Productos.getAll().catch(() => []),
        window.API.Categorias.getAll().catch(() => []),
        window.API.Proveedores.getAll().catch(() => []),
        window.API.Configuracion.get().catch(() => []),
      ]);

    await cargarServicios();

    actualizarSelectClientes();
    actualizarSelectCategorias();
    actualizarSelectProveedores();
    actualizarSelectProductos();
    mostrarServiciosRapidos();
  } catch (error) {
    mostrarAlerta("Error al cargar datos del servidor", "danger");
  }
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
  // Atajos de teclado globales
  document.addEventListener("keydown", function (e) {
    const tag = document.activeElement?.tagName;
    const enCampo = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    // ESC cierra cualquier modal activo (funciona aunque haya un campo enfocado)
    if (e.key === "Escape") {
      cerrarModalActivo();
      return;
    }

    // Atajos numéricos de navegación (solo si no hay campo enfocado)
    if (!enCampo) {
      const map = { "1": "ventas", "2": "creditos", "3": "clientes", "4": "productos", "5": "reportes", "6": "facturacion" };
      if (map[e.key]) {
        e.preventDefault();
        showSection(map[e.key]);
      }
    }
  });

  addSubmitListener("formProducto", guardarProducto);
  addSubmitListener("formProveedor", guardarProveedor);
  addSubmitListener("formSalida", guardarSalida);
  addSubmitListener("formConfiguracion", guardarConfiguracion);

  addInputListener("montoRecibido", calcularCambio);
  addKeyPressListener("buscarProductoVenta", buscarProductoVenta);
  addKeyPressListener("verificadorBuscar", verificarPrecio);

  addInputListener("productoPrecio", calcularPrecioConDescuento);
  addInputListener("descuentoPorcentaje", function () {
    limpiarDescuentoOpuesto("porcentaje");
  });
  addInputListener("descuentoMonto", function () {
    limpiarDescuentoOpuesto("monto");
  });
}

function cerrarModalActivo() {
  // 1. Modales dinámicos conocidos (creados con JS, se cierran con .remove() o su propio método)
  const dinamicos = [
    ["modalFacturaImpresion", () => window.FacturaImpresion?.cerrar()],
    ["modalAgregarManual",    () => window.VentasModule?.cerrarModalManual()],
    ["modalDevolucion",       () => document.getElementById("modalDevolucion")?.remove()],
  ];
  for (const [id, fn] of dinamicos) {
    if (document.getElementById(id)) { fn(); return; }
  }

  // 2. modalRegistrarPago — puede ser dinámico (pagos-module) o HTML (.modal)
  const modalPago = document.getElementById("modalRegistrarPago");
  if (modalPago) {
    if (modalPago.classList.contains("modal")) {
      modalPago.classList.remove("active");
    } else {
      modalPago.remove();
    }
    return;
  }

  // 3. Modales HTML con clase .modal.active
  const activo = document.querySelector(".modal.active");
  if (activo) { activo.classList.remove("active"); return; }

  // 4. Cualquier modal dinámico restante (ej: creditos-module) con display flex/block
  const bodyDivs = document.querySelectorAll("body > div[id]");
  for (const el of bodyDivs) {
    if (el.style.display === "flex" || el.style.display === "block") {
      el.style.display = "none";
      return;
    }
  }
}

function addSubmitListener(formId, handler) {
  const form = document.getElementById(formId);
  if (form) form.addEventListener("submit", handler);
}

function addInputListener(elementId, handler) {
  const element = document.getElementById(elementId);
  if (element) element.addEventListener("input", handler);
}

function addKeyPressListener(elementId, handler) {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handler();
      }
    });
  }
}

// ==================== NAVEGACIÓN ====================
window.showSection = function (sectionId) {

  if (!Auth.canAccess(sectionId)) {
    Toast.error("No tienes permisos para acceder a esta sección");
    return;
  }

  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));

  const section = document.getElementById(sectionId);
  if (section) section.classList.add("active");

  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((nav) => {
    const onclick = nav.getAttribute("onclick");
    if (onclick && onclick.includes(sectionId)) {
      nav.classList.add("active");
    }
  });

  switch (sectionId) {
    case "verificador":
      if (window.VerificadorModule) {
        VerificadorModule.init();
        setTimeout(() => {
          const input = document.getElementById("verificadorInput");
          if (input) input.focus();
        }, 50);
      }
      break;
    case "productos":
      actualizarTablaProductos();
      break;
case "proveedores":
      actualizarTablaProveedores();
      break;
    case "creditos":
      actualizarTablaCreditos();
      break;
    case "reportes":
      if (window.ReportesModule && !window.ReportesModule._initialized) {
        ReportesModule.init();
        ReportesModule._initialized = true;
      } else if (window.ReportesModule) {
        ReportesModule.cargarReporte(ReportesModule.periodoActual || "hoy");
      }
      break;
    case "ventas":
      actualizarHistorialVentas();
      break;
    case "salidas":
      cargarSalidas();
      break;
    case "configuracion":
      cargarConfiguracion();
      if (Auth.isAdmin()) {
        UsuariosModule.cargar();
      }
      break;
    case "reporte-inventario":
      if (window.ReporteInventarioModule) {
        ReporteInventarioModule.init();
      }
      break;
  }

  initializeModule(sectionId);
};

// ==================== INICIALIZACIÓN DE MÓDULOS ====================
function initializeModule(sectionId) {

  switch (sectionId) {
    case "clientes":
      if (window.ClientesModule && !window.ClientesModule._initialized) {
        ClientesModule.init();
        ClientesModule._initialized = true;
      }
      break;

    case "ventas":
      if (window.VentasModule && !window.VentasModule._initialized) {
        VentasModule.init();
        VentasModule._initialized = true;
      }
      break;

    case "inventario":
      if (window.InventarioModule && !window.InventarioModule._initialized) {
        InventarioModule.init();
        InventarioModule._initialized = true;
      }
      break;

    case "facturacion":
      if (window.FacturacionModule && !window.FacturacionModule._initialized) {
        FacturacionModule.init();
        FacturacionModule._initialized = true;
      }
      break;
  }
}

window.switchTab = function (tabId) {
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));

  const tabContent = document.getElementById(tabId);
  if (tabContent) tabContent.classList.add("active");

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    const onclick = tab.getAttribute("onclick");
    if (onclick && onclick.includes(tabId)) {
      tab.classList.add("active");
    }
  });
};

// ==================== CLIENTES ====================

function actualizarSelectClientes() {
  const selects = document.querySelectorAll("#ventaCliente, #creditoCliente");
  selects.forEach((select) => {
    if (!select) return;
    select.innerHTML =
      '<option value="">Cliente General</option>' +
      clientes
        .map(
          (c) =>
            `<option value="${c.id}">${c.nombre} ${c.apellido || ""}</option>`,
        )
        .join("");
  });
}

window.filtrarClientes = function () {
  const busqueda = getValue("buscarCliente").toLowerCase();
  const tbody = document.getElementById("tablaClientes");
  if (!tbody) return;

  const filas = tbody.getElementsByTagName("tr");
  Array.from(filas).forEach((fila) => {
    const texto = fila.textContent.toLowerCase();
    fila.style.display = texto.includes(busqueda) ? "" : "none";
  });
};

// ==================== INVENTARIO ====================
async function actualizarInventario() {
  const tbody = document.getElementById("inventarioTabla");
  if (!tbody) return;

  try {
    productos = await window.API.Productos.getAll();

    if (productos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center">No hay productos en inventario</td></tr>';
      return;
    }

    tbody.innerHTML = productos
      .map((p) => {
        const codigoPrincipal = p.imei || p.codigo_barras || p.sku;

        return `
          <tr onclick="verDetalleProducto(${p.id})" style="cursor: pointer;">
            <td>${codigoPrincipal}</td>
            <td>${p.nombre}</td>
            <td>${p.categoria_nombre || "-"}</td>
            <td>${p.stock_actual}</td>
            <td>$${parseFloat(p.precio_costo).toFixed(2)}</td>
            <td>$${(p.precio_costo * p.stock_actual).toFixed(2)}</td>
            <td>
              <span class="badge ${p.activo ? "badge-success" : "badge-danger"}">
                ${p.activo ? "Activo" : "Inactivo"}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    const totalProductos = productos.length;
    const valorInventario = productos.reduce(
      (sum, p) => sum + p.precio_costo * p.stock_actual,
      0,
    );
    const bajoStock = productos.filter(
      (p) => p.stock_actual <= p.stock_minimo,
    ).length;

    setTextIfExists(".stat-card:nth-child(1).value", totalProductos);
    setTextIfExists(
      ".stat-card:nth-child(2).value",
      `$${valorInventario.toFixed(2)}`,
    );
    setTextIfExists(".stat-card:nth-child(3).value", bajoStock);
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-danger">Error al cargar inventario</td></tr>';
  }
}

// ==================== VENTAS ====================
function agregarItemVenta() {
  const container = document.getElementById("ventaItems");
  if (!container) return;

  const itemDiv = document.createElement("div");
  itemDiv.className = "invoice-item";
  itemDiv.innerHTML = `
    <div class="form-group">
      <select class="item-producto" onchange="actualizarPrecioItem(this)">
        <option value="">Seleccione producto</option>
        ${productos
          .map((p) => {
            const codigo = p.imei || p.codigo_barras || p.sku;
            return `<option value="${p.id}" data-precio="${p.precio_venta}" data-mayoreo="${p.precio_mayoreo || p.precio_venta}">${codigo} - ${p.nombre}</option>`;
          })
          .join("")}
      </select>
    </div>
    <div class="form-group">
      <input type="number" class="item-cantidad" placeholder="Cantidad" min="1" value="1" onchange="calcularTotalesVenta()">
    </div>
    <div class="form-group">
      <input type="number" class="item-precio" placeholder="Precio" readonly>
    </div>
    <div class="form-group">
      <label><input type="checkbox" class="item-mayoreo" onchange="actualizarPrecioItem(this.closest('.invoice-item').querySelector('.item-producto'))"> Mayoreo</label>
    </div>
    <div class="form-group">
      <input type="number" class="item-total" placeholder="Total" readonly>
    </div>
    <button type="button" class="btn btn-danger btn-small" onclick="this.parentElement.remove(); calcularTotalesVenta();">Eliminar</button>
  `;
  actualizarSelectsVentaProductos();
  container.appendChild(itemDiv);
}

function actualizarSelectsVentaProductos() {
  const selects = document.querySelectorAll(".item-producto");

  selects.forEach((select) => {
    const valorActual = select.value;

    select.innerHTML =
      '<option value="">Seleccione producto</option>' +
      productos
        .map((p) => {
          const codigo = p.imei || p.codigo_barras || p.sku;
          return `
            <option
              value="${p.id}"
              data-precio="${p.precio_venta}"
              data-mayoreo="${p.precio_mayoreo || p.precio_venta}">
              ${codigo} - ${p.nombre}
            </option>`;
        })
        .join("");

    if (valorActual) select.value = valorActual;
  });
}

window.actualizarPrecioItem = function (select) {
  const item = select.closest(".invoice-item");
  const productoId = select.value;
  const esMayoreo = item.querySelector(".item-mayoreo").checked;

  if (!productoId) return;

  const option = select.options[select.selectedIndex];
  const precio = esMayoreo ? option.dataset.mayoreo : option.dataset.precio;

  item.querySelector(".item-precio").value = parseFloat(precio).toFixed(2);
  calcularTotalesVenta();
};

// ==================== MÓDULO DE SERVICIOS EN VENTAS ====================

async function cargarServicios() {
  try {
    serviciosDisponibles = await window.API.Servicios.getAll();
  } catch (error) {
    serviciosDisponibles = [];
  }
}

window.agregarServicioAVenta = function (servicioId = null) {
  const container = document.getElementById("serviciosEnVenta");
  if (!container) return;

  const servicioDiv = document.createElement("div");
  servicioDiv.className = "servicio-item";
  servicioDiv.style.cssText = `
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 10px;
    margin-bottom: 10px;
    padding: 12px;
    background: #f0f8ff;
    border-radius: 5px;
    border-left: 4px solid #4CAF50;
    align-items: center;
  `;

  const opcionesServicios = serviciosDisponibles
    .map((s) => {
      const precio = s.es_gratuito
        ? "GRATIS"
        : `$${parseFloat(s.precio).toFixed(2)}`;
      const badge = s.es_gratuito ? " " : "";
      return `<option value="${s.id}" data-precio="${s.precio}" data-gratuito="${s.es_gratuito}" data-nombre="${s.nombre}">${s.nombre} - ${precio}${badge}</option>`;
    })
    .join("");

  servicioDiv.innerHTML = `
    <select class="servicio-select" onchange="actualizarPrecioServicio(this)">
      <option value="">Seleccione servicio...</option>
      ${opcionesServicios}
    </select>
    <input
      type="number"
      class="servicio-cantidad"
      placeholder="Cant"
      min="1"
      value="1"
      onchange="calcularTotalesVenta()"
      style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"
    />
    <input
      type="number"
      class="servicio-precio"
      placeholder="Precio"
      readonly
      style="padding: 8px; border: 1px solid #ddd; border-radius: 5px; background: #f5f5f5; text-align: right; font-weight: bold;"
    />
    <button
      type="button"
      class="btn btn-danger btn-small"
      onclick="this.parentElement.remove(); calcularTotalesVenta();"
      style="padding: 8px 12px; white-space: nowrap;"
    >
      Eliminar
    </button>
  `;

  container.appendChild(servicioDiv);

  if (servicioId) {
    const select = servicioDiv.querySelector(".servicio-select");
    select.value = servicioId;
    actualizarPrecioServicio(select);
  }
};

window.actualizarPrecioServicio = function (select) {
  const servicioItem = select.closest(".servicio-item");
  const servicioId = select.value;

  if (!servicioId) {
    servicioItem.querySelector(".servicio-precio").value = "";
    calcularTotalesVenta();
    return;
  }

  const option = select.options[select.selectedIndex];
  const precio = parseFloat(option.dataset.precio) || 0;
  const esGratuito = option.dataset.gratuito === "true";

  const precioInput = servicioItem.querySelector(".servicio-precio");
  precioInput.value = esGratuito ? "0.00 (GRATIS)" : precio.toFixed(2);

  if (esGratuito) {
    servicioItem.style.borderLeftColor = "#4CAF50";
    precioInput.style.color = "#4CAF50";
  } else {
    servicioItem.style.borderLeftColor = "#2196F3";
    precioInput.style.color = "#333";
  }

  calcularTotalesVenta();
};

function mostrarServiciosRapidos() {
  const container = document.getElementById("serviciosRapidos");
  if (!container) return;

  const serviciosComunes = serviciosDisponibles.filter(
    (s) =>
      s.nombre.toLowerCase().includes("protector") ||
      s.nombre.toLowerCase().includes("configuración") ||
      s.nombre.toLowerCase().includes("configuracion") ||
      s.nombre.toLowerCase().includes("gratis"),
  );

  container.innerHTML = serviciosComunes
    .slice(0, 6)
    .map((s) => {
      const badge = s.es_gratuito ? "" : `$${s.precio}`;
      return `
        <button
          type="button"
          class="btn btn-small ${s.es_gratuito ? "btn-success" : "btn-info"}"
          onclick="agregarServicioAVenta(${s.id})"
          style="margin: 5px; padding: 8px 12px; white-space: nowrap;"
        >
          ${s.nombre.substring(0, 25)}... ${badge}
        </button>
      `;
    })
    .join("");
}

function calcularTotalesVenta() {
  const items = document.querySelectorAll("#ventaItems.invoice-item");
  let subtotal = 0;

  items.forEach((item) => {
    const cantidad =
      parseFloat(item.querySelector(".item-cantidad").value) || 0;
    const precio = parseFloat(item.querySelector(".item-precio").value) || 0;
    const total = cantidad * precio;
    item.querySelector(".item-total").value = total.toFixed(2);
    subtotal += total;
  });

  const servicios = document.querySelectorAll(
    "#serviciosEnVenta.servicio-item",
  );
  servicios.forEach((servicio) => {
    const select = servicio.querySelector(".servicio-select");
    if (!select.value) return;

    const cantidad =
      parseFloat(servicio.querySelector(".servicio-cantidad").value) || 0;
    const option = select.options[select.selectedIndex];
    const precio = parseFloat(option.dataset.precio) || 0;
    const esGratuito = option.dataset.gratuito === "true";

    const totalServicio = esGratuito ? 0 : cantidad * precio;
    subtotal += totalServicio;
  });

  const itbis = subtotal * 0.18;
  const total = subtotal + itbis;

  setTextIfExists("#ventaSubtotal", `$${subtotal.toFixed(2)}`);
  setTextIfExists("#ventaITBIS", `$${itbis.toFixed(2)}`);
  setTextIfExists("#ventaTotal", `$${total.toFixed(2)}`);
}

function calcularCambio() {
  const total =
    parseFloat(
      document.getElementById("ventaTotal")?.textContent.replace("$", ""),
    ) || 0;
  const recibido = parseFloat(getValue("montoRecibido")) || 0;
  const cambio = recibido - total;
  setValueIfExists("cambio", cambio >= 0 ? cambio.toFixed(2) : "0.00");
}

window.selectPaymentMethod = function (metodo) {
  metodoPagoSeleccionado = metodo;

  document
    .querySelectorAll(".payment-method")
    .forEach((pm) => pm.classList.remove("active"));
  event.target.closest(".payment-method")?.classList.add("active");

  document.getElementById("pagoEfectivo").style.display =
    metodo === "efectivo" ? "block" : "none";
  document.getElementById("pagoTarjeta").style.display =
    metodo === "tarjeta" ? "block" : "none";
  document.getElementById("pagoTransferencia").style.display =
    metodo === "transferencia" ? "block" : "none";
  document.getElementById("pagoMixto").style.display =
    metodo === "mixto" ? "block" : "none";
};

async function buscarProductoVenta() {
  const query = getValue("buscarProductoVenta");
  if (!query || query.length < 2) return;

  try {
    const resultados = await window.API.Productos.search(query);
    if (resultados.length > 0) {
      const producto = resultados[0];
      mostrarAlerta(`Encontrado: ${producto.nombre}`, "info");
    } else {
      mostrarAlerta("No se encontraron productos", "warning");
    }
  } catch (error) {
    mostrarAlerta("Error en búsqueda", "danger");
  }
}

async function actualizarHistorialVentas() {
  const tbody = document.querySelector("#historialVentas tbody");
  if (!tbody) return;

  try {
    const hoy = new Date().toISOString().split("T")[0];
    ventas = await window.API.Ventas.getAll(hoy, hoy);

    if (ventas.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6">No hay ventas registradas hoy</td></tr>';
      return;
    }

    tbody.innerHTML = ventas
      .map((v) => {
        const cliente = clientes.find((c) => c.id == v.cliente_id);
        const nombreCliente = cliente
          ? `${cliente.nombre} ${cliente.apellido || ""}`.trim()
          : "Cliente General";

        return `
          <tr>
            <td>${v.numero_ticket}</td>
            <td>${v.hora || new Date(v.created_at).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</td>
            <td>${nombreCliente}</td>
            <td>$${parseFloat(v.total).toFixed(2)}</td>
            <td>${formatearMetodoPago(v.metodo_pago)}</td>
            <td class="actions">
              <button class="btn btn-info btn-small" onclick="verDetalleVenta(${v.id})"> Ver</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    // silently fail — table shows empty state from previous render
  }
}

function formatearMetodoPago(metodo) {
  const metodos = {
    efectivo: " Efectivo",
    tarjeta: " Tarjeta",
    transferencia: " Transferencia",
    mixto: " Mixto",
  };
  return metodos[metodo] || metodo;
}

window.verDetalleVenta = async function (ventaId) {
  try {
    const venta = await window.API.Ventas.getById(ventaId);
    Toast.info(`Venta #${venta.numero_ticket} — Total: $${venta.total}`);
  } catch (error) {
    mostrarAlerta("Error al cargar detalle de venta", "danger");
  }
};

// ==================== CRÉDITOS ====================
function actualizarTablaCreditos() {
  if (window.CreditosModule) {
    CreditosModule.init();
  }
}

// ==================== UTILIDADES ====================

window.verificarPrecio = async function () {
  const query = getValue("verificadorBuscar");
  if (!query) return;

  try {
    const productos = await window.API.Productos.search(query);
    const resultado = document.getElementById("verificadorResultado");
    if (!resultado) return;

    if (productos.length > 0) {
      const p = productos[0];
      const codigo = p.imei || p.codigo_barras || p.sku;
      resultado.innerHTML = `
        <div class="alert alert-success">
          <h3>${p.nombre}</h3>
          <p><strong>Código/IMEI:</strong> ${codigo}</p>
          <p><strong>Precio:</strong> $${parseFloat(p.precio_venta).toFixed(2)}</p>
          <p><strong>Stock:</strong> ${p.stock_actual} unidades</p>
          <button class="btn btn-info" onclick="verDetalleProducto(${p.id})">Ver Detalles Completos</button>
        </div>
      `;
    } else {
      resultado.innerHTML =
        '<div class="alert alert-danger">Producto no encontrado</div>';
    }
  } catch (error) {
    mostrarAlerta("Error al verificar precio", "danger");
  }
};

window.cancelarVenta = function () {
  if (confirm("¿Está seguro de cancelar la venta?")) {
    document.getElementById("formVenta").reset();
    document.getElementById("ventaItems").innerHTML = "";
    document.getElementById("serviciosEnVenta").innerHTML = "";
    agregarItemVenta();
    calcularTotalesVenta();
    mostrarAlerta("Venta cancelada", "info");
  }
};
