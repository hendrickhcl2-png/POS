// ==================== SISTEMA DE NOTIFICACIONES TOAST ====================

const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  function show(mensaje, tipo = "info", duracion = 4000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;

    const c = getContainer();
    c.appendChild(toast);

    // Forzar reflow para activar la transición de entrada
    toast.getBoundingClientRect();
    toast.classList.add("toast-visible");

    const dismiss = () => {
      toast.classList.remove("toast-visible");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    };

    const timer = setTimeout(dismiss, duracion);
    toast.addEventListener("click", () => { clearTimeout(timer); dismiss(); });
  }

  return {
    show,
    success: (msg, dur) => show(msg, "success", dur),
    error:   (msg, dur) => show(msg, "error", dur),
    warning: (msg, dur) => show(msg, "warning", dur),
    info:    (msg, dur) => show(msg, "info", dur),
  };
})();

window.Toast = Toast;
