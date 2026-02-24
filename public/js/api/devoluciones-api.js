// ==================== API DE DEVOLUCIONES ====================

const DevolucionesAPI = {
  async crear(devolucionData) {
    return await APIClient.post("/devoluciones", devolucionData);
  },

  async getAll(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.fecha_desde) params.append("fecha_desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) params.append("fecha_hasta", filtros.fecha_hasta);
    if (filtros.factura_id) params.append("factura_id", filtros.factura_id);
    const qs = params.toString();
    return await APIClient.get(qs ? `/devoluciones?${qs}` : "/devoluciones");
  },

  async getById(id) {
    return await APIClient.get(`/devoluciones/${id}`);
  },
};

window.DevolucionesAPI = DevolucionesAPI;
