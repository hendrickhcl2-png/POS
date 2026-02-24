// ==================== FORMATEADORES ====================
// Funciones para formatear datos

const Formatters = {
  // Formatear moneda
  formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
  },

  // Formatear método de pago
  formatMetodoPago(metodo) {
    const metodos = {
      efectivo: "💵 Efectivo",
      tarjeta: "💳 Tarjeta",
      transferencia: "🏦 Transferencia",
      mixto: "💰 Mixto",
    };
    return metodos[metodo] || metodo;
  },

  // Formatear fecha
  formatFecha(fecha) {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-DO");
  },

  // Formatear hora
  formatHora(hora) {
    if (!hora) return "-";
    return hora.substring(0, 5); // HH:MM
  },

  // Formatear código (código de barras o IMEI)
  formatCodigo(producto) {
    return producto.imei || producto.codigo_barras || producto.sku || "-";
  },

  // Formatear nombre completo
  formatNombreCompleto(persona) {
    return `${persona.nombre} ${persona.apellido || ""}`.trim();
  },
};

window.Formatters = Formatters;
