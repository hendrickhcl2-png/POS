// ==================== MÓDULO DE SALIDAS ====================

let _salidasData = [];
let salidaEnEdicion = null;

async function actualizarSelectCategoriasGasto() {
  const select = document.getElementById("salidaCategoria");
  if (!select) return;
  const valorActual = select.value;
  try {
    const cats = await window.API.CategoriasGasto.getAll();
    select.innerHTML = '<option value="">Seleccionar...</option>' +
      cats.map((c) => `<option value="${c.nombre}">${c.nombre}</option>`).join("");
    if (valorActual) select.value = valorActual;
  } catch (e) {
    // si falla, dejar el select vacío
  }
}

window.actualizarSelectCategoriasGasto = actualizarSelectCategoriasGasto;

async function cargarSalidas() {
  try {
    const salidas = await window.API.Salidas.getAll();
    _salidasData = salidas;
    const tbody = document.getElementById("tablaSalidas");
    if (!tbody) return;

    if (salidas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: #7f8c8d">No hay salidas registradas</td></tr>`;
      return;
    }

    tbody.innerHTML = salidas
      .map(
        (s) => `
        <tr>
          <td>${s.fecha ? new Date(s.fecha).toLocaleDateString("es-DO") : "-"}</td>
          <td>${s.categoria_gasto || "-"}</td>
          <td>${s.concepto}</td>
          <td style="text-align: right; font-weight: bold;">
            ${Formatters.formatCurrency(parseFloat(s.monto))}
          </td>
          <td>${s.metodo_pago || "-"}</td>
          <td>${s.beneficiario || "-"}</td>
          <td>${s.ncf || "-"}</td>
          <td>
            <button class="btn btn-warning btn-small" onclick="editarSalida(${s.id})">Editar</button>
            <button class="btn btn-danger btn-small" onclick="eliminarSalida(${s.id}, '${s.concepto.replace(/'/g, "\\'")}')">Eliminar</button>
          </td>
        </tr>
      `,
      )
      .join("");
  } catch (error) {
    mostrarAlerta("Error al cargar salidas", "danger");
  }
}

function editarSalida(id) {
  const s = _salidasData.find((s) => s.id === id);
  if (!s) return;

  salidaEnEdicion = id;

  setValueIfExists("salidaFecha", s.fecha ? s.fecha.split("T")[0] : "");
  setValueIfExists("salidaCategoria", s.categoria_gasto || "");
  setValueIfExists("salidaConcepto", s.concepto);
  setValueIfExists("salidaDescripcion", s.descripcion || "");
  setValueIfExists("salidaMonto", s.monto);
  setValueIfExists("salidaMetodoPago", s.metodo_pago || "efectivo");
  setValueIfExists("salidaBeneficiario", s.beneficiario || "");
  setValueIfExists("salidaNcf", s.ncf || "");

  const btnSubmit = document.querySelector("#formSalida button[type='submit']");
  if (btnSubmit) btnSubmit.textContent = "Actualizar Salida";

  let btnCancelar = document.getElementById("btnCancelarEdicionSalida");
  if (!btnCancelar) {
    btnCancelar = document.createElement("button");
    btnCancelar.id = "btnCancelarEdicionSalida";
    btnCancelar.type = "button";
    btnCancelar.className = "btn btn-secondary";
    btnCancelar.textContent = "Cancelar edición";
    btnCancelar.onclick = cancelarEdicionSalida;
    btnSubmit.insertAdjacentElement("afterend", btnCancelar);
  }
  btnCancelar.style.display = "";

  document.getElementById("formSalida")?.scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicionSalida() {
  salidaEnEdicion = null;
  document.getElementById("formSalida").reset();
  setValueIfExists("salidaFecha", new Date().toISOString().split("T")[0]);

  const btnSubmit = document.querySelector("#formSalida button[type='submit']");
  if (btnSubmit) btnSubmit.textContent = "Registrar Salida";

  const btnCancelar = document.getElementById("btnCancelarEdicionSalida");
  if (btnCancelar) btnCancelar.style.display = "none";
}

async function eliminarSalida(id, concepto) {
  if (!confirm(`¿Eliminar la salida "${concepto}"?`)) return;
  try {
    await window.API.Salidas.delete(id);
    mostrarAlerta("Salida eliminada", "success");
    cargarSalidas();
  } catch (error) {
    mostrarAlerta(error.message, "danger");
  }
}

async function guardarSalida(e) {
  e.preventDefault();

  const salidaData = {
    fecha: getValue("salidaFecha"),
    concepto: getValue("salidaConcepto"),
    descripcion: getValue("salidaDescripcion"),
    monto: parseFloat(getValue("salidaMonto")),
    categoria_gasto: getValue("salidaCategoria"),
    metodo_pago: getValue("salidaMetodoPago"),
    beneficiario: getValue("salidaBeneficiario"),
    ncf: getValue("salidaNcf") || null,
  };

  if (!salidaData.concepto || salidaData.concepto.trim() === "") {
    mostrarAlerta("El concepto es obligatorio", "warning");
    return;
  }
  if (!salidaData.monto || salidaData.monto <= 0 || isNaN(salidaData.monto)) {
    mostrarAlerta("El monto debe ser mayor a 0", "warning");
    return;
  }

  try {
    if (salidaEnEdicion) {
      await window.API.Salidas.update(salidaEnEdicion, salidaData);
      mostrarAlerta("Salida actualizada", "success");
      cancelarEdicionSalida();
    } else {
      await window.API.Salidas.create(salidaData);
      document.getElementById("formSalida").reset();
      setValueIfExists("salidaFecha", new Date().toISOString().split("T")[0]);
      mostrarAlerta("Salida registrada", "success");
    }
    cargarSalidas();
  } catch (error) {
    mostrarAlerta(error.message, "danger");
  }
}
