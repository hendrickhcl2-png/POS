// ==================== AUTH MIDDLEWARE ====================

function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ success: false, message: "No autenticado" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ success: false, message: "No autenticado" });
  }
  if (req.session.usuario.rol !== "admin") {
    return res.status(403).json({ success: false, message: "Acceso denegado: se requiere rol admin" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
