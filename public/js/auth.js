// ==================== AUTH MODULE ====================

window.Auth = {
  usuario: null,

  async init() {
    const result = await AuthAPI.me();
    if (!result.success) {
      this._mostrarOverlay();
      return false;
    }
    this.usuario = result.data;
    this._ocultarOverlay();
    this.setupUI();
    return true;
  },

  async login(username, password) {
    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "";

    const result = await AuthAPI.login(username, password);
    if (!result.success) {
      if (errorEl) errorEl.textContent = result.message || "Credenciales inválidas";
      return false;
    }

    this.usuario = result.data;
    this._ocultarOverlay();
    this.setupUI();
    if (window.inicializarApp) await window.inicializarApp();
    return true;
  },

  async logout() {
    await AuthAPI.logout();
    this.usuario = null;
    window._appInitialized = false;
    this._mostrarOverlay();
    // Reset form
    const u = document.getElementById("loginUsername");
    const p = document.getElementById("loginPassword");
    const e = document.getElementById("loginError");
    if (u) u.value = "";
    if (p) p.value = "";
    if (e) e.textContent = "";
  },

  isAdmin() {
    return this.usuario && this.usuario.rol === "admin";
  },

  canAccess(sectionId) {
    if (!this.usuario) return false;
    if (this.isAdmin()) return true;
    // Cajero: solo estas secciones
    const cajeroSections = ["ventas", "creditos", "clientes", "reportes", "verificador"];
    return cajeroSections.includes(sectionId);
  },

  setupUI() {
    // Actualizar nombre en sidebar
    const nameEl = document.getElementById("usuarioNombreSidebar");
    if (nameEl) nameEl.textContent = this.usuario.nombre || this.usuario.username;

    const rolEl = document.getElementById("usuarioRolSidebar");
    if (rolEl) rolEl.textContent = this.usuario.rol === "admin" ? "Administrador" : "Cajero";

    // Ocultar nav items según rol
    const adminOnlyNavs = [
      "nav-productos",
      "nav-proveedores",
      "nav-salidas",
      "nav-reporte-inventario",
      "nav-facturacion",
      "nav-configuracion",
      "nav-group-inventario",
      "nav-group-admin",
    ];

    if (!this.isAdmin()) {
      adminOnlyNavs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
    } else {
      adminOnlyNavs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "";
      });
    }

    // Tab usuarios en configuración
    const tabUsuarios = document.getElementById("tabUsuarios");
    if (tabUsuarios) tabUsuarios.style.display = this.isAdmin() ? "" : "none";
  },

  _mostrarOverlay() {
    const overlay = document.getElementById("loginOverlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      setTimeout(() => {
        const u = document.getElementById("loginUsername");
        if (u) u.focus();
      }, 100);
    }
  },

  _ocultarOverlay() {
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.classList.add("hidden");
  },
};

// Handler del formulario de login
function handleLoginSubmit() {
  const username = (document.getElementById("loginUsername")?.value || "").trim();
  const password = document.getElementById("loginPassword")?.value || "";
  if (!username || !password) {
    const e = document.getElementById("loginError");
    if (e) e.textContent = "Ingresa usuario y contraseña";
    return;
  }
  Auth.login(username, password);
}

// Enter en campos de login
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("loginPassword");
  if (passwordInput) {
    passwordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLoginSubmit();
    });
  }
  const usernameInput = document.getElementById("loginUsername");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLoginSubmit();
    });
  }
});
