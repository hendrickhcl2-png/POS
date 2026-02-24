-- ==================== TABLA DE SERVICIOS ====================
-- Servicios que se pueden agregar a las ventas (instalación, protector de pantalla, etc.)

CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    es_gratuito BOOLEAN DEFAULT FALSE,
    aplica_itbis BOOLEAN DEFAULT FALSE,
    categoria VARCHAR(100), -- 'instalacion', 'proteccion', 'configuracion', 'reparacion', 'otros'
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TABLA DE SERVICIOS EN VENTAS ====================
-- Servicios aplicados a cada venta

CREATE TABLE IF NOT EXISTS servicios_venta (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
    nombre_servicio VARCHAR(200) NOT NULL, -- Guardamos el nombre por si se elimina el servicio
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cantidad INTEGER DEFAULT 1,
    es_gratuito BOOLEAN DEFAULT FALSE,
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    itbis DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ÍNDICES ====================

CREATE INDEX idx_servicios_activo ON servicios(activo);
CREATE INDEX idx_servicios_categoria ON servicios(categoria);
CREATE INDEX idx_servicios_venta_venta_id ON servicios_venta(venta_id);
CREATE INDEX idx_servicios_venta_servicio_id ON servicios_venta(servicio_id);

-- ==================== TRIGGER PARA UPDATED_AT ====================

CREATE OR REPLACE FUNCTION update_servicios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_servicios_timestamp
    BEFORE UPDATE ON servicios
    FOR EACH ROW
    EXECUTE FUNCTION update_servicios_timestamp();

-- ==================== DATOS DE EJEMPLO ====================

INSERT INTO servicios (nombre, descripcion, precio, es_gratuito, aplica_itbis, categoria) VALUES
-- Servicios de Protección
('Protector de Pantalla - Vidrio Templado', 'Instalación de protector de pantalla de vidrio templado', 300.00, FALSE, TRUE, 'proteccion'),
('Protector de Pantalla - Básico', 'Instalación de protector de pantalla básico', 150.00, FALSE, TRUE, 'proteccion'),
('Protector de Pantalla - Gratis', 'Instalación gratuita de protector (cliente trae su protector)', 0.00, TRUE, FALSE, 'proteccion'),
('Forro/Case Instalación', 'Colocación de forro o case', 50.00, FALSE, FALSE, 'proteccion'),

-- Servicios de Configuración
('Configuración Inicial', 'Configuración inicial del dispositivo, cuentas y aplicaciones básicas', 500.00, FALSE, TRUE, 'configuracion'),
('Configuración Completa', 'Configuración completa: cuentas, apps, personalización, seguridad', 1000.00, FALSE, TRUE, 'configuracion'),
('Configuración Gratuita', 'Configuración básica gratuita incluida en la compra', 0.00, TRUE, FALSE, 'configuracion'),
('Transferencia de Datos', 'Transferencia de datos desde dispositivo anterior', 300.00, FALSE, TRUE, 'configuracion'),
('Instalación de Apps', 'Descarga e instalación de aplicaciones solicitadas', 200.00, FALSE, TRUE, 'configuracion'),

-- Servicios de Reparación
('Limpieza Profunda', 'Limpieza profunda del dispositivo', 250.00, FALSE, TRUE, 'reparacion'),
('Cambio de Batería', 'Reemplazo de batería (batería no incluida)', 400.00, FALSE, TRUE, 'reparacion'),
('Cambio de Pantalla', 'Reemplazo de pantalla (pantalla no incluida)', 800.00, FALSE, TRUE, 'reparacion'),

-- Otros Servicios
('Asesoría Técnica', 'Asesoría sobre uso del dispositivo (30 min)', 200.00, FALSE, FALSE, 'otros'),
('Respaldo de Datos', 'Respaldo completo de datos del dispositivo', 300.00, FALSE, TRUE, 'otros'),
('Servicio Express', 'Atención prioritaria y entrega inmediata', 500.00, FALSE, FALSE, 'otros'),
('Garantía Extendida', 'Garantía extendida por 6 meses adicionales', 1500.00, FALSE, FALSE, 'otros');

-- ==================== COMENTARIOS ====================

COMMENT ON TABLE servicios IS 'Catálogo de servicios disponibles para agregar a las ventas';
COMMENT ON TABLE servicios_venta IS 'Servicios aplicados a cada venta específica';

COMMENT ON COLUMN servicios.es_gratuito IS 'Si el servicio es gratuito (cortesía)';
COMMENT ON COLUMN servicios.aplica_itbis IS 'Si el servicio está sujeto a ITBIS';
COMMENT ON COLUMN servicios.categoria IS 'Categoría del servicio: instalacion, proteccion, configuracion, reparacion, otros';

-- ==================== VISTA DE SERVICIOS POPULARES ====================

CREATE OR REPLACE VIEW servicios_mas_usados AS
SELECT 
    s.id,
    s.nombre,
    s.precio,
    s.es_gratuito,
    COUNT(sv.id) as veces_usado,
    SUM(sv.total) as ingresos_generados
FROM servicios s
LEFT JOIN servicios_venta sv ON s.id = sv.servicio_id
WHERE s.activo = TRUE
GROUP BY s.id, s.nombre, s.precio, s.es_gratuito
ORDER BY veces_usado DESC;

-- ==================== VERIFICACIÓN ====================

SELECT 'Tabla servicios creada correctamente' as mensaje;
SELECT COUNT(*) as total_servicios FROM servicios;
SELECT * FROM servicios ORDER BY categoria, nombre;
