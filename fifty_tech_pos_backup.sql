--
-- PostgreSQL database dump
--

\restrict B9glh98d5Oi1HPJnaJBIqj7vwxgyZkpfKPzFkfd6i9zBqpa8k9Yjd984Y4d5NOl

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
-- Name: actualizar_saldo_credito(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.actualizar_saldo_credito() OWNER TO postgres;

--
-- Name: actualizar_stock_venta(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.actualizar_stock_venta() OWNER TO postgres;

--
-- Name: generar_codigo_cliente(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.generar_codigo_cliente() OWNER TO postgres;

--
-- Name: generar_codigo_proveedor(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.generar_codigo_proveedor() OWNER TO postgres;

--
-- Name: update_servicios_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_servicios_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_servicios_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abonos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.abonos OWNER TO postgres;

--
-- Name: TABLE abonos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.abonos IS 'Pagos realizados a créditos';


--
-- Name: abonos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.abonos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.abonos_id_seq OWNER TO postgres;

--
-- Name: abonos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.abonos_id_seq OWNED BY public.abonos.id;


--
-- Name: ajustes_inventario; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ajustes_inventario OWNER TO postgres;

--
-- Name: ajustes_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ajustes_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ajustes_inventario_id_seq OWNER TO postgres;

--
-- Name: ajustes_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ajustes_inventario_id_seq OWNED BY public.ajustes_inventario.id;


--
-- Name: caracteristicas_producto; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.caracteristicas_producto OWNER TO postgres;

--
-- Name: caracteristicas_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.caracteristicas_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.caracteristicas_producto_id_seq OWNER TO postgres;

--
-- Name: caracteristicas_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.caracteristicas_producto_id_seq OWNED BY public.caracteristicas_producto.id;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO postgres;

--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: configuracion; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.configuracion OWNER TO postgres;

--
-- Name: configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.configuracion_id_seq OWNER TO postgres;

--
-- Name: configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.configuracion_id_seq OWNED BY public.configuracion.id;


--
-- Name: creditos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.creditos OWNER TO postgres;

--
-- Name: TABLE creditos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.creditos IS 'Gestión de ventas a crédito';


--
-- Name: creditos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.creditos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.creditos_id_seq OWNER TO postgres;

--
-- Name: creditos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.creditos_id_seq OWNED BY public.creditos.id;


--
-- Name: creditos_pendientes; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.creditos_pendientes OWNER TO postgres;

--
-- Name: detalle_costo_producto; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_costo_producto (
    id integer NOT NULL,
    producto_id integer,
    concepto character varying(200) NOT NULL,
    monto numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.detalle_costo_producto OWNER TO postgres;

--
-- Name: detalle_costo_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_costo_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_costo_producto_id_seq OWNER TO postgres;

--
-- Name: detalle_costo_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_costo_producto_id_seq OWNED BY public.detalle_costo_producto.id;


--
-- Name: detalle_credito; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.detalle_credito OWNER TO postgres;

--
-- Name: detalle_credito_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_credito_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_credito_id_seq OWNER TO postgres;

--
-- Name: detalle_credito_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_credito_id_seq OWNED BY public.detalle_credito.id;


--
-- Name: detalle_devolucion; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.detalle_devolucion OWNER TO postgres;

--
-- Name: detalle_devolucion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_devolucion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_devolucion_id_seq OWNER TO postgres;

--
-- Name: detalle_devolucion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_devolucion_id_seq OWNED BY public.detalle_devolucion.id;


--
-- Name: detalle_factura; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.detalle_factura OWNER TO postgres;

--
-- Name: detalle_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_factura_id_seq OWNER TO postgres;

--
-- Name: detalle_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_factura_id_seq OWNED BY public.detalle_factura.id;


--
-- Name: detalle_venta; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.detalle_venta OWNER TO postgres;

--
-- Name: detalle_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_venta_id_seq OWNER TO postgres;

--
-- Name: detalle_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_venta_id_seq OWNED BY public.detalle_venta.id;


--
-- Name: devoluciones; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.devoluciones OWNER TO postgres;

--
-- Name: devoluciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devoluciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devoluciones_id_seq OWNER TO postgres;

--
-- Name: devoluciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devoluciones_id_seq OWNED BY public.devoluciones.id;


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.facturas OWNER TO postgres;

--
-- Name: TABLE facturas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.facturas IS 'Facturas con NCF para cumplimiento fiscal';


--
-- Name: facturas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.facturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facturas_id_seq OWNER TO postgres;

--
-- Name: facturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.facturas_id_seq OWNED BY public.facturas.id;


--
-- Name: facturas_servicio; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.facturas_servicio OWNER TO postgres;

--
-- Name: facturas_servicio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.facturas_servicio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facturas_servicio_id_seq OWNER TO postgres;

--
-- Name: facturas_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.facturas_servicio_id_seq OWNED BY public.facturas_servicio.id;


--
-- Name: historial_producto; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.historial_producto OWNER TO postgres;

--
-- Name: historial_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_producto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_producto_id_seq OWNER TO postgres;

--
-- Name: historial_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_producto_id_seq OWNED BY public.historial_producto.id;


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.movimientos_inventario OWNER TO postgres;

--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_inventario_id_seq OWNER TO postgres;

--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_inventario_id_seq OWNED BY public.movimientos_inventario.id;


--
-- Name: pagos_factura; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.pagos_factura OWNER TO postgres;

--
-- Name: pagos_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pagos_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pagos_factura_id_seq OWNER TO postgres;

--
-- Name: pagos_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pagos_factura_id_seq OWNED BY public.pagos_factura.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.productos OWNER TO postgres;

--
-- Name: TABLE productos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.productos IS 'Catálogo de productos del negocio';


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO postgres;

--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.proveedores OWNER TO postgres;

--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proveedores_id_seq OWNER TO postgres;

--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: salidas; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.salidas OWNER TO postgres;

--
-- Name: TABLE salidas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.salidas IS 'Registro de gastos y salidas de dinero';


--
-- Name: salidas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salidas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salidas_id_seq OWNER TO postgres;

--
-- Name: salidas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salidas_id_seq OWNED BY public.salidas.id;


--
-- Name: secuencias_ncf; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.secuencias_ncf OWNER TO postgres;

--
-- Name: secuencias_ncf_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.secuencias_ncf_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.secuencias_ncf_id_seq OWNER TO postgres;

--
-- Name: secuencias_ncf_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.secuencias_ncf_id_seq OWNED BY public.secuencias_ncf.id;


--
-- Name: servicios; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.servicios OWNER TO postgres;

--
-- Name: TABLE servicios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.servicios IS 'Catálogo de servicios disponibles para agregar a las ventas';


--
-- Name: COLUMN servicios.es_gratuito; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.servicios.es_gratuito IS 'Si el servicio es gratuito (cortesía)';


--
-- Name: COLUMN servicios.aplica_itbis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.servicios.aplica_itbis IS 'Si el servicio está sujeto a ITBIS';


--
-- Name: COLUMN servicios.categoria; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.servicios.categoria IS 'Categoría del servicio: instalacion, proteccion, configuracion, reparacion, otros';


--
-- Name: servicios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.servicios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.servicios_id_seq OWNER TO postgres;

--
-- Name: servicios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.servicios_id_seq OWNED BY public.servicios.id;


--
-- Name: servicios_venta; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.servicios_venta OWNER TO postgres;

--
-- Name: TABLE servicios_venta; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.servicios_venta IS 'Servicios aplicados a cada venta específica';


--
-- Name: servicios_mas_usados; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.servicios_mas_usados OWNER TO postgres;

--
-- Name: servicios_venta_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.servicios_venta_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.servicios_venta_id_seq OWNER TO postgres;

--
-- Name: servicios_venta_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.servicios_venta_id_seq OWNED BY public.servicios_venta.id;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ventas OWNER TO postgres;

--
-- Name: TABLE ventas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ventas IS 'Registro de todas las ventas (tickets)';


--
-- Name: ventas_del_dia; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.ventas_del_dia OWNER TO postgres;

--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventas_id_seq OWNER TO postgres;

--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: abonos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonos ALTER COLUMN id SET DEFAULT nextval('public.abonos_id_seq'::regclass);


--
-- Name: ajustes_inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario ALTER COLUMN id SET DEFAULT nextval('public.ajustes_inventario_id_seq'::regclass);


--
-- Name: caracteristicas_producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caracteristicas_producto ALTER COLUMN id SET DEFAULT nextval('public.caracteristicas_producto_id_seq'::regclass);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: configuracion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion ALTER COLUMN id SET DEFAULT nextval('public.configuracion_id_seq'::regclass);


--
-- Name: creditos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creditos ALTER COLUMN id SET DEFAULT nextval('public.creditos_id_seq'::regclass);


--
-- Name: detalle_costo_producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_costo_producto ALTER COLUMN id SET DEFAULT nextval('public.detalle_costo_producto_id_seq'::regclass);


--
-- Name: detalle_credito id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_credito ALTER COLUMN id SET DEFAULT nextval('public.detalle_credito_id_seq'::regclass);


--
-- Name: detalle_devolucion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion ALTER COLUMN id SET DEFAULT nextval('public.detalle_devolucion_id_seq'::regclass);


--
-- Name: detalle_factura id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_factura ALTER COLUMN id SET DEFAULT nextval('public.detalle_factura_id_seq'::regclass);


--
-- Name: detalle_venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id SET DEFAULT nextval('public.detalle_venta_id_seq'::regclass);


--
-- Name: devoluciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones ALTER COLUMN id SET DEFAULT nextval('public.devoluciones_id_seq'::regclass);


--
-- Name: facturas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas ALTER COLUMN id SET DEFAULT nextval('public.facturas_id_seq'::regclass);


--
-- Name: facturas_servicio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas_servicio ALTER COLUMN id SET DEFAULT nextval('public.facturas_servicio_id_seq'::regclass);


--
-- Name: historial_producto id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_producto ALTER COLUMN id SET DEFAULT nextval('public.historial_producto_id_seq'::regclass);


--
-- Name: movimientos_inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id SET DEFAULT nextval('public.movimientos_inventario_id_seq'::regclass);


--
-- Name: pagos_factura id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_factura ALTER COLUMN id SET DEFAULT nextval('public.pagos_factura_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: productos codigo_barras; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN codigo_barras SET DEFAULT ('PROD-'::text || (nextval('public.productos_id_seq'::regclass))::text);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: salidas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salidas ALTER COLUMN id SET DEFAULT nextval('public.salidas_id_seq'::regclass);


--
-- Name: secuencias_ncf id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.secuencias_ncf ALTER COLUMN id SET DEFAULT nextval('public.secuencias_ncf_id_seq'::regclass);


--
-- Name: servicios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios ALTER COLUMN id SET DEFAULT nextval('public.servicios_id_seq'::regclass);


--
-- Name: servicios_venta id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_venta ALTER COLUMN id SET DEFAULT nextval('public.servicios_venta_id_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Data for Name: abonos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.abonos (id, credito_id, detalle_credito_id, monto, metodo_pago, banco, numero_referencia, fecha, hora, usuario, notas, created_at) FROM stdin;
\.


--
-- Data for Name: ajustes_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ajustes_inventario (id, producto_id, tipo_ajuste, cantidad_anterior, cantidad_ajuste, cantidad_nueva, motivo, usuario, fecha) FROM stdin;
\.


--
-- Data for Name: caracteristicas_producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.caracteristicas_producto (id, producto_id, nombre, valor, tipo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id, nombre, descripcion, activo, created_at) FROM stdin;
1	Smartphones	\N	t	2026-02-24 12:31:02.78097
2	Computadoras y Tablets	\N	t	2026-02-24 12:31:02.78097
3	Audio	\N	t	2026-02-24 12:31:02.78097
4	Accesorios	\N	t	2026-02-24 12:31:02.78097
5	Cables y Cargadores	\N	t	2026-02-24 12:31:02.78097
6	Telefonos	\N	t	2026-02-24 13:57:32.711327
7	Celulares	\N	t	2026-02-24 13:57:38.064666
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id, codigo, nombre, apellido, cedula, rnc, telefono, email, direccion, limite_credito, saldo_pendiente, tipo_cliente, notas, activo, created_at, updated_at) FROM stdin;
1	CLI000001	Cliente General	\N	\N	\N	\N	\N	\N	0.00	0.00	individual	\N	t	2025-12-19 12:17:21.359644	2025-12-19 12:17:21.359644
4	CLI000004	Tech Solutions SRL	\N	\N	\N	809-555-0003	ventas@techsolutions.com	Plaza Comercial #789, Santiago	100000.00	0.00	corporativo	\N	t	2025-12-19 12:17:34.025944	2025-12-19 12:17:34.025944
6	CLI000006	Ana	López	001-4567890-1	\N	809-555-0005	ana.lopez@example.com	Av. 27 de Febrero #654, Santiago	40000.00	0.00	individual	prueba update	t	2025-12-19 12:17:34.025944	2026-02-12 13:04:01.790097
5	CLI000005	Pedro	Martínez	001-3456789-0	\N	809-555-0004	pedro.martinez@example.com	Calle del Sol #321, Santiago	25000.00	0.00	mayorista	\N	t	2025-12-19 12:17:34.025944	2026-02-24 10:38:37.243247
10	CLI0007	Fulano	De tal	123123123123					0.00	0.00	individual		t	2026-02-24 12:19:05.11256	2026-02-24 12:19:05.11256
2	CLI000002	Juan	Pérez	001-1234567-8	\N	809-555-0001	juan.perez@example.com	Calle Principal #123, Santiago	50000.00	88950.00	individual	\N	t	2025-12-19 12:17:34.025944	2026-02-24 14:35:38.610357
\.


--
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.configuracion (id, nombre_negocio, rnc, telefono, email, direccion, serie_ticket, folio_actual, porcentaje_itbis, logo_url, created_at, updated_at) FROM stdin;
1	Fifty Tech	130-98765-4	809-555-9999	info@fiftytech.com	Av. 27 de Febrero #1234, Santiago, República Dominicana	A	6	18.00	\N	2025-12-19 12:17:21.358288	2025-12-19 12:17:21.358288
2	Fifty Tech POS					A01	1	18.00	\N	2026-01-11 13:44:28.063846	2026-01-11 13:44:28.063846
\.


--
-- Data for Name: creditos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.creditos (id, numero_credito, cliente_id, factura_id, monto_total, monto_pagado, saldo_pendiente, fecha_credito, fecha_vencimiento, estado, notas, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: detalle_costo_producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_costo_producto (id, producto_id, concepto, monto, created_at) FROM stdin;
\.


--
-- Data for Name: detalle_credito; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_credito (id, credito_id, producto_id, nombre_producto, cantidad, precio_unitario, monto_producto, monto_pagado_producto, saldo_producto, created_at) FROM stdin;
\.


--
-- Data for Name: detalle_devolucion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_devolucion (id, devolucion_id, detalle_factura_id, producto_id, codigo_producto, nombre_producto, cantidad_devuelta, cantidad_original, precio_unitario, subtotal, itbis, total, created_at) FROM stdin;
1	1	1	2	194253740072	iPhone 15 128GB	1	5	67500.00	67500.00	12150.00	79650.00	2026-02-24 14:28:30.359622
2	2	2	24	350308318749424	whatever	1	1	30000.00	30000.00	5400.00	35400.00	2026-02-24 14:34:42.109449
3	3	1	2	194253740072	iPhone 15 128GB	1	5	67500.00	67500.00	12150.00	79650.00	2026-02-24 14:35:38.610357
\.


--
-- Data for Name: detalle_factura; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_factura (id, factura_id, producto_id, codigo_producto, nombre_producto, cantidad, precio_unitario, precio_costo_unitario, es_mayoreo, descuento, subtotal, itbis, total, cantidad_devuelta, created_at) FROM stdin;
2	2	24	350308318749424	whatever	1	30000.00	17000.00	f	0.00	30000.00	5400.00	35400.00	1	2026-02-24 14:24:42.308595
1	1	2	194253740072	iPhone 15 128GB	5	67500.00	55000.00	f	0.00	337500.00	60750.00	398250.00	2	2026-02-24 13:33:54.51776
\.


--
-- Data for Name: detalle_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_venta (id, venta_id, producto_id, codigo_producto, nombre_producto, cantidad, precio_unitario, precio_costo_unitario, es_mayoreo, descuento, subtotal, itbis, total, created_at) FROM stdin;
1	1	2	194253740072	iPhone 15 128GB	5	67500.00	55000.00	f	0.00	337500.00	60750.00	398250.00	2026-02-24 13:33:54.51776
2	2	24	350308318749424	whatever	1	30000.00	17000.00	f	0.00	30000.00	5400.00	35400.00	2026-02-24 14:24:42.308595
\.


--
-- Data for Name: devoluciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devoluciones (id, factura_id, venta_id, numero_devolucion, tipo, subtotal, itbis, total, motivo, notas, fecha, hora, usuario, estado, created_at, updated_at) FROM stdin;
1	1	1	DEV-00000001	total	67500.00	12150.00	79650.00	defectuoso	\N	2026-02-24	14:28:30.359622	Sistema	procesada	2026-02-24 14:28:30.359622	2026-02-24 14:28:30.359622
2	2	2	DEV-00000002	total	30000.00	5400.00	35400.00	prueba	\N	2026-02-24	14:34:42.109449	Sistema	procesada	2026-02-24 14:34:42.109449	2026-02-24 14:34:42.109449
3	1	1	DEV-00000003	total	67500.00	12150.00	79650.00	prueba	\N	2026-02-24	14:35:38.610357	Sistema	procesada	2026-02-24 14:35:38.610357	2026-02-24 14:35:38.610357
\.


--
-- Data for Name: facturas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facturas (id, numero_factura, ncf, tipo_comprobante, cliente_id, subtotal, descuento, itbis, total, fecha, fecha_vencimiento, estado, tipo_factura, venta_id, notas, usuario, created_at, updated_at, monto_pagado, saldo_pendiente, dias_credito) FROM stdin;
2	FAC-00000002	B02-00000002	B02	\N	30000.00	0.00	5400.00	35400.00	2026-02-24	\N	pagada	contado	2	\N	\N	2026-02-24 14:24:42.308595	2026-02-24 14:24:42.308595	0.00	0.00	30
1	FAC-00000001	B02-00000001	B02	2	337500.00	0.00	60750.00	398250.00	2026-02-24	2026-06-24	parcial	credito	1	\N	\N	2026-02-24 13:33:54.51776	2026-02-24 14:35:38.610357	150000.00	168600.00	30
\.


--
-- Data for Name: facturas_servicio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.facturas_servicio (id, numero_factura, proveedor_id, fecha, subtotal, itbis, total, notas, estado, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: historial_producto; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.historial_producto (id, producto_id, campo_modificado, valor_anterior, valor_nuevo, usuario, fecha_cambio) FROM stdin;
\.


--
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_inventario (id, producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, fecha, tipo_movimiento, usuario) FROM stdin;
1	2	salida	5	8	3	Venta #1	2026-02-24 13:33:54.51776	\N	Sistema
2	24	salida	1	1	0	Venta #2	2026-02-24 14:24:42.308595	\N	Sistema
3	2	entrada	1	0	0	Devolución DEV-00000001 - defectuoso	2026-02-24 14:28:30.359622	\N	Sistema
4	24	entrada	1	0	0	Devolución DEV-00000002 - prueba	2026-02-24 14:34:42.109449	\N	Sistema
5	2	entrada	1	0	0	Devolución DEV-00000003 - prueba	2026-02-24 14:35:38.610357	\N	Sistema
\.


--
-- Data for Name: pagos_factura; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos_factura (id, factura_id, numero_pago, monto, metodo_pago, monto_efectivo, monto_tarjeta, monto_transferencia, banco, referencia, numero_cheque, fecha, hora, notas, usuario, created_at) FROM stdin;
1	1	PAG-00000001	100000.00	efectivo	100000.00	\N	\N	\N	\N	\N	2026-02-24	13:33:54.51776	Pago inicial en venta	Sistema	2026-02-24 13:33:54.51776
2	1	PAG-00000002	50000.00	efectivo	\N	\N	\N	\N	\N	\N	2026-02-24	13:40:20.865039	\N	Sistema	2026-02-24 13:40:20.865039
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id, codigo_barras, imei, nombre, descripcion, categoria_id, precio_costo, precio_venta, precio_mayoreo, cantidad_mayoreo, stock_actual, stock_minimo, stock_maximo, proveedor_id, aplica_itbis, activo, imagen_url, created_at, updated_at, disponible, descuento_porcentaje, descuento_monto, precio_con_descuento, stock, costo, costos, caracteristicas) FROM stdin;
1	194253741931	\N	iPhone 15 Pro Max 256GB	Smartphone Apple iPhone 15 Pro Max 256GB Titanio Natural	1	82000.00	98000.00	\N	5	5	2	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
3	194253706573	\N	iPhone 14 128GB	Smartphone Apple iPhone 14 128GB Azul	1	43000.00	52000.00	\N	5	10	3	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
4	8806095070797	\N	Samsung Galaxy S24 Ultra 256GB	Smartphone Samsung Galaxy S24 Ultra 256GB Titanio Negro	1	70000.00	85000.00	\N	5	4	2	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
5	8806095070568	\N	Samsung Galaxy S24 128GB	Smartphone Samsung Galaxy S24 128GB Violeta	1	48000.00	58000.00	\N	5	7	2	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
6	8806095264837	\N	Samsung Galaxy A55 128GB	Smartphone Samsung Galaxy A55 128GB Azul Marino	1	22000.00	28500.00	\N	5	12	3	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
7	194253508021	\N	MacBook Air M2 256GB	Laptop Apple MacBook Air 13" chip M2 256GB Gris Espacial	2	108000.00	128000.00	\N	5	3	1	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
8	194253754511	\N	iPad Air M2 64GB WiFi	Tablet Apple iPad Air 11" chip M2 64GB WiFi Azul	2	55000.00	68000.00	\N	5	5	2	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
9	8806094947847	\N	Samsung Galaxy Tab S9 256GB	Tablet Samsung Galaxy Tab S9 11" 256GB WiFi Grafito	2	42000.00	52000.00	\N	5	4	1	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
10	194253362173	\N	AirPods Pro 2da Generación	Audífonos Apple AirPods Pro 2da Gen con cancelación de ruido activa	3	16000.00	22000.00	\N	5	10	3	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
11	8806094498271	\N	Samsung Galaxy Buds2 Pro	Audífonos inalámbricos Samsung Galaxy Buds2 Pro Grafito	3	11000.00	15000.00	\N	5	8	3	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
12	6925281990861	\N	JBL Tune 770NC	Audífonos over-ear JBL Tune 770NC con cancelación de ruido Negro	3	6500.00	9500.00	\N	5	6	2	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
13	5901234123457	\N	Funda iPhone 15 Pro Max Silicona	Funda de silicona para iPhone 15 Pro Max Negro	4	600.00	1500.00	\N	5	20	5	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
14	5901234123464	\N	Funda Samsung Galaxy S24 Ultra	Funda protectora transparente para Samsung Galaxy S24 Ultra	4	500.00	1200.00	\N	5	15	5	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
15	5901234123471	\N	Vidrio Templado iPhone 15	Protector de pantalla vidrio templado para iPhone 15 / 15 Plus	4	250.00	750.00	\N	5	30	10	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
16	5901234123488	\N	Vidrio Templado Samsung S24	Protector de pantalla vidrio templado para Samsung S24 / S24+	4	250.00	750.00	\N	5	25	10	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
17	5901234123495	\N	Ring Holder Universal	Anillo soporte metálico universal para teléfonos, giratorio 360°	4	150.00	450.00	\N	5	40	10	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
18	194253430551	\N	Cargador 20W USB-C Apple	Adaptador de corriente USB-C 20W Apple original	5	1200.00	2000.00	\N	5	15	5	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
19	194253430568	\N	Cable USB-C a Lightning 1m	Cable Apple USB-C a Lightning 1 metro Blanco original	5	800.00	1500.00	\N	5	20	5	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
20	5901234123501	\N	Cable USB-C a USB-C 2m	Cable USB-C a USB-C 2 metros carga rápida 60W trenzado	5	500.00	1000.00	\N	5	25	8	0	\N	f	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
21	848061080665	\N	Power Bank Anker 20000mAh	Batería externa Anker PowerCore 20000mAh 2 puertos USB-C Negro	5	3200.00	5500.00	\N	5	8	3	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
22	8806090893049	\N	Cargador Samsung 25W Super Fast	Cargador Samsung 25W Super Fast Charging USB-C sin cable	5	900.00	1800.00	\N	5	12	4	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
23	productonuevo	\N	celular	\N	6	18100.00	30000.00	\N	5	1	0	1	\N	t	t	\N	2026-02-24 14:07:21.780105	2026-02-24 14:07:21.780105	t	0.00	0.00	\N	0	0.00	[{"monto": 15000, "concepto": "Compra"}, {"monto": 3000, "concepto": "mano de obra"}, {"monto": 100, "concepto": "Costo extra"}]	[{"tipo": "estado", "valor": "80%", "nombre": "bateria"}]
24	350308318749424	123123	whatever	\N	6	17000.00	30000.00	\N	5	0	0	1	\N	t	t	\N	2026-02-24 14:21:57.958894	2026-02-24 14:21:57.958894	t	0.00	0.00	\N	0	0.00	[{"monto": 12000, "concepto": "costo"}, {"monto": 3000, "concepto": "mano de obra"}, {"monto": 2000, "concepto": "pantalla"}]	[{"tipo": "estado", "valor": "100%", "nombre": "Bateria"}]
2	194253740072	\N	iPhone 15 128GB	Smartphone Apple iPhone 15 128GB Negro	1	55000.00	67500.00	\N	5	0	2	0	\N	t	t	\N	2026-02-24 12:31:02.782441	2026-02-24 12:31:02.782441	t	0.00	0.00	\N	0	0.00	\N	\N
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.proveedores (id, codigo, nombre, contacto_nombre, telefono, email, direccion, rnc, terminos_pago, notas, activo, created_at, updated_at) FROM stdin;
1	PROV00001	Distribuidora Tech RD	Carlos Rodríguez	809-555-1001	ventas@techrd.com	Zona Industrial, Santo Domingo	130-12345-6	30 días	Proveedor principal de electrónicos	t	2025-12-19 12:17:34.028756	2025-12-19 12:17:34.028756
2	PROV00002	Importadora Global	Laura Fernández	809-555-1002	importaciones@global.com	Puerto de Haina	130-23456-7	60 días	Importador directo de Asia	t	2025-12-19 12:17:34.028756	2025-12-19 12:17:34.028756
3	PROV00003	Accesorios Premium	Roberto Santos	809-555-1003	info@premiumas.com	Santiago Centro	130-34567-8	Contado	Accesorios de alta gama	t	2025-12-19 12:17:34.028756	2025-12-19 12:17:34.028756
4	PROV00004	Mayorista Caribe	Sofía Ramírez	809-555-1004	mayorista@caribe.com	Av. Duarte, La Vega	130-45678-9	45 días	Distribuidor regional	t	2025-12-19 12:17:34.028756	2025-12-19 12:17:34.028756
6	PROV00005	qwe	213123213	1123123213	123123123@test.com	123123123	123123123	\N	\N	t	2025-12-21 14:54:08.655554	2025-12-21 14:54:08.655554
7	PROV0001	Tech Distributors RD	Juan Pérez	809-555-0001	ventas@techdist.com	\N	101-12345-6	\N	\N	t	2026-01-11 13:44:28.062476	2026-01-11 13:44:28.062476
8	PROV0002	Electronics Supply	María García	809-555-0002	info@elecsupply.com	\N	101-23456-7	\N	\N	t	2026-01-11 13:44:28.062476	2026-01-11 13:44:28.062476
9	PROV0003	Mobile Parts Inc	Pedro Martínez	809-555-0003	pedidos@mobileparts.com	\N	101-34567-8	\N	\N	t	2026-01-11 13:44:28.062476	2026-01-11 13:44:28.062476
\.


--
-- Data for Name: salidas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salidas (id, numero_salida, fecha, concepto, descripcion, monto, categoria_gasto, metodo_pago, beneficiario, numero_referencia, created_at) FROM stdin;
1	SAL00000001	2026-02-24	celular (productonuevo) - Compra	\N	15000.00	Compras	\N	\N	\N	2026-02-24 14:07:21.783825
2	SAL00000002	2026-02-24	celular (productonuevo) - mano de obra	\N	3000.00	Compras	\N	\N	\N	2026-02-24 14:07:21.785182
3	SAL00000003	2026-02-24	celular (productonuevo) - Costo extra	\N	100.00	Compras	\N	\N	\N	2026-02-24 14:07:21.785923
4	SAL00000004	2026-02-24	whatever (350308318749424) - costo	\N	12000.00	Compras	\N	\N	\N	2026-02-24 14:21:57.964649
5	SAL00000005	2026-02-24	whatever (350308318749424) - mano de obra	\N	3000.00	Compras	\N	\N	\N	2026-02-24 14:21:57.966171
6	SAL00000006	2026-02-24	whatever (350308318749424) - pantalla	\N	2000.00	Compras	\N	\N	\N	2026-02-24 14:21:57.967409
\.


--
-- Data for Name: secuencias_ncf; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.secuencias_ncf (id, tipo_comprobante, descripcion, serie, secuencia_inicial, secuencia_final, secuencia_actual, fecha_vencimiento, activo, created_at, updated_at) FROM stdin;
1	01	Factura de Crédito Fiscal	A01	1	1000000	1	2025-12-31	t	2026-01-11 13:44:28.071069	2026-01-11 13:44:28.071069
2	02	Factura de Consumo	B01	1	1000000	1	2025-12-31	t	2026-01-11 13:44:28.071069	2026-01-11 13:44:28.071069
3	14	Factura Gubernamental	C01	1	1000000	1	2025-12-31	t	2026-01-11 13:44:28.071069	2026-01-11 13:44:28.071069
4	15	Comprobante Especial	D01	1	1000000	1	2025-12-31	t	2026-01-11 13:44:28.071069	2026-01-11 13:44:28.071069
\.


--
-- Data for Name: servicios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servicios (id, nombre, descripcion, precio, es_gratuito, aplica_itbis, categoria, activo, created_at, updated_at) FROM stdin;
1	Protector de Pantalla - Vidrio Templado	Instalación de protector de pantalla de vidrio templado	300.00	f	t	proteccion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
2	Protector de Pantalla - Básico	Instalación de protector de pantalla básico	150.00	f	t	proteccion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
3	Protector de Pantalla - Gratis	Instalación gratuita de protector (cliente trae su protector)	0.00	t	f	proteccion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
4	Forro/Case Instalación	Colocación de forro o case	50.00	f	f	proteccion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
5	Configuración Inicial	Configuración inicial del dispositivo, cuentas y aplicaciones básicas	500.00	f	t	configuracion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
6	Configuración Completa	Configuración completa: cuentas, apps, personalización, seguridad	1000.00	f	t	configuracion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
7	Configuración Gratuita	Configuración básica gratuita incluida en la compra	0.00	t	f	configuracion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
8	Transferencia de Datos	Transferencia de datos desde dispositivo anterior	300.00	f	t	configuracion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
9	Instalación de Apps	Descarga e instalación de aplicaciones solicitadas	200.00	f	t	configuracion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
10	Limpieza Profunda	Limpieza profunda del dispositivo	250.00	f	t	reparacion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
11	Cambio de Batería	Reemplazo de batería (batería no incluida)	400.00	f	t	reparacion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
12	Cambio de Pantalla	Reemplazo de pantalla (pantalla no incluida)	800.00	f	t	reparacion	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
13	Asesoría Técnica	Asesoría sobre uso del dispositivo (30 min)	200.00	f	f	otros	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
14	Respaldo de Datos	Respaldo completo de datos del dispositivo	300.00	f	t	otros	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
15	Servicio Express	Atención prioritaria y entrega inmediata	500.00	f	f	otros	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
16	Garantía Extendida	Garantía extendida por 6 meses adicionales	1500.00	f	f	otros	t	2025-12-29 13:46:16.228421	2025-12-29 13:46:16.228421
17	Pegar pantalla	\N	100.00	f	f	\N	t	2026-02-24 12:16:00.842198	2026-02-24 12:16:00.842198
\.


--
-- Data for Name: servicios_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servicios_venta (id, venta_id, servicio_id, nombre_servicio, descripcion, precio, cantidad, es_gratuito, subtotal, itbis, total, created_at, es_gratis) FROM stdin;
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id, numero_ticket, cliente_id, subtotal, descuento, itbis, total, metodo_pago, monto_efectivo, monto_tarjeta, monto_transferencia, banco_tarjeta, referencia_tarjeta, banco_transferencia, referencia_transferencia, monto_recibido, cambio, fecha, hora, estado, notas, usuario, ncf, tipo_comprobante, created_at, updated_at, banco, referencia, incluir_itbis, generar_factura_electronica) FROM stdin;
1	A00000001	2	337500.00	0.00	60750.00	398250.00	credito	\N	\N	\N	\N	\N	\N	\N	100000.00	\N	2026-02-24	13:33:54.51776	completada	\N	\N	\N	\N	2026-02-24 13:33:54.51776	2026-02-24 13:33:54.51776	\N	\N	t	f
2	A00000002	\N	30000.00	0.00	5400.00	35400.00	efectivo	\N	\N	\N	\N	\N	\N	\N	35400.00	\N	2026-02-24	14:24:42.308595	completada	\N	\N	\N	\N	2026-02-24 14:24:42.308595	2026-02-24 14:24:42.308595	\N	\N	t	f
\.


--
-- Name: abonos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.abonos_id_seq', 1, false);


--
-- Name: ajustes_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ajustes_inventario_id_seq', 1, false);


--
-- Name: caracteristicas_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.caracteristicas_producto_id_seq', 1, false);


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_seq', 7, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clientes_id_seq', 10, true);


--
-- Name: configuracion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.configuracion_id_seq', 2, true);


--
-- Name: creditos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.creditos_id_seq', 1, false);


--
-- Name: detalle_costo_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_costo_producto_id_seq', 1, false);


--
-- Name: detalle_credito_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_credito_id_seq', 1, false);


--
-- Name: detalle_devolucion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_devolucion_id_seq', 3, true);


--
-- Name: detalle_factura_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_factura_id_seq', 2, true);


--
-- Name: detalle_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_venta_id_seq', 2, true);


--
-- Name: devoluciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.devoluciones_id_seq', 3, true);


--
-- Name: facturas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.facturas_id_seq', 2, true);


--
-- Name: facturas_servicio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.facturas_servicio_id_seq', 1, false);


--
-- Name: historial_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.historial_producto_id_seq', 1, false);


--
-- Name: movimientos_inventario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_seq', 5, true);


--
-- Name: pagos_factura_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagos_factura_id_seq', 2, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_seq', 24, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 9, true);


--
-- Name: salidas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salidas_id_seq', 6, true);


--
-- Name: secuencias_ncf_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.secuencias_ncf_id_seq', 4, true);


--
-- Name: servicios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.servicios_id_seq', 17, true);


--
-- Name: servicios_venta_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.servicios_venta_id_seq', 1, false);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_seq', 2, true);


--
-- Name: abonos abonos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonos
    ADD CONSTRAINT abonos_pkey PRIMARY KEY (id);


--
-- Name: ajustes_inventario ajustes_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_pkey PRIMARY KEY (id);


--
-- Name: caracteristicas_producto caracteristicas_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caracteristicas_producto
    ADD CONSTRAINT caracteristicas_producto_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_cedula_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cedula_key UNIQUE (cedula);


--
-- Name: clientes clientes_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_codigo_key UNIQUE (codigo);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: configuracion configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (id);


--
-- Name: creditos creditos_numero_credito_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_numero_credito_key UNIQUE (numero_credito);


--
-- Name: creditos creditos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_pkey PRIMARY KEY (id);


--
-- Name: detalle_costo_producto detalle_costo_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_costo_producto
    ADD CONSTRAINT detalle_costo_producto_pkey PRIMARY KEY (id);


--
-- Name: detalle_credito detalle_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_credito
    ADD CONSTRAINT detalle_credito_pkey PRIMARY KEY (id);


--
-- Name: detalle_devolucion detalle_devolucion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_pkey PRIMARY KEY (id);


--
-- Name: detalle_factura detalle_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_pkey PRIMARY KEY (id);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id);


--
-- Name: devoluciones devoluciones_numero_devolucion_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_numero_devolucion_key UNIQUE (numero_devolucion);


--
-- Name: devoluciones devoluciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_pkey PRIMARY KEY (id);


--
-- Name: facturas facturas_numero_factura_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_numero_factura_key UNIQUE (numero_factura);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- Name: facturas_servicio facturas_servicio_numero_factura_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas_servicio
    ADD CONSTRAINT facturas_servicio_numero_factura_key UNIQUE (numero_factura);


--
-- Name: facturas_servicio facturas_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas_servicio
    ADD CONSTRAINT facturas_servicio_pkey PRIMARY KEY (id);


--
-- Name: historial_producto historial_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_producto
    ADD CONSTRAINT historial_producto_pkey PRIMARY KEY (id);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- Name: pagos_factura pagos_factura_numero_pago_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_factura
    ADD CONSTRAINT pagos_factura_numero_pago_key UNIQUE (numero_pago);


--
-- Name: pagos_factura pagos_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_factura
    ADD CONSTRAINT pagos_factura_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_codigo_key UNIQUE (codigo);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: salidas salidas_numero_salida_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salidas
    ADD CONSTRAINT salidas_numero_salida_key UNIQUE (numero_salida);


--
-- Name: salidas salidas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salidas
    ADD CONSTRAINT salidas_pkey PRIMARY KEY (id);


--
-- Name: secuencias_ncf secuencias_ncf_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.secuencias_ncf
    ADD CONSTRAINT secuencias_ncf_pkey PRIMARY KEY (id);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id);


--
-- Name: servicios_venta servicios_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_venta
    ADD CONSTRAINT servicios_venta_pkey PRIMARY KEY (id);


--
-- Name: ventas ventas_numero_ticket_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_numero_ticket_key UNIQUE (numero_ticket);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: idx_abonos_credito; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_abonos_credito ON public.abonos USING btree (credito_id);


--
-- Name: idx_caracteristicas_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_caracteristicas_producto ON public.caracteristicas_producto USING btree (producto_id);


--
-- Name: idx_categorias_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categorias_nombre ON public.categorias USING btree (nombre);


--
-- Name: idx_creditos_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_creditos_cliente ON public.creditos USING btree (cliente_id);


--
-- Name: idx_creditos_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_creditos_estado ON public.creditos USING btree (estado);


--
-- Name: idx_detalle_devolucion_devolucion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_devolucion_devolucion ON public.detalle_devolucion USING btree (devolucion_id);


--
-- Name: idx_detalle_devolucion_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_devolucion_producto ON public.detalle_devolucion USING btree (producto_id);


--
-- Name: idx_detalle_venta_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_detalle_venta_producto ON public.detalle_venta USING btree (producto_id);


--
-- Name: idx_devoluciones_factura; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devoluciones_factura ON public.devoluciones USING btree (factura_id);


--
-- Name: idx_devoluciones_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devoluciones_fecha ON public.devoluciones USING btree (fecha);


--
-- Name: idx_facturas_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facturas_cliente ON public.facturas USING btree (cliente_id);


--
-- Name: idx_facturas_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facturas_fecha ON public.facturas USING btree (fecha);


--
-- Name: idx_historial_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_producto ON public.historial_producto USING btree (producto_id, fecha_cambio DESC);


--
-- Name: idx_movimientos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_fecha ON public.movimientos_inventario USING btree (fecha);


--
-- Name: idx_movimientos_producto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_producto ON public.movimientos_inventario USING btree (producto_id);


--
-- Name: idx_movimientos_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_movimientos_tipo ON public.movimientos_inventario USING btree (tipo);


--
-- Name: idx_pagos_factura; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagos_factura ON public.pagos_factura USING btree (factura_id);


--
-- Name: idx_pagos_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pagos_fecha ON public.pagos_factura USING btree (fecha);


--
-- Name: idx_productos_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_categoria ON public.productos USING btree (categoria_id);


--
-- Name: idx_productos_codigo_barras; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_codigo_barras ON public.productos USING btree (codigo_barras);


--
-- Name: idx_productos_imei; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_imei ON public.productos USING btree (imei);


--
-- Name: idx_productos_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_nombre ON public.productos USING btree (nombre);


--
-- Name: idx_productos_proveedor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_productos_proveedor ON public.productos USING btree (proveedor_id);


--
-- Name: idx_proveedores_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_codigo ON public.proveedores USING btree (codigo);


--
-- Name: idx_proveedores_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_nombre ON public.proveedores USING btree (nombre);


--
-- Name: idx_proveedores_rnc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_rnc ON public.proveedores USING btree (rnc);


--
-- Name: idx_servicios_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicios_activo ON public.servicios USING btree (activo);


--
-- Name: idx_servicios_categoria; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicios_categoria ON public.servicios USING btree (categoria);


--
-- Name: idx_servicios_venta_servicio_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicios_venta_servicio_id ON public.servicios_venta USING btree (servicio_id);


--
-- Name: idx_servicios_venta_venta_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicios_venta_venta_id ON public.servicios_venta USING btree (venta_id);


--
-- Name: idx_ventas_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ventas_cliente ON public.ventas USING btree (cliente_id);


--
-- Name: idx_ventas_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ventas_fecha ON public.ventas USING btree (fecha);


--
-- Name: unique_codigo_barras_not_null; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_codigo_barras_not_null ON public.productos USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);


--
-- Name: unique_imei_not_null; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_imei_not_null ON public.productos USING btree (imei) WHERE (imei IS NOT NULL);


--
-- Name: abonos trigger_actualizar_saldo_credito; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_saldo_credito AFTER INSERT ON public.abonos FOR EACH ROW EXECUTE FUNCTION public.actualizar_saldo_credito();


--
-- Name: detalle_venta trigger_actualizar_stock_venta; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_stock_venta AFTER INSERT ON public.detalle_venta FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_venta();


--
-- Name: servicios trigger_update_servicios_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_servicios_timestamp BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION public.update_servicios_timestamp();


--
-- Name: categorias update_categorias_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clientes update_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: configuracion update_configuracion_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creditos update_creditos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_creditos_updated_at BEFORE UPDATE ON public.creditos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: facturas update_facturas_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON public.facturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proveedores update_proveedores_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ventas update_ventas_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: abonos abonos_credito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonos
    ADD CONSTRAINT abonos_credito_id_fkey FOREIGN KEY (credito_id) REFERENCES public.creditos(id);


--
-- Name: abonos abonos_detalle_credito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonos
    ADD CONSTRAINT abonos_detalle_credito_id_fkey FOREIGN KEY (detalle_credito_id) REFERENCES public.detalle_credito(id);


--
-- Name: ajustes_inventario ajustes_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ajustes_inventario
    ADD CONSTRAINT ajustes_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: caracteristicas_producto caracteristicas_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caracteristicas_producto
    ADD CONSTRAINT caracteristicas_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: creditos creditos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: creditos creditos_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.creditos
    ADD CONSTRAINT creditos_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);


--
-- Name: detalle_costo_producto detalle_costo_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_costo_producto
    ADD CONSTRAINT detalle_costo_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: detalle_credito detalle_credito_credito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_credito
    ADD CONSTRAINT detalle_credito_credito_id_fkey FOREIGN KEY (credito_id) REFERENCES public.creditos(id) ON DELETE CASCADE;


--
-- Name: detalle_credito detalle_credito_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_credito
    ADD CONSTRAINT detalle_credito_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_devolucion detalle_devolucion_detalle_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_detalle_factura_id_fkey FOREIGN KEY (detalle_factura_id) REFERENCES public.detalle_factura(id);


--
-- Name: detalle_devolucion detalle_devolucion_devolucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_devolucion_id_fkey FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones(id) ON DELETE CASCADE;


--
-- Name: detalle_devolucion detalle_devolucion_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_devolucion
    ADD CONSTRAINT detalle_devolucion_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_factura detalle_factura_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE CASCADE;


--
-- Name: detalle_factura detalle_factura_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: detalle_venta detalle_venta_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- Name: devoluciones devoluciones_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);


--
-- Name: devoluciones devoluciones_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- Name: facturas facturas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: facturas_servicio facturas_servicio_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas_servicio
    ADD CONSTRAINT facturas_servicio_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: facturas facturas_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id);


--
-- Name: historial_producto historial_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_producto
    ADD CONSTRAINT historial_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: movimientos_inventario movimientos_inventario_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: pagos_factura pagos_factura_factura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos_factura
    ADD CONSTRAINT pagos_factura_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES public.facturas(id);


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: productos productos_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: servicios_venta servicios_venta_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_venta
    ADD CONSTRAINT servicios_venta_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE SET NULL;


--
-- Name: servicios_venta servicios_venta_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicios_venta
    ADD CONSTRAINT servicios_venta_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE CASCADE;


--
-- Name: ventas ventas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict B9glh98d5Oi1HPJnaJBIqj7vwxgyZkpfKPzFkfd6i9zBqpa8k9Yjd984Y4d5NOl

