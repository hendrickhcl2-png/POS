// Wrapper para manejar errores async/await
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ IMPORTANTE: Exportar
module.exports = asyncHandler;
