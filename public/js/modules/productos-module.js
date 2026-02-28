// ==================== MÓDULO DE PRODUCTOS ====================

// ==================== SISTEMA DINÁMICO DE COSTOS ====================

window.agregarLineaCosto = function () {
  contadorCostos++;
  const container = document.getElementById("costosContainer");
  if (!container) return;

  const lineaDiv = document.createElement("div");
  lineaDiv.className = "costo-item-dinamico";
  lineaDiv.id = `costo-${contadorCostos}`;
  lineaDiv.style.cssText = `
    display: grid;
    grid-template-columns: 2fr 1fr auto;
    gap: 10px;
    margin-bottom: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 5px;
    border-left: 3px solid #3498db;
  `;

  lineaDiv.innerHTML = `
    <input
      type="text"
      class="costo-concepto"
      data-id="${contadorCostos}"
      placeholder="Descripción del costo (ej: Costo de pantalla, Costo de batería...)"
      style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;"
    />
    <input
      type="number"
      class="costo-monto"
      data-id="${contadorCostos}"
      step="0.01"
      min="0"
      placeholder="$0.00"
      style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; text-align: right;"
      oninput="calcularCostoTotal()"
    />
    <button
      type="button"
      class="btn btn-danger btn-small"
      onclick="eliminarLineaCosto(${contadorCostos})"
      title="Eliminar esta línea"
      style="padding: 8px 12px;"
    >
      Eliminar
    </button>
  `;

  container.appendChild(lineaDiv);
  lineaDiv.querySelector(".costo-concepto").focus();
};

window.eliminarLineaCosto = function (id) {
  const elemento = document.getElementById(`costo-${id}`);
  if (elemento) {
    elemento.remove();
    calcularCostoTotal();
  }
};

function calcularCostoTotal() {
  const montos = document.querySelectorAll(".costo-monto");
  let total = 0;

  montos.forEach((input) => {
    const valor = parseFloat(input.value) || 0;
    total += valor;
  });

  const campoCostoTotal = document.getElementById("productoCosto");
  if (campoCostoTotal) {
    campoCostoTotal.value = total.toFixed(2);
  }
}

function obtenerCostos() {
  const costos = [];
  const lineas = document.querySelectorAll(".costo-item-dinamico");

  lineas.forEach((linea) => {
    const concepto = linea.querySelector(".costo-concepto").value.trim();
    const monto = parseFloat(linea.querySelector(".costo-monto").value) || 0;

    if (concepto && monto > 0) {
      costos.push({ concepto, monto });
    } else if (monto > 0) {
      costos.push({ concepto: "Costo adicional", monto });
    }
  });

  return costos;
}

function limpiarCostos() {
  const container = document.getElementById("costosContainer");
  if (container) {
    container.innerHTML = "";
  }
  contadorCostos = 0;
  calcularCostoTotal();
}

// ==================== CARACTERÍSTICAS ====================

window.agregarCaracteristica = function (nombre = "", valor = "", tipo = "estado") {
  contadorCaracteristicas++;
  const container = document.getElementById("caracteristicasContainer");
  if (!container) return;

  const lineaDiv = document.createElement("div");
  lineaDiv.className = "caracteristica-item";
  lineaDiv.id = `caracteristica-${contadorCaracteristicas}`;
  lineaDiv.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 10px;
    margin-bottom: 10px;
    padding: 10px;
    background: #f0f8ff;
    border-radius: 5px;
    border-left: 3px solid #2196F3;
  `;

  lineaDiv.innerHTML = `
    <input
      type="text"
      class="caracteristica-nombre"
      placeholder="Ej: Batería, Pantalla, Cámara..."
      value="${nombre}"
      style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"
    />
    <input
      type="text"
      class="caracteristica-valor"
      placeholder="Ej: 80%, Original, Funciona perfectamente..."
      value="${valor}"
      style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"
    />
    <button
      type="button"
      class="btn btn-danger btn-small"
      onclick="eliminarCaracteristica(${contadorCaracteristicas})"
      title="Eliminar"
      style="padding: 8px 12px;"
    >
      Eliminar
    </button>
  `;

  container.appendChild(lineaDiv);
  lineaDiv.querySelector(".caracteristica-nombre").focus();
};

window.eliminarCaracteristica = function (id) {
  const elemento = document.getElementById(`caracteristica-${id}`);
  if (elemento) {
    elemento.remove();
  }
};

function obtenerCaracteristicas() {
  const caracteristicas = [];
  const lineas = document.querySelectorAll(".caracteristica-item");

  lineas.forEach((linea) => {
    const nombre = linea.querySelector(".caracteristica-nombre").value.trim();
    const valor = linea.querySelector(".caracteristica-valor").value.trim();

    if (nombre && valor) {
      caracteristicas.push({ nombre, valor, tipo: "estado" });
    }
  });

  return caracteristicas;
}

function limpiarCaracteristicas() {
  const container = document.getElementById("caracteristicasContainer");
  if (container) {
    container.innerHTML = "";
  }
  contadorCaracteristicas = 0;
}

// ==================== CALCULAR PRECIO CON DESCUENTO ====================

function calcularPrecioConDescuento() {
  const precioVenta = parseFloat(getValue("productoPrecio")) || 0;
  const descuentoPorcentaje = parseFloat(getValue("descuentoPorcentaje")) || 0;
  const descuentoMonto = parseFloat(getValue("descuentoMonto")) || 0;

  let precioFinal = precioVenta;

  if (descuentoPorcentaje > 0) {
    precioFinal = precioVenta - (precioVenta * descuentoPorcentaje) / 100;
  } else if (descuentoMonto > 0) {
    precioFinal = precioVenta - descuentoMonto;
  }

  if (precioFinal < 0) precioFinal = 0;

  const elementoPrecioFinal = document.getElementById("precioConDescuento");
  if (elementoPrecioFinal) {
    elementoPrecioFinal.textContent = `$${precioFinal.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return precioFinal;
}

function limpiarDescuentoOpuesto(tipo) {
  if (tipo === "porcentaje") {
    const montoInput = document.getElementById("descuentoMonto");
    if (montoInput && parseFloat(getValue("descuentoPorcentaje")) > 0) {
      montoInput.value = "0";
    }
  } else if (tipo === "monto") {
    const porcentajeInput = document.getElementById("descuentoPorcentaje");
    if (porcentajeInput && parseFloat(getValue("descuentoMonto")) > 0) {
      porcentajeInput.value = "0";
    }
  }
  calcularPrecioConDescuento();
}

// ==================== EDITAR PRODUCTO ====================

window.editarProducto = async function (productoId) {
  try {
    const producto = await window.API.Productos.getById(productoId);
    productoEnEdicion = producto;

    cerrarModal("modalDetalleProducto");
    showSection("productos");

    document.getElementById("formProducto")?.scrollIntoView({ behavior: "smooth" });

    setValueIfExists("productoCodigo", producto.codigo_barras || "");
    setValueIfExists("productoIMEI", producto.imei || "");
    setValueIfExists("productoSKU", producto.sku || "");
    setValueIfExists("productoNombre", producto.nombre || "");
    setValueIfExists("productoDescripcion", producto.descripcion || "");
    setValueIfExists("productoCategoria", producto.categoria_id || "");
    toggleStockPorCategoria();
    setValueIfExists("productoProveedor", producto.proveedor_id || "");
    setValueIfExists("productoPrecio", producto.precio_venta || "");
    setValueIfExists("productoMayoreo", producto.precio_mayoreo || "");
    setValueIfExists("productoCantidadMayoreo", producto.cantidad_mayoreo || 5);
    setValueIfExists("productoStock", producto.stock_actual || 0);
    setValueIfExists("productoStockMin", producto.stock_minimo || 0);
    setValueIfExists("productoStockMax", producto.stock_maximo || 0);
    setValueIfExists("descuentoPorcentaje", producto.descuento_porcentaje || 0);
    setValueIfExists("descuentoMonto", producto.descuento_monto || 0);

    const checkDisponible = document.getElementById("productoDisponible");
    if (checkDisponible) {
      checkDisponible.checked = producto.disponible !== false;
    }

    limpiarCostos();
    if (producto.costos && producto.costos.length > 0) {
      producto.costos.forEach((costo) => {
        agregarLineaCosto();
        const ultimaLinea = document.querySelector(".costo-item-dinamico:last-child");
        if (ultimaLinea) {
          ultimaLinea.querySelector(".costo-concepto").value = costo.concepto;
          ultimaLinea.querySelector(".costo-monto").value = costo.monto;
        }
      });
      calcularCostoTotal();
    } else {
      agregarLineaCosto();
    }

    limpiarCaracteristicas();
    if (producto.caracteristicas && producto.caracteristicas.length > 0) {
      producto.caracteristicas.forEach((carac) => {
        agregarCaracteristica(carac.nombre, carac.valor, carac.tipo);
      });
    } else {
      agregarCaracteristica();
    }

    const btnSubmit = document.querySelector('#formProducto button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.textContent = "Actualizar Producto";
      btnSubmit.classList.remove("btn-primary");
      btnSubmit.classList.add("btn-warning");
    }

    let btnCancelar = document.getElementById("btnCancelarEdicion");
    if (!btnCancelar) {
      btnCancelar = document.createElement("button");
      btnCancelar.type = "button";
      btnCancelar.id = "btnCancelarEdicion";
      btnCancelar.className = "btn btn-secondary";
      btnCancelar.textContent = " Cancelar Edición";
      btnCancelar.onclick = cancelarEdicion;
      btnSubmit.parentElement.appendChild(btnCancelar);
    }

    mostrarAlerta("Modo edición activado. Modifica los campos necesarios.", "info");
  } catch (error) {
    mostrarAlerta("Error al cargar producto para editar", "danger");
  }
};

function cancelarEdicion() {
  productoEnEdicion = null;

  document.getElementById("formProducto").reset();
  toggleStockPorCategoria();
  limpiarCostos();
  limpiarCaracteristicas();
  agregarLineaCosto();
  agregarCaracteristica();

  const btnSubmit = document.querySelector('#formProducto button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.textContent = "Guardar Producto";
    btnSubmit.classList.remove("btn-warning");
    btnSubmit.classList.add("btn-primary");
  }

  const btnCancelar = document.getElementById("btnCancelarEdicion");
  if (btnCancelar) btnCancelar.remove();

  mostrarAlerta("Edición cancelada", "info");
}

// ==================== GUARDAR PRODUCTO ====================

async function guardarProducto(e) {
  e.preventDefault();

  const nombre = getValue("productoNombre");
  if (!nombre || nombre.trim() === "") {
    mostrarAlerta("El nombre del producto es obligatorio", "warning");
    return;
  }

  const categoriaId = getValue("productoCategoria");
  if (!categoriaId || categoriaId === "") {
    mostrarAlerta("Debe seleccionar una categoría", "warning");
    return;
  }

  const costos = obtenerCostos();
  const caracteristicas = obtenerCaracteristicas();

  const codigoBarras = getValue("productoCodigo");
  const imei = getValue("productoIMEI");

  const productoData = {
    codigo_barras: codigoBarras || null,
    imei: imei || null,
    nombre: nombre,
    descripcion: getValue("productoDescripcion"),
    categoria_id: parseInt(categoriaId),
    proveedor_id: parseInt(getValue("productoProveedor")) || null,
    precio_costo: parseFloat(getValue("productoCosto")) || 0,
    precio_venta: parseFloat(getValue("productoPrecio")) || 0,
    precio_mayoreo: parseFloat(getValue("productoMayoreo")) || null,
    cantidad_mayoreo: parseInt(getValue("productoCantidadMayoreo")) || 5,
    stock_actual: parseInt(getValue("productoStock")) || 0,
    stock_minimo: parseInt(getValue("productoStockMin")) || 0,
    stock_maximo: parseInt(getValue("productoStockMax")) || 0,
    descuento_porcentaje: parseFloat(getValue("descuentoPorcentaje")) || 0,
    descuento_monto: parseFloat(getValue("descuentoMonto")) || 0,
    disponible: document.getElementById("productoDisponible")?.checked !== false,
    aplica_itbis: true,
    activo: true,
    costos: costos,
    caracteristicas: caracteristicas,
  };

  try {
    let producto;

    if (productoEnEdicion) {
      producto = await window.API.Productos.update(productoEnEdicion.id, productoData);

      const index = productos.findIndex((p) => p.id === productoEnEdicion.id);
      if (index !== -1) {
        if (producto.categoria_id) {
          const categoria = categorias.find((c) => c.id == producto.categoria_id);
          if (categoria) producto.categoria_nombre = categoria.nombre;
        }
        if (producto.proveedor_id) {
          const proveedor = proveedores.find((p) => p.id == producto.proveedor_id);
          if (proveedor) producto.proveedor_nombre = proveedor.nombre;
        }
        productos[index] = producto;
      }

      mostrarAlerta(`"${nombre}" actualizado exitosamente`, "success");
      cancelarEdicion();
    } else {
      producto = await window.API.Productos.create(productoData);

      if (producto.categoria_id) {
        const categoria = categorias.find((c) => c.id == producto.categoria_id);
        if (categoria) producto.categoria_nombre = categoria.nombre;
      }
      if (producto.proveedor_id) {
        const proveedor = proveedores.find((p) => p.id == producto.proveedor_id);
        if (proveedor) producto.proveedor_nombre = proveedor.nombre;
      }

      productos.push(producto);

      document.getElementById("formProducto").reset();
      limpiarCostos();
      limpiarCaracteristicas();
      agregarLineaCosto();
      agregarCaracteristica();

      mostrarAlerta(`"${nombre}" guardado exitosamente`, "success");
    }

    actualizarTablaProductos();
    actualizarSelectProductos();
    actualizarInventario();
  } catch (error) {
    mostrarAlerta("Error al guardar producto: " + error.message, "danger");
  }
}

function actualizarTablaProductos() {
  const tbody = document.getElementById("tablaProductos");
  if (!tbody) return;

  if (productos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No hay productos</td></tr>';
    return;
  }

  tbody.innerHTML = productos
    .map((p) => {
      const codigoPrincipal = p.codigo_barras || p.imei || `ID-${p.id}`;
      const disponible = p.disponible !== false;
      const tieneDescuento = p.descuento_porcentaje > 0 || p.descuento_monto > 0;

      return `
        <tr style="${!disponible ? "opacity: 0.6;" : ""}">
          <td>${codigoPrincipal}</td>
          <td>
            ${p.nombre}
            ${p.caracteristicas && p.caracteristicas.length > 0
              ? `<br><small style="color: #7f8c8d;">${p.caracteristicas.length} característica(s)</small>`
              : ""}
          </td>
          <td>${p.categoria_nombre || "-"}</td>
          <td>
            ${tieneDescuento
              ? `<span style="text-decoration: line-through; color: #95a5a6;">$${parseFloat(p.precio_venta).toFixed(2)}</span><br>
                 <span style="color: #27ae60; font-weight: bold;">$${parseFloat(p.precio_con_descuento || p.precio_venta).toFixed(2)}</span>`
              : `$${parseFloat(p.precio_venta).toFixed(2)}`}
          </td>
          <td>${p.stock_actual}</td>
          <td>
            <span class="badge ${disponible ? "badge-success" : "badge-danger"}">
              ${disponible ? "Disponible" : "Vendido"}
            </span>
          </td>
          <td class="actions">
            <button class="btn btn-info btn-small" onclick="verDetalleProducto(${p.id})">Ver</button>
            <button class="btn btn-warning btn-small" onclick="editarProducto(${p.id})">Editar</button>
            <button class="btn btn-danger btn-small" onclick="eliminarProducto(${p.id})">Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ==================== VER DETALLE DE PRODUCTO ====================

window.verDetalleProducto = async function (productoId) {
  try {
    const producto = await window.API.Productos.getById(productoId);

    const codigoPrincipal = producto.imei || producto.codigo_barras || producto.sku;
    const tipoProducto = producto.imei
      ? "IMEI"
      : producto.codigo_barras
      ? "Código de Barras"
      : "SKU";

    const precioFinal = producto.precio_con_descuento || producto.precio_venta;
    const ganancia = precioFinal - producto.precio_costo;
    const margenPorcentaje = ((ganancia / producto.precio_costo) * 100).toFixed(2);

    let caracteristicasHTML = "";
    if (producto.caracteristicas && producto.caracteristicas.length > 0) {
      caracteristicasHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #34495e; margin-bottom: 10px;">Características del Producto:</h4>
          ${producto.caracteristicas
            .map(
              (c) => `
            <div style="padding: 8px; margin: 5px 0; background: white; border-radius: 3px; border-left: 3px solid #2196F3;">
              <strong style="color: #2c3e50;">${c.nombre}:</strong>
              <span style="color: #34495e;">${c.valor}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    let costosHTML = "";
    if (producto.costos && producto.costos.length > 0) {
      costosHTML = producto.costos
        .map(
          (c, index) => `
          <div class="cost-item" style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">
            <span style="color: #34495e;"><strong>${index + 1}.</strong> ${c.concepto}</span>
            <span style="font-weight: bold; color: #2c3e50;">$${parseFloat(c.monto).toFixed(2)}</span>
          </div>
        `,
        )
        .join("");
    } else {
      costosHTML = `
        <div class="cost-item">
          <span>Costo de compra:</span>
          <span style="font-weight: bold;">$${parseFloat(producto.precio_costo).toFixed(2)}</span>
        </div>
      `;
    }

    const tieneDescuento = producto.descuento_porcentaje > 0 || producto.descuento_monto > 0;
    let descuentoHTML = "";
    if (tieneDescuento) {
      descuentoHTML = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h4 style="color: #856404; margin-bottom: 10px;">Descuento Aplicado:</h4>
          ${producto.descuento_porcentaje > 0
            ? `<p style="margin: 5px 0; color: #856404;"><strong>Porcentaje:</strong> ${producto.descuento_porcentaje}%</p>`
            : `<p style="margin: 5px 0; color: #856404;"><strong>Monto:</strong> $${producto.descuento_monto.toFixed(2)}</p>`}
          <p style="margin: 5px 0; color: #856404;">
            <strong>Precio Original:</strong>
            <span style="text-decoration: line-through;">$${parseFloat(producto.precio_venta).toFixed(2)}</span>
          </p>
          <p style="margin: 5px 0; color: #856404; font-size: 18px;">
            <strong>Precio con Descuento:</strong>
            <span style="color: #27ae60; font-weight: bold;">$${parseFloat(precioFinal).toFixed(2)}</span>
          </p>
        </div>
      `;
    }

    const content = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Información General
          </h3>

          <div style="margin: 15px 0;">
            <strong>${tipoProducto}:</strong>
            <p style="font-size: 18px; color: #3498db; font-weight: bold;">${codigoPrincipal}</p>
          </div>

          <div style="margin: 15px 0;">
            <strong>Nombre del Producto:</strong>
            <p style="font-size: 16px;">${producto.nombre}</p>
          </div>

          ${producto.descripcion
            ? `<div style="margin: 15px 0;">
                <strong>Descripción:</strong>
                <p>${producto.descripcion}</p>
               </div>`
            : ""}

          <div style="margin: 15px 0;">
            <strong>Categoría:</strong>
            <p>${producto.categoria_nombre || "Sin categoría"}</p>
          </div>

          <div style="margin: 15px 0;">
            <strong>Proveedor:</strong>
            <p>${producto.proveedor_nombre || "Sin proveedor"}</p>
          </div>

          <div style="margin: 15px 0;">
            <strong>Estado:</strong>
            <p style="font-size: 20px; color: ${producto.disponible !== false ? "#27ae60" : "#e74c3c"}; font-weight: bold;">
              ${producto.disponible !== false ? "Disponible" : "Vendido"}
            </p>
          </div>

          ${caracteristicasHTML}
        </div>

        <div>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Costos y Precios
          </h3>

          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
            <h4 style="color: #34495e; margin-bottom: 10px;">Desglose de Costos:</h4>
            ${costosHTML}
            <div class="cost-item" style="border-top: 2px solid #34495e; margin-top: 10px; padding-top: 10px;">
              <span><strong>COSTO TOTAL:</strong></span>
              <span style="font-weight: bold; color: #e74c3c; font-size: 18px;">
                $${parseFloat(producto.precio_costo).toFixed(2)}
              </span>
            </div>
          </div>

          ${descuentoHTML}

          <div style="margin: 20px 0; padding: 15px; background: #ecf0f1; border-radius: 5px;">
            <div style="margin: 10px 0;">
              <strong>Precio de Venta${tieneDescuento ? " Original" : ""}:</strong>
              <p style="font-size: ${tieneDescuento ? "16px" : "20px"}; color: ${tieneDescuento ? "#95a5a6" : "#27ae60"}; font-weight: bold; ${tieneDescuento ? "text-decoration: line-through;" : ""}">
                $${parseFloat(producto.precio_venta).toFixed(2)}
              </p>
            </div>

            ${tieneDescuento
              ? `<div style="margin: 10px 0;">
                  <strong>Precio Final con Descuento:</strong>
                  <p style="font-size: 22px; color: #27ae60; font-weight: bold;">
                    $${parseFloat(precioFinal).toFixed(2)}
                  </p>
                 </div>`
              : ""}

            ${producto.precio_mayoreo
              ? `<div style="margin: 10px 0;">
                  <strong>Precio Mayoreo:</strong>
                  <p style="font-size: 18px; color: #f39c12; font-weight: bold;">
                    $${parseFloat(producto.precio_mayoreo).toFixed(2)}
                    <small>(${producto.cantidad_mayoreo}+ unidades)</small>
                  </p>
                 </div>`
              : ""}

            <div style="margin: 15px 0; padding: 15px; background: #d4edda; border-radius: 5px;">
              <strong>Ganancia por Unidad:</strong>
              <p style="font-size: 22px; color: #155724; font-weight: bold;">
                $${ganancia.toFixed(2)}
                <small style="font-size: 14px;">(${margenPorcentaje}% de margen)</small>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="editarProducto(${producto.id}); cerrarModal('modalDetalleProducto');">
          Editar Producto
        </button>
        <button class="btn btn-secondary" onclick="cerrarModal('modalDetalleProducto')">
          Cerrar
        </button>
      </div>
    `;

    document.getElementById("detalleProductoContent").innerHTML = content;
    document.getElementById("modalDetalleProducto").classList.add("active");
  } catch (error) {
    mostrarAlerta("Error al cargar detalles del producto", "danger");
  }
};

// ==================== SELECTS Y TABLA ====================

function actualizarSelectProductos() {
  const select = document.getElementById("ajusteProducto");
  if (!select) return;

  select.innerHTML =
    '<option value="">Seleccione producto</option>' +
    productos
      .map((p) => {
        const codigo = p.imei || p.codigo_barras || p.sku;
        return `<option value="${p.id}">${codigo} - ${p.nombre} (Stock: ${p.stock_actual})</option>`;
      })
      .join("");
}

function actualizarSelectCategorias() {
  const select = document.getElementById("productoCategoria");
  if (!select) return;

  select.innerHTML = "";

  const optionDefault = document.createElement("option");
  optionDefault.value = "";
  optionDefault.textContent = "Seleccione una categoría";
  select.appendChild(optionDefault);

  categorias.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.nombre;
    select.appendChild(option);
  });

  toggleStockPorCategoria();
}

// ==================== TOGGLE STOCK POR CATEGORÍA ====================

window.toggleStockPorCategoria = function () {
  const select = document.getElementById("productoCategoria");
  const seccionStock = document.getElementById("seccionStock");
  if (!select || !seccionStock) return;

  const nombre = (select.options[select.selectedIndex]?.text || "").toLowerCase();
  const esTelefono = /tel[eé]fono|celular/i.test(nombre);

  if (esTelefono) {
    seccionStock.style.display = "none";
    // Fijar stock a 1 para que el trigger de venta funcione correctamente
    const stock = document.getElementById("productoStock");
    const stockMin = document.getElementById("productoStockMin");
    const stockMax = document.getElementById("productoStockMax");
    if (stock) stock.value = "1";
    if (stockMin) stockMin.value = "0";
    if (stockMax) stockMax.value = "1";
  } else {
    seccionStock.style.display = "";
  }
};

window.eliminarProducto = async function (id) {
  if (!confirm("¿Está seguro de eliminar este producto?")) return;

  try {
    await window.API.Productos.delete(id);
    productos = productos.filter((p) => p.id !== id);
    actualizarTablaProductos();
    actualizarInventario();
    mostrarAlerta("Producto eliminado", "success");
  } catch (error) {
    mostrarAlerta("Error al eliminar producto", "danger");
  }
};

window.filtrarProductos = function () {
  const busqueda = getValue("buscarProducto").toLowerCase();
  const tbody = document.getElementById("tablaProductos");
  if (!tbody) return;

  const filas = tbody.getElementsByTagName("tr");
  Array.from(filas).forEach((fila) => {
    const texto = fila.textContent.toLowerCase();
    fila.style.display = texto.includes(busqueda) ? "" : "none";
  });
};
