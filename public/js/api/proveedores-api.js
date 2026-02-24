// ==================== API DE PROVEEDORES ====================
// Cliente API para todas las operaciones de proveedores

const ProveedoresAPI = {
  // Obtener todos los proveedores
  async getAll() {
    return await APIClient.get("/proveedores");
  },

  // Obtener proveedor por ID
  async getById(id) {
    return await APIClient.get(`/proveedores/${id}`);
  },

  // Obtener productos de un proveedor
  async getProductos(id) {
    return await APIClient.get(`/proveedores/${id}/productos`);
  },

  // Crear nuevo proveedor
  async create(proveedorData) {
    return await APIClient.post("/proveedores", proveedorData);
  },

  // Actualizar proveedor
  async update(id, proveedorData) {
    return await APIClient.put(`/proveedores/${id}`, proveedorData);
  },

  // Eliminar proveedor
  async delete(id) {
    return await APIClient.delete(`/proveedores/${id}`);
  },
};

// Exportar
window.ProveedoresAPI = ProveedoresAPI;
