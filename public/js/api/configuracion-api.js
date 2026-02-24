// ==================== API DE CONFIGURACIÓN ====================
// Cliente API para todas las operaciones de configuración

const ConfiguracionAPI = {
  // Obtener configuración del sistema
  async get() {
    return await APIClient.get("/configuracion");
  },

  // Actualizar configuración
  async update(configData) {
    return await APIClient.put("/configuracion", configData);
  },

  // Obtener secuencias NCF
  async getNCF() {
    return await APIClient.get("/configuracion/ncf");
  },

  // Actualizar secuencia NCF
  async updateNCF(id, ncfData) {
    return await APIClient.put(`/configuracion/ncf/${id}`, ncfData);
  },

  // Resetear base de datos (SOLO DESARROLLO)
  async reset(confirmar = false) {
    if (!confirmar) {
      throw new Error("Debe confirmar el reseteo de la base de datos");
    }
    return await APIClient.post("/configuracion/reset", {
      confirmar: "RESETEAR_TODO",
    });
  },
};

// Exportar
window.ConfiguracionAPI = ConfiguracionAPI;
