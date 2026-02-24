// ==================== API DE INVENTARIO ====================
// Cliente API para todas las operaciones de inventario

const InventarioAPI = {
  // Obtener inventario completo
  async getAll(filtros = {}) {
    let url = "/inventario";
    const params = [];

    if (filtros.categoria) params.push(`categoria=${filtros.categoria}`);
    if (filtros.bajo_stock) params.push(`bajo_stock=true`);
    if (filtros.sin_stock) params.push(`sin_stock=true`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    return await APIClient.get(url);
  },

  // Obtener producto por ID
  async getById(id) {
    return await APIClient.get(`/inventario/${id}`);
  },

  // Actualizar stock de un producto
  async updateStock(id, cantidad, tipo, motivo = "") {
    return await APIClient.post(`/inventario/${id}/stock`, {
      cantidad,
      tipo, // 'entrada' o 'salida'
      motivo,
    });
  },

  // Ajuste de inventario
  async ajustarInventario(id, nuevaCantidad, motivo) {
    return await APIClient.post(`/inventario/${id}/ajustar`, {
      nueva_cantidad: nuevaCantidad,
      motivo,
    });
  },

  // Obtener estadísticas de inventario
  async getEstadisticas() {
    return await APIClient.get("/inventario/estadisticas");
  },

  // Obtener productos con bajo stock
  async getBajoStock() {
    return await APIClient.get("/inventario/bajo-stock");
  },

  // Obtener productos sin stock
  async getSinStock() {
    return await APIClient.get("/inventario/sin-stock");
  },

  // Obtener historial de movimientos
  async getHistorialMovimientos(productoId, filtros = {}) {
    let url = `/inventario/${productoId}/movimientos`;
    const params = [];

    if (filtros.fecha_inicio)
      params.push(`fecha_inicio=${filtros.fecha_inicio}`);
    if (filtros.fecha_fin) params.push(`fecha_fin=${filtros.fecha_fin}`);
    if (filtros.tipo) params.push(`tipo=${filtros.tipo}`);

    if (params.length > 0) {
      url += "?" + params.join("&");
    }

    return await APIClient.get(url);
  },

  // Obtener valor total del inventario
  async getValorTotal() {
    return await APIClient.get("/inventario/valor-total");
  },

  // Exportar inventario (para reportes)
  async exportar(formato = "json") {
    return await APIClient.get(`/inventario/exportar?formato=${formato}`);
  },
};

// Exportar
window.InventarioAPI = InventarioAPI;
