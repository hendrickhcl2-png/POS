// ==================== MÓDULO DE PROVEEDORES ====================

async function guardarProveedor(e) {
  e.preventDefault();

  const proveedorData = {
    nombre: getValue("proveedorNombre"),
    contacto_nombre: getValue("proveedorContacto"),
    telefono: getValue("proveedorTelefono"),
    email: getValue("proveedorEmail"),
    direccion: getValue("proveedorDireccion"),
    rnc: getValue("proveedorRNC"),
  };

  try {
    const proveedor = await window.API.Proveedores.create(proveedorData);
    proveedores.push(proveedor);
    actualizarTablaProveedores();
    actualizarSelectProveedores();
    document.getElementById("formProveedor").reset();
    mostrarAlerta("Proveedor guardado", "success");
  } catch (error) {
    mostrarAlerta("Error al guardar proveedor", "danger");
  }
}

function actualizarTablaProveedores() {
  const tbody = document.getElementById("tablaProveedores");
  if (!tbody) return;

  if (proveedores.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">No hay proveedores</td></tr>';
    return;
  }

  tbody.innerHTML = proveedores
    .map(
      (p) => `
      <tr>
        <td>${p.codigo || p.id}</td>
        <td>${p.nombre}</td>
        <td>${p.contacto_nombre || "-"}</td>
        <td>${p.telefono || "-"}</td>
        <td>${p.email || "-"}</td>
      </tr>
    `,
    )
    .join("");
}

function actualizarSelectProveedores() {
  const select = document.getElementById("productoProveedor");
  if (!select) return;

  select.innerHTML =
    '<option value="">Seleccione proveedor</option>' +
    proveedores
      .map((p) => `<option value="${p.id}">${p.nombre}</option>`)
      .join("");
}
