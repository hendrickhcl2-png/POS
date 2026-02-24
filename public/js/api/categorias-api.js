// ==================== API DE CATEGORÍAS ====================
// Cliente API para todas las operaciones de categorías

const CategoriasAPI = {
  // Obtener todas las categorías
  async getAll() {
    return await APIClient.get("/categorias");
  },

  // Obtener categoría por ID
  async getById(id) {
    return await APIClient.get(`/categorias/${id}`);
  },

  // Crear nueva categoría
  async create(categoriaData) {
    return await APIClient.post("/categorias", categoriaData);
  },

  // Actualizar categoría
  async update(id, categoriaData) {
    return await APIClient.put(`/categorias/${id}`, categoriaData);
  },

  // Eliminar categoría
  async delete(id) {
    return await APIClient.delete(`/categorias/${id}`);
  },
};

// Exportar
window.CategoriasAPI = CategoriasAPI;
