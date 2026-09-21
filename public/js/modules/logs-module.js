// ==================== MÓDULO DE REGISTRO DE EVENTOS (ADMIN) ====================
// Muestra el archivo logs/app-YYYY-MM-DD.log: cada línea trae
// fecha y hora | nivel | origen | usuario | módulo | proceso | mensaje | detalle

window.LogsModule = {
  MAX_MENSAJE_VISIBLE: 200, // lo que pase de aquí se lee en el desplegable
  lineas: [], // líneas ya parseadas del día cargado
  fecha: null,
  autoRefresco: null,
  _iniciado: false,

  async init() {
    if (!this._iniciado) {
      this._conectarControles();
      this._iniciado = true;
    }
    await this.cargarDias();
    await this.cargar();
  },

  _conectarControles() {
    const alCambiar = (id, evento, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(evento, fn);
    };

    alCambiar("logsFecha", "change", () => this.cargar());
    alCambiar("logsLineas", "change", () => this.cargar());
    alCambiar("logsNivel", "change", () => this.render());
    alCambiar("logsOrigen", "change", () => this.render());
    alCambiar("logsBuscar", "input", () => this.render());

    alCambiar("logsAuto", "change", (e) => {
      clearInterval(this.autoRefresco);
      // Refresco corto: sirve para mirar el log mientras alguien usa la caja.
      this.autoRefresco = e.target.checked ? setInterval(() => this.cargar(true), 15000) : null;
    });
  },

  // ==================== CARGA ====================

  async cargarDias() {
    const select = document.getElementById("logsFecha");
    if (!select) return;

    try {
      const dias = await LogsAPI.getDias();
      const seleccionada = select.value;

      if (dias.length === 0) {
        select.innerHTML = `<option value="">Sin registros</option>`;
        return;
      }

      select.innerHTML = dias
        .map((d) => `<option value="${d.fecha}">${d.fecha} (${d.tamano_kb} KB)</option>`)
        .join("");

      // Al refrescar se conserva el día que el admin estaba mirando.
      if (seleccionada && dias.some((d) => d.fecha === seleccionada)) {
        select.value = seleccionada;
      }
    } catch (error) {
      select.innerHTML = `<option value="">No se pudo cargar</option>`;
      Toast.error(error.message || "No se pudieron cargar los días con registros");
    }
  },

  async cargar(silencioso = false) {
    const fecha = document.getElementById("logsFecha")?.value;
    const cuerpo = document.getElementById("logsTabla");
    if (!fecha || !cuerpo) {
      if (cuerpo) cuerpo.innerHTML = this._filaVacia("No hay archivos de registro todavía");
      this.lineas = [];
      this._actualizarResumen();
      return;
    }

    const limite = parseInt(document.getElementById("logsLineas")?.value) || 1000;
    if (!silencioso) cuerpo.innerHTML = this._filaVacia("Cargando…");

    try {
      const texto = await LogsAPI.getContenido(fecha, { lineas: limite });
      this.fecha = fecha;
      this.lineas = texto
        .split("\n")
        .filter(Boolean)
        .map((l) => this._parsear(l))
        .reverse(); // lo más reciente arriba
      this.render();
    } catch (error) {
      cuerpo.innerHTML = this._filaVacia(error.message || "Error al cargar el registro");
    }
  },

  // Los campos nunca contienen "|" (el servidor lo sustituye al escribir), así
  // que partir por " | " es seguro.
  _parsear(linea) {
    const c = linea.split(" | ");
    return {
      fechaHora: c[0] || "",
      hora: (c[0] || "").split(" ")[1] || c[0] || "",
      nivel: (c[1] || "").trim(),
      origen: (c[2] || "").trim(),
      usuario: c[3] || "",
      modulo: c[4] || "",
      proceso: c[5] || "",
      mensaje: c[6] || "",
      detalle: c[7] && c[7] !== "-" ? c[7] : "",
      crudo: linea,
    };
  },

  // ==================== RENDER ====================

  _filtradas() {
    const nivel = document.getElementById("logsNivel")?.value || "";
    const origen = document.getElementById("logsOrigen")?.value || "";
    const texto = (document.getElementById("logsBuscar")?.value || "").trim().toLowerCase();

    return this.lineas.filter((l) => {
      if (nivel && l.nivel !== nivel) return false;
      if (origen && l.origen !== origen) return false;
      if (texto && !l.crudo.toLowerCase().includes(texto)) return false;
      return true;
    });
  },

  render() {
    const cuerpo = document.getElementById("logsTabla");
    if (!cuerpo) return;

    const filas = this._filtradas();
    this._actualizarResumen(filas);

    if (filas.length === 0) {
      cuerpo.innerHTML = this._filaVacia(
        this.lineas.length === 0 ? "No hay eventos registrados este día" : "Ningún evento coincide con el filtro",
      );
      return;
    }

    cuerpo.innerHTML = filas
      .map((l, i) => {
        const nivel = l.nivel.toLowerCase();

        // Los errores de consola del servidor traen el stack dentro del propio
        // mensaje: en la tabla se recorta y lo completo va al desplegable.
        const largo = l.mensaje.length > this.MAX_MENSAJE_VISIBLE;
        const visible = largo ? l.mensaje.slice(0, this.MAX_MENSAJE_VISIBLE) + "…" : l.mensaje;
        const ampliado = [largo ? l.mensaje : "", l.detalle].filter(Boolean).join("\n\n");

        return `
        <tr class="log-fila log-fila--${nivel}">
          <td class="log-hora">${l.hora}</td>
          <td><span class="log-nivel log-nivel--${nivel}">${l.nivel}</span></td>
          <td class="log-origen">${l.origen}</td>
          <td>${this._escapar(l.usuario)}</td>
          <td class="log-modulo"><strong>${this._escapar(l.modulo)}</strong></td>
          <td class="log-proceso">${this._escapar(l.proceso)}</td>
          <td class="log-mensaje">
            ${this._escapar(visible)}
            ${ampliado ? `<button type="button" class="log-detalle-btn" onclick="LogsModule.alternarDetalle(${i})">detalle</button>` : ""}
          </td>
        </tr>
        ${ampliado ? `<tr id="logDetalle${i}" class="log-detalle" hidden><td colspan="7"><pre>${this._escapar(ampliado)}</pre></td></tr>` : ""}
      `;
      })
      .join("");
  },

  alternarDetalle(indice) {
    const fila = document.getElementById(`logDetalle${indice}`);
    if (fila) fila.hidden = !fila.hidden;
  },

  _actualizarResumen(filas = []) {
    const cuenta = (nivel) => filas.filter((l) => l.nivel === nivel).length;

    const poner = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    };

    poner("logsTotalEventos", filas.length);
    poner("logsTotalErrores", cuenta("ERROR"));
    poner("logsTotalAvisos", cuenta("WARNING"));
    poner(
      "logsUltimoEvento",
      filas.length > 0 ? filas[0].fechaHora : "—",
    );
  },

  _filaVacia(mensaje) {
    return `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--clr-muted);">${mensaje}</td></tr>`;
  },

  _escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
  },

  // ==================== ACCIONES ====================

  async refrescar() {
    await this.cargarDias();
    await this.cargar();
  },

  descargar() {
    const fecha = document.getElementById("logsFecha")?.value;
    if (!fecha) {
      Toast.warning("No hay ningún día seleccionado");
      return;
    }
    window.open(LogsAPI.urlDescarga(fecha), "_blank");
  },

  copiar() {
    const filas = this._filtradas();
    if (filas.length === 0) {
      Toast.warning("No hay eventos que copiar");
      return;
    }

    const texto = filas.map((l) => l.crudo).reverse().join("\n");
    navigator.clipboard
      .writeText(texto)
      .then(() => Toast.success(`${filas.length} evento(s) copiados al portapapeles`))
      .catch(() => Toast.error("No se pudo copiar al portapapeles"));
  },
};
