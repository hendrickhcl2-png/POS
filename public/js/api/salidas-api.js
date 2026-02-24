// ==================== API DE SALIDAS ====================

const SalidasAPI = {
  async getAll() {
    return await APIClient.get("/salidas");
  },

  async create(data) {
    return await APIClient.post("/salidas", data);
  },
};

window.SalidasAPI = SalidasAPI;
