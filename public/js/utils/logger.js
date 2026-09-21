// ==================== REGISTRO DE EVENTOS DEL NAVEGADOR ====================
// Captura lo que el usuario ve en pantalla (los toasts: errores, avisos y
// confirmaciones) más los errores de JavaScript, y los manda a POST /api/logs,
// donde el servidor los escribe en logs/app-YYYY-MM-DD.log.
//
// De cada evento se guarda: fecha y hora, usuario (lo pone el servidor desde
// la sesión), módulo, proceso, mensaje y detalle (archivo:línea o el stack).
//
// Debe cargarse justo después de toast.js y antes que el resto de módulos.

const AppLogger = (() => {
  const ENDPOINT = "/api/logs";
  const MAX_COLA = 200; // techo para no comerse la memoria si el servidor no responde
  const ESPERA_ENVIO = 3000; // los avisos normales se agrupan; los errores salen de una

  let cola = [];
  let temporizador = null;
  let enviando = false;

  // ---------- de dónde vino el mensaje ----------

  // Funciones que solo reenvían el aviso: el proceso útil es quien las llamó.
  const ENVOLTORIOS = /^(mostrarAlerta|mostrarMensaje|mostrarToast|alertar|notificar)$/;

  // Saca el módulo y la función del stack. Sirve tanto el formato de Firefox
  // (fn@http://.../ventas.js:236:8) como el de Chrome (at fn (http://...)).
  function origenLlamada() {
    const frames = String(new Error().stack || "").split("\n");

    for (const frame of frames) {
      // Los frames del propio logger y del sistema de toasts no interesan.
      if (/utils\/(logger|toast)\.js/.test(frame)) continue;
      if (ENVOLTORIOS.test(nombreDeFuncion(frame))) continue;

      const archivo = frame.match(/\/([\w.-]+)\.js:(\d+)/);
      if (!archivo) continue;

      const funcion = nombreDeFuncion(frame);

      return {
        modulo: archivo[1].replace(/-module$/, ""),
        proceso: funcion && !/^</.test(funcion) ? funcion : "(anónimo)",
        ubicacion: `${archivo[1]}.js:${archivo[2]}`,
      };
    }

    return { modulo: seccionActiva(), proceso: "(desconocido)", ubicacion: "" };
  }

  function nombreDeFuncion(frame) {
    const m = frame.match(/^\s*at\s+([^\s(]+)/) || frame.match(/^\s*([^@\s]+)@/);
    // "Object.procesarVenta" o "VentasModule.procesarVenta" → "procesarVenta"
    return m ? m[1].split(".").pop() : "";
  }

  // Si el stack no dice nada, al menos queda la sección abierta en pantalla.
  function seccionActiva() {
    return document.querySelector(".section.active")?.id || "app";
  }

  // ---------- envío ----------

  function encolar(evento, inmediato) {
    if (cola.length >= MAX_COLA) cola.shift();
    cola.push(evento);

    // Los errores y lo que pasa en el login salen al instante: si se agruparan,
    // un login fallido se enviaría ya con la sesión siguiente abierta y el
    // servidor lo firmaría con el usuario equivocado.
    if (inmediato || evento.nivel === "error") {
      enviar();
      return;
    }
    if (!temporizador) temporizador = setTimeout(enviar, ESPERA_ENVIO);
  }

  async function enviar() {
    clearTimeout(temporizador);
    temporizador = null;
    if (enviando || cola.length === 0) return;

    const lote = cola.splice(0, 50);
    enviando = true;
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventos: lote }),
        keepalive: true,
      });
    } catch (error) {
      // Si el servidor no está, se descarta el lote: registrar este fallo con
      // el propio logger sería un bucle.
      console.debug("No se pudo enviar el registro de eventos:", error.message);
    } finally {
      enviando = false;
      if (cola.length > 0 && !temporizador) temporizador = setTimeout(enviar, ESPERA_ENVIO);
    }
  }

  // Al cerrar o esconder la pestaña se manda lo que quede pendiente.
  function vaciarAlSalir() {
    if (cola.length === 0) return;
    const lote = cola.splice(0, cola.length);
    const cuerpo = new Blob([JSON.stringify({ eventos: lote })], { type: "application/json" });
    if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, cuerpo);
  }

  // ---------- API pública ----------

  function registrar(nivel, mensaje, detalle = "", extra = {}) {
    if (mensaje === undefined || mensaje === null || mensaje === "") return;
    const origen = origenLlamada();

    encolar(
      {
        nivel,
        modulo: extra.modulo || origen.modulo,
        proceso: extra.proceso || origen.proceso,
        mensaje: String(mensaje),
        detalle: detalle || origen.ubicacion,
        seccion: seccionActiva(),
      },
      extra.inmediato,
    );
  }

  // ---------- enganches ----------

  // Cada aviso que aparece en pantalla queda registrado. Se envuelven los
  // cinco métodos porque success/warning/... no pasan por Toast.show.
  function engancharToast() {
    if (!window.Toast) return;

    const equivalencias = { danger: "error", warn: "warning" };

    const envolver = (nombre, nivelFijo) => {
      const original = window.Toast[nombre];
      if (typeof original !== "function") return;

      window.Toast[nombre] = function (mensaje, tipoODuracion, duracion) {
        const tipo = nivelFijo || (typeof tipoODuracion === "string" ? tipoODuracion : "info");
        registrar(equivalencias[tipo] || tipo, mensaje);
        return original.apply(this, arguments);
      };
    };

    envolver("show", null);
    envolver("success", "success");
    envolver("error", "error");
    envolver("warning", "warning");
    envolver("info", "info");
  }

  // Errores de JavaScript que nunca llegan a verse en pantalla.
  function engancharErrores() {
    window.addEventListener("error", (e) => {
      const archivo = (e.filename || "").split("/").pop() || "";
      registrar("error", e.message || "Error de JavaScript", `${archivo}:${e.lineno}`, {
        modulo: archivo.replace(/\.js$/, "").replace(/-module$/, "") || seccionActiva(),
        proceso: "error no controlado",
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      const motivo = e.reason;
      registrar(
        "error",
        motivo?.message || String(motivo),
        motivo?.stack || "",
        { proceso: "promesa sin manejar" },
      );
    });
  }

  // Lo que los módulos ya mandan a la consola en sus catch: ahí está la causa
  // real del error, mientras el toast solo tiene el texto amable.
  function engancharConsola() {
    const originales = { error: console.error, warn: console.warn };

    console.error = function (...args) {
      registrar("error", textoDeArgs(args), "", { proceso: "console.error" });
      originales.error.apply(console, args);
    };
    console.warn = function (...args) {
      registrar("warning", textoDeArgs(args), "", { proceso: "console.warn" });
      originales.warn.apply(console, args);
    };
  }

  function textoDeArgs(args) {
    return args
      .map((a) => {
        if (a instanceof Error) return `${a.message} ${a.stack || ""}`;
        if (a && typeof a === "object") {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(" ")
      .trim();
  }

  // El login no usa toasts: sus mensajes van a #loginError. Se observa ese
  // elemento para que un "Credenciales inválidas" también quede registrado.
  function engancharLogin() {
    const el = document.getElementById("loginError");
    if (!el || typeof MutationObserver === "undefined") return;

    let ultimo = "";
    new MutationObserver(() => {
      const texto = el.textContent.trim();
      if (!texto || texto === ultimo) return;
      ultimo = texto;
      registrar("warning", texto, "", {
        modulo: "login",
        proceso: "inicio de sesión",
        inmediato: true,
      });
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  function init() {
    engancharToast();
    engancharErrores();
    engancharConsola();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", engancharLogin);
    } else {
      engancharLogin();
    }
    window.addEventListener("pagehide", vaciarAlSalir);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") vaciarAlSalir();
    });
  }

  init();

  return {
    registrar,
    error: (mensaje, detalle) => registrar("error", mensaje, detalle),
    warning: (mensaje, detalle) => registrar("warning", mensaje, detalle),
    info: (mensaje, detalle) => registrar("info", mensaje, detalle),
    enviar,
  };
})();

window.AppLogger = AppLogger;
