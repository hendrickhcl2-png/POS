// ==================== ERROR HANDLER MIDDLEWARE ====================
// Middleware central para manejo de errores

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.stack);

  // Error de validación
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Error de validación",
      message: err.message,
    });
  }

  // Error de base de datos
  if (err.code === "23505") {
    // Unique constraint violation
    return res.status(409).json({
      error: "Registro duplicado",
      message: "Ya existe un registro con estos datos",
    });
  }

  if (err.code === "23503") {
    // Foreign key violation
    return res.status(400).json({
      error: "Error de relación",
      message: "No se puede completar la operación debido a dependencias",
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    error: "Error del servidor",
    message: err.message || "Ha ocurrido un error inesperado",
  });
};

module.exports = errorHandler;
