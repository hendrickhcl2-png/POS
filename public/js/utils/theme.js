/**
 * Tema claro / oscuro.
 *
 * La preferencia se guarda en localStorage: "light" | "dark" | "system".
 * Sin preferencia guardada, arranca en claro.
 * Siempre deja data-theme="light" | "dark" en <html> (el CSS solo mira eso);
 * en modo "system" sigue el ajuste del sistema operativo y reacciona si cambia.
 *
 * Se carga en <head>, antes que el resto, para aplicar el tema antes de que
 * la página se pinte y evitar el destello blanco al entrar en modo oscuro.
 */
(function () {
  const STORAGE_KEY = "pos-tema";
  const MODOS = ["light", "dark", "system"];
  const MODO_POR_DEFECTO = "light";
  const ETIQUETAS = {
    system: "Tema automático (según el sistema)",
    light: "Tema claro",
    dark: "Tema oscuro",
  };
  const ICONOS = { system: "◐", light: "☀", dark: "☾" };

  const media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function leerModo() {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return MODOS.includes(guardado) ? guardado : MODO_POR_DEFECTO;
    } catch (e) {
      return MODO_POR_DEFECTO;
    }
  }

  function guardarModo(modo) {
    try {
      localStorage.setItem(STORAGE_KEY, modo);
    } catch (e) {
      // Sin almacenamiento (modo privado, bloqueado): el tema dura la sesión
    }
  }

  function resolver(modo) {
    if (modo === "system") return media && media.matches ? "dark" : "light";
    return modo;
  }

  function actualizarBoton(modo) {
    const btn = document.getElementById("btnTema");
    if (!btn) return;
    btn.textContent = ICONOS[modo];
    btn.title = ETIQUETAS[modo] + " — clic para cambiar";
    btn.setAttribute("aria-label", ETIQUETAS[modo]);
  }

  function aplicar(modo) {
    document.documentElement.setAttribute("data-theme", resolver(modo));
    actualizarBoton(modo);
  }

  let modoActual = leerModo();
  aplicar(modoActual);

  if (media) {
    const alCambiarSistema = () => {
      if (modoActual === "system") aplicar("system");
    };
    if (media.addEventListener) media.addEventListener("change", alCambiarSistema);
    else if (media.addListener) media.addListener(alCambiarSistema);
  }

  document.addEventListener("DOMContentLoaded", () => actualizarBoton(modoActual));

  window.Tema = {
    // Claro → Oscuro → Automático → Claro
    alternar() {
      const siguiente = MODOS[(MODOS.indexOf(modoActual) + 1) % MODOS.length];
      this.establecer(siguiente);
    },
    establecer(modo) {
      if (!MODOS.includes(modo)) return;
      modoActual = modo;
      guardarModo(modo);
      aplicar(modo);
    },
    obtener() {
      return modoActual;
    },
  };
})();
