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

  // Eliminar producto
  async delete(id) {
    return await APIClient.delete(`/productos/${id}`);
  },
};

// Exportar
window.ProductosAPI = ProductosAPI;
