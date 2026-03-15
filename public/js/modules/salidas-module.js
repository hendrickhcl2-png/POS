// ==================== MÓDULO DE SALIDAS ====================

let _salidasData = [];
let salidaEnEdicion = null;
const _pgSalidas = new Paginator('tablaSalidas', 20);

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
    _pgSalidas.render(
      salidas.map((s) => `
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
      `),
      `<tr><td colspan="8" class="text-center" style="color: #7f8c8d">No hay salidas registradas</td></tr>`
    );
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

// ==================== REPORTE GASTOS INLINE (SALIDAS) ====================

function _renderGastoBars(containerId, items, total, colorGrad) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const f = (n) => Formatters.formatCurrency(parseFloat(n) || 0);
  el.innerHTML = (items || []).map(item => {
    const label = item.categoria || item.metodo_pago || "—";
    const pct = total > 0 ? ((parseFloat(item.total) / total) * 100).toFixed(1) : 0;
    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-weight:600;">${label}</span>
          <span>${f(item.total)} (${pct}%)</span>
        </div>
        <div style="background:#ecf0f1;height:24px;border-radius:12px;overflow:hidden;">
          <div style="background:${colorGrad};height:100%;width:${pct}%;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;min-width:${pct > 0 ? '32px' : '0'};">
            ${item.cantidad}
          </div>
        </div>
      </div>`;
  }).join("") || `<p style="color:var(--clr-muted);text-align:center;">Sin datos</p>`;
}

async function descargarExcelCategoriasSalidas() {
  const desde = document.getElementById("sgDesde")?.value;
  const hasta = document.getElementById("sgHasta")?.value;
  if (!desde || !hasta) { mostrarAlerta("Selecciona ambas fechas", "warning"); return; }
  const btn = document.getElementById("sgBtnExcel");
  if (btn) { btn.disabled = true; btn.textContent = "Generando..."; }
  try {
    const baseURL = window.API_URL || "http://localhost:3000/api";
    const response = await fetch(`${baseURL}/reportes/categorias/excel?fecha_inicio=${desde}&fecha_fin=${hasta}`);
    if (!response.ok) throw new Error("Error al generar Excel");
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `categorias_${desde}_${hasta}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    mostrarAlerta("Error al descargar: " + e.message, "danger");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Descargar Excel"; }
  }
}
window.descargarExcelCategoriasSalidas = descargarExcelCategoriasSalidas;

async function cargarReporteGastosSalidas() {
  const desde = document.getElementById("sgDesde")?.value;
  const hasta = document.getElementById("sgHasta")?.value;
  if (!desde || !hasta) { mostrarAlerta("Selecciona ambas fechas", "warning"); return; }
  try {
    const data = await ReportesAPI.getReporteSalidas(desde, hasta);
    const resumen = data.resumen;
    const total = parseFloat(resumen.total_salidas) || 0;

    document.getElementById("sgTotal").textContent = Formatters.formatCurrency(total);
    document.getElementById("sgCantidad").textContent = resumen.cantidad_salidas;

    _renderGastoBars("sgPorCategoria", data.por_categoria, total, "linear-gradient(90deg,#e74c3c,#c0392b)");
    _renderGastoBars("sgPorMetodo", data.por_metodo, total, "linear-gradient(90deg,#3498db,#2980b9)");

    document.getElementById("sgContenido").style.display = "block";
    const btn = document.getElementById("sgBtnExcel");
    if (btn) btn.style.display = "inline-block";
  } catch (e) {
    mostrarAlerta("Error al cargar reporte de gastos: " + e.message, "danger");
  }
}

function initReporteGastosSalidas() {
  const hoy = new Date().toISOString().split("T")[0];
  const primero = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const sgDesde = document.getElementById("sgDesde");
  const sgHasta = document.getElementById("sgHasta");
  if (sgDesde && !sgDesde.value) sgDesde.value = primero;
  if (sgHasta && !sgHasta.value) sgHasta.value = hoy;
  cargarReporteGastosSalidas();
}

window.cargarReporteGastosSalidas = cargarReporteGastosSalidas;
window.initReporteGastosSalidas = initReporteGastosSalidas;

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
