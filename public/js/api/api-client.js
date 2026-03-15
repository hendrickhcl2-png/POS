// ==================== CLIENTE API BASE ====================
// Cliente HTTP base para todas las APIs

const API_URL = "http://localhost:3000/api";

const APIClient = {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Error en la petición");
      }

      const result = await response.json();
      // Normalizar respuestas envueltas { success, data } y devolver data directamente
      if (result !== null && typeof result === "object" && "success" in result && "data" in result) {
        return result.data;
      }
      return result;
    } catch (error) {
      console.error("❌ Error en API:", error);
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("No se pudo conectar con el servidor. Verifica que el servidor esté activo.");
      }
      throw error;
    }
  },

  async get(endpoint) {
    return this.request(endpoint);
  },

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  },

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

window.APIClient = APIClient;
