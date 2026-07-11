# Guía Práctica — Fifty Tech POS

**Cómo hacer cada tarea, paso a paso, y qué hacer cuando algo no funciona.**

Este documento complementa el [Manual de Usuario](MANUAL_USUARIO.md). Mientras el manual explica *qué es* cada sección, esta guía explica *exactamente qué botones tocar* para cada tarea y cómo resolver los problemas más comunes (por ejemplo: "el producto existe pero no aparece").

> Cada tarea sigue el formato: **Objetivo → Pasos → ⚠️ Si algo falla**.

---

## Índice de tareas

**Ventas**
- [Buscar un producto para venderlo](#buscar-un-producto-para-venderlo)
- [⚠️ El producto existe pero NO aparece en la búsqueda](#️-el-producto-existe-pero-no-aparece-en-la-búsqueda)
- [Vender escaneando con lector de código de barras](#vender-escaneando-con-lector-de-código-de-barras)
- [Cambiar la cantidad o quitar un producto del carrito](#cambiar-la-cantidad-o-quitar-un-producto-del-carrito)
- [Cobrar una venta en efectivo](#cobrar-una-venta-en-efectivo)
- [Cobrar con factura fiscal (NCF)](#cobrar-con-factura-fiscal-ncf)
- [Hacer una venta a crédito](#hacer-una-venta-a-crédito)
- [Registrar una venta de un día anterior](#registrar-una-venta-de-un-día-anterior)

**Inventario**
- [Reponer stock de un producto agotado](#reponer-stock-de-un-producto-agotado)
- [Crear un producto nuevo](#crear-un-producto-nuevo)
- [Asignar precio a un producto que no tiene](#asignar-precio-a-un-producto-que-no-tiene)
- [Aplicar un descuento a un producto](#aplicar-un-descuento-a-un-producto)

**Clientes y crédito**
- [Registrar un cliente](#registrar-un-cliente)
- [Registrar un abono a un crédito](#registrar-un-abono-a-un-crédito)

**Facturas y devoluciones**
- [Devolver un producto (reembolso o cambio)](#devolver-un-producto-reembolso-o-cambio)
- [Ver el motivo y las notas de una devolución](#ver-el-motivo-y-las-notas-de-una-devolución)
- [Anular una factura](#anular-una-factura)

**Cierre y reportes**
- [Cerrar la caja (cuadre de turno)](#cerrar-la-caja-cuadre-de-turno)

**Solución de problemas**
- [Tabla rápida de "no aparece / no me deja"](#tabla-rápida-de-problemas)

---

## Ventas

### Buscar un producto para venderlo

**Objetivo:** encontrar un producto y agregarlo al carrito.

**Pasos:**
1. Vaya a **Ventas** (tecla `1`).
2. Haga clic en la barra de búsqueda (arriba dice *"Buscar por código de barras, IMEI o nombre del producto..."*).
3. Escriba **una parte** del nombre, el **código de barras** o el **IMEI**. No hace falta escribirlo completo ni respetar mayúsculas.
4. Pulse **`Enter`** o el botón **Buscar**.
5. Se abre una lista de resultados. Pulse **Agregar** en el producto correcto.

**Qué busca exactamente:** el sistema compara su texto contra tres campos: **nombre**, **código de barras** e **IMEI**. La búsqueda es parcial (encuentra coincidencias en medio de la palabra) y no distingue mayúsculas.

**⚠️ Si algo falla:** si sale *"Producto no encontrado"* pero usted sabe que el producto existe, vea la sección siguiente.

---

### ⚠️ El producto existe pero NO aparece en la búsqueda

Esta es la situación más común. En Ventas **solo aparecen** los productos que cumplen **las tres condiciones**:

1. Están **activos** (no eliminados).
2. Tienen **stock mayor que 0**.
3. Tienen un **precio de venta mayor que 0**.

Si falla **cualquiera** de las tres, el producto no saldrá en la búsqueda de ventas aunque exista. Diagnóstico y solución:

#### Causa 1 — Está agotado (stock en 0)
- **Cómo lo reconoce:** al buscarlo en Ventas, el sistema muestra automáticamente un recuadro naranja: *"Sin stock — ¿Deseas agregar unidades?"*.
- **Solución rápida:** pulse **+ Agregar Stock**, escriba cuántas unidades entraron y confirme. El sistema repone el stock y lo marca disponible. Luego vuelva a buscarlo normalmente.
- *(Requiere permisos; si es cajero, pida a un administrador que reponga el stock.)*

#### Causa 2 — No tiene precio de venta
- **Cómo lo reconoce:** no aparece en Ventas **ni** en el recuadro de agotados.
- **Solución:** un administrador debe asignarle precio. Vea [Asignar precio a un producto que no tiene](#asignar-precio-a-un-producto-que-no-tiene).

#### Causa 3 — Está inactivo / fue eliminado
- No aparecerá en ninguna búsqueda. Un administrador debe volver a crearlo en **Productos**.

#### Causa 4 — Está buscando por un dato que el sistema no compara
- La búsqueda **no** mira la descripción, la categoría ni las características. Busque por **nombre, código de barras o IMEI**.

#### Causa 5 — Error de tecleo o código incompleto
- Pruebe con menos letras (una palabra clave del nombre) en lugar del nombre completo.

> **Regla de oro:** *no aparece* = agotado, sin precio, inactivo, o buscó por el campo equivocado. En ese orden.

---

### Vender escaneando con lector de código de barras

**Objetivo:** agregar productos al carrito con un lector físico (pistola USB).

**Pasos:**
1. En **Ventas**, pulse el botón **Escanear** (ícono de código de barras).
2. El campo cambia a modo escaneo (*"Listo — escanee el código..."*).
3. Dispare el lector sobre el código del producto. El lector "teclea" el código y envía `Enter` solo.
4. Resultado:
   - Si hay **una sola** coincidencia → se **agrega directo** al carrito y queda listo para el siguiente escaneo.
   - Si hay **varias** → se muestra la lista para elegir.

**⚠️ Si algo falla:**
- *"Producto no encontrado"* al escanear → el código no está registrado en ningún producto, o el producto está agotado/sin precio (use la búsqueda normal para ver el recuadro de agotados).
- Si el foco se sale del campo, el modo escaneo se cancela; vuelva a pulsar **Escanear**.

---

### Cambiar la cantidad o quitar un producto del carrito

**Objetivo:** ajustar el carrito antes de cobrar.

**Pasos:**
1. En la tabla del carrito (parte central de Ventas), modifique la **cantidad** en la línea del producto.
2. Para **quitar** una línea, use el botón de eliminar de esa fila.
3. Los totales (Subtotal, ITBIS, Total) se recalculan solos.

**⚠️ Si algo falla:** no puede vender más unidades de las que hay en stock. Si necesita más, primero reponga stock (ver [Reponer stock](#reponer-stock-de-un-producto-agotado)).

---

### Cobrar una venta en efectivo

**Objetivo:** completar una venta pagada en efectivo.

**Pasos:**
1. Con productos en el carrito, revise las **Opciones de Facturación**:
   - Marque **Incluir ITBIS (18%)** si la venta lleva impuesto; desmárquelo si está exenta.
   - Deje **sin** marcar *Generar Factura Electrónica* y *Venta a Crédito*.
2. (Opcional) Seleccione el **Cliente**; si no, queda como **Cliente General**.
3. En **Método de Pago**, escriba el **Monto recibido**.
4. El campo **Cambio** se calcula solo (verde si alcanza, rojo si falta).
5. Pulse el botón de **procesar/finalizar venta**.
6. Aparece la confirmación con el **número de ticket** (ej. *Ticket #125*) y se descuenta el stock.

**⚠️ Si algo falla:**
- *No deja finalizar* → el **monto recibido es menor que el total**. Corrija el monto.
- El carrito está vacío → agregue al menos un producto.

---

### Cobrar con factura fiscal (NCF)

**Objetivo:** emitir una factura con comprobante fiscal.

**Pasos:**
1. Arme la venta normalmente y **marque "Generar Factura Electrónica"**.
2. (Recomendado) Seleccione un **cliente** con RNC/cédula si necesita comprobante con datos fiscales.
3. Finalice la venta.
4. Se abre el formulario de facturación: elija el **tipo de comprobante** (define el prefijo del NCF).
5. Confirme. El sistema asigna el **NCF** y ofrece **ver la factura**.

**Alternativa (factura después de la venta):** vaya a **Facturación**, ubique la venta y genere su factura.

**⚠️ Si algo falla:** si no ve la sección **Facturación**, su usuario es **Cajero** (solo administradores facturan).

---

### Hacer una venta a crédito

**Objetivo:** vender permitiendo pago a plazos.

**Pasos:**
1. **Seleccione un cliente registrado** (obligatorio — no puede ser "Cliente General").
2. Marque **Venta a Crédito**.
3. Elija el **Plazo** (15/30/60/90/120 días).
4. (Opcional) Escriba un **Pago Inicial**; deje `0` para financiar todo.
5. Finalice la venta. El saldo queda registrado en el crédito del cliente.

**⚠️ Si algo falla:**
- *No deja marcar crédito / da error* → falta seleccionar un cliente registrado. Créelo primero en **Clientes**.
- En crédito **no** se calcula cambio (no aplica efectivo recibido).

---

### Registrar una venta de un día anterior

**Objetivo:** cargar una venta con fecha pasada.

**Pasos:**
1. En **Ventas**, marque **"Registrar venta con fecha anterior"**.
2. Seleccione la **fecha** deseada.
3. Arme y finalice la venta normalmente.

**⚠️ Si algo falla:** recuerde volver a **desmarcar** la casilla para la próxima venta del día, o quedará con la fecha anterior.

---

## Inventario

### Reponer stock de un producto agotado

Hay **tres formas**, según dónde esté:

**A) Desde la búsqueda de Ventas (la más rápida):**
1. Busque el producto en **Ventas**.
2. En el recuadro naranja *"Sin stock"*, pulse **+ Agregar Stock**.
3. Escriba las unidades y confirme.

**B) Desde Productos (administrador):**
1. Vaya a **Productos** → busque el producto → **Editar**.
2. Ajuste el **Stock actual** y guarde.

**C) Desde Historial de Inventario (administrador):**
1. Vaya a **Historial de Inventario** → localice el producto → **Editar**.
2. Cambie el stock; el movimiento queda registrado.

**⚠️ Si algo falla:** si es **Cajero**, solo tiene la opción A (agregar stock rápido). Las secciones de inventario son solo para administradores.

---

### Crear un producto nuevo

**Objetivo:** dar de alta un producto en el catálogo.

**Pasos:**
1. Vaya a **Productos** (tecla `4`, administrador).
2. Complete el formulario:
   - **Nombre** *(obligatorio)*.
   - **Categoría** *(obligatoria)* — si no existe, créela antes en **Configuración → Categorías**.
   - **Precio de costo** y **Precio de venta** *(el de venta no puede ser menor que el costo)*.
   - **Stock** actual, mínimo y máximo.
   - **Código de barras / IMEI** (para poder buscarlo o escanearlo).
   - (Opcional) proveedor, NCF, costos detallados y características.
3. Guarde.

**⚠️ Si algo falla:**
- *No guarda* → revise: falta nombre, falta categoría, precio de venta en 0, o precio de venta menor que el costo.
- *Descuento inválido* → el porcentaje debe estar entre 0 y 100.
- *Stock mínimo mayor que el máximo* → corrija los valores.

---

### Asignar precio a un producto que no tiene

**Objetivo:** dar precio a un producto para que aparezca en ventas.

**Pasos:**
1. Vaya a **Productos** (administrador).
2. Abra la pestaña/lista **"Sin Precio"** (muestra los productos con precio en 0 o vacío).
3. Asigne el **precio de venta** al producto y guarde.
4. Ya aparecerá en la búsqueda de **Ventas** (siempre que tenga stock > 0).

**Alternativa:** **Productos → Editar** el producto y complete el precio de venta.

---

### Aplicar un descuento a un producto

**Objetivo:** que un producto se venda con descuento automático.

**Pasos:**
1. **Productos → Editar** el producto.
2. Elija el tipo de descuento:
   - **Por porcentaje** (0 a 100), o
   - **Por monto fijo**.
3. El sistema muestra el **precio final** calculado. Guarde.
4. En Ventas y en el Verificador, el producto mostrará el precio con descuento aplicado.

**⚠️ Si algo falla:** solo se usa **uno** de los dos tipos de descuento a la vez; al escribir uno, el otro se limpia.

---

## Clientes y crédito

### Registrar un cliente

**Pasos:**
1. Vaya a **Clientes** (tecla `3`).
2. Pulse **Agregar cliente**.
3. Complete al menos el **Nombre** (único campo obligatorio). Los demás (apellido, cédula, RNC, teléfono, email, dirección, notas) son opcionales.
4. Guarde.

**⚠️ Si algo falla:** *no guarda* → falta el **Nombre**.

---

### Registrar un abono a un crédito

**Objetivo:** recibir un pago parcial o total de una deuda.

**Pasos:**
1. Vaya a **Créditos** (tecla `2`), pestaña **Pendientes**.
2. (Opcional) Filtre por el nombre del cliente.
3. En la fila del cliente, pulse **Registrar Pago / abono**.
4. Elija la **factura pendiente** a la que aplica el abono.
5. Escriba el **monto** (mayor que 0 y no mayor que el saldo).
6. Confirme. El saldo del cliente y de la factura se reducen; si llega a 0, la factura pasa a **pagada** y el crédito se mueve a la pestaña **Pagados**.

**⚠️ Si algo falla:**
- *No hay facturas para elegir* → ese cliente no tiene facturas de crédito pendientes.
- *No deja el monto* → es 0 o supera el saldo pendiente.

---

## Facturas y devoluciones

### Devolver un producto (reembolso o cambio)

**Objetivo:** retornar un producto de una factura existente.

**Pasos:**
1. Vaya a **Facturación** (administrador).
2. Busque la factura y pulse **Devolución**.
3. Seleccione los **productos** y las **cantidades** a devolver (total o parcial).
4. Elija el **método**:
   - **Reembolso** → indique **efectivo** o **transferencia** (con su referencia).
   - **Cambio** → seleccione el **producto de cambio** y su cantidad; el sistema calcula la diferencia.
5. Escriba el **Motivo** *(obligatorio)* — la razón real de la devolución.
6. (Opcional) Escriba **Notas adicionales** con más detalle.
7. Confirme.

**Qué ocurre:** se genera un número (ej. `DEV-00000012`), se restaura el stock (siempre en cambios; opcional en reembolsos), y si la factura tenía saldo se reduce por lo devuelto.

**⚠️ Si algo falla:**
- *No deja confirmar* → falta el **Motivo**, o intenta devolver más cantidad de la disponible.
- No ve el botón **Devolución** → es **Cajero** (solo administradores).

---

### Ver el motivo y las notas de una devolución

**Dos lugares:**

**A) En el detalle de la factura:**
1. **Facturación → Ver detalle** de la factura.
2. Baje hasta el recuadro **"Devoluciones Registradas"**: verá el número, tipo, fecha, el **Motivo** y las **📝 Notas** de cada devolución.

**B) En los reportes:**
1. **Reportes → Devoluciones del Período**.
2. La tabla incluye columnas **Motivo** y **Notas** para cada devolución del rango.

---

### Anular una factura

**Objetivo:** invalidar una factura emitida.

**Pasos:**
1. **Facturación** → ubique la factura.
2. Pulse **Anular**.
3. Escriba el **motivo de anulación** *(obligatorio)* y confirme.

**⚠️ Si algo falla:** una factura ya **anulada** o **pagada** no muestra el botón de anular/devolución según su estado. Revise el estado de la factura.

---

## Cierre y reportes

### Cerrar la caja (cuadre de turno)

**Objetivo:** verificar el efectivo al final del día.

**Pasos:**
1. Vaya a **Reportes** (tecla `5`) → **Cuadre de Turno**.
2. Seleccione la **fecha**.
3. Escriba el **Fondo de caja** con el que se abrió.
4. Pulse cargar. El sistema muestra: ventas en efectivo, ventas por tarjeta/transferencia, abonos de crédito, salidas/gastos, devoluciones y el **efectivo esperado**.
5. Cuente el efectivo físico y compárelo con el esperado.
6. (Opcional) **Imprima** el cuadre o **descárguelo en Excel**.

**⚠️ Si algo falla:** si el efectivo real y el esperado no coinciden, revise si faltó registrar una **salida/gasto**, una **venta**, o un **abono**.

---

## Tabla rápida de problemas

| Síntoma | Causa más probable | Solución |
|---------|--------------------|----------|
| "Producto no encontrado" pero existe | Agotado (stock 0) | Búsquelo en Ventas → **+ Agregar Stock** |
| No aparece ni en agotados | Sin precio de venta | **Productos → Sin Precio** → asignar precio |
| No aparece de ninguna forma | Inactivo/eliminado | Volver a crearlo en **Productos** |
| Busco por descripción y no sale | Solo busca nombre/código/IMEI | Buscar por nombre, código o IMEI |
| No deja finalizar venta en efectivo | Monto recibido < total | Corregir el monto recibido |
| No deja hacer venta a crédito | Falta cliente registrado | Seleccionar/crear cliente |
| No veo Facturación / Productos / etc. | Usuario es **Cajero** | Iniciar sesión como **Administrador** |
| No deja guardar producto | Falta nombre/categoría o precio ≤ costo | Completar campos obligatorios |
| No deja confirmar devolución | Falta **Motivo** o cantidad excede | Escribir motivo / ajustar cantidad |
| Efectivo del cuadre no cuadra | Falta registrar salida/venta/abono | Revisar movimientos del día |
| El producto vende con fecha vieja | Quedó activa la casilla de fecha anterior | Desmarcar "Registrar venta con fecha anterior" |

---

*Fifty Tech POS — Guía práctica. Consulte también el [Manual de Usuario](MANUAL_USUARIO.md) para la descripción completa de cada sección.*
