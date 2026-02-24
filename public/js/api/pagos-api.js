// ==================== API DE PAGOS ====================

const PagosAPI = {
  async registrar(pagoData) {
    return await APIClient.post("/pagos", pagoData);
  },

  async getPorFactura(facturaId) {
    return await APIClient.get(`/pagos/factura/${facturaId}`);
  },

  async getAll(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.fecha_desde) params.append("fecha_desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) params.append("fecha_hasta", filtros.fecha_hasta);
    const qs = params.toString();
    return await APIClient.get(qs ? `/pagos?${qs}` : "/pagos");
  },

  // DELETE con body usa request() directamente ya que APIClient.delete() no admite body
  async anular(pagoId, motivo) {
    return await APIClient.request(`/pagos/${pagoId}`, {
      method: "DELETE",
      body: JSON.stringify({ motivo }),
    });
  },
};

window.PagosAPI = PagosAPI;
