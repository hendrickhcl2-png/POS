// ==================== RUTAS DE CONFIGURACIÓN ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");
const { requireAdmin } = require("../middleware/auth-middleware");

// Obtener configuración del sistema
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM configuracion 
      ORDER BY id DESC 
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Si no existe, crear configuración por defecto
      const defaultConfig = await pool.query(
        `INSERT INTO configuracion 
         (nombre_negocio, rnc, telefono, email, direccion, serie_ticket, porcentaje_itbis)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        ["Fifty Tech POS", "", "", "", "", "A01", 18.0],
      );
      return res.json(defaultConfig.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener configuración:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración
router.put("/", requireAdmin, async (req, res) => {
  try {
    const {
      nombre_negocio, rnc, telefono, email, direccion, nombre_impresora,
      porcentaje_itbis,
    } = req.body;

    // Obtener configuración actual
    const current = await pool.query(
      "SELECT id, porcentaje_itbis FROM configuracion ORDER BY id DESC LIMIT 1",
    );

    // El nombre de impresora termina en el comando `lp -d NOMBRE`.
    // imprimir.js ya lo filtra con este mismo regex antes de usarlo, pero se
    // rechaza también al guardar para no dejar metacaracteres almacenados.
    if (nombre_impresora && !/^[\w\s\-.()À-ɏ]+$/.test(nombre_impresora)) {
      return res.status(400).json({
        error: "El nombre de la impresora solo admite letras, números, espacios, guiones, puntos y paréntesis",
      });
    }

    // El ITBIS es un porcentaje entre 0 y 100. Si no viene en la petición se
    // conserva el valor actual en vez de pisarlo.
    let itbis = current.rows[0]?.porcentaje_itbis ?? 18;
    if (porcentaje_itbis !== undefined && porcentaje_itbis !== null && porcentaje_itbis !== "") {
      const pi = parseFloat(porcentaje_itbis);
      if (isNaN(pi) || pi < 0 || pi > 100) {
        return res.status(400).json({ error: "El ITBIS debe estar entre 0 y 100%" });
      }
      itbis = pi;
    }

    let result;
    if (current.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO configuracion (nombre_negocio, rnc, telefono, email, direccion, nombre_impresora, porcentaje_itbis)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [nombre_negocio || "", rnc || "", telefono || "", email || "", direccion || "", nombre_impresora || "", itbis],
      );
    } else {
      result = await pool.query(
        `UPDATE configuracion
         SET nombre_negocio = $1, rnc = $2, telefono = $3, email = $4, direccion = $5,
             nombre_impresora = $6, porcentaje_itbis = $7
         WHERE id = $8
         RETURNING *`,
        [nombre_negocio || "", rnc || "", telefono || "", email || "", direccion || "", nombre_impresora || "", itbis, current.rows[0].id],
      );
    }

    res.json({
      message: "Configuración actualizada exitosamente",
      configuracion: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error al actualizar configuración:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener configuración de NCF (Números de Comprobante Fiscal)
router.get("/ncf", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM secuencias_ncf 
      ORDER BY tipo_comprobante ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener secuencias NCF:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar secuencia NCF
router.put("/ncf/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serie,
      secuencia_inicial,
      secuencia_final,
      secuencia_actual,
      fecha_vencimiento,
    } = req.body;

    // El rango tiene que ser coherente, o la secuencia queda inservible
    const ini = parseInt(secuencia_inicial, 10);
    const fin = parseInt(secuencia_final, 10);
    const act = parseInt(secuencia_actual, 10);

    if ([ini, fin, act].some((n) => isNaN(n))) {
      return res.status(400).json({ error: "Las secuencias deben ser números enteros" });
    }
    if (ini < 0 || fin < 0 || act < 0) {
      return res.status(400).json({ error: "Las secuencias no pueden ser negativas" });
    }
    if (fin < ini) {
      return res.status(400).json({
        error: "La secuencia final no puede ser menor que la inicial",
      });
    }
    if (act < ini || act > fin) {
      return res.status(400).json({
        error: `La secuencia actual debe estar entre ${ini} y ${fin}`,
      });
    }

    const result = await pool.query(
      `UPDATE secuencias_ncf
       SET serie = $1, secuencia_inicial = $2, secuencia_final = $3,
           secuencia_actual = $4, fecha_vencimiento = $5
       WHERE id = $6
       RETURNING *`,
      [
        serie,
        secuencia_inicial,
        secuencia_final,
        secuencia_actual,
        fecha_vencimiento,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Secuencia NCF no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar secuencia NCF:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resetear base de datos (SOLO PARA DESARROLLO)
router.post("/reset", requireAdmin, async (req, res) => {
  try {
    const { confirmar } = req.body;

    if (confirmar !== "RESETEAR_TODO") {
      return res.status(400).json({
        error:
          "Debe confirmar la acción enviando { confirmar: 'RESETEAR_TODO' }",
      });
    }

    // ADVERTENCIA: Esto eliminará TODOS los datos
    await pool.query(
      "TRUNCATE TABLE ventas, detalle_venta, servicios_venta, productos, clientes CASCADE",
    );

    res.json({
      message:
        "⚠️ Base de datos reseteada. Todos los datos han sido eliminados.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error al resetear base de datos:", error);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ Rutas de configuración cargadas");

module.exports = router;
