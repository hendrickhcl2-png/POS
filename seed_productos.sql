-- ============================================================
--  RESET Y SEED DE DATOS DE PRUEBA — Fifty Tech POS
-- ============================================================

-- Limpiar en orden respetando FK
TRUNCATE TABLE
  caracteristicas_producto,
  detalle_costo_producto,
  historial_producto,
  ajustes_inventario,
  movimientos_inventario,
  detalle_devolucion,
  devoluciones,
  pagos_factura,
  detalle_factura,
  facturas,
  detalle_credito,
  abonos,
  creditos,
  servicios_venta,
  detalle_venta,
  ventas,
  salidas,
  productos,
  categorias
RESTART IDENTITY CASCADE;

-- ============================================================
--  CATEGORÍAS
-- ============================================================
INSERT INTO categorias (nombre) VALUES
  ('Smartphones'),
  ('Computadoras y Tablets'),
  ('Audio'),
  ('Accesorios'),
  ('Cables y Cargadores');

-- ============================================================
--  PRODUCTOS
-- ============================================================
INSERT INTO productos (
  codigo_barras, nombre, descripcion,
  precio_costo, precio_venta,
  stock_actual, stock_minimo,
  categoria_id, aplica_itbis, disponible
) VALUES

-- Smartphones
('194253741931', 'iPhone 15 Pro Max 256GB',
  'Smartphone Apple iPhone 15 Pro Max 256GB Titanio Natural',
  82000, 98000, 5, 2,
  (SELECT id FROM categorias WHERE nombre = 'Smartphones'), true, true),

('194253740072', 'iPhone 15 128GB',
  'Smartphone Apple iPhone 15 128GB Negro',
  55000, 67500, 8, 2,
  (SELECT id FROM categorias WHERE nombre = 'Smartphones'), true, true),

('194253706573', 'iPhone 14 128GB',
  'Smartphone Apple iPhone 14 128GB Azul',
  43000, 52000, 10, 3,
  (SELECT id FROM categorias WHERE nombre = 'Smartphones'), true, true),

('8806095070797', 'Samsung Galaxy S24 Ultra 256GB',
  'Smartphone Samsung Galaxy S24 Ultra 256GB Titanio Negro',
  70000, 85000, 4, 2,
  (SELECT id FROM categorias WHERE nombre = 'Smartphones'), true, true),

('8806095070568', 'Samsung Galaxy S24 128GB',
  'Smartphone Samsung Galaxy S24 128GB Violeta',
  48000, 58000, 7, 2,
  (SELECT id FROM categorias WHERE nombre = 'Smartphones'), true, true),

('8806095264837', 'Samsung Galaxy A55 128GB',
  'Smartphone Samsung Galaxy A55 128GB Azul Marino',
  22000, 28500, 12, 3,
  (SELECT id FROM categorias WHERE nombre = 'Smartphones'), true, true),

-- Computadoras y Tablets
('194253508021', 'MacBook Air M2 256GB',
  'Laptop Apple MacBook Air 13" chip M2 256GB Gris Espacial',
  108000, 128000, 3, 1,
  (SELECT id FROM categorias WHERE nombre = 'Computadoras y Tablets'), true, true),

('194253754511', 'iPad Air M2 64GB WiFi',
  'Tablet Apple iPad Air 11" chip M2 64GB WiFi Azul',
  55000, 68000, 5, 2,
  (SELECT id FROM categorias WHERE nombre = 'Computadoras y Tablets'), true, true),

('8806094947847', 'Samsung Galaxy Tab S9 256GB',
  'Tablet Samsung Galaxy Tab S9 11" 256GB WiFi Grafito',
  42000, 52000, 4, 1,
  (SELECT id FROM categorias WHERE nombre = 'Computadoras y Tablets'), true, true),

-- Audio
('194253362173', 'AirPods Pro 2da Generación',
  'Audífonos Apple AirPods Pro 2da Gen con cancelación de ruido activa',
  16000, 22000, 10, 3,
  (SELECT id FROM categorias WHERE nombre = 'Audio'), true, true),

('8806094498271', 'Samsung Galaxy Buds2 Pro',
  'Audífonos inalámbricos Samsung Galaxy Buds2 Pro Grafito',
  11000, 15000, 8, 3,
  (SELECT id FROM categorias WHERE nombre = 'Audio'), true, true),

('6925281990861', 'JBL Tune 770NC',
  'Audífonos over-ear JBL Tune 770NC con cancelación de ruido Negro',
  6500, 9500, 6, 2,
  (SELECT id FROM categorias WHERE nombre = 'Audio'), true, true),

-- Accesorios
('5901234123457', 'Funda iPhone 15 Pro Max Silicona',
  'Funda de silicona para iPhone 15 Pro Max Negro',
  600, 1500, 20, 5,
  (SELECT id FROM categorias WHERE nombre = 'Accesorios'), false, true),

('5901234123464', 'Funda Samsung Galaxy S24 Ultra',
  'Funda protectora transparente para Samsung Galaxy S24 Ultra',
  500, 1200, 15, 5,
  (SELECT id FROM categorias WHERE nombre = 'Accesorios'), false, true),

('5901234123471', 'Vidrio Templado iPhone 15',
  'Protector de pantalla vidrio templado para iPhone 15 / 15 Plus',
  250, 750, 30, 10,
  (SELECT id FROM categorias WHERE nombre = 'Accesorios'), false, true),

('5901234123488', 'Vidrio Templado Samsung S24',
  'Protector de pantalla vidrio templado para Samsung S24 / S24+',
  250, 750, 25, 10,
  (SELECT id FROM categorias WHERE nombre = 'Accesorios'), false, true),

('5901234123495', 'Ring Holder Universal',
  'Anillo soporte metálico universal para teléfonos, giratorio 360°',
  150, 450, 40, 10,
  (SELECT id FROM categorias WHERE nombre = 'Accesorios'), false, true),

-- Cables y Cargadores
('194253430551', 'Cargador 20W USB-C Apple',
  'Adaptador de corriente USB-C 20W Apple original',
  1200, 2000, 15, 5,
  (SELECT id FROM categorias WHERE nombre = 'Cables y Cargadores'), true, true),

('194253430568', 'Cable USB-C a Lightning 1m',
  'Cable Apple USB-C a Lightning 1 metro Blanco original',
  800, 1500, 20, 5,
  (SELECT id FROM categorias WHERE nombre = 'Cables y Cargadores'), false, true),

('5901234123501', 'Cable USB-C a USB-C 2m',
  'Cable USB-C a USB-C 2 metros carga rápida 60W trenzado',
  500, 1000, 25, 8,
  (SELECT id FROM categorias WHERE nombre = 'Cables y Cargadores'), false, true),

('848061080665', 'Power Bank Anker 20000mAh',
  'Batería externa Anker PowerCore 20000mAh 2 puertos USB-C Negro',
  3200, 5500, 8, 3,
  (SELECT id FROM categorias WHERE nombre = 'Cables y Cargadores'), true, true),

('8806090893049', 'Cargador Samsung 25W Super Fast',
  'Cargador Samsung 25W Super Fast Charging USB-C sin cable',
  900, 1800, 12, 4,
  (SELECT id FROM categorias WHERE nombre = 'Cables y Cargadores'), true, true);

-- Confirmación
SELECT
  c.nombre AS categoria,
  COUNT(p.id) AS productos,
  SUM(p.stock_actual) AS stock_total
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
GROUP BY c.nombre
ORDER BY c.nombre;
