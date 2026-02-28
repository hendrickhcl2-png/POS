// ==================== API DE SALIDAS ====================

const SalidasAPI = {
  async getAll() {
    return await APIClient.get("/salidas");
  },

  async create(data) {
    return await APIClient.post("/salidas", data);
  },

  async update(id, data) {
    return await APIClient.put(`/salidas/${id}`, data);
  },

  async delete(id) {
    return await APIClient.delete(`/salidas/${id}`);
  },
};

window.SalidasAPI = SalidasAPI;
