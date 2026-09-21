// ==================== RUTAS DE REGISTRO DE EVENTOS ====================
// POST /api/logs        recibe los avisos que se mostraron en pantalla
// GET  /api/logs        lista los archivos disponibles (admin)
// GET  /api/logs/:fecha devuelve el contenido de un día (admin)

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const logger = require("../utils/logger");
const { requireAdmin } = require("../middleware/auth-middleware");

const MAX_EVENTOS_POR_PETICION = 50;
const MAX_EVENTOS_ANONIMOS_POR_MINUTO = 60;
const LINEAS_POR_DEFECTO = 500;
const MAX_LINEAS = 5000;

// Esta ruta acepta eventos sin sesión iniciada (los errores de la pantalla de
// login), así que se limita cuánto puede escribir un cliente no autenticado.
const anonimos = new Map();

function excedeLimiteAnonimo(ip, cantidad) {
  const ahora = Date.now();
  const registro = anonimos.get(ip) || { desde: ahora, contados: 0 };

  if (ahora - registro.desde > 60000) {
    registro.desde = ahora;
    registro.contados = 0;
  }

  registro.contados += cantidad;
  anonimos.set(ip, registro);

  // Limpieza perezosa para que el mapa no crezca con IPs viejas.
  if (anonimos.size > 500) {
    for (const [clave, valor] of anonimos) {
      if (ahora - valor.desde > 60000) anonimos.delete(clave);
    }
  }

  return registro.contados > MAX_EVENTOS_ANONIMOS_POR_MINUTO;
}

// ==================== RECIBIR EVENTOS DEL NAVEGADOR ====================
router.post("/", (req, res) => {
  const recibidos = Array.isArray(req.body?.eventos)
    ? req.body.eventos
    : [req.body];

  const eventos = recibidos
    .filter((e) => e && typeof e.mensaje === "string" && e.mensaje.trim() !== "")
    .slice(0, MAX_EVENTOS_POR_PETICION);

  if (!req.session?.usuario && excedeLimiteAnonimo(req.ip, eventos.length)) {
    return res.status(429).json({ error: "Demasiados eventos sin sesión iniciada" });
  }

  for (const evento of eventos) {
    logger.registrar({
      nivel: evento.nivel,
      origen: "cliente",
      // El usuario sale de la sesión, no de lo que mande el navegador.
      usuario: logger.usuarioDe(req),
      modulo: evento.modulo,
      proceso: evento.proceso,
      mensaje: evento.mensaje,
      detalle: evento.detalle,
    });
  }

  res.json({ success: true, registrados: eventos.length });
});

// ==================== LISTAR ARCHIVOS ====================
router.get("/", requireAdmin, (req, res) => {
  let archivos = [];
  try {
    archivos = fs.readdirSync(logger.DIR_LOGS);
  } catch {
    return res.json({ success: true, data: [] });
  }

  const data = archivos
    .filter((n) => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(n))
    .map((nombre) => {
      const stat = fs.statSync(path.join(logger.DIR_LOGS, nombre));
      return {
        fecha: nombre.replace(/^app-|\.log$/g, ""),
        archivo: nombre,
        tamano_kb: Math.round((stat.size / 1024) * 10) / 10,
        modificado: stat.mtime,
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  res.json({ success: true, data });
});

// ==================== LEER UN DÍA ====================
router.get("/:fecha", requireAdmin, (req, res) => {
  const { fecha } = req.params;

  // El formato fijo de la fecha es lo que impide salirse de la carpeta de logs.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Fecha inválida. Formato esperado: YYYY-MM-DD" });
  }

  const archivo = path.join(logger.DIR_LOGS, `app-${fecha}.log`);
  if (!fs.existsSync(archivo)) {
    return res.status(404).json({ error: `No hay registros del ${fecha}` });
  }

  const solicitadas = parseInt(req.query.lineas);
  const limite = Number.isInteger(solicitadas)
    ? Math.min(Math.max(solicitadas, 1), MAX_LINEAS)
    : LINEAS_POR_DEFECTO;

  const contenido = fs.readFileSync(archivo, "utf8").split("\n").filter(Boolean);
  const nivel = String(req.query.nivel || "").toUpperCase();
  const filtradas = nivel
    ? contenido.filter((l) => l.includes(` | ${nivel.padEnd(7)} | `))
    : contenido;

  res.type("text/plain").send(filtradas.slice(-limite).join("\n"));
});

module.exports = router;
