// ==================== API DE REPORTES ====================

const ReportesAPI = {
  async getReporteVentas(periodo) {
    return await APIClient.get(`/reportes/ventas?periodo=${periodo}`);
  },

  async getReporteProductos(periodo) {
    return await APIClient.get(`/reportes/productos-vendidos?periodo=${periodo}`);
  },

  async getReporteGanancias(periodo) {
    return await APIClient.get(`/reportes/ganancias?periodo=${periodo}`);
  },

  async getDashboard(periodo) {
    return await APIClient.get(`/reportes/dashboard?periodo=${periodo}`);
  },

  async getReportePersonalizado(tipo, fechaInicio, fechaFin) {
    const endpoint = tipo === "ventas" ? "ventas" : "productos-vendidos";
    return await APIClient.get(`/reportes/${endpoint}?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
  },
};

window.ReportesAPI = ReportesAPI;
