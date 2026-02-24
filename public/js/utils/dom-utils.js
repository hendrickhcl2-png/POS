// ==================== UTILIDADES DOM ====================
// Funciones helper para manipulación del DOM

const DOMUtils = {
  // Obtener valor de un elemento por ID
  getValue(id) {
    const elem = document.getElementById(id);
    return elem ? elem.value : "";
  },

  // Establecer valor de un elemento si existe
  setValueIfExists(id, value) {
    const elem = document.getElementById(id);
    if (elem) elem.value = value;
  },

  // Establecer texto de un elemento
  setTextIfExists(selector, text) {
    const elem = document.querySelector(selector);
    if (elem) elem.textContent = text;
  },

  // Mostrar alerta
  mostrarAlerta(mensaje, tipo = "info") {
    const tipoToast = tipo === "danger" ? "error" : tipo;
    Toast.show(mensaje, tipoToast);
  },

  // Cerrar modal
  cerrarModal(modalId) {
    document.getElementById(modalId)?.classList.remove("active");
  },

  // Abrir modal
  abrirModal(modalId) {
    document.getElementById(modalId)?.classList.add("active");
  },

  // Limpiar formulario
  limpiarFormulario(formId) {
    document.getElementById(formId)?.reset();
  },
};

// Exportar para uso global
window.DOMUtils = DOMUtils;
window.getValue = DOMUtils.getValue;
window.setValueIfExists = DOMUtils.setValueIfExists;
window.setTextIfExists = DOMUtils.setTextIfExists;
window.mostrarAlerta = DOMUtils.mostrarAlerta;
window.cerrarModal = DOMUtils.cerrarModal;

