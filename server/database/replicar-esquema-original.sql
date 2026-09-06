-- =====================================================================
--  Fifty Tech POS — Replicación del esquema original (base del cliente)
-- =====================================================================
--  Reconstruido a partir de fifty_tech_pos_backup.sql (pg_dump de la base
--  original), recuperado del historial de git: el archivo fue borrado en el
--  commit 46b56a7 y no forma parte de server/database/schema.sql, que quedó
--  como una reconstrucción parcial sin funciones, triggers ni varias tablas.
--
--  El script es idempotente y ADITIVO: no borra ni reescribe datos. Se puede
--  correr sobre una base existente cuantas veces haga falta.
--
--  Uso:  psql -U postgres -d fifty_tech_pos -f server/database/replicar-esquema-original.sql
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. TABLAS QUE EXISTEN EN LA BASE DEL CLIENTE Y FALTABAN AQUÍ
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.abonos (

    id integer NOT NULL,
    credito_id integer NOT NULL,
    detalle_credito_id integer,
    monto numeric(12,2) NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    banco character varying(100),
    numero_referencia character varying(100),
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    usuario character varying(100),
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.abonos_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.abonos_id_seq OWNED BY public.abonos.id;
ALTER TABLE ONLY public.abonos ALTER COLUMN id SET DEFAULT nextval('public.abonos_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.ajustes_inventario (

    id integer NOT NULL,
    producto_id integer,
    tipo_ajuste character varying(20) NOT NULL,
    cantidad_anterior integer NOT NULL,
    cantidad_ajuste integer NOT NULL,
    cantidad_nueva integer NOT NULL,
    motivo character varying(300),
    usuario character varying(100),
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.ajustes_inventario_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.ajustes_inventario_id_seq OWNED BY public.ajustes_inventario.id;
ALTER TABLE ONLY public.ajustes_inventario ALTER COLUMN id SET DEFAULT nextval('public.ajustes_inventario_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.caracteristicas_producto (

    id integer NOT NULL,
    producto_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    valor text NOT NULL,
    tipo character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.caracteristicas_producto_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.caracteristicas_producto_id_seq OWNED BY public.caracteristicas_producto.id;
ALTER TABLE ONLY public.caracteristicas_producto ALTER COLUMN id SET DEFAULT nextval('public.caracteristicas_producto_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.creditos (

    id integer NOT NULL,
    numero_credito character varying(50) NOT NULL,
    cliente_id integer NOT NULL,
    factura_id integer,
    monto_total numeric(12,2) NOT NULL,
    monto_pagado numeric(12,2) DEFAULT 0,
    saldo_pendiente numeric(12,2) NOT NULL,
    fecha_credito date NOT NULL,
    fecha_vencimiento date,
    estado character varying(20) DEFAULT 'activo'::character varying,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.creditos_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.creditos_id_seq OWNED BY public.creditos.id;
ALTER TABLE ONLY public.creditos ALTER COLUMN id SET DEFAULT nextval('public.creditos_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.detalle_costo_producto (

    id integer NOT NULL,
    producto_id integer,
    concepto character varying(200) NOT NULL,
    monto numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.detalle_costo_producto_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.detalle_costo_producto_id_seq OWNED BY public.detalle_costo_producto.id;
ALTER TABLE ONLY public.detalle_costo_producto ALTER COLUMN id SET DEFAULT nextval('public.detalle_costo_producto_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.detalle_credito (

    id integer NOT NULL,
    credito_id integer,
    producto_id integer,
    nombre_producto character varying(300),
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    monto_producto numeric(12,2) NOT NULL,
    monto_pagado_producto numeric(12,2) DEFAULT 0,
    saldo_producto numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.detalle_credito_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.detalle_credito_id_seq OWNED BY public.detalle_credito.id;
ALTER TABLE ONLY public.detalle_credito ALTER COLUMN id SET DEFAULT nextval('public.detalle_credito_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.facturas_servicio (

    id integer NOT NULL,
    numero_factura character varying(50) NOT NULL,
    proveedor_id integer,
    fecha date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0,
    itbis numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    notas text,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.facturas_servicio_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.facturas_servicio_id_seq OWNED BY public.facturas_servicio.id;
ALTER TABLE ONLY public.facturas_servicio ALTER COLUMN id SET DEFAULT nextval('public.facturas_servicio_id_seq'::regclass);

CREATE TABLE IF NOT EXISTS public.historial_producto (

    id integer NOT NULL,
    producto_id integer NOT NULL,
    campo_modificado character varying(100) NOT NULL,
    valor_anterior text,
    valor_nuevo text,
    usuario character varying(100),
    fecha_cambio timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS public.historial_producto_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.historial_producto_id_seq OWNED BY public.historial_producto.id;
ALTER TABLE ONLY public.historial_producto ALTER COLUMN id SET DEFAULT nextval('public.historial_producto_id_seq'::regclass);

-- Llaves primarias y únicas de esas tablas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'abonos_pkey') THEN
    ALTER TABLE ONLY public.abonos ADD CONSTRAINT abonos_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ajustes_inventario_pkey') THEN
    ALTER TABLE ONLY public.ajustes_inventario ADD CONSTRAINT ajustes_inventario_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caracteristicas_producto_pkey') THEN
    ALTER TABLE ONLY public.caracteristicas_producto ADD CONSTRAINT caracteristicas_producto_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditos_numero_credito_key') THEN
    ALTER TABLE ONLY public.creditos ADD CONSTRAINT creditos_numero_credito_key UNIQUE (numero_credito);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditos_pkey') THEN
    ALTER TABLE ONLY public.creditos ADD CONSTRAINT creditos_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'detalle_costo_producto_pkey') THEN
    ALTER TABLE ONLY public.detalle_costo_producto ADD CONSTRAINT detalle_costo_producto_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'detalle_credito_pkey') THEN
    ALTER TABLE ONLY public.detalle_credito ADD CONSTRAINT detalle_credito_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facturas_servicio_numero_factura_key') THEN
    ALTER TABLE ONLY public.facturas_servicio ADD CONSTRAINT facturas_servicio_numero_factura_key UNIQUE (numero_factura);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facturas_servicio_pkey') THEN
    ALTER TABLE ONLY public.facturas_servicio ADD CONSTRAINT facturas_servicio_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'historial_producto_pkey') THEN
    ALTER TABLE ONLY public.historial_producto ADD CONSTRAINT historial_producto_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- =====================================================================
-- 2. COLUMNAS PRESENTES EN LA BASE DEL CLIENTE Y AUSENTES AQUÍ
--    (varias son heredadas/duplicadas, pero el código las consulta:
--     p. ej. movimientos_inventario.tipo_movimiento y servicios_venta.es_gratis)
-- =====================================================================

ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS limite_credito numeric(12,2) DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_cliente character varying(20) DEFAULT 'individual'::character varying;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS folio_actual integer DEFAULT 1;
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.detalle_devolucion ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.detalle_factura ADD COLUMN IF NOT EXISTS es_mayoreo boolean DEFAULT false;
ALTER TABLE public.detalle_factura ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.detalle_venta ADD COLUMN IF NOT EXISTS es_mayoreo boolean DEFAULT false;
ALTER TABLE public.detalle_venta ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.devoluciones ADD COLUMN IF NOT EXISTS usuario character varying(100) DEFAULT 'Sistema'::character varying;
ALTER TABLE public.devoluciones ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS notas text;
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS usuario character varying(100);
ALTER TABLE public.facturas ADD COLUMN IF NOT EXISTS dias_credito integer DEFAULT 30;
ALTER TABLE public.movimientos_inventario ADD COLUMN IF NOT EXISTS tipo_movimiento character varying(50);
ALTER TABLE public.pagos_factura ADD COLUMN IF NOT EXISTS usuario character varying(100) DEFAULT 'Sistema'::character varying;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url text;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS precio_con_descuento numeric(15,2);
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS costo numeric(10,2) DEFAULT 0;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS terminos_pago character varying(100);
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.secuencias_ncf ADD COLUMN IF NOT EXISTS descripcion character varying(200);
ALTER TABLE public.secuencias_ncf ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.secuencias_ncf ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.secuencias_ncf ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.servicios_venta ADD COLUMN IF NOT EXISTS es_gratis boolean DEFAULT false;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS banco_tarjeta character varying(100);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS referencia_tarjeta character varying(100);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS banco_transferencia character varying(100);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS referencia_transferencia character varying(100);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS usuario character varying(100);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS ncf character varying(50);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS tipo_comprobante character varying(10);
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

-- =====================================================================
-- 3. FUNCIONES
-- =====================================================================

CREATE OR REPLACE FUNCTION public.actualizar_saldo_credito() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE creditos 
    SET monto_pagado = monto_pagado + NEW.monto,
        saldo_pendiente = monto_total - (monto_pagado + NEW.monto),
        estado = CASE 
            WHEN (monto_total - (monto_pagado + NEW.monto)) <= 0 THEN 'pagado'
            ELSE estado
        END
    WHERE id = NEW.credito_id;
    
    -- Actualizar cliente
    UPDATE clientes c
    SET saldo_pendiente = (
        SELECT COALESCE(SUM(saldo_pendiente), 0)
        FROM creditos
        WHERE cliente_id = c.id AND estado = 'activo'
    )
    FROM creditos cr
    WHERE c.id = cr.cliente_id AND cr.id = NEW.credito_id;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_stock_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE productos 
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generar_codigo_cliente() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    nuevo_codigo VARCHAR(50);
    contador INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 4) AS INTEGER)), 0) + 1 
    INTO contador FROM clientes WHERE codigo LIKE 'CLI%';
    nuevo_codigo := 'CLI' || LPAD(contador::TEXT, 6, '0');
    RETURN nuevo_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.generar_codigo_proveedor() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    nuevo_codigo VARCHAR(50);
    contador INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) + 1 
    INTO contador FROM proveedores WHERE codigo LIKE 'PROV%';
    nuevo_codigo := 'PROV' || LPAD(contador::TEXT, 5, '0');
    RETURN nuevo_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_servicios_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 4. TRIGGERS
--    trigger_actualizar_stock_venta es el que descuenta el stock al
--    vender: ventas-controller.js dejó de hacerlo en código (commit
--    1b93b83) justamente porque este trigger ya lo hacía.
-- =====================================================================

DROP TRIGGER IF EXISTS trigger_actualizar_saldo_credito ON public.abonos;
CREATE TRIGGER trigger_actualizar_saldo_credito AFTER INSERT ON public.abonos FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo_credito();

DROP TRIGGER IF EXISTS trigger_actualizar_stock_venta ON public.detalle_venta;
CREATE TRIGGER trigger_actualizar_stock_venta AFTER INSERT ON public.detalle_venta FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_venta();

DROP TRIGGER IF EXISTS trigger_update_servicios_timestamp ON public.servicios;
CREATE TRIGGER trigger_update_servicios_timestamp BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION public.update_servicios_timestamp();

DROP TRIGGER IF EXISTS update_categorias_updated_at ON public.categorias;
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracion_updated_at ON public.configuracion;
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creditos_updated_at ON public.creditos;
CREATE TRIGGER update_creditos_updated_at BEFORE UPDATE ON public.creditos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_facturas_updated_at ON public.facturas;
CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON public.facturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_proveedores_updated_at ON public.proveedores;
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ventas_updated_at ON public.ventas;
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 5. ÍNDICES Y LLAVES FORÁNEAS DE LAS TABLAS RESTAURADAS
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_abonos_credito ON public.abonos USING btree (credito_id);
CREATE INDEX IF NOT EXISTS idx_caracteristicas_producto ON public.caracteristicas_producto USING btree (producto_id);
CREATE INDEX IF NOT EXISTS idx_creditos_cliente ON public.creditos USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_creditos_estado ON public.creditos USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_historial_producto ON public.historial_producto USING btree (producto_id, fecha_cambio DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'abonos_credito_id_fkey') THEN
    ALTER TABLE ONLY public.abonos ADD CONSTRAINT abonos_credito_id_fkey FOREIGN KEY (credito_id) REFERENCES public.creditos(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'abonos_detalle_credito_id_fkey') THEN
    ALTER TABLE ONLY public.abonos ADD CONSTRAINT abonos_detalle_credito_id_fkey FOREIGN KEY (detalle_credito_id) REFERENCES public.detalle_credito(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ajustes_inventario_producto_id_fkey') THEN
    ALTER TABLE ONLY public.ajustes_inventario ADD CONSTRAINT ajustes_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caracteristicas_producto_producto_id_fkey') THEN
    ALTER TABLE ONLY public.caracteristicas_producto ADD CONSTRAINT caracteristicas_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditos_cliente_id_fkey') THEN
    ALTER TABLE ONLY public.creditos ADD CONSTRAINT creditos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creditos_factura_id_fkey') THEN
    ALTER TABLE ONLY public.creditos ADD CONSTRAINT creditos_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'detalle_costo_producto_producto_id_fkey') THEN
    ALTER TABLE ONLY public.detalle_costo_producto ADD CONSTRAINT detalle_costo_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'detalle_credito_credito_id_fkey') THEN
    ALTER TABLE ONLY public.detalle_credito ADD CONSTRAINT detalle_credito_credito_id_fkey FOREIGN KEY (credito_id) REFERENCES public.creditos(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'detalle_credito_producto_id_fkey') THEN
    ALTER TABLE ONLY public.detalle_credito ADD CONSTRAINT detalle_credito_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facturas_servicio_proveedor_id_fkey') THEN
    ALTER TABLE ONLY public.facturas_servicio ADD CONSTRAINT facturas_servicio_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'historial_producto_producto_id_fkey') THEN
    ALTER TABLE ONLY public.historial_producto ADD CONSTRAINT historial_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
