// ==================== MÓDULO DE PROVEEDORES ====================

let proveedorEnEdicion = null;

async function guardarProveedor(e) {
  e.preventDefault();

  const nombre = getValue("proveedorNombre");
  if (!nombre || nombre.trim() === "") {
    Toast.warning("El nombre del proveedor es obligatorio");
    return;
  }

  const proveedorData = {
    nombre,
    contacto_nombre: getValue("proveedorContacto") || null,
    telefono: getValue("proveedorTelefono") || null,
    email: getValue("proveedorEmail") || null,
    direccion: getValue("proveedorDireccion") || null,
    rnc: getValue("proveedorRNC") || null,
    descripcion: getValue("proveedorDescripcion") || null,
  };

  try {
    if (proveedorEnEdicion) {
      const actualizado = await window.API.Proveedores.update(proveedorEnEdicion, proveedorData);
      const idx = proveedores.findIndex((p) => p.id === proveedorEnEdicion);
      if (idx !== -1) proveedores[idx] = actualizado;
      Toast.success("Proveedor actualizado correctamente");
      _cancelarEdicionProveedor();
    } else {
      const nuevo = await window.API.Proveedores.create(proveedorData);
      proveedores.push(nuevo);
      Toast.success("Proveedor guardado correctamente");
      document.getElementById("formProveedor").reset();
    }

    actualizarTablaProveedores();
    actualizarSelectProveedores();
  } catch (error) {
    Toast.error("Error al guardar proveedor: " + error.message);
  }
}

window.editarProveedor = async function (id) {
  const p = proveedores.find((p) => p.id === id);
  if (!p) return;

  proveedorEnEdicion = id;

  setValueIfExists("proveedorNombre", p.nombre || "");
  setValueIfExists("proveedorContacto", p.contacto_nombre || "");
  setValueIfExists("proveedorTelefono", p.telefono || "");
  setValueIfExists("proveedorEmail", p.email || "");
  setValueIfExists("proveedorDireccion", p.direccion || "");
  setValueIfExists("proveedorRNC", p.rnc || "");
  setValueIfExists("proveedorDescripcion", p.descripcion || "");

  // Cambiar botón submit
  const btnSubmit = document.querySelector('#formProveedor button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.textContent = "Actualizar Proveedor";
    btnSubmit.classList.replace("btn-primary", "btn-warning");
  }

  // Agregar botón cancelar si no existe
  if (!document.getElementById("btnCancelarProveedor")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnCancelarProveedor";
    btn.className = "btn btn-secondary";
    btn.textContent = "Cancelar";
    btn.onclick = _cancelarEdicionProveedor;
    btnSubmit?.parentElement?.appendChild(btn);
  }

  // Scroll al form
  document.getElementById("formProveedor")?.scrollIntoView({ behavior: "smooth" });
  Toast.info("Modo edición: " + p.nombre);
};

function _cancelarEdicionProveedor() {
  proveedorEnEdicion = null;
  document.getElementById("formProveedor").reset();

  const btnSubmit = document.querySelector('#formProveedor button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.textContent = "Guardar Proveedor";
    btnSubmit.classList.replace("btn-warning", "btn-primary");
  }

  document.getElementById("btnCancelarProveedor")?.remove();
}

window.eliminarProveedor = async function (id) {
  const p = proveedores.find((p) => p.id === id);
  if (!p) return;

  if (!confirm(`¿Eliminar el proveedor "${p.nombre}"?\n\nEsta acción no se puede deshacer.`)) return;

  try {
    await window.API.Proveedores.delete(id);
    proveedores = proveedores.filter((p) => p.id !== id);
    actualizarTablaProveedores();
    actualizarSelectProveedores();
    Toast.success("Proveedor eliminado");

    // Si estaba editando ese proveedor, cancelar edición
    if (proveedorEnEdicion === id) _cancelarEdicionProveedor();
  } catch (error) {
    Toast.error(error.message || "No se puede eliminar el proveedor");
  }
};

function actualizarTablaProveedores() {
  const tbody = document.getElementById("tablaProveedores");
  if (!tbody) return;

  if (proveedores.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center">No hay proveedores registrados</td></tr>';
    return;
  }

  tbody.innerHTML = proveedores
    .map(
      (p) => `
      <tr>
        <td>${p.codigo || p.id}</td>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.descripcion || "-"}</td>
        <td>${p.contacto_nombre || "-"}</td>
        <td>${p.telefono || "-"}</td>
        <td>${p.email || "-"}</td>
        <td>
          <button class="btn btn-info btn-small" onclick="FacturasProveedoresModule.filtrarPorProveedor('${p.nombre.replace(/'/g, "\\'")}')">Ver Facturas</button>
          <button class="btn btn-warning btn-small" onclick="editarProveedor(${p.id})">Editar</button>
          <button class="btn btn-danger btn-small" onclick="eliminarProveedor(${p.id})">Eliminar</button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function actualizarSelectProveedores() {
  const opciones = '<option value="">Sin proveedor</option>' +
    proveedores.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("");

  const selSingle = document.getElementById("productoProveedor");
  if (selSingle) selSingle.innerHTML = opciones;

  const selLote = document.getElementById("loteProveedor");
  if (selLote) selLote.innerHTML = opciones;
}
