// ==================== UTILIDAD DE RANGOS DE FECHAS ====================
// Centraliza el cálculo de fechas para los periodos de los reportes.

// Formatea una fecha usando sus componentes locales (evita el corrimiento
// de día que produce toISOString() al convertir a UTC).
function aFechaLocal(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Devuelve { fechaInicio, fechaFin } (YYYY-MM-DD) para un periodo nombrado.
function calcularRangoPeriodo(periodo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  switch (periodo) {
    case "ayer": {
      const ayer = new Date(hoy);
      ayer.setDate(hoy.getDate() - 1);
      return { fechaInicio: aFechaLocal(ayer), fechaFin: aFechaLocal(ayer) };
    }

    case "semana": {
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - 7);
      return {
        fechaInicio: aFechaLocal(inicioSemana),
        fechaFin: aFechaLocal(hoy),
      };
    }

    case "mes": {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { fechaInicio: aFechaLocal(inicioMes), fechaFin: aFechaLocal(hoy) };
    }

    case "mes_pasado": {
      const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      // Día 0 del mes actual = último día del mes pasado
      const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return {
        fechaInicio: aFechaLocal(inicioMesPasado),
        fechaFin: aFechaLocal(finMesPasado),
      };
    }

    case "año": {
      const inicioAño = new Date(hoy.getFullYear(), 0, 1);
      return { fechaInicio: aFechaLocal(inicioAño), fechaFin: aFechaLocal(hoy) };
    }

    case "hoy":
    default:
      return { fechaInicio: aFechaLocal(hoy), fechaFin: aFechaLocal(hoy) };
  }
}

// Resuelve el rango a partir del query string: si viene `periodo` lo calcula,
// si no usa el rango personalizado `fecha_inicio` / `fecha_fin`.
function resolverRango({ periodo, fecha_inicio, fecha_fin }) {
  if (periodo) return calcularRangoPeriodo(periodo);
  return { fechaInicio: fecha_inicio, fechaFin: fecha_fin };
}

module.exports = { aFechaLocal, calcularRangoPeriodo, resolverRango };
