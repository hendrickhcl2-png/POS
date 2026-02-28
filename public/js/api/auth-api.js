// ==================== AUTH API ====================
const AuthAPI = {
  async login(username, password) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async logout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return res.json();
  },

  async me() {
    const res = await fetch("/api/auth/me");
    return res.json();
  },

  async getUsuarios() {
    const res = await fetch("/api/auth/usuarios");
    return res.json();
  },

  async crearUsuario(data) {
    const res = await fetch("/api/auth/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async actualizarUsuario(id, data) {
    const res = await fetch(`/api/auth/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async eliminarUsuario(id) {
    const res = await fetch(`/api/auth/usuarios/${id}`, { method: "DELETE" });
    return res.json();
  },
};
