const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ANCHO = 38; // caracteres por línea en 80mm (reducido para márgenes de Windows GDI)

function linea(char = "-") {
  return char.repeat(ANCHO);
}

function centrar(texto) {
  const t = String(texto).substring(0, ANCHO);
  const pad = Math.floor((ANCHO - t.length) / 2);
  return " ".repeat(pad) + t;
}

function columnas(izq, der) {
  const derStr = String(der);
  const izqStr = String(izq).substring(0, ANCHO - derStr.length - 1);
  const spaces = ANCHO - izqStr.length - derStr.length;
  return izqStr + " ".repeat(Math.max(1, spaces)) + derStr;
}

function fmt(n) {
  const num = parseFloat(n) || 0;
  return "RD$" + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtFecha(f) {
  if (!f) return "";
  // Extraer solo la parte de fecha (YYYY-MM-DD) en caso de que llegue como ISO completo
  const datePart = String(f).split("T")[0].split(" ")[0];
  const d = new Date(datePart + "T12:00:00");
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtHora(h) {
  if (!h) return "";
  // Truncar a HH:MM:SS quitando microsegundos PostgreSQL
  return String(h).substring(0, 8);
}

function generarTextoRecibo(data) {
  const { factura, config } = data;
  const lines = [];

  // Encabezado
  lines.push(centrar(config.nombre || "FIFTY TECH SRL"));
  if (config.direccion) lines.push(centrar(config.direccion));
  if (config.telefono)  lines.push(centrar("Tel: " + config.telefono));
  if (config.rnc)       lines.push(centrar("RNC: " + config.rnc));
  lines.push(linea("="));

  // Número de documento y fecha
  const tipoDoc = factura.esFacturaElectronica ? "FACTURA" : "RECIBO";
  lines.push(centrar(`${tipoDoc} ${factura.numeroDocumento || ""}`));
  lines.push(centrar(`${fmtFecha(factura.fecha)}  ${fmtHora(factura.hora)}`));

  // NCF
  if (factura.ncf) {
    lines.push(linea("-"));
    lines.push(centrar("NCF: " + factura.ncf));
    lines.push(centrar(factura.tipo_comprobante || "B02") + " - Consumidor Final");
  }

  lines.push(linea("-"));

  // Cliente
  lines.push("Cliente: " + (factura.cliente_nombre || "Consumidor Final"));
  if (factura.cliente_cedula) lines.push("Cedula:  " + factura.cliente_cedula);
  if (factura.cliente_rnc)    lines.push("RNC:     " + factura.cliente_rnc);
  lines.push(linea("-"));

  // Productos
  lines.push("PRODUCTOS:");
  (factura.items || []).forEach((item) => {
    const nombre = String(item.nombre_producto).substring(0, ANCHO);
    lines.push(nombre);
    lines.push(columnas(`  ${item.cantidad} x ${fmt(item.precio_unitario)}`, fmt(item.subtotal)));
  });

  // Servicios
  if (factura.servicios && factura.servicios.length > 0) {
    lines.push(linea("-"));
    lines.push("SERVICIOS:");
    factura.servicios.forEach((s) => {
      lines.push(columnas(String(s.nombre_servicio).substring(0, ANCHO - 8), s.es_gratuito ? "GRATIS" : fmt(s.precio)));
    });
  }

  lines.push(linea("="));

  // Totales
  lines.push(columnas("Subtotal:", fmt(factura.subtotal)));
  if (factura.descuento > 0) {
    lines.push(columnas("Descuento:", "-" + fmt(factura.descuento)));
  }
  lines.push(columnas("ITBIS (18%):", fmt(factura.itbis)));
  lines.push(linea("-"));
  const labelTotal = factura.total_devuelto > 0 ? "TOTAL BRUTO:" : "TOTAL:";
  lines.push(columnas(labelTotal, fmt(factura.total)));
  if (factura.total_devuelto > 0) {
    lines.push(columnas("Monto devuelto:", "-" + fmt(factura.total_devuelto)));
    lines.push(linea("-"));
    lines.push(columnas("TOTAL NETO:", fmt(factura.total_neto)));
  }

  lines.push(linea("="));

  // Pago
  const metodosMap = {
    efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia",
    cheque: "Cheque", credito: "Credito", mixto: "Mixto",
  };
  lines.push("Pago: " + (metodosMap[factura.metodo_pago] || factura.metodo_pago || ""));
  if (factura.metodo_pago === "efectivo" || factura.metodo_pago === "mixto") {
    lines.push(columnas("  Recibido:", fmt(factura.monto_recibido || factura.total)));
    lines.push(columnas("  Cambio:", fmt(factura.cambio || 0)));
  }
  if (factura.banco)     lines.push("Banco: " + factura.banco);
  if (factura.referencia) lines.push("Ref:   " + factura.referencia);

  lines.push(linea("-"));

  // Estado y pie
  const estado = factura.total_devuelto > 0 ? "*** CON DEVOLUCIONES ***" : "*** COMPLETADO ***";
  lines.push(centrar(estado));
  lines.push("");
  lines.push(centrar("Gracias por su compra en"));
  lines.push(centrar(config.nombre || "FIFTY TECH SRL"));
  lines.push("");
  lines.push(centrar("Conserve este recibo para"));
  lines.push(centrar("cualquier reclamacion"));
  lines.push("");
  lines.push(centrar("--- GARANTIA ---"));
  lines.push(centrar("2 meses - No aplica:"));
  lines.push(centrar("pantalla, mojado, caida, destapado"));
  lines.push("");
  lines.push("");
  lines.push("");

  return lines.join("\n");
}

// GET /api/imprimir/impresoras — lista impresoras disponibles en el sistema
router.get("/impresoras", (req, res) => {
  const isWindows = os.platform() === "win32";
  const cmd = isWindows
    ? `powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"`
    : `lpstat -a | awk '{print $1}'`;

  exec(cmd, (err, stdout) => {
    if (err) {
      return res.json({ success: true, impresoras: [] });
    }
    const impresoras = stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    res.json({ success: true, impresoras });
  });
});

// POST /api/imprimir
router.post("/", (req, res) => {
  const { factura, config, impresora } = req.body;

  if (!factura) {
    return res.status(400).json({ success: false, message: "Datos de factura requeridos" });
  }

  const nombreImpresora = /^[\w\s\-\.()\u00C0-\u024F]+$/.test(impresora || "") ? impresora : "Termica";
  const texto = generarTextoRecibo({ factura, config: config || {} });
  const tmpFile = path.join(os.tmpdir(), `recibo_${Date.now()}.txt`);

  fs.writeFile(tmpFile, texto, (writeErr) => {
    if (writeErr) {
      return res.status(500).json({ success: false, message: "Error al crear archivo temporal" });
    }

    const isWindows = os.platform() === "win32";
    const cmd = isWindows
      ? `powershell -NoProfile -Command "Get-Content -Raw '${tmpFile.replace(/'/g, "''")}' | Out-Printer -Name '${nombreImpresora.replace(/'/g, "''")}'"`
      : `lp -d "${nombreImpresora}" -o raw "${tmpFile}"`;

    exec(cmd, (err, stdout, stderr) => {
      fs.unlink(tmpFile, () => {});

      if (err) {
        return res.status(500).json({
          success: false,
          message: stderr || err.message || "Error al imprimir",
        });
      }

      res.json({ success: true, message: "Impresion enviada a " + nombreImpresora });
    });
  });
});

module.exports = router;
