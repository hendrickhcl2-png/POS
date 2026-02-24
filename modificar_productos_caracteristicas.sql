-- ==================== MODIFICACIONES AL ESQUEMA DE PRODUCTOS ====================
-- Para productos individuales (cada uno único)

-- 1. Agregar columna de disponibilidad en productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS descuento_monto DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_con_descuento DECIMAL(10,2);

-- 2. Hacer stock_actual, stock_minimo, stock_maximo opcionales (NULL permitido)
ALTER TABLE productos 
ALTER COLUMN stock_actual DROP NOT NULL,
ALTER COLUMN stock_minimo DROP NOT NULL,
ALTER COLUMN stock_maximo DROP NOT NULL;

-- 3. Crear tabla de características del producto
CREATE TABLE IF NOT EXISTS caracteristicas_producto (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,  -- Ej: "Batería", "Pantalla", "Cámara"
    valor TEXT NOT NULL,            -- Ej: "80%", "Original", "Funciona perfectamente"
    tipo VARCHAR(50),               -- Ej: "estado", "especificacion", "defecto"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_caracteristicas_producto 
ON caracteristicas_producto(producto_id);

-- 4. Crear función para calcular precio con descuento
CREATE OR REPLACE FUNCTION calcular_precio_con_descuento()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay descuento por porcentaje
    IF NEW.descuento_porcentaje > 0 THEN
        NEW.precio_con_descuento = NEW.precio_venta * (1 - NEW.descuento_porcentaje / 100);
    -- Si hay descuento por monto fijo
    ELSIF NEW.descuento_monto > 0 THEN
        NEW.precio_con_descuento = NEW.precio_venta - NEW.descuento_monto;
    -- Sin descuento
    ELSE
        NEW.precio_con_descuento = NEW.precio_venta;
    END IF;
    
    -- Asegurar que el precio no sea negativo
    IF NEW.precio_con_descuento < 0 THEN
        NEW.precio_con_descuento = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para calcular precio con descuento automáticamente
DROP TRIGGER IF EXISTS trigger_calcular_precio_descuento ON productos;
CREATE TRIGGER trigger_calcular_precio_descuento
    BEFORE INSERT OR UPDATE OF precio_venta, descuento_porcentaje, descuento_monto
    ON productos
    FOR EACH ROW
    EXECUTE FUNCTION calcular_precio_con_descuento();

-- 6. Actualizar productos existentes
UPDATE productos 
SET disponible = true,
    descuento_porcentaje = 0,
    descuento_monto = 0,
    precio_con_descuento = precio_venta
WHERE disponible IS NULL;

-- 7. Crear tabla de historial de cambios de producto (opcional pero útil)
CREATE TABLE IF NOT EXISTS historial_producto (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    campo_modificado VARCHAR(100) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario VARCHAR(100),
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para historial
CREATE INDEX IF NOT EXISTS idx_historial_producto 
ON historial_producto(producto_id, fecha_cambio DESC);

-- 8. Insertar características de ejemplo para productos existentes
-- (Solo como ejemplo, puedes eliminar esto después)
INSERT INTO caracteristicas_producto (producto_id, nombre, valor, tipo)
SELECT 
    id,
    'Estado General',
    'Usado - Buen Estado',
    'estado'
FROM productos 
WHERE nombre LIKE '%iPhone%' 
  AND NOT EXISTS (SELECT 1 FROM caracteristicas_producto WHERE producto_id = productos.id)
LIMIT 3;

-- 9. Verificar cambios
SELECT 
    'Productos actualizados' as mensaje,
    COUNT(*) as total,
    SUM(CASE WHEN disponible THEN 1 ELSE 0 END) as disponibles,
    SUM(CASE WHEN descuento_porcentaje > 0 OR descuento_monto > 0 THEN 1 ELSE 0 END) as con_descuento
FROM productos;

-- 10. Ver características creadas
SELECT 
    p.nombre as producto,
    c.nombre as caracteristica,
    c.valor,
    c.tipo
FROM caracteristicas_producto c
JOIN productos p ON c.producto_id = p.id
ORDER BY p.id, c.id;

-- ==================== EJEMPLOS DE USO ====================

-- Ejemplo 1: Crear producto con características
/*
BEGIN;

INSERT INTO productos (
    imei, nombre, descripcion, categoria_id,
    precio_costo, precio_venta, disponible,
    descuento_porcentaje, proveedor_id
) VALUES (
    '123456789012345',
    'iPhone 14 Pro Max 256GB Negro',
    'iPhone usado en excelente estado',
    1, -- Categoría Teléfonos
    35000,
    48000,
    true,
    10, -- 10% de descuento
    1
) RETURNING id;

-- Supongamos que el producto tiene ID 100
INSERT INTO caracteristicas_producto (producto_id, nombre, valor, tipo) VALUES
(100, 'Batería', '80%', 'estado'),
(100, 'Pantalla', 'Original, sin rayones', 'estado'),
(100, 'Cámara Trasera', 'Funcionando perfectamente', 'estado'),
(100, 'Face ID', 'Funcionando', 'funcionalidad'),
(100, 'Incluye', 'Cargador + Cable', 'accesorios'),
(100, 'Garantía', '30 días', 'garantia');

COMMIT;
*/

-- Ejemplo 2: Actualizar precio con descuento
/*
UPDATE productos 
SET descuento_porcentaje = 15
WHERE id = 100;
-- El trigger calculará automáticamente precio_con_descuento
*/

-- Ejemplo 3: Marcar producto como no disponible (vendido)
/*
UPDATE productos 
SET disponible = false
WHERE id = 100;
*/

-- Ejemplo 4: Buscar productos con características específicas
/*
SELECT DISTINCT p.*
FROM productos p
JOIN caracteristicas_producto c ON p.id = c.producto_id
WHERE c.nombre = 'Batería' 
  AND c.valor LIKE '%80%'
  AND p.disponible = true;
*/

COMMIT;
