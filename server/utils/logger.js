// ==================== REGISTRO DE EVENTOS (LOG A ARCHIVO) ====================
// Escribe en logs/app-YYYY-MM-DD.log una línea por evento, con este formato:
//
//   2026-09-21 14:32:10 | ERROR   | cliente  | admin (Administrador) | ventas | procesarVenta | Error al procesar venta: Stock insuficiente | ventas.js:996
//
//   fecha y hora | nivel | origen | usuario | módulo | proceso | mensaje | detalle
//
// Guarda tanto los avisos que ve el cajero en pantalla (los manda el logger
// del navegador a POST /api/logs) como los errores del servidor.

const fs = require("fs");
const path = require("path");

const DIR_LOGS = path.join(__dirname, "../../logs");
const DIAS_A_CONSERVAR = 90;
const MAX_MENSAJE = 1000;
const MAX_DETALLE = 2000;

const NIVELES = ["error", "warning", "info", "success", "debug"];

// Los eventos se encolan y se escriben en orden: dos errores casi simultáneos
// (el console.error del controlador y el del manejador de errores) tienen que
// quedar los dos, no pisarse.
let pendientes = [];
let escribiendo = false;

// Los fallos al escribir el archivo se reportan con la consola original: si se
// usara la interceptada, un error de disco se registraría a sí mismo en bucle.
const consolaOriginal = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
};

try {
  fs.mkdirSync(DIR_LOGS, { recursive: true });
} catch (error) {
  consolaOriginal.error("No se pudo crear la carpeta de logs:", error.message);
}

function dosDigitos(n) {
  return String(n).padStart(2, "0");
}

function fechaDelDia(d = new Date()) {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

function fechaHora(d = new Date()) {
  return `${fechaDelDia(d)} ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}:${dosDigitos(d.getSeconds())}`;
}

function archivoDelDia() {
  return path.join(DIR_LOGS, `app-${fechaDelDia()}.log`);
}

// Una línea por evento: los saltos de línea (stacks, sobre todo) se colapsan
// para no romper el formato al leer el archivo con grep o en un editor.
function limpiar(valor, maximo) {
  if (valor === null || valor === undefined || valor === "") return "-";
  const texto = String(valor)
    .replace(/[\r\n]+/g, " ↵ ")
    .replace(/\|/g, "¦")
    .trim();
  return texto.length > maximo ? texto.slice(0, maximo) + "…" : texto || "-";
}

function nivelValido(nivel) {
  const n = String(nivel || "info").toLowerCase();
  return NIVELES.includes(n) ? n : "info";
}

// Describe al usuario tal como quedará en el archivo: "admin (Administrador)".
function describirUsuario(usuario) {
  if (!usuario) return "anónimo";
  const nombre = usuario.nombre && usuario.nombre !== usuario.username ? ` (${usuario.nombre})` : "";
  return `${usuario.username || "?"}${nombre}`;
}

function usuarioDe(req) {
  return describirUsuario(req?.session?.usuario);
}

function registrar({
  nivel = "info",
  origen = "servidor",
  usuario = "sistema",
  modulo = "-",
  proceso = "-",
  mensaje = "",
  detalle = "",
}) {
  const linea =
    [
      fechaHora(),
      nivelValido(nivel).toUpperCase().padEnd(7),
      String(origen).padEnd(8),
      limpiar(usuario, 60),
      limpiar(modulo, 40),
      limpiar(proceso, 60),
      limpiar(mensaje, MAX_MENSAJE),
      limpiar(detalle, MAX_DETALLE),
    ].join(" | ") + "\n";

  pendientes.push(linea);
  vaciar();
}

function vaciar() {
  if (escribiendo || pendientes.length === 0) return;

  escribiendo = true;
  const lote = pendientes.join("");
  pendientes = [];

  fs.appendFile(archivoDelDia(), lote, (error) => {
    escribiendo = false;
    if (error) consolaOriginal.error("No se pudo escribir el log:", error.message);
    if (pendientes.length > 0) vaciar();
  });
}

// Registra un error del servidor a partir del error y la petición que lo causó.
// Imprime además una línea corta en la terminal con la consola original: si
// usara console.error (interceptado) el mismo error quedaría dos veces.
function registrarErrorServidor(error, req, proceso = "-") {
  consolaOriginal.error(
    `❌ ${req ? `${req.method} ${req.originalUrl || req.url}` : proceso}:`,
    error?.message || error,
  );

  registrar({
    nivel: "error",
    origen: "servidor",
    usuario: usuarioDe(req),
    modulo: req ? `${req.method} ${req.originalUrl || req.url}` : "proceso",
    proceso,
    mensaje: error?.message || String(error),
    detalle: error?.stack || "",
  });
}

// Todo lo que los controladores ya mandan a console.error / console.warn
// termina también en el archivo, sin tener que tocar cada uno.
function capturarConsola() {
  console.error = (...args) => {
    consolaOriginal.error(...args);
    registrar({ nivel: "error", origen: "servidor", modulo: "consola", mensaje: textoDeArgs(args) });
  };
  console.warn = (...args) => {
    consolaOriginal.warn(...args);
    registrar({ nivel: "warning", origen: "servidor", modulo: "consola", mensaje: textoDeArgs(args) });
  };
}

function textoDeArgs(args) {
  return args
    .map((a) => {
      if (a instanceof Error) return `${a.message} ${a.stack || ""}`;
      if (typeof a === "object") {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(" ");
}

// Borra los archivos más viejos que DIAS_A_CONSERVAR para que la carpeta no
// crezca sin límite en el equipo del cliente.
function limpiarAntiguos(dias = DIAS_A_CONSERVAR) {
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  let archivos = [];
  try {
    archivos = fs.readdirSync(DIR_LOGS);
  } catch {
    return 0;
  }

  let borrados = 0;
  for (const nombre of archivos) {
    if (!/^app-\d{4}-\d{2}-\d{2}\.log$/.test(nombre)) continue;
    const completo = path.join(DIR_LOGS, nombre);
    try {
      if (fs.statSync(completo).mtimeMs < limite) {
        fs.unlinkSync(completo);
        borrados++;
      }
    } catch {
      // si un archivo no se puede leer o borrar, se deja y se sigue
    }
  }
  return borrados;
}

module.exports = {
  DIR_LOGS,
  NIVELES,
  registrar,
  registrarErrorServidor,
  capturarConsola,
  limpiarAntiguos,
  usuarioDe,
  archivoDelDia,
  fechaDelDia,
};
