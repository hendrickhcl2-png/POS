// ==================== MÓDULO DE VALIDACIONES ====================

const Validators = {
  // ── Texto ──────────────────────────────────────────────────────

  /** Valor requerido: no nulo, no vacío */
  required(value) {
    return value !== null && value !== undefined && String(value).trim() !== "";
  },

  /** Longitud mínima */
  minLength(value, min) {
    return String(value).trim().length >= min;
  },

  // ── Números ────────────────────────────────────────────────────

  /** Número >= 0 */
  isNonNegative(value) {
    const n = parseFloat(value);
    return !isNaN(n) && n >= 0;
  },

  /** Número > 0 */
  isPositive(value) {
    const n = parseFloat(value);
    return !isNaN(n) && n > 0;
  },

  /** Entero >= 0 */
  isNonNegativeInt(value) {
    const n = parseInt(value, 10);
    return !isNaN(n) && n >= 0 && Number.isInteger(n);
  },

  // ── Formatos dominicanos ───────────────────────────────────────

  /** Cédula dominicana: 11 dígitos (acepta guiones) */
  isCedula(value) {
    const digits = String(value).replace(/\D/g, "");
    return digits.length === 11;
  },

  /** RNC dominicano: 9 dígitos (acepta guiones) */
  isRNC(value) {
    const digits = String(value).replace(/\D/g, "");
    return digits.length === 9;
  },

  /** Teléfono dominicano: 10 dígitos */
  isPhone(value) {
    const digits = String(value).replace(/\D/g, "");
    return digits.length === 10;
  },

  // ── Email ──────────────────────────────────────────────────────

  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
  },

  // ── Helpers ────────────────────────────────────────────────────

  /**
   * Valida un objeto de reglas y devuelve el primer mensaje de error, o null.
   * Uso:
   *   const error = Validators.validate({
   *     "Nombre": [value, "required"],
   *     "Precio": [precio, "positive"],
   *   });
   *   if (error) { mostrarAlerta(error, "warning"); return; }
   */
  validate(rules) {
    for (const [label, [value, rule]] of Object.entries(rules)) {
      if (rule === "required" && !this.required(value)) {
        return `${label} es obligatorio`;
      }
      if (rule === "positive" && !this.isPositive(value)) {
        return `${label} debe ser un número mayor a 0`;
      }
      if (rule === "nonNegative" && !this.isNonNegative(value)) {
        return `${label} debe ser un número válido`;
      }
      if (rule === "email" && value && !this.isEmail(value)) {
        return `${label} no tiene un formato de correo válido`;
      }
      if (rule === "cedula" && value && !this.isCedula(value)) {
        return `${label} debe tener 11 dígitos`;
      }
      if (rule === "rnc" && value && !this.isRNC(value)) {
        return `${label} debe tener 9 dígitos`;
      }
      if (rule === "phone" && value && !this.isPhone(value)) {
        return `${label} debe tener 10 dígitos`;
      }
    }
    return null;
  },
};

window.Validators = Validators;
