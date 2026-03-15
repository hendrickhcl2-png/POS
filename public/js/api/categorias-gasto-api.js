// ==================== API DE CATEGORÍAS DE GASTO ====================

const CategoriasGastoAPI = {
  async getAll() {
    return await APIClient.get("/categorias-gasto");
  },

  async create(nombre) {
    return await APIClient.post("/categorias-gasto", { nombre });
  },

  async delete(id) {
    return await APIClient.delete(`/categorias-gasto/${id}`);
  },
};

window.CategoriasGastoAPI = CategoriasGastoAPI;
