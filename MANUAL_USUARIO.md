# Manual de Usuario — Fifty Tech POS

Sistema de Punto de Venta y Facturación para República Dominicana.

Este manual explica, paso a paso, cómo usar todas las funciones del programa: ventas, inventario, clientes, créditos, facturación con NCF, devoluciones, reportes y configuración.

---

## Índice

1. [Conceptos generales](#1-conceptos-generales)
2. [Inicio de sesión y roles](#2-inicio-de-sesión-y-roles)
3. [La pantalla principal y la navegación](#3-la-pantalla-principal-y-la-navegación)
4. [Punto de Venta (Ventas)](#4-punto-de-venta-ventas)
5. [Créditos](#5-créditos)
6. [Clientes](#6-clientes)
7. [Productos](#7-productos)
8. [Proveedores](#8-proveedores)
9. [Salidas / Gastos](#9-salidas--gastos)
10. [Reporte de Inventario](#10-reporte-de-inventario)
11. [Inventario Vendido](#11-inventario-vendido)
12. [Historial de Inventario](#12-historial-de-inventario)
13. [Facturación (NCF)](#13-facturación-ncf)
14. [Devoluciones](#14-devoluciones)
15. [Reportes y Cuadre de Turno](#15-reportes-y-cuadre-de-turno)
16. [Configuración](#16-configuración)
17. [Verificador de Precios](#17-verificador-de-precios)
18. [Usuarios](#18-usuarios)
19. [Preguntas frecuentes y consejos](#19-preguntas-frecuentes-y-consejos)

---

## 1. Conceptos generales

Antes de empezar, conviene conocer algunos términos que se usan en todo el sistema:

| Término | Significado |
|---------|-------------|
| **ITBIS** | Impuesto de la República Dominicana (18%). Se puede incluir o excluir en cada venta. |
| **NCF** | Número de Comprobante Fiscal. Secuencia fiscal que identifica una factura válida ante la DGII. |
| **Ticket** | Número interno de cada venta (ej. *Ticket #125*). No es lo mismo que la factura fiscal. |
| **Factura** | Documento fiscal generado a partir de una venta, con NCF. |
| **Crédito** | Venta que el cliente paga a plazos, con abonos posteriores. |
| **Salida / Gasto** | Dinero que sale de la caja (pago a proveedor, servicios, etc.). |
| **Cuadre de turno** | Cierre de caja: comparación entre el efectivo esperado y lo que hay físicamente. |
| **Devolución** | Retorno de un producto vendido (reembolso o cambio). |

El sistema usa dos números diferentes para cada transacción: el **ticket** (venta) y, si se emite, la **factura con NCF**. Una venta puede existir sin factura fiscal.

---

## 2. Inicio de sesión y roles

Al abrir el programa aparece la pantalla de acceso. Debe escribir su **usuario** y **contraseña**.

### Usuarios de fábrica (primer arranque)

- **Administrador:** `admin` / `admin123`
- **Cajero:** `cajero` / `cajero123`

> Cambie estas contraseñas lo antes posible desde la sección **Configuración → Usuarios**.

### Roles y permisos

Existen dos tipos de usuario:

**Administrador** — Acceso total a todas las secciones.

**Cajero** — Acceso limitado únicamente a:
- Ventas
- Créditos
- Clientes
- Reportes
- Verificador de Precios

Las secciones de inventario, facturación, proveedores, salidas y configuración **no** son visibles para el cajero; el menú se oculta automáticamente según el rol.

Para **cerrar sesión**, pulse la **✕** que aparece junto a su nombre en la parte superior del menú lateral.

---

## 3. La pantalla principal y la navegación

La pantalla se divide en dos partes:

- **Menú lateral (izquierda):** logo, nombre del usuario conectado y las secciones agrupadas en *Ventas*, *Inventario* y *Admin*.
- **Área de trabajo (derecha):** muestra la sección seleccionada.

### Atajos de teclado

Cuando **no** está escribiendo dentro de un campo, puede saltar entre secciones con los números:

| Tecla | Sección |
|-------|---------|
| `1` | Ventas |
| `2` | Créditos |
| `3` | Clientes |
| `4` | Productos |
| `5` | Reportes |
| `6` | Facturación |

- **`Esc`** cierra cualquier ventana emergente (modal) que esté abierta.
- **`Enter`** en los campos de búsqueda ejecuta la búsqueda.

### Paginación

Las tablas largas (ventas, clientes, devoluciones, etc.) se muestran en páginas de 20 filas con controles de navegación al pie de la tabla.

---

## 4. Punto de Venta (Ventas)

Es la pantalla principal de trabajo (tecla `1`). Aquí se registran todas las ventas.

### 4.1 Buscar y agregar productos

Tiene tres formas de agregar un producto al carrito:

1. **Buscar por texto:** escriba el **código de barras, IMEI o nombre** en la barra de búsqueda y pulse `Enter` o el botón **Buscar**.
2. **Escanear:** pulse el botón **Escanear** para usar un lector de código de barras; el producto se agrega directamente al carrito.
3. **Lista de resultados:** si la búsqueda arroja varios productos, se muestra una lista para elegir.

Si un producto está **agotado**, el sistema lo indica; un administrador puede usar la opción de **agregar stock rápido** desde la misma búsqueda.

### 4.2 Servicios rápidos

Además de productos, se pueden agregar **servicios** (por ejemplo, reparaciones o instalaciones) mediante botones de acceso rápido. Los servicios se configuran en **Configuración**.

### 4.3 Seleccionar el cliente

Arriba del formulario está el selector **Cliente**. Por defecto es **Cliente General** (venta sin cliente asociado). Puede elegir un cliente registrado; esto es **obligatorio** si la venta será a crédito.

### 4.4 Opciones de facturación

En el panel de opciones puede activar:

- **Incluir ITBIS (18%)** — marque si la venta lleva impuesto; desmárquelo si está exenta.
- **Generar Factura Electrónica** — al finalizar la venta se abrirá el formulario para emitir la factura con NCF.
- **Venta a Crédito** — habilita el pago a plazos (ver siguiente punto).

### 4.5 Venta a crédito

Al marcar **Venta a Crédito** aparecen dos campos:

- **Plazo de crédito:** 15, 30 (por defecto), 60, 90 o 120 días.
- **Pago inicial (opcional):** monto que el cliente abona en el momento. Déjelo en `0` para financiar todo el total.

> Recuerde: para una venta a crédito **debe** seleccionar un cliente registrado (no "Cliente General").

### 4.6 Totales, pago y cambio

El panel de totales muestra en tiempo real: **Subtotal**, **Descuento aplicado** (si lo hay), **ITBIS** y **TOTAL**.

En **Método de Pago** (venta en efectivo) escriba el **Monto recibido**; el sistema calcula automáticamente el **Cambio**. Si el monto recibido es menor que el total, el sistema no permite completar la venta. En ventas a crédito no se calcula cambio.

### 4.7 Fecha retroactiva

Existe la opción **"Registrar venta con fecha anterior"**, útil para cargar ventas de días pasados. Actívela y seleccione la fecha deseada antes de procesar.

### 4.8 Finalizar la venta

Pulse el botón para procesar la venta. Al completarse:

- Se descuenta el stock de los productos.
- Se genera un **número de ticket** (ej. *Ticket #125*).
- Si marcó *Factura Electrónica*, se abre el formulario de facturación.
- Se muestra un mensaje de confirmación.

---

## 5. Créditos

Sección para dar seguimiento a las ventas a crédito y sus abonos (tecla `2`).

Tiene dos pestañas:

### 5.1 Pendientes

Lista de clientes que **deben dinero**, con estadísticas generales (total por cobrar, cantidad de clientes, etc.). Puede filtrar por nombre.

Para cada cliente puede:

- **Registrar un pago / abono:** abre una ventana donde se elige la factura pendiente y se ingresa el monto a abonar. El sistema descuenta ese monto del saldo del cliente y de la factura.
- **Ver historial de pagos:** muestra todos los abonos realizados por ese cliente.
- **Ver reporte / estado de cuenta:** resumen de facturas y saldos del cliente.

### 5.2 Pagados

Historial de créditos que ya fueron **saldados por completo**, con sus estadísticas.

---

## 6. Clientes

Registro de clientes (tecla `3`).

### 6.1 Lista y búsqueda

Muestra todos los clientes con estadísticas (total de clientes, con crédito, etc.) y un buscador que filtra en vivo.

### 6.2 Agregar / editar un cliente

Pulse **Agregar cliente** (o edite uno existente). Los campos son:

| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| Nombre | **Sí** | Único campo obligatorio |
| Apellido | No | |
| Cédula | No | |
| RNC | No | Para clientes con comprobante fiscal |
| Teléfono | No | |
| Email | No | |
| Dirección | No | |
| Notas | No | Observaciones internas |

### 6.3 Ver detalle y eliminar

- **Ver detalle:** muestra toda la información del cliente y su actividad.
- **Eliminar:** borra el cliente (pide confirmación). Se recomienda no eliminar clientes con historial de ventas.

---

## 7. Productos

Gestión del catálogo e inventario (tecla `4`, solo administrador).

### 7.1 Crear un producto

Al registrar un producto puede indicar:

- **Nombre** (obligatorio) y **Descripción**.
- **Categoría** (obligatoria) — se administran en Configuración.
- **Proveedor** y datos de la **factura del proveedor** (número y fecha).
- **Precio de costo** y **Precio de venta** (el de venta no puede ser menor que el costo).
- **Stock** actual, **stock mínimo** y **stock máximo** (para alertas de reposición).
- **NCF** del producto (si aplica).
- **Código de barras / IMEI**.

**Descuentos:** puede definir un descuento por **porcentaje** o por **monto fijo**; el sistema calcula y muestra el precio final. (El porcentaje debe estar entre 0 y 100.)

**Costos detallados:** puede desglosar el costo en varias líneas (concepto + monto), útil cuando un producto tiene costos adicionales (transporte, aduana, etc.). El sistema suma todas las líneas para el costo total.

**Características:** puede añadir pares *nombre + valor* (por ejemplo, "Color: Negro", "Capacidad: 128GB").

### 7.2 Carga múltiple / por lote

Existe una función para registrar **varios productos a la vez** (lote), con opción de asignar NCF y método de pago comunes al lote.

### 7.3 Editar y eliminar

Cada producto puede editarse o eliminarse. Al editar se cargan todos sus datos, incluidos costos y características.

---

## 8. Proveedores

Registro de proveedores (solo administrador).

Campos: **Nombre** (obligatorio), contacto, teléfono, email, dirección y RNC.

Puede **editar** o **eliminar** proveedores. Los proveedores quedan disponibles para asociarlos a los productos y a las facturas de compra.

---

## 9. Salidas / Gastos

Registro del dinero que **sale de la caja** (solo administrador).

### 9.1 Registrar una salida

Campos principales:

- **Fecha** (por defecto, hoy).
- **Concepto** (obligatorio).
- **Descripción**.
- **Monto** (obligatorio, mayor que 0).
- **Categoría de gasto** (se administran en Configuración).
- **Método de pago**.
- **Beneficiario**.
- **NCF** (si el gasto tiene comprobante).

Las salidas se pueden **editar** y **eliminar**.

### 9.2 Reporte de gastos

Dentro de la sección hay un reporte de gastos por rango de fechas que muestra:

- Totales **por categoría**.
- Totales **por método de pago**.
- Opción de **descargar en Excel**.

Las salidas se restan de la ganancia en los reportes generales y aparecen en el cuadre de turno.

---

## 10. Reporte de Inventario

Vista del inventario actual con su valor (solo administrador).

Muestra, por producto: stock, precio de costo, precio de venta, descuento y valores calculados. El resumen superior indica:

- **Costo total** del inventario.
- **Valor de venta** total.
- **Ganancia potencial** (venta − costo).

Puede **filtrar por categoría**, ver el conteo de productos, **eliminar** un producto y **exportar a CSV**.

---

## 11. Inventario Vendido

Muestra lo que se ha **vendido** en un rango de fechas (solo administrador).

Por defecto muestra desde el **primer día del mes** hasta **hoy**. Para cada línea vendida indica cantidades, precios y si tuvo devolución. Las tarjetas superiores resumen el **valor vendido**.

Puede **filtrar** por texto y **editar** una línea de venta (corregir cantidad o precio unitario).

---

## 12. Historial de Inventario

Vista del movimiento de cada producto (entradas y salidas de stock) en un rango de fechas (solo administrador).

Por defecto va del primer día del mes a hoy. Las tarjetas resumen: total de unidades, unidades vendidas, valor del inventario y valor vendido.

Puede filtrar (por ejemplo, mostrar solo productos **con ventas**) y **editar** el stock/precio de un producto directamente; los cambios de stock quedan registrados como movimiento.

---

## 13. Facturación (NCF)

Emisión y consulta de facturas fiscales (tecla `6`, solo administrador).

### 13.1 Generar una factura

Una factura se genera **a partir de una venta**. Ocurre de dos formas:

1. Marcando *Generar Factura Electrónica* al momento de la venta.
2. Desde la sección Facturación, generando la factura de una venta existente.

Al generar se elige el **tipo de comprobante** (que determina el prefijo del NCF, ej. `B01`, `B02`) y, si es a crédito, los días de crédito. El sistema asigna el **NCF** automáticamente y permite ver la factura generada.

### 13.2 Buscar y ver facturas

La sección lista las facturas con su estado. Para cada una:

- **Ver detalle:** abre la factura completa (productos, totales, NCF y, si las hay, las **devoluciones registradas** con su motivo y notas).
- **Imprimir:** genera la impresión de la factura.
- **Registrar pago:** para facturas a crédito con saldo pendiente.
- **Devolución:** inicia una devolución sobre esa factura (ver sección 14).
- **Anular:** anula la factura (pide un **motivo de anulación** obligatorio).

### 13.3 Estado de cuenta del cliente

Desde facturación puede consultar el **estado de cuenta** de un cliente: sus facturas, pagos y saldos.

### 13.4 Registrar pago de una factura

Al registrar un pago se indica: monto, fecha, método de pago, referencia, banco y observaciones. El saldo pendiente se reduce y, cuando llega a cero, la factura pasa a estado **pagada**.

---

## 14. Devoluciones

Permite retornar productos de una venta ya facturada. Se inicia desde el botón **Devolución** en la lista de facturas.

### 14.1 Cómo hacer una devolución

1. Seleccione los **productos** y las **cantidades** a devolver (puede ser total o parcial).
2. Elija el **método de devolución**:
   - **Reembolso:** se devuelve el dinero. Debe indicar si es en **efectivo** o por **transferencia** (con su referencia).
   - **Cambio:** se intercambia por otro producto. Debe seleccionar el **producto de cambio** y su cantidad; el sistema calcula la **diferencia** a favor o en contra.
3. Escriba el **Motivo de la devolución** (**obligatorio**) — la razón (ej. "producto defectuoso").
4. Opcionalmente, escriba **Notas adicionales** con más detalle.
5. Confirme para procesar.

Al procesarse:

- Se genera un **número de devolución** (ej. `DEV-00000012`).
- El **stock se restaura** al inventario (siempre en cambios; opcional en reembolsos).
- Si la factura tenía saldo pendiente, se **reduce** por el monto devuelto.
- En cambios, se descuenta el stock del producto nuevo.

### 14.2 Dónde ver el motivo y las notas de una devolución

- **En el detalle de la factura** (Facturación → Ver detalle): la factura muestra un recuadro **"Devoluciones Registradas"** con el número, tipo, fecha, el **Motivo** y las **📝 Notas** de cada devolución.
- **En Reportes → Devoluciones del Período:** la tabla incluye columnas de **Motivo** y **Notas** para cada devolución del rango consultado.

---

## 15. Reportes y Cuadre de Turno

Sección de análisis del negocio (tecla `5`).

### 15.1 Reportes de ventas

Puede elegir el **período** (día, semana, mes, etc.). El reporte muestra:

- **Resumen de ventas:** total vendido, cantidad de ventas, ITBIS, y costos operativos.
- **Desglose de ganancias:** ventas − costo de productos = ganancia bruta; menos salidas/gastos = **ganancia neta**. El margen se muestra en color según sea positivo o negativo.
- **Devoluciones del período:** con motivo y notas.
- **Tabla de ventas** detallada.
- **Top de productos** más vendidos.

Las devoluciones se restan para mostrar las **ventas netas**.

### 15.2 Cuadre de turno (cierre de caja)

El cuadre compara el efectivo esperado con el real al cerrar el día/turno:

1. Abra el cuadre y seleccione la **fecha**.
2. Ingrese el **fondo de caja** inicial (dinero con el que se abrió).
3. El sistema calcula:
   - Ventas en efectivo, ventas por tarjeta/transferencia.
   - Abonos de crédito recibidos.
   - **Salidas/gastos** del período.
   - Devoluciones (efectivo y crédito).
   - El **efectivo esperado** en caja.
4. Puede **imprimir** el cuadre o **descargarlo en Excel**.

Esto permite detectar diferencias (sobrantes o faltantes) al final del turno.

---

## 16. Configuración

Ajustes generales del sistema (solo administrador). Incluye varias áreas:

### 16.1 Datos de la empresa

Nombre, **RNC**, teléfono, email y dirección — se usan en las facturas impresas.

### 16.2 Impresora

Campo para el **nombre de la impresora**. Hay un botón **Detectar impresoras** que lista las disponibles y permite seleccionarla.

### 16.3 Servicios

Alta y baja de **servicios rápidos** (los que aparecen en Ventas). Cada servicio puede ser **gratuito** o **pagado** (con precio). Los pagados requieren un precio mayor que 0.

### 16.4 Categorías de productos

Alta y baja de las **categorías** que se asignan a los productos. No se puede eliminar una categoría que aún tenga productos asociados.

### 16.5 Categorías de gasto

Alta y baja de las **categorías de gasto** usadas en Salidas.

### 16.6 Usuarios

Gestión de cuentas (ver sección 18).

---

## 17. Verificador de Precios

Herramienta rápida para **consultar el precio** de un producto sin iniciar una venta. Accesible desde el botón **Verificador de Precios** en la pantalla de Ventas.

- Escanee o escriba el **código / IMEI / nombre** y pulse `Enter`.
- Muestra el producto con su **precio final** (aplicando descuentos si los tiene).
- Si hay varias coincidencias, las lista todas.
- Si no encuentra nada, lo indica claramente.

Es ideal para atender consultas de precio en el mostrador.

---

## 18. Usuarios

Gestión de cuentas de acceso (Configuración → Usuarios, solo administrador).

- **Crear usuario:** nombre de usuario, contraseña y rol (**Administrador** o **Cajero**).
- **Editar usuario:** puede cambiar los datos; si deja la contraseña en blanco, **no se modifica**.
- **Eliminar usuario:** pide confirmación (acción irreversible).

Se recomienda que cada empleado tenga su propia cuenta para poder identificar quién realizó cada operación.

---

## 19. Preguntas frecuentes y consejos

**¿Cuál es la diferencia entre ticket y factura?**
El *ticket* es el número interno de la venta; la *factura* es el documento fiscal con NCF. Una venta puede no tener factura.

**Vendí sin factura y ahora la necesito.**
Puede generar la factura de esa venta desde la sección **Facturación**.

**No veo algunas secciones del menú.**
Probablemente su usuario es **Cajero**. Las secciones de inventario, facturación, proveedores, salidas y configuración son solo para **Administrador**.

**El cliente quiere devolver un teléfono.**
Vaya a **Facturación**, busque la factura, pulse **Devolución**, elija los productos, indique reembolso o cambio y escriba el **motivo** (obligatorio) y las **notas**. Podrá verlo luego en el detalle de la factura y en Reportes.

**¿Cómo cierro la caja al final del día?**
Use **Reportes → Cuadre de Turno**: ponga la fecha y el fondo inicial, revise el efectivo esperado y compárelo con el real. Puede imprimirlo o exportarlo a Excel.

**Un producto aparece agotado.**
Un administrador puede reponer stock desde **Productos** o mediante la opción de stock rápido en la búsqueda de ventas.

**¿Cómo aplico un descuento?**
En el producto puede definir un descuento por porcentaje o por monto; el precio final se calcula automáticamente y se refleja en la venta.

**Olvidé registrar una venta de ayer.**
En Ventas active **"Registrar venta con fecha anterior"** y seleccione la fecha.

---

*Fifty Tech POS — Manual de usuario. Para dudas técnicas o cambios en el sistema, contacte al administrador del sistema.*
