// ==================== API DE PRODUCTOS ====================
// Cliente API para todas las operaciones de productos

const ProductosAPI = {
  // Obtener todos los productos
  async getAll() {
    return await APIClient.get("/productos");
  },

  // Buscar productos
  async search(query) {
    return await APIClient.get(
      `/productos/buscar?q=${encodeURIComponent(query)}`,
    );
  },

  // Obtener producto por ID
  async getById(id) {
    return await APIClient.get(`/productos/${id}`);
  },

  // Crear nuevo producto
  async create(productoData) {
    return await APIClient.post("/productos", productoData);
  },

  // Actualizar producto
  async update(id, productoData) {
    return await APIClient.put(`/productos/${id}`, productoData);
  },

  // Eliminar producto (soft delete)
  async delete(id) {
    return await APIClient.delete(`/productos/${id}`);
  },

  // Eliminar producto permanentemente (hard delete, solo sin ventas)
  async forceDelete(id) {
    return await APIClient.delete(`/productos/${id}/force`);
  },

  // Buscar productos agotados (stock <= 0) por código o nombre
  async searchAgotados(query) {
    return await APIClient.get(`/productos/buscar-agotados?q=${encodeURIComponent(query)}`);
  },

  // Agregar stock rápido (suma cantidad al stock actual)
  async agregarStock(id, cantidad) {
    return await APIClient.patch(`/productos/${id}/stock`, { cantidad });
  },

  // Historial de productos vendidos
  async getVendidos(fechaInicio, fechaFin) {
    let url = "/productos/vendidos";
    const params = [];
    if (fechaInicio) params.push(`fecha_inicio=${fechaInicio}`);
    if (fechaFin) params.push(`fecha_fin=${fechaFin}`);
    if (params.length) url += "?" + params.join("&");
    return await APIClient.get(url);
  },
};

// Exportar
window.ProductosAPI = ProductosAPI;
