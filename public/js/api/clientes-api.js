// ==================== API DE CLIENTES ====================
// Cliente API para todas las operaciones de clientes

const ClientesAPI = {
  // Obtener todos los clientes
  async getAll() {
    return await APIClient.get("/clientes");
  },

  // Obtener cliente por ID
  async getById(id) {
    return await APIClient.get(`/clientes/${id}`);
  },

  // Crear nuevo cliente
  async create(clienteData) {
    return await APIClient.post("/clientes", clienteData);
  },

  // Actualizar cliente
  async update(id, clienteData) {
    return await APIClient.put(`/clientes/${id}`, clienteData);
  },

  // Eliminar cliente
  async delete(id) {
    return await APIClient.delete(`/clientes/${id}`);
  },

  // Buscar clientes por término
  async search(termino) {
    return await APIClient.get(
      `/clientes/buscar?q=${encodeURIComponent(termino)}`,
    );
  },

  // Obtener clientes con saldo pendiente
  async getConSaldoPendiente() {
    return await APIClient.get("/clientes/con-saldo-pendiente");
  },

  // Obtener estado de cuenta de un cliente
  async getEstadoCuenta(clienteId) {
    return await APIClient.get(`/clientes/${clienteId}/estado-cuenta`);
  },

  // Obtener historial de compras
  async getHistorialCompras(clienteId, filtros = {}) {
    let url = `/clientes/${clienteId}/historial-compras`;
    const params = [];

    if (filtros.fecha_inicio)
      params.push(`fecha_inicio=${filtros.fecha_inicio}`);
    if (filtros.fecha_fin) params.push(`fecha_fin=${filtros.fecha_fin}`);
    if (filtros.limite) params.push(`limite=${filtros.limite}`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    return await APIClient.get(url);
  },

  // Obtener estadísticas del cliente
  async getEstadisticas(clienteId) {
    return await APIClient.get(`/clientes/${clienteId}/estadisticas`);
  },
};

// Exportar
window.ClientesAPI = ClientesAPI;
