--
-- PostgreSQL database dump
--

\restrict AiN2130nKHeMbL5sDeDdgN9hJ6qZaOeQPH5lLPKIJ3JfRD6B5dGIvgLbP8T8Gtk

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: actualizar_saldo_credito(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_saldo_credito() RETURNS trigger
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


--
-- Name: actualizar_stock_venta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_stock_venta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE productos 
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$;


--
-- Name: generar_codigo_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_codigo_cliente() RETURNS character varying
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


--
-- Name: generar_codigo_proveedor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_codigo_proveedor() RETURNS character varying
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


--
-- Name: update_servicios_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_servicios_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abonos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abonos (
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


--
-- Name: TABLE abonos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.abonos IS 'Pagos realizados a créditos';


--
-- Name: abonos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.abonos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: abonos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.abonos_id_seq OWNED BY public.abonos.id;


--
-- Name: ajustes_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ajustes_inventario (
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


--
-- Name: ajustes_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ajustes_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ajustes_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ajustes_inventario_id_seq OWNED BY public.ajustes_inventario.id;


--
-- Name: caracteristicas_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caracteristicas_producto (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    valor text NOT NULL,
    tipo character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: caracteristicas_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.caracteristicas_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: caracteristicas_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.caracteristicas_producto_id_seq OWNED BY public.caracteristicas_producto.id;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(200) NOT NULL,
    apellido character varying(200),
    cedula character varying(20),
    rnc character varying(20),
    telefono character varying(20),
    email character varying(100),
    direccion text,
    limite_credito numeric(12,2) DEFAULT 0,
    saldo_pendiente numeric(12,2) DEFAULT 0,
    tipo_cliente character varying(20) DEFAULT 'individual'::character varying,
    notas text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: configuracion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion (
    id integer NOT NULL,
    nombre_negocio character varying(200) NOT NULL,
    rnc character varying(20),
    telefono character varying(20),
    email character varying(100),
    direccion text,
    serie_ticket character varying(10) DEFAULT 'A'::character varying,
    folio_actual integer DEFAULT 1,
    porcentaje_itbis numeric(5,2) DEFAULT 18.00,
    logo_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_id_seq OWNED BY public.configuracion.id;


--
-- Name: creditos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creditos (
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


--
-- Name: TABLE creditos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.creditos IS 'Gestión de ventas a crédito';


--
-- Name: creditos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.creditos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: creditos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.creditos_id_seq OWNED BY public.creditos.id;


--
-- Name: creditos_pendientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.creditos_pendientes AS
 SELECT cr.id,
    cr.numero_credito,
    cl.nombre AS cliente,
    cl.telefono,
    cr.monto_total,
    cr.monto_pagado,
    cr.saldo_pendiente,
    cr.fecha_credito,
    cr.fecha_vencimiento,
        CASE
            WHEN (cr.fecha_vencimiento < CURRENT_DATE) THEN 'Vencido'::text
            WHEN (cr.fecha_vencimiento <= (CURRENT_DATE + '7 days'::interval)) THEN 'Por vencer'::text
            ELSE 'Vigente'::text
        END AS status_vencimiento
   FROM (public.creditos cr
     JOIN public.clientes cl ON ((cr.cliente_id = cl.id)))
  WHERE ((cr.estado)::text = 'activo'::text)
  ORDER BY cr.fecha_vencimiento;


--
-- Name: detalle_costo_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_costo_producto (
    id integer NOT NULL,
    producto_id integer,
    concepto character varying(200) NOT NULL,
    monto numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: detalle_costo_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_costo_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_costo_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_costo_producto_id_seq OWNED BY public.detalle_costo_producto.id;


--
-- Name: detalle_credito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_credito (
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


--
-- Name: detalle_credito_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_credito_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_credito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_credito_id_seq OWNED BY public.detalle_credito.id;


--
-- Name: detalle_devolucion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_devolucion (
    id integer NOT NULL,
    devolucion_id integer NOT NULL,
    detalle_factura_id integer,
    producto_id integer,
    codigo_producto character varying(100),
    nombre_producto character varying(300),
    cantidad_devuelta integer NOT NULL,
    cantidad_original integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    itbis numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: detalle_devolucion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_devolucion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_devolucion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_devolucion_id_seq OWNED BY public.detalle_devolucion.id;


--
-- Name: detalle_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_factura (
    id integer NOT NULL,
    factura_id integer,
    producto_id integer,
    codigo_producto character varying(100),
    nombre_producto character varying(300),
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    precio_costo_unitario numeric(12,2),
    es_mayoreo boolean DEFAULT false,
    descuento numeric(12,2) DEFAULT 0,
    subtotal numeric(12,2) NOT NULL,
    itbis numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    cantidad_devuelta integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: detalle_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_factura_id_seq OWNED BY public.detalle_factura.id;


--
-- Name: detalle_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_venta (
    id integer NOT NULL,
    venta_id integer,
    producto_id integer,
    codigo_producto character varying(100),
    nombre_producto character varying(300),
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    precio_costo_unitario numeric(12,2),
    es_mayoreo boolean DEFAULT false,
    descuento numeric(12,2) DEFAULT 0,
    subtotal numeric(12,2) NOT NULL,
    itbis numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_venta_id_seq OWNED BY public.detalle_venta.id;


--
-- Name: devoluciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devoluciones (
    id integer NOT NULL,
    factura_id integer NOT NULL,
    venta_id integer,
    numero_devolucion character varying(50) NOT NULL,
    tipo character varying(20) NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    itbis numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    motivo text NOT NULL,
    notas text,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    hora time without time zone DEFAULT CURRENT_TIME,
    usuario character varying(100) DEFAULT 'Sistema'::character varying,
    estado character varying(20) DEFAULT 'procesada'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT devoluciones_estado_check CHECK (((estado)::text = ANY (ARRAY[('procesada'::character varying)::text, ('anulada'::character varying)::text]))),
    CONSTRAINT devoluciones_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('parcial'::character varying)::text, ('total'::character varying)::text])))
);


--
-- Name: devoluciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devoluciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devoluciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devoluciones_id_seq OWNED BY public.devoluciones.id;


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas (
    id integer NOT NULL,
    numero_factura character varying(50) NOT NULL,
    ncf character varying(50),
    tipo_comprobante character varying(10),
    cliente_id integer,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    descuento numeric(12,2) DEFAULT 0,
    itbis numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    fecha date NOT NULL,
    fecha_vencimiento date,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    tipo_factura character varying(20) DEFAULT 'contado'::character varying,
    venta_id integer,
    notas text,
    usuario character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    monto_pagado numeric(12,2) DEFAULT 0,
    saldo_pendiente numeric(12,2) DEFAULT 0,
    dias_credito integer DEFAULT 30,
    CONSTRAINT facturas_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('pagada'::character varying)::text, ('vencida'::character varying)::text, ('anulada'::character varying)::text, ('parcial'::character varying)::text])))
);


--
-- Name: TABLE facturas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.facturas IS 'Facturas con NCF para cumplimiento fiscal';


--
-- Name: facturas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_id_seq OWNED BY public.facturas.id;


--
-- Name: facturas_servicio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas_servicio (
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


--
-- Name: facturas_servicio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facturas_servicio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_servicio_id_seq OWNED BY public.facturas_servicio.id;


--
-- Name: historial_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_producto (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    campo_modificado character varying(100) NOT NULL,
    valor_anterior text,
    valor_nuevo text,
    usuario character varying(100),
    fecha_cambio timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: historial_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_producto_id_seq OWNED BY public.historial_producto.id;


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_inventario (
    id integer NOT NULL,
    producto_id integer NOT NULL,
    tipo character varying(20) DEFAULT 'salida'::character varying,
    cantidad integer NOT NULL,
    stock_anterior integer DEFAULT 0,
    stock_nuevo integer DEFAULT 0,
    motivo text,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_movimiento character varying(50),
    usuario character varying(100),
    CONSTRAINT movimientos_inventario_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('entrada'::character varying)::text, ('salida'::character varying)::text, ('ajuste'::character varying)::text, ('devolucion'::character varying)::text, ('manual'::character varying)::text])))
);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimientos_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimientos_inventario_id_seq OWNED BY public.movimientos_inventario.id;


--
-- Name: pagos_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos_factura (
    id integer NOT NULL,
    factura_id integer NOT NULL,
    numero_pago character varying(50) NOT NULL,
    monto numeric(12,2) NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    monto_efectivo numeric(12,2),
    monto_tarjeta numeric(12,2),
    monto_transferencia numeric(12,2),
    banco character varying(100),
    referencia character varying(100),
    numero_cheque character varying(50),
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    hora time without time zone DEFAULT CURRENT_TIME,
    notas text,
    usuario character varying(100) DEFAULT 'Sistema'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pagos_factura_metodo_pago_check CHECK (((metodo_pago)::text = ANY (ARRAY[('efectivo'::character varying)::text, ('tarjeta'::character varying)::text, ('transferencia'::character varying)::text, ('cheque'::character varying)::text, ('mixto'::character varying)::text]))),
    CONSTRAINT pagos_factura_monto_check CHECK ((monto > (0)::numeric))
);


--
-- Name: pagos_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_factura_id_seq OWNED BY public.pagos_factura.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    codigo_barras character varying(100) NOT NULL,
    imei character varying(100),
    nombre character varying(300) NOT NULL,
    descripcion text,
    categoria_id integer,
    precio_costo numeric(15,2) DEFAULT 0 NOT NULL,
    precio_venta numeric(15,2) DEFAULT 0 NOT NULL,
    precio_mayoreo numeric(15,2),
    cantidad_mayoreo integer DEFAULT 5,
    stock_actual integer DEFAULT 0,
    stock_minimo integer DEFAULT 0,
    stock_maximo integer DEFAULT 0,
    proveedor_id integer,
    aplica_itbis boolean DEFAULT true,
    activo boolean DEFAULT true,
    imagen_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    disponible boolean DEFAULT true,
    descuento_porcentaje numeric(5,2) DEFAULT 0,
    descuento_monto numeric(10,2) DEFAULT 0,
    precio_con_descuento numeric(15,2),
    stock integer DEFAULT 0,
    costo numeric(10,2) DEFAULT 0,
    costos jsonb,
    caracteristicas jsonb
);


--
-- Name: TABLE productos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.productos IS 'Catálogo de productos del negocio';


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(200) NOT NULL,
    contacto_nombre character varying(200),
    telefono character varying(20),
    email character varying(100),
    direccion text,
    rnc character varying(20),
    terminos_pago character varying(100),
    notas text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: salidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salidas (
    id integer NOT NULL,
    numero_salida character varying(50) NOT NULL,
    fecha date NOT NULL,
    concepto character varying(300) NOT NULL,
    descripcion text,
    monto numeric(12,2) NOT NULL,
    categoria_gasto character varying(100),
    metodo_pago character varying(50),
    beneficiario character varying(200),
    numero_referencia character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE salidas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.salidas IS 'Registro de gastos y salidas de dinero';


--
-- Name: salidas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salidas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salidas_id_seq OWNED BY public.salidas.id;


--
-- Name: secuencias_ncf; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secuencias_ncf (
    id integer NOT NULL,
    tipo_comprobante character varying(10) NOT NULL,
    descripcion character varying(200),
    serie character varying(5) NOT NULL,
    secuencia_inicial integer NOT NULL,
    secuencia_final integer NOT NULL,
    secuencia_actual integer NOT NULL,
    fecha_vencimiento date,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: secuencias_ncf_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.secuencias_ncf_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: secuencias_ncf_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.secuencias_ncf_id_seq OWNED BY public.secuencias_ncf.id;


--
-- Name: servicios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicios (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    precio numeric(10,2) DEFAULT 0.00 NOT NULL,
    es_gratuito boolean DEFAULT false,
    aplica_itbis boolean DEFAULT false,
    categoria character varying(100),
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE servicios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.servicios IS 'Catálogo de servicios disponibles para agregar a las ventas';


--
-- Name: COLUMN servicios.es_gratuito; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.servicios.es_gratuito IS 'Si el servicio es gratuito (cortesía)';


--
-- Name: COLUMN servicios.aplica_itbis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.servicios.aplica_itbis IS 'Si el servicio está sujeto a ITBIS';


--
-- Name: COLUMN servicios.categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.servicios.categoria IS 'Categoría del servicio: instalacion, proteccion, configuracion, reparacion, otros';


--
-- Name: servicios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicios_id_seq OWNED BY public.servicios.id;


--
-- Name: servicios_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicios_venta (
    id integer NOT NULL,
    venta_id integer NOT NULL,
    servicio_id integer,
    nombre_servicio character varying(200) NOT NULL,
    descripcion text,
    precio numeric(10,2) DEFAULT 0.00 NOT NULL,
    cantidad integer DEFAULT 1,
    es_gratuito boolean DEFAULT false,
    subtotal numeric(10,2) DEFAULT 0.00,
    itbis numeric(10,2) DEFAULT 0.00,
    total numeric(10,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    es_gratis boolean DEFAULT false
);


--
-- Name: TABLE servicios_venta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.servicios_venta IS 'Servicios aplicados a cada venta específica';


--
-- Name: servicios_mas_usados; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.servicios_mas_usados AS
 SELECT s.id,
    s.nombre,
    s.precio,
    count(sv.id) AS veces_usado,
    sum(
        CASE
            WHEN sv.es_gratuito THEN (0)::numeric
            ELSE sv.total
        END) AS ingresos_generados
   FROM (public.servicios s
     LEFT JOIN public.servicios_venta sv ON ((s.id = sv.servicio_id)))
  GROUP BY s.id, s.nombre, s.precio
  ORDER BY (count(sv.id)) DESC;


--
-- Name: servicios_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicios_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicios_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicios_venta_id_seq OWNED BY public.servicios_venta.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    numero_ticket character varying(50) NOT NULL,
    cliente_id integer,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    descuento numeric(12,2) DEFAULT 0,
    itbis numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    metodo_pago character varying(50) NOT NULL,
    monto_efectivo numeric(12,2) DEFAULT 0,
    monto_tarjeta numeric(12,2) DEFAULT 0,
    monto_transferencia numeric(12,2) DEFAULT 0,
    banco_tarjeta character varying(100),
    referencia_tarjeta character varying(100),
    banco_transferencia character varying(100),
    referencia_transferencia character varying(100),
    monto_recibido numeric(12,2),
    cambio numeric(12,2),
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    estado character varying(20) DEFAULT 'completada'::character varying,
    notas text,
    usuario character varying(100),
    ncf character varying(50),
    tipo_comprobante character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    banco character varying(100),
    referencia character varying(100),
    incluir_itbis boolean DEFAULT true,
    generar_factura_electronica boolean DEFAULT false
);


--
-- Name: TABLE ventas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ventas IS 'Registro de todas las ventas (tickets)';


--
-- Name: ventas_del_dia; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ventas_del_dia AS
 SELECT v.id,
    v.numero_ticket,
    v.fecha,
    v.hora,
    c.nombre AS cliente,
    v.total,
    v.metodo_pago,
    v.estado
   FROM (public.ventas v
     LEFT JOIN public.clientes c ON ((v.cliente_id = c.id)))
  WHERE (v.fecha = CURRENT_DATE)
  ORDER BY v.hora DESC;


--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: abonos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abonos ALTER COLUMN id SET DEFAULT nextval('public.abonos_id_seq'::regclass);


--
-- Name: ajustes_inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustes_inventario ALTER COLUMN id SET DEFAULT nextval('public.ajustes_inventario_id_seq'::regclass);


--
-- Name: caracteristicas_producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caracteristicas_producto ALTER COLUMN id SET DEFAULT nextval('public.caracteristicas_producto_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: configuracion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion ALTER COLUMN id SET DEFAULT nextval('public.configuracion_id_seq'::regclass);


--
-- Name: creditos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditos ALTER COLUMN id SET DEFAULT nextval('public.creditos_id_seq'::regclass);


--
-- Name: detalle_costo_producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_costo_producto ALTER COLUMN id SET DEFAULT nextval('public.detalle_costo_producto_id_seq'::regclass);


--
-- Name: detalle_credito id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_credito ALTER COLUMN id SET DEFAULT nextval('public.detalle_credito_id_seq'::regclass);


--
-- Name: detalle_devolucion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_devolucion ALTER COLUMN id SET DEFAULT nextval('public.detalle_devolucion_id_seq'::regclass);


--
-- Name: detalle_factura id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura ALTER COLUMN id SET DEFAULT nextval('public.detalle_factura_id_seq'::regclass);


--
-- Name: detalle_venta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id SET DEFAULT nextval('public.detalle_venta_id_seq'::regclass);


--
-- Name: devoluciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones ALTER COLUMN id SET DEFAULT nextval('public.devoluciones_id_seq'::regclass);


--
-- Name: facturas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas ALTER COLUMN id SET DEFAULT nextval('public.facturas_id_seq'::regclass);


--
-- Name: facturas_servicio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_servicio ALTER COLUMN id SET DEFAULT nextval('public.facturas_servicio_id_seq'::regclass);


--
-- Name: historial_producto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_producto ALTER COLUMN id SET DEFAULT nextval('public.historial_producto_id_seq'::regclass);


--
-- Name: movimientos_inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id SET DEFAULT nextval('public.movimientos_inventario_id_seq'::regclass);


--
-- Name: pagos_factura id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_factura ALTER COLUMN id SET DEFAULT nextval('public.pagos_factura_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: productos codigo_barras; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN codigo_barras SET DEFAULT ('PROD-'::text || (nextval('public.productos_id_seq'::regclass))::text);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: salidas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salidas ALTER COLUMN id SET DEFAULT nextval('public.salidas_id_seq'::regclass);


--
-- Name: secuencias_ncf id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secuencias_ncf ALTER COLUMN id SET DEFAULT nextval('public.secuencias_ncf_id_seq'::regclass);


--
-- Name: servicios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios ALTER COLUMN id SET DEFAULT nextval('public.servicios_id_seq'::regclass);


--
-- Name: servicios_venta id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios_venta ALTER COLUMN id SET DEFAULT nextval('public.servicios_venta_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Name: abonos abonos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abonos
    ADD CONSTRAINT abonos_pkey PRIMARY KEY (id);


--
-- Name: ajustes_inventario ajustes_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_pkey PRIMARY KEY (id);


--
-- Name: caracteristicas_producto caracteristicas_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caracteristicas_producto
    ADD CONSTRAINT caracteristicas_producto_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_cedula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cedula_key UNIQUE (cedula);


--
-- Name: clientes clientes_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_codigo_key UNIQUE (codigo);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: configuracion configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (id);


--
-- Name: creditos creditos_numero_credito_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_numero_credito_key UNIQUE (numero_credito);


--
-- Name: creditos creditos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_pkey PRIMARY KEY (id);


--
-- Name: detalle_costo_producto detalle_costo_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_costo_producto
    ADD CONSTRAINT detalle_costo_producto_pkey PRIMARY KEY (id);


--
-- Name: detalle_credito detalle_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_credito
    ADD CONSTRAINT detalle_credito_pkey PRIMARY KEY (id);


--
-- Name: detalle_devolucion detalle_devolucion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_pkey PRIMARY KEY (id);


--
-- Name: detalle_factura detalle_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_pkey PRIMARY KEY (id);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id);


--
-- Name: devoluciones devoluciones_numero_devolucion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_numero_devolucion_key UNIQUE (numero_devolucion);


--
-- Name: devoluciones devoluciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_pkey PRIMARY KEY (id);


--
-- Name: facturas facturas_numero_factura_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_numero_factura_key UNIQUE (numero_factura);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- Name: facturas_servicio facturas_servicio_numero_factura_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_servicio
    ADD CONSTRAINT facturas_servicio_numero_factura_key UNIQUE (numero_factura);


--
-- Name: facturas_servicio facturas_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_servicio
    ADD CONSTRAINT facturas_servicio_pkey PRIMARY KEY (id);


--
-- Name: historial_producto historial_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_producto
    ADD CONSTRAINT historial_producto_pkey PRIMARY KEY (id);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- Name: pagos_factura pagos_factura_numero_pago_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_factura
    ADD CONSTRAINT pagos_factura_numero_pago_key UNIQUE (numero_pago);


--
-- Name: pagos_factura pagos_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_factura
    ADD CONSTRAINT pagos_factura_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_codigo_key UNIQUE (codigo);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: salidas salidas_numero_salida_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salidas
    ADD CONSTRAINT salidas_numero_salida_key UNIQUE (numero_salida);


--
-- Name: salidas salidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salidas
    ADD CONSTRAINT salidas_pkey PRIMARY KEY (id);


--
-- Name: secuencias_ncf secuencias_ncf_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secuencias_ncf
    ADD CONSTRAINT secuencias_ncf_pkey PRIMARY KEY (id);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id);


--
-- Name: servicios_venta servicios_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios_venta
    ADD CONSTRAINT servicios_venta_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_numero_ticket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_numero_ticket_key UNIQUE (numero_ticket);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: idx_abonos_credito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_abonos_credito ON public.abonos USING btree (credito_id);


--
-- Name: idx_caracteristicas_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caracteristicas_producto ON public.caracteristicas_producto USING btree (producto_id);


--
-- Name: idx_categorias_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categorias_nombre ON public.categorias USING btree (nombre);


--
-- Name: idx_creditos_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditos_cliente ON public.creditos USING btree (cliente_id);


--
-- Name: idx_creditos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditos_estado ON public.creditos USING btree (estado);


--
-- Name: idx_detalle_devolucion_devolucion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_devolucion_devolucion ON public.detalle_devolucion USING btree (devolucion_id);


--
-- Name: idx_detalle_devolucion_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_devolucion_producto ON public.detalle_devolucion USING btree (producto_id);


--
-- Name: idx_detalle_venta_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_venta_producto ON public.detalle_venta USING btree (producto_id);


--
-- Name: idx_devoluciones_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devoluciones_factura ON public.devoluciones USING btree (factura_id);


--
-- Name: idx_devoluciones_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devoluciones_fecha ON public.devoluciones USING btree (fecha);


--
-- Name: idx_facturas_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_cliente ON public.facturas USING btree (cliente_id);


--
-- Name: idx_facturas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_fecha ON public.facturas USING btree (fecha);


--
-- Name: idx_historial_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_producto ON public.historial_producto USING btree (producto_id, fecha_cambio DESC);


--
-- Name: idx_movimientos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_fecha ON public.movimientos_inventario USING btree (fecha);


--
-- Name: idx_movimientos_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_producto ON public.movimientos_inventario USING btree (producto_id);


--
-- Name: idx_movimientos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimientos_tipo ON public.movimientos_inventario USING btree (tipo);


--
-- Name: idx_pagos_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_factura ON public.pagos_factura USING btree (factura_id);


--
-- Name: idx_pagos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_fecha ON public.pagos_factura USING btree (fecha);


--
-- Name: idx_productos_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_categoria ON public.productos USING btree (categoria_id);


--
-- Name: idx_productos_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_codigo_barras ON public.productos USING btree (codigo_barras);


--
-- Name: idx_productos_imei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_imei ON public.productos USING btree (imei);


--
-- Name: idx_productos_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_nombre ON public.productos USING btree (nombre);


--
-- Name: idx_productos_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_productos_proveedor ON public.productos USING btree (proveedor_id);


--
-- Name: idx_proveedores_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_codigo ON public.proveedores USING btree (codigo);


--
-- Name: idx_proveedores_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_nombre ON public.proveedores USING btree (nombre);


--
-- Name: idx_proveedores_rnc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_rnc ON public.proveedores USING btree (rnc);


--
-- Name: idx_servicios_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servicios_activo ON public.servicios USING btree (activo);


--
-- Name: idx_servicios_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servicios_categoria ON public.servicios USING btree (categoria);


--
-- Name: idx_servicios_venta_servicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servicios_venta_servicio_id ON public.servicios_venta USING btree (servicio_id);


--
-- Name: idx_servicios_venta_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servicios_venta_venta_id ON public.servicios_venta USING btree (venta_id);


--
-- Name: idx_ventas_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_cliente ON public.ventas USING btree (cliente_id);


--
-- Name: idx_ventas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (fecha);


--
-- Name: unique_codigo_barras_not_null; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_codigo_barras_not_null ON public.productos USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);


--
-- Name: unique_imei_not_null; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_imei_not_null ON public.productos USING btree (imei) WHERE (imei IS NOT NULL);


--
-- Name: abonos trigger_actualizar_saldo_credito; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_saldo_credito AFTER INSERT ON public.abonos FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo_credito();


--
-- Name: detalle_venta trigger_actualizar_stock_venta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_stock_venta AFTER INSERT ON public.detalle_venta FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_venta();


--
-- Name: servicios trigger_update_servicios_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_servicios_timestamp BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION public.update_servicios_timestamp();


--
-- Name: categorias update_categorias_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clientes update_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: configuracion update_configuracion_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creditos update_creditos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_creditos_updated_at BEFORE UPDATE ON public.creditos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: facturas update_facturas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON public.facturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proveedores update_proveedores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ventas update_ventas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: abonos abonos_credito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abonos
    ADD CONSTRAINT abonos_credito_id_fkey FOREIGN KEY (credito_id) REFERENCES public.creditos(id);


--
-- Name: abonos abonos_detalle_credito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abonos
    ADD CONSTRAINT abonos_detalle_credito_id_fkey FOREIGN KEY (detalle_credito_id) REFERENCES public.detalle_credito(id);


--
-- Name: ajustes_inventario ajustes_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: caracteristicas_producto caracteristicas_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caracteristicas_producto
    ADD CONSTRAINT caracteristicas_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: creditos creditos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: creditos creditos_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);


--
-- Name: detalle_costo_producto detalle_costo_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_costo_producto
    ADD CONSTRAINT detalle_costo_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: detalle_credito detalle_credito_credito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_credito
    ADD CONSTRAINT detalle_credito_credito_id_fkey FOREIGN KEY (credito_id) REFERENCES public.creditos(id) ON DELETE CASCADE;


--
-- Name: detalle_credito detalle_credito_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_credito
    ADD CONSTRAINT detalle_credito_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_devolucion detalle_devolucion_detalle_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_detalle_factura_id_fkey FOREIGN KEY (detalle_factura_id) REFERENCES public.detalle_factura(id);


--
-- Name: detalle_devolucion detalle_devolucion_devolucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_devolucion_id_fkey FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones(id) ON DELETE CASCADE;


--
-- Name: detalle_devolucion detalle_devolucion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_factura detalle_factura_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE CASCADE;


--
-- Name: detalle_factura detalle_factura_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- Name: devoluciones devoluciones_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);


--
-- Name: devoluciones devoluciones_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- Name: facturas facturas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: facturas_servicio facturas_servicio_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_servicio
    ADD CONSTRAINT facturas_servicio_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: facturas facturas_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- Name: historial_producto historial_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_producto
    ADD CONSTRAINT historial_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: movimientos_inventario movimientos_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: pagos_factura pagos_factura_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_factura
    ADD CONSTRAINT pagos_factura_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: productos productos_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: servicios_venta servicios_venta_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios_venta
    ADD CONSTRAINT servicios_venta_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE SET NULL;


--
-- Name: servicios_venta servicios_venta_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios_venta
    ADD CONSTRAINT servicios_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- Name: ventas ventas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict AiN2130nKHeMbL5sDeDdgN9hJ6qZaOeQPH5lLPKIJ3JfRD6B5dGIvgLbP8T8Gtk

