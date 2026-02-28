// ==================== RUTAS DE AUTENTICACIÓN ====================
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../database/pool");
const { requireAuth, requireAdmin } = require("../middleware/auth-middleware");

// ==================== LOGIN ====================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Usuario y contraseña requeridos" });
    }

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE username = $1 AND activo = true",
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Credenciales inválidas" });
    }

    const usuario = result.rows[0];
    const passwordOk = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ success: false, message: "Credenciales inválidas" });
    }

    req.session.usuario = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };

    res.json({
      success: true,
      data: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// ==================== LOGOUT ====================
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
    }
    res.json({ success: true });
  });
});

// ==================== ME ====================
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, data: req.session.usuario });
});

// ==================== LISTAR USUARIOS (admin) ====================
router.get("/usuarios", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, nombre, rol, activo, created_at FROM usuarios ORDER BY id ASC"
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("❌ Error al listar usuarios:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CREAR USUARIO (admin) ====================
router.post("/usuarios", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, nombre, rol } = req.body;

    if (!username || !password || !rol) {
      return res.status(400).json({ success: false, message: "username, password y rol son requeridos" });
    }

    if (!["admin", "cajero"].includes(rol)) {
      return res.status(400).json({ success: false, message: "Rol inválido" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (username, password_hash, nombre, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, nombre, rol, activo, created_at`,
      [username.trim(), hash, nombre || username, rol]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ success: false, message: "El nombre de usuario ya existe" });
    }
    console.error("❌ Error al crear usuario:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EDITAR USUARIO (admin) ====================
router.put("/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rol, activo, password } = req.body;

    if (rol && !["admin", "cajero"].includes(rol)) {
      return res.status(400).json({ success: false, message: "Rol inválido" });
    }

    // Build update dynamically
    const updates = [];
    const params = [];
    let i = 1;

    if (nombre !== undefined) { updates.push(`nombre = $${i++}`); params.push(nombre); }
    if (rol !== undefined) { updates.push(`rol = $${i++}`); params.push(rol); }
    if (activo !== undefined) { updates.push(`activo = $${i++}`); params.push(activo); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${i++}`);
      params.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "Sin cambios" });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id = $${i} RETURNING id, username, nombre, rol, activo`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("❌ Error al editar usuario:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ELIMINAR USUARIO (admin) ====================
router.delete("/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.usuario.id;

    if (parseInt(id) === adminId) {
      return res.status(400).json({ success: false, message: "No puedes eliminar tu propia cuenta" });
    }

    // Verificar que no sea el último admin
    const target = await pool.query("SELECT rol FROM usuarios WHERE id = $1", [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    if (target.rows[0].rol === "admin") {
      const { rows } = await pool.query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin' AND activo = true");
      if (parseInt(rows[0].count) <= 1) {
        return res.status(400).json({ success: false, message: "No puedes eliminar el único administrador" });
      }
    }

    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

console.log("✅ Rutas de auth cargadas");

module.exports = router;
