-- ============================================================
-- Fifty Tech POS - Esquema base de la base de datos
-- ============================================================
-- Idempotente: usa CREATE TABLE IF NOT EXISTS.
-- Las migraciones incrementales (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
-- las aplica automáticamente server.js -> initAuth() al arrancar.
-- ============================================================

-- ====================== USUARIOS ======================
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100),
  rol VARCHAR(20) NOT NULL DEFAULT 'cajero' CHECK (rol IN ('admin', 'cajero')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================== CATEGORÍAS ======================
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT
);

-- ================= CATEGORÍAS DE GASTO ==================
CREATE TABLE IF NOT EXISTS categorias_gasto (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL
);

-- ====================== PROVEEDORES =====================
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  contacto_nombre VARCHAR(200),
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion TEXT,
  rnc VARCHAR(20),
  notas TEXT
);

-- ======================= CLIENTES =======================
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  apellido VARCHAR(200),
  cedula VARCHAR(20),
  rnc VARCHAR(20),
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion TEXT,
  notas TEXT,
  saldo_pendiente NUMERIC(12,2) DEFAULT 0
);

-- ====================== CONFIGURACIÓN ===================
CREATE TABLE IF NOT EXISTS configuracion (
  id SERIAL PRIMARY KEY,
  nombre_negocio VARCHAR(200),
  rnc VARCHAR(20),
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion TEXT,
  serie_ticket VARCHAR(10),
  porcentaje_itbis NUMERIC(5,2) DEFAULT 18.0,
  nombre_impresora VARCHAR(255)
);

-- ===================== SECUENCIAS NCF ===================
CREATE TABLE IF NOT EXISTS secuencias_ncf (
  id SERIAL PRIMARY KEY,
  tipo_comprobante VARCHAR(20) NOT NULL,
  serie VARCHAR(10),
  secuencia_inicial INTEGER,
  secuencia_final INTEGER,
  secuencia_actual INTEGER,
  fecha_vencimiento DATE
);

-- ======================= PRODUCTOS ======================
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo_barras VARCHAR(100) UNIQUE,
  imei VARCHAR(50) UNIQUE,
  nombre VARCHAR(300) NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  precio_costo NUMERIC(12,2),
  precio_venta NUMERIC(12,2) NOT NULL,
  precio_mayoreo NUMERIC(12,2),
  cantidad_mayoreo INTEGER DEFAULT 5,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  stock_maximo INTEGER DEFAULT 0,
  descuento_porcentaje NUMERIC(5,2),
  descuento_monto NUMERIC(12,2),
  disponible BOOLEAN DEFAULT true,
  aplica_itbis BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  costos JSONB,
  caracteristicas JSONB,
  creado_por VARCHAR(100),
  factura_proveedor_numero VARCHAR(100),
  factura_proveedor_fecha DATE,
  ncf VARCHAR(19),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================= SERVICIOS ======================
CREATE TABLE IF NOT EXISTS servicios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(10,2) DEFAULT 0.00,
  es_gratuito BOOLEAN DEFAULT FALSE,
  aplica_itbis BOOLEAN DEFAULT FALSE,
  categoria VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================= VENTAS =======================
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  numero_ticket VARCHAR(20) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2),
  descuento NUMERIC(12,2) DEFAULT 0,
  itbis NUMERIC(12,2),
  total NUMERIC(12,2),
  metodo_pago VARCHAR(20),
  monto_efectivo NUMERIC(12,2),
  monto_tarjeta NUMERIC(12,2),
  monto_transferencia NUMERIC(12,2),
  monto_recibido NUMERIC(12,2),
  cambio NUMERIC(12,2),
  banco VARCHAR(100),
  referencia VARCHAR(100),
  fecha DATE DEFAULT CURRENT_DATE,
  hora TIME DEFAULT CURRENT_TIME,
  estado VARCHAR(20) DEFAULT 'completada',
  notas TEXT,
  incluir_itbis BOOLEAN DEFAULT true,
  generar_factura_electronica BOOLEAN DEFAULT false,
  usuario_id INTEGER,
  usuario_nombre VARCHAR(100),
  motivo_anulacion TEXT,
  fecha_anulacion TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== DETALLE DE VENTA ==================
CREATE TABLE IF NOT EXISTS detalle_venta (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo_producto VARCHAR(100),
  nombre_producto VARCHAR(300),
  imei VARCHAR(50),
  cantidad INTEGER,
  precio_unitario NUMERIC(12,2),
  precio_costo_unitario NUMERIC(12,2),
  descuento NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2),
  itbis NUMERIC(12,2),
  total NUMERIC(12,2)
);

-- =================== SERVICIOS POR VENTA ================
CREATE TABLE IF NOT EXISTS servicios_venta (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
  nombre_servicio VARCHAR(200),
  descripcion TEXT,
  precio NUMERIC(10,2) DEFAULT 0.00,
  cantidad INTEGER DEFAULT 1,
  es_gratuito BOOLEAN DEFAULT FALSE,
  subtotal NUMERIC(10,2),
  itbis NUMERIC(10,2),
  total NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================= FACTURAS =======================
CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  numero_factura VARCHAR(20) UNIQUE,
  ncf VARCHAR(19),
  tipo_comprobante VARCHAR(10),
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2),
  descuento NUMERIC(12,2) DEFAULT 0,
  itbis NUMERIC(12,2),
  total NUMERIC(12,2),
  monto_pagado NUMERIC(12,2) DEFAULT 0,
  saldo_pendiente NUMERIC(12,2),
  fecha DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  estado VARCHAR(20) DEFAULT 'pendiente',
  tipo_factura VARCHAR(20) DEFAULT 'contado',
  venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================== DETALLE DE FACTURA =================
CREATE TABLE IF NOT EXISTS detalle_factura (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo_producto VARCHAR(100),
  nombre_producto VARCHAR(300),
  cantidad INTEGER,
  precio_unitario NUMERIC(12,2),
  precio_costo_unitario NUMERIC(12,2),
  descuento NUMERIC(12,2) DEFAULT 0,
  cantidad_devuelta INTEGER DEFAULT 0,
  subtotal NUMERIC(12,2),
  itbis NUMERIC(12,2),
  total NUMERIC(12,2)
);

-- ==================== PAGOS DE FACTURA ==================
CREATE TABLE IF NOT EXISTS pagos_factura (
  id SERIAL PRIMARY KEY,
  numero_pago VARCHAR(20) UNIQUE,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  monto NUMERIC(12,2),
  metodo_pago VARCHAR(20),
  monto_efectivo NUMERIC(12,2),
  monto_tarjeta NUMERIC(12,2),
  monto_transferencia NUMERIC(12,2),
  banco VARCHAR(100),
  referencia VARCHAR(100),
  numero_cheque VARCHAR(50),
  notas TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  hora TIME DEFAULT CURRENT_TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================== DEVOLUCIONES ====================
CREATE TABLE IF NOT EXISTS devoluciones (
  id SERIAL PRIMARY KEY,
  numero_devolucion VARCHAR(20) UNIQUE,
  factura_id INTEGER REFERENCES facturas(id) ON DELETE SET NULL,
  venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
  tipo VARCHAR(20),
  subtotal NUMERIC(12,2),
  itbis NUMERIC(12,2),
  total NUMERIC(12,2),
  motivo TEXT NOT NULL,
  notas TEXT,
  estado VARCHAR(20) DEFAULT 'procesada',
  metodo_devolucion VARCHAR(20) DEFAULT 'reembolso',
  metodo_reembolso VARCHAR(20),
  referencia_transferencia VARCHAR(200),
  producto_cambio_id INTEGER,
  producto_cambio_nombre VARCHAR(300),
  producto_cambio_precio NUMERIC(12,2),
  producto_cambio_cantidad INTEGER DEFAULT 1,
  diferencia_cambio NUMERIC(12,2) DEFAULT 0,
  monto_cliente_pago NUMERIC(12,2) DEFAULT 0,
  fecha DATE DEFAULT CURRENT_DATE,
  hora TIME DEFAULT CURRENT_TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================ DETALLE DE DEVOLUCIÓN =================
CREATE TABLE IF NOT EXISTS detalle_devolucion (
  id SERIAL PRIMARY KEY,
  devolucion_id INTEGER NOT NULL REFERENCES devoluciones(id) ON DELETE CASCADE,
  detalle_factura_id INTEGER,
  producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo_producto VARCHAR(100),
  nombre_producto VARCHAR(300),
  cantidad_devuelta INTEGER,
  cantidad_original INTEGER,
  precio_unitario NUMERIC(12,2),
  subtotal NUMERIC(12,2),
  itbis NUMERIC(12,2),
  total NUMERIC(12,2)
);

-- ========================= SALIDAS ======================
CREATE TABLE IF NOT EXISTS salidas (
  id SERIAL PRIMARY KEY,
  numero_salida VARCHAR(20) UNIQUE,
  fecha DATE DEFAULT CURRENT_DATE,
  concepto VARCHAR(300) NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12,2) NOT NULL,
  categoria_gasto VARCHAR(100),
  metodo_pago VARCHAR(20),
  beneficiario VARCHAR(200),
  numero_referencia VARCHAR(100),
  ncf VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================ MOVIMIENTOS DE INVENTARIO =============
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo VARCHAR(20),
  cantidad INTEGER,
  motivo TEXT,
  usuario VARCHAR(100),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  stock_anterior INTEGER,
  stock_nuevo INTEGER
);

-- ====================== ÍNDICES ÚTILES ==================
CREATE INDEX IF NOT EXISTS idx_ventas_fecha          ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente        ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta   ON detalle_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente      ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta        ON facturas(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado       ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_factura         ON pagos_factura(factura_id);
CREATE INDEX IF NOT EXISTS idx_devoluciones_factura  ON devoluciones(factura_id);
CREATE INDEX IF NOT EXISTS idx_detalle_dev_dev       ON detalle_devolucion(devolucion_id);
CREATE INDEX IF NOT EXISTS idx_mov_inv_producto      ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria   ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor   ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_salidas_fecha         ON salidas(fecha);

-- ====================== CONFIG INICIAL ==================
INSERT INTO configuracion (id, nombre_negocio, porcentaje_itbis)
SELECT 1, 'Fifty Tech', 18.0
WHERE NOT EXISTS (SELECT 1 FROM configuracion);
