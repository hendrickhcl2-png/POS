const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const LOGO_PATH = path.join(__dirname, "../../public/images/Logotipo.png");
let _logoBytes = null; // caché: se procesa solo una vez

async function obtenerBytesLogo() {
  if (_logoBytes !== null) return _logoBytes;

  try {
    const sharp = require("sharp");
    if (!fs.existsSync(LOGO_PATH)) { _logoBytes = Buffer.alloc(0); return _logoBytes; }

    const { data, info } = await sharp(LOGO_PATH)
      .resize(384, 100, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const bytesPerRow = Math.ceil(width / 8);
    const bitmap = Buffer.alloc(bytesPerRow * height, 0);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Imprimir si NO es fondo blanco/casi-blanco (umbral 240)
        if (!(r > 240 && g > 240 && b > 240)) {
          const byteIdx = y * bytesPerRow + Math.floor(x / 8);
          bitmap[byteIdx] |= 1 << (7 - (x % 8));
        }
      }
    }

    const xL = bytesPerRow & 0xff;
    const xH = (bytesPerRow >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    _logoBytes = Buffer.concat([
      Buffer.from([0x1b, 0x61, 0x01]),                         // ESC a 1: centrar
      Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),  // GS v 0: raster bitmap
      bitmap,
      Buffer.from([0x0a]),                                      // avance de línea
      Buffer.from([0x1b, 0x61, 0x00]),                         // ESC a 0: izquierda
    ]);
  } catch {
    _logoBytes = Buffer.alloc(0);
  }
  return _logoBytes;
}

const ANCHO = 47; // caracteres por línea en 80mm (raw mode, fuente fija de la impresora)

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

function derecha(texto) {
  const t = String(texto);
  return " ".repeat(Math.max(0, ANCHO - t.length)) + t;
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
  if (config.telefono) lines.push(centrar("Tel: " + config.telefono));
  if (config.rnc) lines.push(centrar("RNC: " + config.rnc));
  lines.push(linea("="));

  // Número de documento y fecha
  const tipoDoc = factura.esFacturaElectronica ? "FACTURA" : "RECIBO";
  lines.push(centrar(`${tipoDoc} ${factura.numeroDocumento || ""}`));
  lines.push(centrar(`${fmtFecha(factura.fecha)}  ${fmtHora(factura.hora)}`));


  // Cliente
  lines.push("Cliente: " + (factura.cliente_nombre || "Cliente General"));
  if (factura.cliente_cedula) lines.push("Cedula:  " + factura.cliente_cedula);
  if (factura.cliente_rnc) lines.push("RNC:     " + factura.cliente_rnc);
  if (factura.vendedor_nombre) lines.push("Vendedor: " + factura.vendedor_nombre);

  lines.push("");
  // Productos
  const tieneItems = factura.items && factura.items.length > 0;
  if (tieneItems) {
    lines.push("PRODUCTOS:");
    factura.items.forEach((item) => {
      const nombre = String(item.nombre_producto).substring(0, ANCHO);
      lines.push(nombre);
      if (item.imei) lines.push("  IMEI: " + item.imei);
      lines.push(columnas(`  ${item.cantidad} x ${fmt(item.precio_unitario)}`, fmt(item.subtotal)));
    });
  }

  lines.push("");
  // Servicios
  if (factura.servicios && factura.servicios.length > 0) {
    if (tieneItems) lines.push(linea("-"));
    lines.push("SERVICIOS:");
    factura.servicios.forEach((s) => {
      lines.push(columnas(String(s.nombre_servicio).substring(0, ANCHO - 8), s.es_gratuito ? "GRATIS" : fmt(s.precio)));
    });
  }

  lines.push("");
  // Totales
  lines.push(derecha("Subtotal: " + fmt(factura.subtotal)));
  if (factura.descuento > 0) {
    lines.push(derecha("Descuento: -" + fmt(factura.descuento)));
  }
  if (factura.itbis > 0) {
    lines.push(derecha("ITBIS (18%): " + fmt(factura.itbis)));
  }
  lines.push("");
  const labelTotal = factura.total_devuelto > 0 ? "TOTAL BRUTO: " : "TOTAL: ";
  lines.push(derecha(labelTotal + fmt(factura.total)));
  lines.push("");
  if (factura.total_devuelto > 0) {
    lines.push(derecha("Monto devuelto: -" + fmt(factura.total_devuelto)));
    lines.push(derecha("TOTAL NETO: " + fmt(factura.total_neto)));
  }

  // Pago
  const metodosMap = {
    efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia",
    cheque: "Cheque", credito: "Credito", mixto: "Mixto",
  };
  lines.push(derecha("Pago: " + (metodosMap[factura.metodo_pago] || factura.metodo_pago || "")));
  if (factura.metodo_pago === "efectivo") {
    lines.push(derecha("Recibido: " + fmt(factura.monto_recibido || factura.total)));
    lines.push(derecha("Cambio: " + fmt(factura.cambio || 0)));
  }
  if (factura.metodo_pago === "mixto") {
    if (parseFloat(factura.monto_efectivo) > 0) lines.push(derecha("Efectivo: " + fmt(factura.monto_efectivo)));
    if (parseFloat(factura.monto_tarjeta) > 0) lines.push(derecha("Tarjeta: " + fmt(factura.monto_tarjeta)));
    if (parseFloat(factura.monto_transferencia) > 0) lines.push(derecha("Transferencia: " + fmt(factura.monto_transferencia)));
    if (parseFloat(factura.cambio) > 0) lines.push(derecha("Cambio: " + fmt(factura.cambio)));
  }
  if (factura.banco) lines.push(derecha("Banco: " + factura.banco));
  if (factura.referencia) lines.push(derecha("Ref: " + factura.referencia));

  lines.push(linea("-"));
  // Estado y pie
  if (factura.total_devuelto > 0) {
    lines.push(centrar("*** CON DEVOLUCIONES ***"));
  }
  lines.push("");
  lines.push(centrar("Gracias por su compra en"));
  lines.push(centrar("FIFTY TECH SRL"));
  lines.push("");
  lines.push(centrar("2 MESES DE GARANTIA"));
  lines.push(centrar("NO APLICA: "));
  lines.push(centrar("PANTALLA"));
  lines.push(centrar("MOJADO"));
  lines.push(centrar("CAIDA"));
  lines.push(centrar("DESTAPADO"));
  lines.push(centrar("Conserve este recibo para"));
  lines.push(centrar("cualquier reclamacion"));
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
        fs.unlink(psFile, () => { });
        callback(err, stdout, stderr);
      }
    );
  });
}

function generarTextoCuadre(c) {
  const lines = [];
  const config = c.config || {};

  const fmtFecha = (f) => {
    if (!f) return "";
    const d = new Date(f + "T12:00:00");
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Encabezado
  lines.push(centrar(config.nombre_negocio || "FITY TECH"));
  if (config.direccion) lines.push(centrar(config.direccion));
  if (config.telefono) lines.push(centrar(config.telefono));
  lines.push(centrar("CORTE DE TURNO"));
  lines.push(centrar("TURNO #" + (c.turno || "")));
  lines.push(linea("-"));
  lines.push(columnas("REALIZADO:", fmtFecha(c.fecha)));
  lines.push(columnas("CAJERO:", (c.cajero || "").toUpperCase()));
  lines.push(columnas("VENTAS TOTALES:", fmt((c.ventas_neto || 0) + (c.total_ventas_credito || 0))));
  lines.push(columnas("GANANCIA:", fmt(c.ganancia)));
  lines.push(columnas((c.cantidad_ventas + (c.cantidad_ventas_credito || 0)) + " VENTAS EN EL TURNO.", ""));
  lines.push(linea("-"));

  // Dinero en caja
  lines.push(centrar("== DINERO EN CAJA =="));
  lines.push(columnas("FONDO DE CAJA:", fmt(c.fondo_caja)));
  lines.push(columnas("VENTAS EN EFECTIVO:", "+ " + fmt(c.ventas_efectivo)));
  lines.push(columnas("ABONOS EN EFECTIVO:", "+ " + fmt(c.pagos_efectivo)));
  lines.push(columnas("SALIDAS:", "- " + fmt(c.salidas_efectivo)));
  lines.push(columnas("DEV. EN EFECTIVO:", "- " + fmt(c.dev_efectivo)));
  lines.push(linea("-"));
  lines.push(columnas("EFECTIVO EN CAJA", "= " + fmt(c.efectivo_en_caja)));
  lines.push(linea("-"));

  // Salidas
  lines.push(centrar("== SALIDAS EFECTIVO =="));
  (c.salidas || []).forEach((s) => {
    lines.push(columnas(
      String(s.concepto || s.descripcion || "Salida").substring(0, ANCHO - 10),
      fmt(s.monto)
    ));
  });
  lines.push(columnas("TOTAL SALIDAS", "= " + fmt(c.total_salidas)));
  lines.push(linea("-"));

  // Ventas
  lines.push(centrar("== VENTAS =="));
  lines.push(columnas("EN EFECTIVO:", fmt(c.ventas_efectivo)));
  lines.push(columnas("CON TARJETA:", fmt(c.ventas_tarjeta)));
  lines.push(columnas("A CREDITO:", fmt(c.total_ventas_credito)));
  lines.push(columnas("TRANSFERENCIA:", fmt(c.ventas_transferencia)));
  lines.push(columnas("CHEQUE:", fmt(c.ventas_cheque)));
  lines.push(columnas("DEV. DE VENTAS:", "- " + fmt(c.devoluciones_total)));
  lines.push(linea("-"));
  lines.push(columnas("TOTAL VENTAS", "= " + fmt((c.ventas_neto || 0) + (c.total_ventas_credito || 0))));
  lines.push(linea("-"));

  // Ventas por depto
  if ((c.por_categoria || []).length > 0) {
    lines.push(centrar("== VENTAS POR DEPTO =="));
    (c.por_categoria || []).forEach((cat) => {
      lines.push(columnas(
        String(cat.categoria).toUpperCase().substring(0, ANCHO - 10),
        fmt(cat.total)
      ));
    });
    lines.push(linea("-"));
  }

  // Ingresos contado
  lines.push(centrar("== INGRESOS CONTADO =="));
  lines.push(columnas("VENTAS EFECTIVO:", fmt(c.ventas_efectivo)));
  lines.push(columnas("PAGOS CLIENTES:", fmt(c.pagos_clientes)));
  lines.push(columnas("VENTAS TRANSFERENCIA:", fmt(c.ventas_transferencia)));
  lines.push(columnas("DEV. EFECTIVO:", "- " + fmt(c.dev_efectivo)));
  lines.push(columnas("DEV. TRANSFERENCIA:", "- " + fmt(c.dev_transferencia)));
  lines.push(linea("-"));
  lines.push(columnas("TOTAL INGRESOS", "= " + fmt(c.total_ingresos)));
  lines.push(linea("-"));

  // Pagos de crédito
  if ((c.pagos_credito || []).length > 0) {
    lines.push(centrar("== PAGOS DE CREDITOS =="));
    (c.pagos_credito || []).forEach((p) => {
      const metodo = p.metodo_pago === "transferencia" ? "TRA" : (p.metodo_pago || "").substring(0, 3).toUpperCase();
      const nombre = String(p.cliente_nombre || "—").substring(0, ANCHO - 12);
      lines.push(columnas(`${nombre} (${metodo})`, fmt(p.monto)));
    });
    lines.push(linea("-"));
  }

  // Devoluciones
  const devEf = c.devoluciones_efectivo || [];
  const devCr = c.devoluciones_credito || [];
  if (devEf.length > 0 || devCr.length > 0) {
    lines.push(centrar("== DEVOLUCIONES =="));

    if (devEf.length > 0) {
      lines.push(centrar("=== EN EFECTIVO ==="));
      devEf.forEach((d) => {
        const items = (d.items || []).map(i => i.nombre_producto).join(", ");
        const desc = items
          ? String(items).substring(0, ANCHO - 2)
          : `Dev ${d.numero_devolucion}`;
        const ticket = d.numero_ticket ? ` T#${d.numero_ticket}` : "";
        lines.push("() " + String(desc + ticket).substring(0, ANCHO - 4));
        lines.push(derecha(fmt(d.total)));
      });
    }

    if (devCr.length > 0) {
      lines.push(centrar("=== POR VENTAS A CREDITO ==="));
      devCr.forEach((d) => {
        const items = (d.items || []).map(i => i.nombre_producto).join(", ");
        const desc = items
          ? String(items).substring(0, ANCHO - 2)
          : `Dev ${d.numero_devolucion}`;
        const ticket = d.numero_ticket ? ` T#${d.numero_ticket}` : "";
        lines.push(String(desc + ticket).substring(0, ANCHO));
        lines.push(derecha(fmt(d.total)));
      });
    }
    lines.push(linea("-"));
  }

  lines.push("");
  lines.push("");
  lines.push("");

  const sep = os.platform() === "win32" ? "\r\n" : "\n";
  return lines.join(sep);
}

function generarTextoEstadoCuenta(data) {
  const { cliente, facturas, config, totalOriginal, totalPagado, totalPendiente } = data;
  const lines = [];
  const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ""}`.trim();

  // Header
  lines.push(centrar(config.nombre || "FIFTY TECH SRL"));
  if (config.direccion) lines.push(centrar(config.direccion));
  if (config.telefono) lines.push(centrar("Tel: " + config.telefono));
  if (config.rnc) lines.push(centrar("RNC: " + config.rnc));
  lines.push(linea("="));
  lines.push(centrar("ESTADO DE CUENTA"));
  lines.push(centrar(fmtFecha(new Date().toISOString())));
  lines.push(linea("="));

  // Client info
  lines.push("Cliente: " + nombreCompleto);
  if (cliente.cedula) lines.push("Cedula:  " + cliente.cedula);
  if (cliente.rnc) lines.push("RNC:     " + cliente.rnc);
  if (cliente.telefono) lines.push("Tel:     " + cliente.telefono);
  lines.push("");

  // Summary
  lines.push(columnas("Monto original:", fmt(totalOriginal)));
  lines.push(columnas("Total pagado:", fmt(totalPagado)));
  lines.push(columnas("SALDO PENDIENTE:", fmt(totalPendiente)));
  lines.push(linea("="));

  // Invoices
  lines.push("");
  lines.push(centrar("== FACTURAS =="));
  lines.push(linea("-"));

  facturas.forEach(f => {
    const estadoLabel = f.estado === 'pagada' ? 'PAG' : f.estado === 'parcial' ? 'PAR' : 'PEN';
    lines.push(columnas(f.numero_factura + " [" + estadoLabel + "]", fmtFecha(f.fecha)));
    lines.push(columnas("  Original: " + fmt(f.total), "Pend: " + fmt(f.saldo_pendiente)));

    // Payments for this invoice
    if (f.pagos && f.pagos.length > 0) {
      f.pagos.forEach(p => {
        const metodo = (p.metodo_pago || "").substring(0, 4).toUpperCase();
        lines.push(columnas("    " + fmtFecha(p.fecha) + " " + metodo, "+" + fmt(p.monto)));
        if (p.referencia || p.banco) {
          lines.push("      Ref: " + (p.referencia || "") + (p.banco ? " (" + p.banco + ")" : ""));
        }
      });
    }
    lines.push(linea("-"));
  });

  // All payments summary
  const allPagos = [];
  facturas.forEach(f => {
    (f.pagos || []).forEach(p => {
      allPagos.push({ ...p, numero_factura: f.numero_factura });
    });
  });
  allPagos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  if (allPagos.length > 0) {
    lines.push("");
    lines.push(centrar("== HISTORIAL DE PAGOS =="));
    lines.push(linea("-"));

    allPagos.forEach(p => {
      const metodo = (p.metodo_pago || "").substring(0, 4).toUpperCase();
      lines.push(columnas(fmtFecha(p.fecha) + " " + (p.numero_pago || ""), fmt(p.monto)));
      lines.push(columnas("  " + p.numero_factura + " " + metodo, p.referencia || p.banco || ""));
    });

    lines.push(linea("-"));
    lines.push(columnas("TOTAL PAGADO:", fmt(totalPagado)));
  }

  lines.push(linea("="));
  lines.push(columnas("SALDO PENDIENTE:", fmt(totalPendiente)));
  lines.push(linea("="));
  lines.push("");
  lines.push(centrar("Estado de cuenta generado el"));
  lines.push(centrar(fmtFecha(new Date().toISOString())));
  lines.push("");
  lines.push("");
  lines.push("");

  const sep = os.platform() === "win32" ? "\r\n" : "\n";
  return lines.join(sep);
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
      fs.unlink(tmpFile, () => { });
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

// POST /api/imprimir/estado-cuenta
router.post("/estado-cuenta", async (req, res) => {
  const { cliente, facturas, config, totalOriginal, totalPagado, totalPendiente, impresora } = req.body;

  if (!cliente || !facturas) {
    return res.status(400).json({ success: false, message: "Datos de estado de cuenta requeridos" });
  }

  const nombreImpresora = /^[\w\s\-\.()\u00C0-\u024F]+$/.test(impresora || "") ? impresora : "Termica";
  const texto = generarTextoEstadoCuenta({ cliente, facturas, config: config || {}, totalOriginal, totalPagado, totalPendiente });
  const tmpFile = path.join(os.tmpdir(), `edocuenta_${Date.now()}.txt`);
  const contenido = Buffer.from(texto, "utf8");

  fs.writeFile(tmpFile, contenido, (writeErr) => {
    if (writeErr) {
      return res.status(500).json({ success: false, message: "Error al crear archivo temporal" });
    }
    const isWindows = os.platform() === "win32";
    const done = (err, stdout, stderr) => {
      fs.unlink(tmpFile, () => {});
      if (err) {
        return res.status(500).json({ success: false, message: stderr || err.message || "Error al imprimir" });
      }
      res.json({ success: true, message: "Estado de cuenta enviado a " + nombreImpresora });
    };
    if (isWindows) imprimirRawWindows(tmpFile, nombreImpresora, done);
    else exec(`lp -d "${nombreImpresora}" -o raw "${tmpFile}"`, done);
  });
});

// POST /api/imprimir/cuadre
router.post("/cuadre", async (req, res) => {
  const { cuadre, impresora } = req.body;
  if (!cuadre) {
    return res.status(400).json({ success: false, message: "Datos de cuadre requeridos" });
  }

  const nombreImpresora = /^[\w\s\-\.()\u00C0-\u024F]+$/.test(impresora || "") ? impresora : "Termica";
  const texto = generarTextoCuadre(cuadre);
  const tmpFile = path.join(os.tmpdir(), `cuadre_${Date.now()}.txt`);
  const contenido = Buffer.from(texto, "utf8");

  fs.writeFile(tmpFile, contenido, (writeErr) => {
    if (writeErr) {
      return res.status(500).json({ success: false, message: "Error al crear archivo temporal" });
    }
    const isWindows = os.platform() === "win32";
    const done = (err, stdout, stderr) => {
      fs.unlink(tmpFile, () => {});
      if (err) {
        return res.status(500).json({ success: false, message: stderr || err.message || "Error al imprimir" });
      }
      res.json({ success: true, message: "Cuadre enviado a " + nombreImpresora });
    };
    if (isWindows) imprimirRawWindows(tmpFile, nombreImpresora, done);
    else exec(`lp -d "${nombreImpresora}" -o raw "${tmpFile}"`, done);
  });
});

module.exports = router;
