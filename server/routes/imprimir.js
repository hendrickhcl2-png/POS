const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const LOGO_PATH = path.join(__dirname, "../../public/images/Logotipo.webp");

// Caché del logo ya procesado (se genera una sola vez)
let _logoBytes = null;

async function obtenerBytesLogo() {
  if (_logoBytes !== null) return _logoBytes;

  try {
    const sharp = require("sharp");
    if (!fs.existsSync(LOGO_PATH)) {
      _logoBytes = Buffer.alloc(0);
      return _logoBytes;
    }

    // Redimensionar: máx 384px ancho, máx 120px alto, sin upscale
    const { data, info } = await sharp(LOGO_PATH)
      .resize(384, 120, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const bytesPerRow = Math.ceil(width / 8);

    // Convertir píxeles grises a bitmap 1-bit (umbral en 180)
    const bitmap = Buffer.alloc(bytesPerRow * height, 0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[y * width + x] < 180) {
          const byteIdx = y * bytesPerRow + Math.floor(x / 8);
          bitmap[byteIdx] |= 1 << (7 - (x % 8));
        }
      }
    }

    // ESC/POS: centrar → GS v 0 (imagen raster) → restaurar alineación izquierda
    const xL = bytesPerRow & 0xff;
    const xH = (bytesPerRow >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    _logoBytes = Buffer.concat([
      Buffer.from([0x1b, 0x61, 0x01]),                      // ESC a 1: centrar
      Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]), // GS v 0: raster
      bitmap,
      Buffer.from([0x0a]),                                   // avance de línea
      Buffer.from([0x1b, 0x61, 0x00]),                       // ESC a 0: izquierda
    ]);
  } catch {
    _logoBytes = Buffer.alloc(0);
  }

  return _logoBytes;
}

const ANCHO = 42; // caracteres por línea en 80mm (raw mode, fuente fija de la impresora)

function linea(char = "-") {
  return char.repeat(ANCHO);
}

function centrar(texto) {
  const t = String(texto).substring(0, ANCHO);
  const pad = Math.max(0, Math.floor((ANCHO - t.length) / 2));
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

  lines.push(linea("-"));

  // Cliente
  lines.push("Cliente: " + (factura.cliente_nombre || "Cliente General"));
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
  if (factura.banco)      lines.push("Banco: " + factura.banco);
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

  // Usar \r\n en Windows para que la impresora térmica avance correctamente
  const sep = os.platform() === "win32" ? "\r\n" : "\n";
  return lines.join(sep);
}

// Impresión raw en Windows vía Windows Spooler API (bypasa GDI, fuente fija de la impresora)
function imprimirRawWindows(txtFile, printerName, callback) {
  const safePrinter = printerName.replace(/'/g, "''");
  const safeFile = txtFile.replace(/'/g, "''");

  const psContent = `Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", CharSet=CharSet.Ansi)] public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
    [DllImport("winspool.Drv")] public static extern bool ClosePrinter(IntPtr h);
    [DllImport("winspool.Drv")] public static extern bool StartDocPrinter(IntPtr h, int l, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv")] public static extern bool EndDocPrinter(IntPtr h);
    [DllImport("winspool.Drv")] public static extern bool StartPagePrinter(IntPtr h);
    [DllImport("winspool.Drv")] public static extern bool EndPagePrinter(IntPtr h);
    [DllImport("winspool.Drv")] public static extern bool WritePrinter(IntPtr h, IntPtr b, int c, out int w);
    public static bool Print(string printer, string file) {
        byte[] bytes = File.ReadAllBytes(file);
        IntPtr hP;
        DOCINFOA di = new DOCINFOA { pDocName = "Recibo", pDataType = "RAW" };
        if (!OpenPrinter(printer, out hP, IntPtr.Zero)) return false;
        if (StartDocPrinter(hP, 1, di)) {
            StartPagePrinter(hP);
            IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, p, bytes.Length);
            int w; WritePrinter(hP, p, bytes.Length, out w);
            Marshal.FreeCoTaskMem(p);
            EndPagePrinter(hP);
            EndDocPrinter(hP);
        }
        ClosePrinter(hP);
        return true;
    }
}
'@ -Language CSharp
[RawPrint]::Print('${safePrinter}', '${safeFile}')
`;

  const psFile = path.join(os.tmpdir(), `rawprint_${Date.now()}.ps1`);
  fs.writeFile(psFile, psContent, "utf8", (writeErr) => {
    if (writeErr) return callback(writeErr);
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`,
      (err, stdout, stderr) => {
        fs.unlink(psFile, () => {});
        callback(err, stdout, stderr);
      }
    );
  });
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
router.post("/", async (req, res) => {
  const { factura, config, impresora } = req.body;

  if (!factura) {
    return res.status(400).json({ success: false, message: "Datos de factura requeridos" });
  }

  const nombreImpresora = /^[\w\s\-\.()\u00C0-\u024F]+$/.test(impresora || "") ? impresora : "Termica";
  const texto = generarTextoRecibo({ factura, config: config || {} });
  const tmpFile = path.join(os.tmpdir(), `recibo_${Date.now()}.txt`);

  const logoBytes = await obtenerBytesLogo();
  const textBytes = Buffer.from(texto, "utf8");
  const contenido = logoBytes.length > 0 ? Buffer.concat([logoBytes, textBytes]) : textBytes;

  fs.writeFile(tmpFile, contenido, (writeErr) => {
    if (writeErr) {
      return res.status(500).json({ success: false, message: "Error al crear archivo temporal" });
    }

    const isWindows = os.platform() === "win32";

    const done = (err, stdout, stderr) => {
      fs.unlink(tmpFile, () => {});
      if (err) {
        return res.status(500).json({
          success: false,
          message: stderr || err.message || "Error al imprimir",
        });
      }
      res.json({ success: true, message: "Impresion enviada a " + nombreImpresora });
    };

    if (isWindows) {
      imprimirRawWindows(tmpFile, nombreImpresora, done);
    } else {
      exec(`lp -d "${nombreImpresora}" -o raw "${tmpFile}"`, done);
    }
  });
});

module.exports = router;
