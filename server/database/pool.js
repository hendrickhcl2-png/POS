// Pool de conexión a PostgreSQL

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "fifty_tech_pos",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 5432,
});

// Verificar conexión
pool.on("connect", () => {
  console.log("Conexion exitosa");
});

pool.on("error", (err) => {
  console.error("❌ Error en pool de PostgreSQL:", err);
});

module.exports = pool;
