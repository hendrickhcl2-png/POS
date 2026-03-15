// ==================== API DE VENTAS ====================

const VentasAPI = {
  async create(ventaData) {
    return await APIClient.post("/ventas", ventaData);
  },

  async getAll(fechaDesde = null, fechaHasta = null, clienteId = null, metodoPago = null) {
    const params = new URLSearchParams();
    if (fechaDesde) params.append("fecha_desde", fechaDesde);
    if (fechaHasta) params.append("fecha_hasta", fechaHasta);
    if (clienteId) params.append("cliente_id", clienteId);
    if (metodoPago) params.append("metodo_pago", metodoPago);
    const qs = params.toString();
    return await APIClient.get(qs ? `/ventas?${qs}` : "/ventas");
  },

  async getById(id) {
    return await APIClient.get(`/ventas/${id}`);
  },

  async anular(id, motivo) {
    return await APIClient.post(`/ventas/${id}/anular`, { motivo });
  },

  async updateFecha(id, fecha) {
    return await APIClient.patch(`/ventas/${id}/fecha`, { fecha });
  },

  async getEstadisticas(fechaDesde = null, fechaHasta = null) {
    const params = new URLSearchParams();
    if (fechaDesde) params.append("fecha_desde", fechaDesde);
    if (fechaHasta) params.append("fecha_hasta", fechaHasta);
    const qs = params.toString();
    return await APIClient.get(qs ? `/ventas/estadisticas/resumen?${qs}` : "/ventas/estadisticas/resumen");
  },

  async getVentasHoy() {
    const hoy = new Date().toISOString().split("T")[0];
    return this.getAll(hoy, hoy);
  },

  async getVentasPorRango(fechaInicio, fechaFin) {
    return this.getAll(fechaInicio, fechaFin);
  },

  async getVentasPorCliente(clienteId, fechaDesde = null, fechaHasta = null) {
    return this.getAll(fechaDesde, fechaHasta, clienteId);
  },

  async getVentasPorMetodoPago(metodoPago, fechaDesde = null, fechaHasta = null) {
    return this.getAll(fechaDesde, fechaHasta, null, metodoPago);
  },
};

window.VentasAPI = VentasAPI;
