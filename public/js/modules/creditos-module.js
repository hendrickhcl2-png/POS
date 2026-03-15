// ==================== MÓDULO DE CRÉDITOS / CUENTAS POR COBRAR ====================

const CreditosModule = {
  _clientes: [],
  _initialized: false,
  _tabActivo: "pendientes",
  _pgPendientes: null,
  _pgPagados: null,

  // ==================== INIT ====================

  init() {
    if (!this._initialized) {
      this._initialized = true;
    }
    this.cargarClientes();
  },

  // ==================== TABS ====================

  switchTab(tab) {
    this._tabActivo = tab;

    const btnPendientes = document.getElementById("tabCuentasCobrar");
    const btnPagados = document.getElementById("tabHistorialPagados");
    const contentPendientes = document.getElementById("tabContentPendientes");
    const contentPagados = document.getElementById("tabContentPagados");
    const filtroCreditosWrapper = document.getElementById("filtroCreditos");

    if (tab === "pendientes") {
      btnPendientes?.classList.add("active");
      btnPagados?.classList.remove("active");
      contentPendientes?.classList.add("active");
      contentPagados?.classList.remove("active");
      if (filtroCreditosWrapper) filtroCreditosWrapper.style.display = "";
      this.cargarClientes();
    } else {
      btnPagados?.classList.add("active");
      btnPendientes?.classList.remove("active");
      contentPagados?.classList.add("active");
      contentPendientes?.classList.remove("active");
      if (filtroCreditosWrapper) filtroCreditosWrapper.style.display = "none";
      this.cargarHistorialPagados();
    }
  },

  actualizarTabActivo() {
    if (this._tabActivo === "pagados") {
      this.cargarHistorialPagados();
    } else {
      this.cargarClientes();
    }
  },

  // ==================== CARGAR HISTORIAL PAGADOS ====================

  async cargarHistorialPagados() {
    const tbody = document.getElementById("tablaHistorialPagados");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center tabla-vacia-mensaje">Cargando...</td></tr>`;

    try {
      const data = await API.Clientes.getCreditosPagados();
      this._renderStatsPagados(data);
      this._renderHistorialPagados(data);
    } catch (err) {
      console.error("Error cargando historial pagados:", err);
      tbody.innerHTML = `<tr><td colspan="6" class="text-center tabla-vacia-mensaje" style="color:var(--clr-danger);">Error al cargar los datos.</td></tr>`;
    }
  },

  _renderStatsPagados(pagados) {
    const container = document.getElementById("creditosPagadosStats");
    if (!container) return;

    const totalCobrado = pagados.reduce(
      (s, r) => s + parseFloat(r.monto_pagado || r.total || 0),
      0,
    );

    container.innerHTML = `
      <div class="stat-mini">
        <div class="stat-mini__label">Facturas saldadas</div>
        <div class="stat-mini__value">${pagados.length}</div>
      </div>
      <div class="stat-mini" style="flex:2;min-width:200px;">
        <div class="stat-mini__label">Total cobrado</div>
        <div class="stat-mini__value stat-mini__value--success">${this._fmt(totalCobrado)}</div>
      </div>`;
  },

  _renderHistorialPagados(pagados) {
    if (!this._pgPagados) this._pgPagados = new Paginator('tablaHistorialPagados', 20);
    this._pgPagados.render(
      (pagados || []).map(
        (r) => `
      <tr>
        <td>
          <strong>${r.nombre} ${r.apellido || ""}</strong>
          ${r.cedula ? `<br><small style="color:var(--clr-muted);">${r.cedula}</small>` : ""}
        </td>
        <td>${r.telefono || "—"}</td>
        <td style="font-size:13px;color:var(--clr-muted);">${r.numero_factura}</td>
        <td style="text-align:right;font-weight:700;color:var(--clr-success);">${this._fmt(r.total)}</td>
        <td style="text-align:center;font-size:13px;">${this._formatFecha(r.ultimo_pago || r.fecha_pago)}</td>
        <td style="text-align:center;">
          <button
            class="btn btn-secondary btn-small"
            onclick="CreditosModule.abrirModalHistorial(${r.cliente_id}, '${(r.nombre + " " + (r.apellido || "")).trim().replace(/'/g, "\\'")}')"
          >Ver Pagos</button>
        </td>
      </tr>`,
      ),
      `<tr><td colspan="6" class="text-center tabla-vacia-mensaje">No hay cuentas pagadas registradas.</td></tr>`
    );
  },

  // ==================== CARGAR CLIENTES CON SALDO ====================

  async cargarClientes() {
    const tbody = document.getElementById("tablaClientesCredito");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="text-center tabla-vacia-mensaje">Cargando...</td></tr>`;

    try {
      const clientes = await API.Clientes.getConSaldoPendiente();
      this._clientes = clientes;
      this._renderStats(clientes);
      this._renderTabla(clientes);
    } catch (err) {
      console.error("Error cargando créditos:", err);
      tbody.innerHTML = `<tr><td colspan="5" class="text-center tabla-vacia-mensaje" style="color:var(--clr-danger);">Error al cargar los datos.</td></tr>`;
    }
  },

  // ==================== FILTRAR ====================

  filtrar(texto) {
    const q = (texto || "").toLowerCase().trim();
    if (!q) {
      this._renderTabla(this._clientes);
      return;
    }
    const filtrados = this._clientes.filter(
      (c) =>
        (c.nombre + " " + (c.apellido || "")).toLowerCase().includes(q) ||
        (c.telefono || "").toLowerCase().includes(q),
    );
    this._renderTabla(filtrados);
  },

  // ==================== RENDER STATS ====================

  _renderStats(clientes) {
    const container = document.getElementById("creditosStats");
    if (!container) return;

    const totalSaldo = clientes.reduce(
      (s, c) => s + parseFloat(c.saldo_pendiente || 0),
      0,
    );
    const totalFacturas = clientes.reduce(
      (s, c) => s + parseInt(c.facturas_pendientes || 0),
      0,
    );

    container.innerHTML = `
      <div class="stat-mini">
        <div class="stat-mini__label">Clientes con deuda</div>
        <div class="stat-mini__value">${clientes.length}</div>
      </div>
      <div class="stat-mini">
        <div class="stat-mini__label">Facturas pendientes</div>
        <div class="stat-mini__value stat-mini__value--warning">${totalFacturas}</div>
      </div>
      <div class="stat-mini" style="flex:2;min-width:200px;">
        <div class="stat-mini__label">Total por cobrar</div>
        <div class="stat-mini__value stat-mini__value--danger">${this._fmt(totalSaldo)}</div>
      </div>`;
  },

  // ==================== RENDER TABLA ====================

  _renderTabla(clientes) {
    if (!this._pgPendientes) this._pgPendientes = new Paginator('tablaClientesCredito', 20);
    this._pgPendientes.render(
      (clientes || []).map(
        (c) => `
      <tr>
        <td>
          <strong>${c.nombre} ${c.apellido || ""}</strong>
          ${c.cedula ? `<br><small style="color:var(--clr-muted);">${c.cedula}</small>` : ""}
          ${c.rnc ? `<br><small style="color:var(--clr-muted);">RNC: ${c.rnc}</small>` : ""}
        </td>
        <td>${c.telefono || "—"}</td>
        <td style="text-align:center;">
          <span style="background:var(--clr-warning);color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">
            ${c.facturas_pendientes}
          </span>
        </td>
        <td style="text-align:right;font-weight:700;color:var(--clr-danger);font-size:15px;">
          ${this._fmt(c.saldo_pendiente)}
        </td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
            <button
              class="btn btn-primary btn-small"
              onclick="CreditosModule.abrirModalPago(${c.cliente_id})"
            >Pagar</button>
            <button
              class="btn btn-info btn-small"
              onclick="CreditosModule.abrirReporteCredito(${c.cliente_id}, '${(c.nombre + " " + (c.apellido || "")).trim().replace(/'/g, "\\'")}')"
            >Reporte</button>
          </div>
        </td>
      </tr>`,
      ),
      `<tr><td colspan="5" class="text-center tabla-vacia-mensaje">No hay clientes con saldo pendiente.</td></tr>`
    );
  },

  // ==================== MODAL PAGO ====================

  async abrirModalPago(clienteId) {
    // Obtener estado de cuenta del cliente
    let data;
    try {
      data = await API.Clientes.getEstadoCuenta(clienteId);
    } catch (err) {
      alert("Error al cargar las facturas del cliente.");
      return;
    }

    const cliente = data.cliente;
    const facturasPendientes = (data.facturas || []).filter(
      (f) => parseFloat(f.saldo_pendiente) > 0,
    );

    if (facturasPendientes.length === 0) {
      alert("Este cliente no tiene facturas con saldo pendiente.");
      this.cargarClientes();
      return;
    }

    const nombreCliente = `${cliente.nombre} ${cliente.apellido || ""}`.trim();

    const opcionesFacturas = facturasPendientes
      .map(
        (f) => `
      <option value="${f.id}" data-saldo="${f.saldo_pendiente}">
        ${f.numero_factura} — Saldo: ${this._fmt(f.saldo_pendiente)}
      </option>`,
      )
      .join("");

    const primerSaldo = parseFloat(facturasPendientes[0].saldo_pendiente).toFixed(2);

    const modal = this._crearModal(
      "modalCreditoPago",
      `Registrar Pago — ${nombreCliente}`,
      `
      <form id="formCreditoPago" onsubmit="event.preventDefault(); CreditosModule._submitPago();">
        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">Fecha del pago:</label>
          <input type="date" id="cpFecha"
            value="${new Date().toISOString().split("T")[0]}"
            style="width:100%;padding:10px;border:1px solid var(--clr-border);border-radius:8px;font-size:14px;" required />
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">Factura:</label>
          <select id="cpFacturaId" class="form-control" style="width:100%;padding:10px;border:1px solid var(--clr-border);border-radius:8px;font-size:14px;"
            onchange="CreditosModule._onFacturaCambio(this)">
            ${opcionesFacturas}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">Monto a pagar:</label>
          <input type="number" id="cpMonto" step="0.01" min="0.01"
            value="${primerSaldo}"
            style="width:100%;padding:10px;border:1px solid var(--clr-border);border-radius:8px;font-size:16px;font-weight:700;" required />
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">Método de pago:</label>
          <select id="cpMetodo" style="width:100%;padding:10px;border:1px solid var(--clr-border);border-radius:8px;font-size:14px;">
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="cheque">Cheque</option>
            <option value="mixto">Mixto</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">Referencia / Banco (opcional):</label>
          <input type="text" id="cpReferencia"
            placeholder="Número de referencia, banco..."
            style="width:100%;padding:10px;border:1px solid var(--clr-border);border-radius:8px;font-size:14px;" />
        </div>

        <div class="js-modal__actions">
          <button type="button" class="btn btn-secondary" onclick="CreditosModule._cerrarModal('modalCreditoPago')">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Pago</button>
        </div>
      </form>`,
    );

    document.body.appendChild(modal);
    modal.style.display = "flex";
  },

  _onFacturaCambio(select) {
    const opt = select.options[select.selectedIndex];
    const saldo = parseFloat(opt.dataset.saldo || 0).toFixed(2);
    const montoInput = document.getElementById("cpMonto");
    if (montoInput) montoInput.value = saldo;
  },

  async _submitPago() {
    const facturaId = document.getElementById("cpFacturaId")?.value;
    const monto = parseFloat(document.getElementById("cpMonto")?.value || 0);
    const metodo = document.getElementById("cpMetodo")?.value;
    const referencia = document.getElementById("cpReferencia")?.value || "";
    const fecha = document.getElementById("cpFecha")?.value || "";

    if (!facturaId || !monto || monto <= 0) {
      alert("Complete todos los campos requeridos.");
      return;
    }

    const btn = document.querySelector("#formCreditoPago button[type=submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Registrando..."; }

    try {
      await PagosAPI.registrar({
        factura_id: parseInt(facturaId),
        monto,
        metodo_pago: metodo,
        referencia: referencia || null,
        fecha: fecha || null,
      });

      this._cerrarModal("modalCreditoPago");
      this.cargarClientes();

      Toast.success("Pago registrado exitosamente");
    } catch (err) {
      const msg = err?.message || "Error al registrar el pago";
      alert(msg);
      if (btn) { btn.disabled = false; btn.textContent = "Registrar Pago"; }
    }
  },

  // ==================== MODAL HISTORIAL ====================

  async abrirModalHistorial(clienteId, nombreCliente) {
    let resp;
    try {
      resp = await API.Clientes.getHistorialPagos(clienteId);
    } catch (err) {
      alert("Error al cargar el historial de pagos.");
      return;
    }

    const pagos = resp.data || [];

    let contenido;
    if (pagos.length === 0) {
      contenido = `<p style="text-align:center;color:var(--clr-muted);padding:30px 0;">Este cliente no tiene pagos registrados.</p>`;
    } else {
      const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
      const filas = pagos
        .map(
          (p) => `
        <tr>
          <td style="font-size:13px;">${this._formatFecha(p.fecha)}</td>
          <td style="font-size:12px;color:var(--clr-muted);">${p.numero_pago}</td>
          <td style="font-size:13px;">${p.numero_factura}</td>
          <td style="text-align:right;font-weight:600;color:var(--clr-success);">${this._fmt(p.monto)}</td>
          <td style="text-align:center;">
            <span style="background:var(--clr-bg-surface);border:1px solid var(--clr-border);padding:2px 8px;border-radius:8px;font-size:11px;text-transform:capitalize;">
              ${p.metodo_pago}
            </span>
          </td>
          <td style="font-size:12px;color:var(--clr-muted);">${p.referencia || p.banco || "—"}</td>
        </tr>`,
        )
        .join("");

      contenido = `
        <div class="tbl-scroll">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--clr-bg-surface);">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Fecha</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);"># Pago</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Factura</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Monto</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Método</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Referencia</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
            <tfoot>
              <tr style="background:var(--clr-bg-surface);">
                <td colspan="3" style="padding:10px 12px;font-weight:700;font-size:13px;border-top:2px solid var(--clr-border);">Total pagado</td>
                <td style="padding:10px 12px;text-align:right;font-weight:700;color:var(--clr-success);font-size:15px;border-top:2px solid var(--clr-border);">
                  ${this._fmt(totalPagado)}
                </td>
                <td colspan="2" style="border-top:2px solid var(--clr-border);"></td>
              </tr>
            </tfoot>
          </table>
        </div>`;
    }

    const modal = this._crearModal(
      "modalCreditoHistorial",
      `Historial de Pagos — ${nombreCliente}`,
      contenido +
        `<div class="js-modal__actions">
           <button class="btn btn-secondary" onclick="CreditosModule._cerrarModal('modalCreditoHistorial')">Cerrar</button>
         </div>`,
      "660px",
    );

    document.body.appendChild(modal);
    modal.style.display = "flex";
  },

  // ==================== REPORTE CUENTAS POR COBRAR ====================

  async abrirReporteCredito(clienteId, nombreCliente) {
    let data;
    try {
      data = await API.Clientes.getReporteCredito(clienteId);
    } catch (err) {
      alert("Error al cargar el reporte.");
      return;
    }

    const { cliente, facturas } = data;
    const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ""}`.trim();
    const totalPendiente = facturas.reduce((s, f) => s + parseFloat(f.saldo_pendiente || 0), 0);
    const totalOriginal = facturas.reduce((s, f) => s + parseFloat(f.total || 0), 0);
    const totalPagado = facturas.reduce((s, f) => s + parseFloat(f.monto_pagado || 0), 0);

    const filasFacturas = facturas.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--clr-muted);">No hay facturas de crédito registradas.</td></tr>`
      : facturas.map((f, idx) => {
          const estadoColor = f.estado === 'pagada' ? 'var(--clr-success)' : f.estado === 'parcial' ? 'var(--clr-warning)' : 'var(--clr-danger)';
          const estadoLabel = f.estado === 'pagada' ? 'Pagada' : f.estado === 'parcial' ? 'Parcial' : 'Pendiente';
          const vencimiento = f.fecha_vencimiento ? this._formatFecha(f.fecha_vencimiento) : '—';
          const pagosHtml = f.pagos && f.pagos.length > 0
            ? f.pagos.map(p => `
                <tr style="background:#f0faf5;">
                  <td style="padding:6px 12px;font-size:12px;color:var(--clr-muted);">${this._formatFecha(p.fecha)}</td>
                  <td style="padding:6px 12px;font-size:12px;color:var(--clr-muted);">${p.numero_pago}</td>
                  <td colspan="2" style="padding:6px 12px;font-size:12px;text-transform:capitalize;">${p.metodo_pago}${p.referencia ? ' — ' + p.referencia : ''}${p.banco ? ' (' + p.banco + ')' : ''}</td>
                  <td style="padding:6px 12px;font-size:13px;font-weight:700;color:var(--clr-success);text-align:right;">+${this._fmt(p.monto)}</td>
                  <td></td>
                </tr>`).join('')
            : `<tr style="background:#f8f9fa;"><td colspan="6" style="padding:6px 18px;font-size:12px;color:var(--clr-muted);font-style:italic;">Sin abonos registrados</td></tr>`;

          return `
            <tr style="cursor:pointer;border-top:2px solid var(--clr-border);" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
              <td style="padding:10px 12px;font-size:13px;font-weight:600;">${f.numero_factura}</td>
              <td style="padding:10px 12px;font-size:13px;">${this._formatFecha(f.fecha)}</td>
              <td style="padding:10px 12px;text-align:right;font-size:13px;">${this._fmt(f.total)}</td>
              <td style="padding:10px 12px;text-align:right;font-size:13px;color:var(--clr-success);">${this._fmt(f.monto_pagado)}</td>
              <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:700;color:${estadoColor};">${this._fmt(f.saldo_pendiente)}</td>
              <td style="padding:10px 12px;text-align:center;">
                <span style="background:${estadoColor};color:white;padding:2px 10px;border-radius:10px;font-size:11px;">${estadoLabel}</span>
                <span style="font-size:11px;color:var(--clr-muted);display:block;margin-top:2px;">Vence: ${vencimiento}</span>
              </td>
            </tr>
            <tr>
              <td colspan="6" style="padding:0;background:#f8f9fa;">
                <table style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr style="background:#e8f5e9;">
                      <th style="padding:6px 12px;font-size:11px;color:var(--clr-muted);text-align:left;">Fecha abono</th>
                      <th style="padding:6px 12px;font-size:11px;color:var(--clr-muted);text-align:left;"># Pago</th>
                      <th colspan="2" style="padding:6px 12px;font-size:11px;color:var(--clr-muted);text-align:left;">Método / Referencia</th>
                      <th style="padding:6px 12px;font-size:11px;color:var(--clr-muted);text-align:right;">Monto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>${pagosHtml}</tbody>
                </table>
              </td>
            </tr>`;
        }).join('');

    const resumen = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:130px;background:var(--clr-bg-surface);border-radius:8px;padding:14px;text-align:center;border:1px solid var(--clr-border);">
          <div style="font-size:12px;color:var(--clr-muted);">Monto original</div>
          <div style="font-size:18px;font-weight:700;">${this._fmt(totalOriginal)}</div>
        </div>
        <div style="flex:1;min-width:130px;background:#f0faf5;border-radius:8px;padding:14px;text-align:center;border:1px solid var(--clr-border);">
          <div style="font-size:12px;color:var(--clr-muted);">Total abonado</div>
          <div style="font-size:18px;font-weight:700;color:var(--clr-success);">${this._fmt(totalPagado)}</div>
        </div>
        <div style="flex:1;min-width:130px;background:#fff5f5;border-radius:8px;padding:14px;text-align:center;border:1px solid var(--clr-border);">
          <div style="font-size:12px;color:var(--clr-muted);">Saldo pendiente</div>
          <div style="font-size:18px;font-weight:700;color:var(--clr-danger);">${this._fmt(totalPendiente)}</div>
        </div>
      </div>
      ${cliente.cedula || cliente.telefono ? `<p style="font-size:13px;color:var(--clr-muted);margin:0 0 16px;">${cliente.cedula ? 'Cédula: ' + cliente.cedula : ''} ${cliente.telefono ? '&nbsp;|&nbsp; Tel: ' + cliente.telefono : ''}</p>` : ''}
      <p style="font-size:12px;color:var(--clr-muted);margin:0 0 12px;">Haz clic en una factura para ver sus abonos.</p>`;

    const tabla = `
      <div class="tabla-scroll-horizontal">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--clr-bg-surface);">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Factura</th>
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Fecha</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Original</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Abonado</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Pendiente</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:var(--clr-muted);border-bottom:1px solid var(--clr-border);">Estado</th>
            </tr>
          </thead>
          <tbody>${filasFacturas}</tbody>
        </table>
      </div>`;

    const modal = this._crearModal(
      "modalReporteCredito",
      `Cuentas por Cobrar — ${nombreCompleto}`,
      resumen + tabla + `<div class="js-modal__actions"><button class="btn btn-secondary" onclick="CreditosModule._cerrarModal('modalReporteCredito')">Cerrar</button></div>`,
      "780px",
    );

    document.body.appendChild(modal);
    modal.style.display = "flex";
  },

  // ==================== UTILIDADES MODAL ====================

  _crearModal(id, titulo, contenidoHtml, maxWidth = "520px") {
    // Eliminar modal previo si existe
    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = "js-overlay";
    overlay.style.cssText = "display:none;padding:20px;";

    overlay.innerHTML = `
      <div style="background:var(--clr-bg-white);border-radius:12px;width:100%;max-width:${maxWidth};max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--clr-border);">
          <h3 style="margin:0;font-size:16px;color:var(--clr-dark);">${titulo}</h3>
          <button onclick="CreditosModule._cerrarModal('${id}')"
            style="background:none;border:none;cursor:pointer;font-size:22px;color:var(--clr-muted);line-height:1;">&times;</button>
        </div>
        <div style="padding:24px;">
          ${contenidoHtml}
        </div>
      </div>`;

    // Cerrar al hacer click en el overlay
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this._cerrarModal(id);
    });

    return overlay;
  },

  _cerrarModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  // ==================== FORMATTERS ====================

  _fmt(amount) {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(parseFloat(amount) || 0);
  },

  _formatFecha(fechaStr) {
    if (!fechaStr) return "—";
    const d = new Date(fechaStr);
    return d.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },
};

window.CreditosModule = CreditosModule;
