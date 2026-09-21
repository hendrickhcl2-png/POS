// ==================== API DE REGISTRO DE EVENTOS ====================
// No usa APIClient porque el contenido del log viaja como texto plano, no
// como JSON envuelto en { success, data }.

const LogsAPI = {
  // Días con registros disponibles, del más reciente al más antiguo
  async getDias() {
    const res = await fetch("/api/logs");
    if (!res.ok) throw new Error(await mensajeDeError(res));
    const json = await res.json();
    return json.data || [];
  },

  // Contenido de un día. Devuelve las últimas `lineas` del archivo.
  async getContenido(fecha, { lineas = 1000, nivel = "" } = {}) {
    const params = new URLSearchParams({ lineas: String(lineas) });
    if (nivel) params.set("nivel", nivel);

    const res = await fetch(`/api/logs/${fecha}?${params}`);
    if (res.status === 404) return "";
    if (!res.ok) throw new Error(await mensajeDeError(res));
    return await res.text();
  },

  urlDescarga(fecha, lineas = 5000) {
    return `/api/logs/${fecha}?lineas=${lineas}`;
  },
};

async function mensajeDeError(res) {
  try {
    const json = await res.json();
    return json.error || json.message || `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

window.LogsAPI = LogsAPI;
