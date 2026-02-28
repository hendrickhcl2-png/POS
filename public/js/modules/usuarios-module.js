// ==================== MÓDULO DE USUARIOS ====================

window.UsuariosModule = {
  usuarios: [],

  async cargar() {
    const container = document.getElementById("tablaUsuariosContainer");
    if (!container) return;

    container.innerHTML = `<p style="color:var(--clr-muted);font-size:14px;">Cargando usuarios...</p>`;

    try {
      const result = await AuthAPI.getUsuarios();
      if (!result.success) {
        container.innerHTML = `<p style="color:var(--clr-danger);">Error: ${result.message || "No se pudieron cargar los usuarios"}</p>`;
        return;
      }
      this.usuarios = result.data;
      this._renderTabla(result.data);
    } catch (err) {
      container.innerHTML = `<p style="color:var(--clr-danger);">Error al cargar usuarios</p>`;
    }
  },

  _renderTabla(usuarios) {
    const container = document.getElementById("tablaUsuariosContainer");
    if (!container) return;

    if (!usuarios.length) {
      container.innerHTML = `<p style="color:var(--clr-muted);font-size:14px;">No hay usuarios registrados</p>`;
      return;
    }

    container.innerHTML = `
      <table class="tabla-simple">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
            <th style="text-align:center;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${usuarios.map((u) => `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td>${u.nombre || "—"}</td>
              <td>
                <span style="
                  padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;
                  background:${u.rol === "admin" ? "var(--clr-primary)" : "var(--clr-success)"};
                  color:white;">
                  ${u.rol === "admin" ? "Admin" : "Cajero"}
                </span>
              </td>
              <td>
                <span style="color:${u.activo ? "var(--clr-success)" : "var(--clr-danger)"};">
                  ${u.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td style="text-align:center;">
                <button class="btn btn-primary btn-small" onclick="UsuariosModule.mostrarModal(${u.id})">Editar</button>
                ${u.id !== Auth.usuario?.id ? `<button class="btn btn-danger btn-small" onclick="UsuariosModule.eliminar(${u.id}, '${u.username}')">Eliminar</button>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  },

  mostrarModal(usuarioId = null) {
    const modal = document.getElementById("modalUsuario");
    if (!modal) return;

    const titulo = document.getElementById("tituloModalUsuario");
    const idInput = document.getElementById("usuarioId");
    const usernameInput = document.getElementById("usuarioUsername");
    const nombreInput = document.getElementById("usuarioNombre");
    const passwordInput = document.getElementById("usuarioPassword");
    const rolSelect = document.getElementById("usuarioRol");
    const activoGroup = document.getElementById("usuarioActivoGroup");
    const activoCheck = document.getElementById("usuarioActivo");
    const passwordHint = document.getElementById("usuarioPasswordHint");

    // Reset
    idInput.value = "";
    usernameInput.value = "";
    nombreInput.value = "";
    passwordInput.value = "";
    rolSelect.value = "cajero";
    if (activoCheck) activoCheck.checked = true;

    if (usuarioId) {
      const u = this.usuarios.find((x) => x.id === usuarioId);
      if (!u) return;
      if (titulo) titulo.textContent = "Editar Usuario";
      idInput.value = u.id;
      usernameInput.value = u.username;
      usernameInput.disabled = true;
      nombreInput.value = u.nombre || "";
      rolSelect.value = u.rol;
      if (activoCheck) activoCheck.checked = u.activo;
      if (activoGroup) activoGroup.style.display = "";
      if (passwordHint) passwordHint.textContent = "(dejar vacío para no cambiar)";
    } else {
      if (titulo) titulo.textContent = "Nuevo Usuario";
      usernameInput.disabled = false;
      if (activoGroup) activoGroup.style.display = "none";
      if (passwordHint) passwordHint.textContent = "(requerida)";
    }

    modal.classList.add("active");
  },

  async guardar() {
    const id = document.getElementById("usuarioId")?.value;
    const username = document.getElementById("usuarioUsername")?.value.trim();
    const nombre = document.getElementById("usuarioNombre")?.value.trim();
    const password = document.getElementById("usuarioPassword")?.value;
    const rol = document.getElementById("usuarioRol")?.value;
    const activo = document.getElementById("usuarioActivo")?.checked ?? true;

    if (!id && (!username || !password)) {
      Toast.error("Usuario y contraseña son requeridos");
      return;
    }

    let result;
    if (id) {
      const data = { nombre, rol, activo };
      if (password) data.password = password;
      result = await AuthAPI.actualizarUsuario(id, data);
    } else {
      result = await AuthAPI.crearUsuario({ username, nombre, password, rol });
    }

    if (!result.success) {
      Toast.error(result.message || "Error al guardar usuario");
      return;
    }

    Toast.success(id ? "Usuario actualizado" : "Usuario creado");
    cerrarModal("modalUsuario");
    this.cargar();
  },

  async eliminar(id, username) {
    if (!confirm(`¿Eliminar la cuenta "${username}"? Esta acción no se puede deshacer.`)) return;

    const result = await AuthAPI.eliminarUsuario(id);
    if (!result.success) {
      Toast.error(result.message || "Error al eliminar usuario");
      return;
    }

    Toast.success(`Cuenta "${username}" eliminada`);
    this.cargar();
  },
};
