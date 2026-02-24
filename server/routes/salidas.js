const express = require("express");
const router = express.Router();
const pool = require("../database/pool");
const asyncHandler = require("../middleware/async-handler");

// ==================== OBTENER TODAS LAS SALIDAS ====================
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT * FROM salidas ORDER BY fecha DESC, id DESC`,
    );
    res.json({ success: true, data: result.rows });
  }),
);

// ==================== CREAR SALIDA ====================
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      fecha,
      concepto,
      descripcion,
      monto,
      categoria_gasto,
      metodo_pago,
      beneficiario,
      numero_referencia,
    } = req.body;

    const numResult = await pool.query(
      `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(numero_salida, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1 as siguiente FROM salidas`,
    );
    const numeroSalida =
      "SAL" + String(numResult.rows[0].siguiente).padStart(8, "0");

    const result = await pool.query(
      `INSERT INTO salidas (numero_salida, fecha, concepto, descripcion, monto, categoria_gasto, metodo_pago, beneficiario, numero_referencia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        numeroSalida,
        fecha,
        concepto,
        descripcion || null,
        monto,
        categoria_gasto || null,
        metodo_pago || null,
        beneficiario || null,
        numero_referencia || null,
      ],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  }),
);

module.exports = router;
