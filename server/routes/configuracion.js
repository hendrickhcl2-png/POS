// ==================== RUTAS DE CONFIGURACIÓN ====================
const express = require("express");
const router = express.Router();
const pool = require("../database/pool");

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
router.put("/", async (req, res) => {
  try {
    const {
      nombre_negocio,
      rnc,
      telefono,
      email,
      direccion,
      serie_ticket,
      porcentaje_itbis,
      mensaje_ticket,
      logo_url,
    } = req.body;

    // Validaciones
    if (!nombre_negocio || nombre_negocio.trim() === "") {
      return res
        .status(400)
        .json({ error: "El nombre del negocio es obligatorio" });
    }

    if (porcentaje_itbis && (porcentaje_itbis < 0 || porcentaje_itbis > 100)) {
      return res
        .status(400)
        .json({ error: "El porcentaje de ITBIS debe estar entre 0 y 100" });
    }

    // Obtener configuración actual
    const current = await pool.query(
      "SELECT id FROM configuracion ORDER BY id DESC LIMIT 1",
    );

    let result;
    if (current.rows.length === 0) {
      // Crear nueva configuración
      result = await pool.query(
        `INSERT INTO configuracion 
         (nombre_negocio, rnc, telefono, email, direccion, serie_ticket, porcentaje_itbis, mensaje_ticket, logo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          nombre_negocio,
          rnc || "",
          telefono || "",
          email || "",
          direccion || "",
          serie_ticket || "A01",
          porcentaje_itbis || 18.0,
          mensaje_ticket || "",
          logo_url || "",
        ],
      );
    } else {
      // Actualizar configuración existente
      result = await pool.query(
        `UPDATE configuracion 
         SET nombre_negocio = $1, rnc = $2, telefono = $3, email = $4, 
             direccion = $5, serie_ticket = $6, porcentaje_itbis = $7,
             mensaje_ticket = $8, logo_url = $9
         WHERE id = $10
         RETURNING *`,
        [
          nombre_negocio,
          rnc,
          telefono,
          email,
          direccion,
          serie_ticket,
          porcentaje_itbis,
          mensaje_ticket,
          logo_url,
          current.rows[0].id,
        ],
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
router.put("/ncf/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serie,
      secuencia_inicial,
      secuencia_final,
      secuencia_actual,
      fecha_vencimiento,
    } = req.body;

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
router.post("/reset", async (req, res) => {
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
