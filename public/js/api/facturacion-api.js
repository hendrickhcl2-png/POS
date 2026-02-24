// ==================== API DE FACTURACIÓN ====================
// Cliente API para todas las operaciones de facturación

const FacturacionAPI = {
  // Crear factura desde una venta
  async crearDesdeVenta(facturaData) {
    return await APIClient.post("/facturas/desde-venta", facturaData);
  },

  // Obtener todas las facturas con filtros opcionales
  async getAll(filtros = {}) {
    let url = "/facturas";
    const params = [];

    if (filtros.cliente_id) params.push(`cliente_id=${filtros.cliente_id}`);
    if (filtros.estado_pago) params.push(`estado_pago=${filtros.estado_pago}`);
    if (filtros.tipo_factura)
      params.push(`tipo_factura=${filtros.tipo_factura}`);
    if (filtros.fecha_inicio)
      params.push(`fecha_inicio=${filtros.fecha_inicio}`);
    if (filtros.fecha_fin) params.push(`fecha_fin=${filtros.fecha_fin}`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    return await APIClient.get(url);
  },

  // Obtener factura por ID
  async getById(id) {
    return await APIClient.get(`/facturas/${id}`);
  },

  // Registrar pago a una factura
  async registrarPago(facturaId, pagoData) {
    return await APIClient.post(`/facturas/${facturaId}/pagos`, pagoData);
  },

  // Anular factura
  async anular(id, motivo) {
    return await APIClient.post(`/facturas/${id}/anular`, {
      motivo_anulacion: motivo,
    });
  },

  // Obtener estado de cuenta de un cliente
  async getEstadoCuentaCliente(clienteId) {
    return await APIClient.get(`/clientes/${clienteId}/estado-cuenta`);
  },

  // Obtener clientes con saldo pendiente
  async getClientesConSaldo() {
    return await APIClient.get("/clientes/con-saldo-pendiente");
  },

  // Obtener secuencias de NCF
  async getSecuenciasNCF() {
    return await APIClient.get("/facturacion/secuencias-ncf");
  },

  // Actualizar secuencia de NCF
  async updateSecuenciaNcf(id, data) {
    return await APIClient.put(`/facturacion/secuencias-ncf/${id}`, data);
  },

  // Obtener facturas vencidas
  async getFacturasVencidas() {
    return await APIClient.get("/facturas/reportes/vencidas");
  },
};

// Exportar
window.FacturacionAPI = FacturacionAPI;
