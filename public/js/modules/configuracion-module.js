// ==================== MÓDULO DE CONFIGURACIÓN ====================

async function guardarConfiguracion(e) {
  e.preventDefault();

  const configData = {
    nombre_negocio: getValue("configNombre"),
    rnc: getValue("configRNC"),
    telefono: getValue("configTelefono"),
    email: getValue("configEmail"),
    direccion: getValue("configDireccion"),
    serie_ticket: getValue("configSerie"),
    porcentaje_itbis: parseFloat(getValue("configITBIS")),
  };

  try {
    await window.API.Configuracion.update(configData);
    mostrarAlerta("Configuración guardada", "success");
  } catch (error) {
    mostrarAlerta("Error al guardar configuración", "danger");
  }
}

// ==================== CONFIGURACIÓN — SERVICIOS Y CATEGORÍAS ====================

async function cargarConfiguracion() {
  await Promise.all([cargarServiciosConfig(), cargarCategoriasConfig()]);
}

async function cargarServiciosConfig() {
  const lista = document.getElementById("listaServiciosConfig");
  if (!lista) return;
  lista.innerHTML = "<p style='color:#95a5a6'>Cargando...</p>";
  try {
    const servicios = await window.API.Servicios.getAll();
    if (servicios.length === 0) {
      lista.innerHTML =
        "<p class='config-lista-vacia'>No hay servicios registrados</p>";
      return;
    }
    lista.innerHTML = `
      <table class="config-tabla">
        <thead><tr>
          <th>Nombre</th>
          <th>Precio</th>
          <th>Tipo</th>
          <th class="th-acciones-centrado">Acciones</th>
        </tr></thead>
        <tbody>
          ${servicios
            .map(
              (s) => `
            <tr>
              <td>${s.nombre}</td>
              <td>${s.es_gratuito ? "—" : "RD$ " + parseFloat(s.precio).toFixed(2)}</td>
              <td><span class="badge ${s.es_gratuito ? "badge-info" : "badge-success"}">${s.es_gratuito ? "Cortesía" : "Pagado"}</span></td>
              <td class="text-center">
                <button class="btn btn-danger btn-small" onclick="eliminarServicioConfig(${s.id}, '${s.nombre.replace(/'/g, "\\'")}')">Eliminar</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>`;
  } catch (e) {
    lista.innerHTML =
      "<p class='config-lista-vacia'>Error al cargar servicios</p>";
  }
}

window.agregarServicioConfig = async function () {
  const nombre = document.getElementById("nuevoServicioNombre").value.trim();
  const precio =
    parseFloat(document.getElementById("nuevoServicioPrecio").value) || 0;
  const tipo = document.getElementById("nuevoServicioTipo").value;
  if (!nombre) {
    mostrarAlerta("El nombre del servicio es obligatorio", "warning");
    return;
  }
  try {
    await window.API.Servicios.create({
      nombre,
      precio,
      es_gratuito: tipo === "gratuito",
      descripcion: "",
    });
    document.getElementById("nuevoServicioNombre").value = "";
    document.getElementById("nuevoServicioPrecio").value = "0";
    document.getElementById("nuevoServicioTipo").value = "pagado";
    mostrarAlerta("Servicio agregado correctamente", "success");
    await cargarServiciosConfig();
  } catch (e) {
    mostrarAlerta("Error al agregar servicio: " + e.message, "danger");
  }
};

window.eliminarServicioConfig = async function (id, nombre) {
  if (!confirm(`¿Eliminar el servicio "${nombre}"?`)) return;
  try {
    await window.API.Servicios.delete(id);
    mostrarAlerta("Servicio eliminado", "success");
    await cargarServiciosConfig();
  } catch (e) {
    mostrarAlerta("Error al eliminar servicio: " + e.message, "danger");
  }
};

async function cargarCategoriasConfig() {
  const lista = document.getElementById("listaCategoriasConfig");
  if (!lista) return;
  lista.innerHTML = "<p style='color:#95a5a6'>Cargando...</p>";
  try {
    const cats = await window.API.Categorias.getAll();
    if (cats.length === 0) {
      lista.innerHTML =
        "<p class='config-lista-vacia'>No hay categorías registradas</p>";
      return;
    }
    lista.innerHTML = `
      <table class="config-tabla">
        <thead><tr>
          <th>Nombre</th>
          <th>Descripción</th>
          <th class="text-center">Productos</th>
          <th class="th-acciones-centrado">Acciones</th>
        </tr></thead>
        <tbody>
          ${cats
            .map(
              (c) => `
            <tr>
              <td><strong>${c.nombre}</strong></td>
              <td>${c.descripcion || "—"}</td>
              <td class="text-center"><span class="badge badge-info">${c.total_productos}</span></td>
              <td class="text-center">
                <button class="btn btn-danger btn-small" onclick="eliminarCategoriaConfig(${c.id}, '${c.nombre.replace(/'/g, "\\'")}', ${c.total_productos})" ${parseInt(c.total_productos) > 0 ? 'title="Tiene productos asociados"' : ""}>Eliminar</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>`;
  } catch (e) {
    lista.innerHTML =
      "<p class='config-lista-vacia'>Error al cargar categorías</p>";
  }
}

window.agregarCategoriaConfig = async function () {
  const nombre = document.getElementById("nuevaCatNombre").value.trim();
  const descripcion = document
    .getElementById("nuevaCatDescripcion")
    .value.trim();
  if (!nombre) {
    mostrarAlerta("El nombre de la categoría es obligatorio", "warning");
    return;
  }
  try {
    await window.API.Categorias.create({ nombre, descripcion });
    document.getElementById("nuevaCatNombre").value = "";
    document.getElementById("nuevaCatDescripcion").value = "";
    mostrarAlerta("Categoría agregada correctamente", "success");
    await cargarCategoriasConfig();
    // Refresh global categories array and product category dropdown
    categorias = await window.API.Categorias.getAll();
    actualizarSelectCategorias();
  } catch (e) {
    mostrarAlerta(
      "Error al agregar categoría: " + (e.message || "Error"),
      "danger",
    );
  }
};

window.eliminarCategoriaConfig = async function (id, nombre, totalProductos) {
  if (parseInt(totalProductos) > 0) {
    mostrarAlerta(
      `No se puede eliminar "${nombre}" porque tiene ${totalProductos} producto(s) asociado(s)`,
      "warning",
    );
    return;
  }
  if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
  try {
    await window.API.Categorias.delete(id);
    mostrarAlerta("Categoría eliminada", "success");
    await cargarCategoriasConfig();
  } catch (e) {
    mostrarAlerta("Error al eliminar categoría: " + e.message, "danger");
  }
};
