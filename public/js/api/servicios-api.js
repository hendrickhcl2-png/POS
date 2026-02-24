// ==================== API DE SERVICIOS ====================
// Cliente API para todas las operaciones de servicios

const ServiciosAPI = {
  // Obtener todos los servicios
  async getAll(categoria = null) {
    let url = "/servicios";
    if (categoria) {
      url += `?categoria=${encodeURIComponent(categoria)}`;
    }
    return await APIClient.get(url);
  },

  // Obtener servicio por ID
  async getById(id) {
    return await APIClient.get(`/servicios/${id}`);
  },

  // Crear servicio
  async create(servicioData) {
    return await APIClient.post("/servicios", servicioData);
  },

  // Actualizar servicio
  async update(id, servicioData) {
    return await APIClient.put(`/servicios/${id}`, servicioData);
  },

  // Eliminar servicio (soft delete)
  async delete(id) {
    return await APIClient.delete(`/servicios/${id}`);
  },

  // Obtener estadísticas de servicios más usados
  async getMasUsados() {
    return await APIClient.get("/servicios/estadisticas/mas-usados");
  },
};

// Exportar
window.ServiciosAPI = ServiciosAPI;
