// Se invoca automáticamente después de procesar una venta exitosa

const FacturaImpresion = {
  // ==================== MOSTRAR MODAL DE FACTURA ====================

  mostrarFactura(data) {
    // Cerrar cualquier modal anterior
    const modalExistente = document.getElementById("modalFacturaImpresion");
    if (modalExistente) modalExistente.remove();

    // Detectar si es venta o factura y normalizar datos
    const factura = this.normalizarDatos(data);

    // Obtener configuración del negocio desde el global cargado al inicio
    const cfg = window.configuracion || {};
    const config = {
      nombre: cfg.nombre_negocio || "FIFTY TECH SRL",
      rnc: cfg.rnc || "",
      direccion: cfg.direccion || "",
      telefono: cfg.telefono || "",
      email: cfg.email || "",
      nombre_impresora: cfg.nombre_impresora || "",
    };

    // Guardar datos actuales para impresión térmica
    this._factura = factura;
    this._config = config;

    // Construir HTML de la factura
    const modal = document.createElement("div");
    modal.id = "modalFacturaImpresion";
    modal.className = "js-overlay";

    modal.innerHTML = `
  <div class="js-modal" style="max-width:700px;">

  <!-- BOTONES DE ACCIÓN (fuera de print) -->
  <div class="no-print factura-action-bar">
  <span style="color:white;font-size:16px;font-weight:bold;"> Factura / Recibo</span>
  <div style="display:flex;gap:10px;">
  <button type="button" onclick="FacturaImpresion.imprimirTermica()" style="background:#8e44ad;color:white;border:none;padding:8px 18px;border-radius:5px;cursor:pointer;font-size:14px;font-weight:bold;">🖨️ Térmica</button>
  <button type="button" onclick="FacturaImpresion.imprimir()" style="background:#27ae60;color:white;border:none;padding:8px 18px;border-radius:5px;cursor:pointer;font-size:14px;font-weight:bold;"> Imprimir</button>
  <button type="button" onclick="FacturaImpresion.descargarPDF()" style="background:#3498db;color:white;border:none;padding:8px 18px;border-radius:5px;cursor:pointer;font-size:14px;font-weight:bold;"> PDF</button>
  <button type="button" onclick="FacturaImpresion.cerrar()" style="background:#e74c3c;color:white;border:none;padding:8px 18px;border-radius:5px;cursor:pointer;font-size:14px;font-weight:bold;"> Cerrar</button>
  </div>
  </div>

  <!-- FACTURA IMPRIMIBLE -->
  <div id="contenidoFactura" style="padding:30px;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #2c3e50;">
  <div>
  <img src="/images/Logotipo.webp" alt="Logo" style="height:64px;width:auto;margin-bottom:6px;display:block;" />
  <h1 style="margin:0;font-size:28px;color:#2c3e50;">${config.nombre}</h1>
  <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">${config.direccion}</p>
  <p style="margin:3px 0;color:#7f8c8d;font-size:13px;"> ${config.telefono}</p>
  <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">RNC: ${config.rnc}</p>
  </div>
  <div style="text-align:right;">
  <div style="background:${factura.esFacturaElectronica ? "#27ae60" : "#3498db"};color:white;padding:5px 15px;border-radius:20px;font-size:13px;font-weight:bold;display:inline-block;">
  ${factura.esFacturaElectronica ? " FACTURA ELECTRÓNICA" : " RECIBO"}
  </div>
  <p style="margin:8px 0 3px 0;font-size:22px;font-weight:bold;color:#2c3e50;">${factura.numeroDocumento}</p>
  <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">Fecha: ${this.formatFecha(factura.fecha)}</p>
  <p style="margin:3px 0;color:#7f8c8d;font-size:13px;">Hora: ${factura.hora || "N/A"}</p>
  </div>
  </div>


  <!-- DATOS DEL CLIENTE -->
  <div style="background:#f8f9fa;border-radius:8px;padding:12px 18px;margin-bottom:18px;">
  <strong style="color:#2c3e50;font-size:14px;"> Cliente:</strong>
  <span style="color:#2c3e50;font-size:14px;margin-left:10px;">${factura.cliente_nombre || "Cliente General"}</span>
  ${factura.cliente_cedula ? `<span style="color:#7f8c8d;font-size:12px;margin-left:15px;">Cédula: ${factura.cliente_cedula}</span>` : ""}
  ${factura.cliente_rnc ? `<span style="color:#7f8c8d;font-size:12px;margin-left:15px;">RNC: ${factura.cliente_rnc}</span>` : ""}
  </div>

  <!-- TABLA DE PRODUCTOS -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
  <thead>
  <tr style="background:#2c3e50;color:white;">
  <th style="padding:10px;text-align:left;font-size:13px;">#</th>
  <th style="padding:10px;text-align:left;font-size:13px;">Producto</th>
  <th style="padding:10px;text-align:left;font-size:13px;">Código</th>
  <th style="padding:10px;text-align:center;font-size:13px;">Cantidad</th>
  <th style="padding:10px;text-align:right;font-size:13px;">Precio Unit.</th>
  <th style="padding:10px;text-align:right;font-size:13px;">Subtotal</th>
  </tr>
  </thead>
  <tbody>
  ${(factura.items || [])
        .map(
          (item, i) => `
  <tr style="border-bottom:1px solid #ecf0f1;background:${i % 2 === 0 ? "white" : "#f8f9fa"};">
  <td style="padding:10px;font-size:13px;color:#7f8c8d;">${i + 1}</td>
  <td style="padding:10px;font-size:13px;font-weight:500;">${item.nombre_producto}</td>
  <td style="padding:10px;font-size:12px;color:#7f8c8d;">${item.codigo_producto || ""}</td>
  <td style="padding:10px;text-align:center;font-size:13px;">${item.cantidad}</td>
  <td style="padding:10px;text-align:right;font-size:13px;">${this.formatCurrency(item.precio_unitario)}</td>
  <td style="padding:10px;text-align:right;font-size:13px;font-weight:600;color:#27ae60;">${this.formatCurrency(item.subtotal)}</td>
  </tr>
  `,
        )
        .join("")}
  </tbody>
  </table>

  <!-- SERVICIOS (si existen) -->
  ${factura.servicios && factura.servicios.length > 0
        ? `
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;margin-top:15px;">
  <thead>
  <tr style="background:#8e44ad;color:white;">
  <th style="padding:8px;text-align:left;font-size:12px;" colspan="4"> SERVICIOS ADICIONALES</th>
  </tr>
  <tr style="background:#9b59b6;color:white;">
  <th style="padding:8px;text-align:left;font-size:12px;">#</th>
  <th style="padding:8px;text-align:left;font-size:12px;">Servicio</th>
  <th style="padding:8px;text-align:center;font-size:12px;">Estado</th>
  <th style="padding:8px;text-align:right;font-size:12px;">Precio</th>
  </tr>
  </thead>
  <tbody>
  ${factura.servicios
          .map(
            (s, i) => `
  <tr style="border-bottom:1px solid #ecf0f1;">
  <td style="padding:8px;font-size:12px;color:#7f8c8d;">${i + 1}</td>
  <td style="padding:8px;font-size:12px;">${s.nombre_servicio}</td>
  <td style="padding:8px;text-align:center;font-size:12px;">
  <span style="background:${s.es_gratuito ? "#27ae60" : "#f39c12"};color:white;padding:2px 10px;border-radius:12px;font-size:11px;">
  ${s.es_gratuito ? " GRATIS" : " Pagado"}
  </span>
  </td>
  <td style="padding:8px;text-align:right;font-size:12px;font-weight:600;color:${s.es_gratuito ? "#27ae60" : "#2c3e50"};">
  ${s.es_gratuito ? "RD$0.00" : this.formatCurrency(s.precio)}
  </td>
  </tr>
  `,
          )
          .join("")}
  </tbody>
  </table>
  `
        : ""
      }

  <!-- TOTALES -->
  <div style="margin-top:15px;border-top:2px solid #ecf0f1;padding-top:10px;">
  <div style="display:flex;justify-content:flex-end;">
  <table style="width:320px;border-collapse:collapse;">
  <tr style="border-bottom:1px solid #ecf0f1;">
  <td style="padding:8px 10px;color:#7f8c8d;font-size:14px;">Subtotal:</td>
  <td style="padding:8px 10px;text-align:right;font-size:14px;">${this.formatCurrency(factura.subtotal)}</td>
  </tr>
  ${factura.descuento && parseFloat(factura.descuento) > 0
        ? `
  <tr style="border-bottom:1px solid #ecf0f1;">
  <td style="padding:8px 10px;color:#e74c3c;font-size:14px;">Descuento:</td>
  <td style="padding:8px 10px;text-align:right;font-size:14px;color:#e74c3c;">-${this.formatCurrency(factura.descuento)}</td>
  </tr>`
        : ""
      }
  <tr style="border-bottom:1px solid #ecf0f1;">
  <td style="padding:8px 10px;color:#7f8c8d;font-size:14px;">ITBIS (18%):</td>
  <td style="padding:8px 10px;text-align:right;font-size:14px;">${this.formatCurrency(factura.itbis)}</td>
  </tr>
  <tr style="background:#2c3e50;">
  <td style="padding:12px 10px;color:white;font-size:18px;font-weight:bold;">${factura.total_devuelto > 0 ? "TOTAL BRUTO:" : "TOTAL:"}</td>
  <td style="padding:12px 10px;text-align:right;color:#27ae60;font-size:20px;font-weight:bold;">${this.formatCurrency(factura.total)}</td>
  </tr>
  ${factura.total_devuelto > 0 ? `
  <tr style="background:#c0392b;">
  <td style="padding:10px 10px;color:white;font-size:14px;font-weight:bold;">Monto Devuelto:</td>
  <td style="padding:10px 10px;text-align:right;color:#fff;font-size:16px;font-weight:bold;">-${this.formatCurrency(factura.total_devuelto)}</td>
  </tr>
  <tr style="background:#27ae60;">
  <td style="padding:12px 10px;color:white;font-size:18px;font-weight:bold;">TOTAL NETO:</td>
  <td style="padding:12px 10px;text-align:right;color:white;font-size:20px;font-weight:bold;">${this.formatCurrency(factura.total_neto)}</td>
  </tr>
  ` : ""}
  </table>
  </div>
  </div>

  <!-- DEVOLUCIONES (si existen) -->
  ${factura.devoluciones && factura.devoluciones.length > 0 ? `
  <div style="margin-top:20px;border:2px solid #c0392b;border-radius:8px;overflow:hidden;">
  <div style="background:#c0392b;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;">
  <strong style="color:white;font-size:14px;"> Devoluciones Registradas</strong>
  <span style="color:white;font-size:13px;">Total devuelto: ${this.formatCurrency(factura.total_devuelto)}</span>
  </div>
  ${factura.devoluciones.map((dev, idx) => `
  <div style="padding:12px 18px;${idx > 0 ? "border-top:1px solid #f5c6cb;" : ""}background:#fff5f5;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
  <div>
  <strong style="color:#c0392b;font-size:13px;">${dev.numero_devolucion}</strong>
  <span style="background:#c0392b;color:white;padding:2px 10px;border-radius:12px;font-size:11px;margin-left:8px;">${dev.tipo === "total" ? "Total" : "Parcial"}</span>
  </div>
  <span style="color:#7f8c8d;font-size:12px;">${this.formatFecha(dev.fecha)}</span>
  </div>
  ${dev.motivo ? `<p style="margin:0 0 8px 0;color:#7f8c8d;font-size:12px;font-style:italic;">"${dev.motivo}"</p>` : ""}
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
  <thead>
  <tr style="background:#f8d7da;">
  <th style="padding:6px 8px;text-align:left;color:#721c24;">Producto</th>
  <th style="padding:6px 8px;text-align:center;color:#721c24;">Cant. Devuelta</th>
  <th style="padding:6px 8px;text-align:right;color:#721c24;">Precio Unit.</th>
  <th style="padding:6px 8px;text-align:right;color:#721c24;">Total</th>
  </tr>
  </thead>
  <tbody>
  ${(dev.items || []).map(item => `
  <tr style="border-bottom:1px solid #f5c6cb;">
  <td style="padding:6px 8px;color:#2c3e50;">${item.nombre_producto}</td>
  <td style="padding:6px 8px;text-align:center;color:#2c3e50;">${item.cantidad_devuelta}</td>
  <td style="padding:6px 8px;text-align:right;color:#2c3e50;">${this.formatCurrency(item.precio_unitario)}</td>
  <td style="padding:6px 8px;text-align:right;font-weight:600;color:#c0392b;">${this.formatCurrency(item.total)}</td>
  </tr>
  `).join("")}
  </tbody>
  </table>
  <div style="text-align:right;padding:6px 0 0 0;">
  <strong style="color:#c0392b;font-size:13px;">Subtotal devuelto: ${this.formatCurrency(dev.monto_devuelto)}</strong>
  </div>
  </div>
  `).join("")}
  </div>
  ` : ""}

  <!-- DETALLE DE PAGO -->
  <div style="margin-top:20px;background:#f0faf5;border:1px solid #27ae60;border-radius:8px;padding:15px 18px;">
  <strong style="color:#27ae60;font-size:14px;"> Método de Pago: ${this.formatMetodoPago(factura.metodo_pago)}</strong>
  <div style="margin-top:8px;display:flex;gap:30px;flex-wrap:wrap;">
  ${factura.metodo_pago === "efectivo" ||
        factura.metodo_pago === "mixto"
        ? `
  <div><span style="color:#7f8c8d;font-size:13px;">Monto Recibido:</span> <strong style="font-size:14px;">${this.formatCurrency(factura.monto_recibido || factura.total)}</strong></div>
  <div><span style="color:#7f8c8d;font-size:13px;">Cambio:</span> <strong style="font-size:14px;color:#27ae60;">${this.formatCurrency(factura.cambio || 0)}</strong></div>
  `
        : ""
      }
  ${factura.metodo_pago === "tarjeta" ||
        factura.metodo_pago === "transferencia"
        ? `
  ${factura.banco ? `<div><span style="color:#7f8c8d;font-size:13px;">Banco:</span> <strong style="font-size:14px;">${factura.banco}</strong></div>` : ""}
  ${factura.referencia ? `<div><span style="color:#7f8c8d;font-size:13px;">Referencia:</span> <strong style="font-size:14px;">${factura.referencia}</strong></div>` : ""}
  `
        : ""
      }
  </div>
  </div>

  <!-- ESTADO -->
  <div style="margin-top:15px;text-align:center;">
  <span style="background:${factura.total_devuelto > 0 ? "#e67e22" : "#27ae60"};color:white;padding:5px 20px;border-radius:20px;font-size:14px;font-weight:bold;">
  ${factura.total_devuelto > 0 ? "CON DEVOLUCIONES" : (factura.estado_texto || "VENTA COMPLETADA")}
  </span>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:25px;padding-top:15px;border-top:1px dashed #bdc3c7;text-align:center;">
  <p style="margin:3px 0;color:#7f8c8d;font-size:12px;">Gracias por su compra en ${config.nombre}</p>
  <p style="margin:3px 0;color:#7f8c8d;font-size:11px;">Este recibo es válido como comprobante de compra</p>
  <p style="margin:3px 0;color:#7f8c8d;font-size:11px;">No se aceptan devoluciones sin este recibo</p>
  <p style="margin:8px 0 3px;color:#2c3e50;font-size:11px;font-weight:bold;">GARANTÍA</p>
  <p style="margin:2px 0;color:#7f8c8d;font-size:10px;">✓ 2 meses de garantía en todos los equipos</p>
  <p style="margin:2px 0;color:#7f8c8d;font-size:10px;">✗ No aplica: pantalla, mojado, caída, destapado</p>
  </div>
  </div>
  </div>
  `;

    document.body.appendChild(modal);
  },

  // ==================== NORMALIZAR DATOS ====================
  // Detecta si vienen datos de venta o factura y los normaliza
  normalizarDatos(data) {
    // Si tiene numero_factura es una factura, si tiene numero_ticket es una venta
    const esFactura = data.numero_factura != null;

    return {
      // Número de documento
      numeroDocumento: esFactura
        ? `#${data.numero_factura}`
        : `#${data.numero_ticket || "N/A"}`,

      // NCF
      ncf: data.ncf || null,
      tipo_comprobante: data.tipo_comprobante || "B02",

      // Flags
      esFacturaElectronica: data.generar_factura_electronica || esFactura,

      // Fechas
      fecha: data.fecha,
      hora: String(data.hora || new Date().toTimeString().split(" ")[0]).substring(0, 8),

      // Cliente
      cliente_nombre: data.cliente_nombre || "Cliente General",
      cliente_cedula: data.cliente_cedula || null,
      cliente_rnc: data.cliente_rnc || null,

      // Totales - asegurar que sean números
      subtotal: parseFloat(data.subtotal || 0),
      descuento: parseFloat(data.descuento || 0),
      itbis: parseFloat(data.itbis || 0),
      total: parseFloat(data.total || 0),

      // Pago
      metodo_pago: data.metodo_pago || "efectivo",
      monto_recibido: parseFloat(data.monto_recibido || 0),
      cambio: parseFloat(data.cambio || 0),
      banco: data.banco || null,
      referencia: data.referencia || null,

      // Items
      items: data.items || [],
      servicios: data.servicios || [],

      // Devoluciones
      devoluciones: data.devoluciones || [],
      total_devuelto: parseFloat(data.total_devuelto || 0),
      total_neto: parseFloat(data.total || 0) - parseFloat(data.total_devuelto || 0),

      // Estado
      estado_texto: esFactura
        ? data.estado === "pagada"
          ? "FACTURA PAGADA"
          : "FACTURA PENDIENTE"
        : "VENTA COMPLETADA",
    };
  },

  // ==================== IMPRIMIR ====================
  imprimir() {
    const contenido = document.getElementById("contenidoFactura");
    if (!contenido) return;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Factura</title>
<style>
  @page { size: auto; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; font-size: 13px; }
  .no-print { display: none !important; }
  table { border-collapse: collapse; }
</style></head>
<body>${contenido.innerHTML}</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  },

  // ==================== IMPRIMIR TÉRMICA (80mm) ====================
  imprimirTermica() {
    const factura = this._factura;
    const config = this._config;
    if (!factura) return;

    fetch("/api/imprimir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factura, config, impresora: config?.nombre_impresora || "Termica" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          window.Toast?.success("Imprimiendo recibo...");
        } else {
          window.Toast?.error("Error al imprimir: " + data.message);
        }
      })
      .catch(() => window.Toast?.error("No se pudo conectar con la impresora"));
  },

  // ==================== DESCARGAR PDF ====================
  async descargarPDF() {
    // Usar window.print() con CSS para simular PDF
    // Para un PDF real necesitarías jsPDF, pero esto funciona con "Guardar como PDF" del navegador
    this.imprimir();
  },

  // ==================== CERRAR ====================
  cerrar() {
    const modal = document.getElementById("modalFacturaImpresion");
    if (modal) modal.remove();
  },

  // ==================== UTILIDADES ====================
  formatCurrency(amount) {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(amount);
  },

  formatFecha(fecha) {
    if (!fecha) return "N/A";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },

  formatMetodoPago(metodo) {
    const metodos = {
      efectivo: " Efectivo",
      tarjeta: " Tarjeta",
      transferencia: " Transferencia",
      mixto: " Mixto",
    };
    return metodos[metodo] || metodo;
  },
};

window.FacturaImpresion = FacturaImpresion;
