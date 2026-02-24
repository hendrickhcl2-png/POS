// ==================== MÓDULO DE SALIDAS ====================

async function cargarSalidas() {
  try {
    const salidas = await window.API.Salidas.getAll();
    const tbody = document.getElementById("tablaSalidas");
    if (!tbody) return;

    if (salidas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: #7f8c8d">No hay salidas registradas</td></tr>`;
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
        </tr>
      `,
      )
      .join("");
  } catch (error) {
    mostrarAlerta("Error al cargar salidas", "danger");
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
  };

  try {
    await window.API.Salidas.create(salidaData);
    document.getElementById("formSalida").reset();
    setValueIfExists("salidaFecha", new Date().toISOString().split("T")[0]);
    mostrarAlerta("Salida registrada", "success");
    cargarSalidas();
  } catch (error) {
    mostrarAlerta("Error al registrar salida", "danger");
  }
}
