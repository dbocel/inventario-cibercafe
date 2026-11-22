# Manual de Uso - Inventario Cibercafé + Papelería Internet K-ROL

**Versión:** 1.0  
**Fecha:** Octubre 2026  
**Sistema:** Inventario para Cibercafé y Papelería Internet K-ROL  
**Moneda:** Quetzales (Q)  
**Idioma:** Español (Guatemala)

---

## 1. Objetivo

Este manual tiene como finalidad guiar al usuario en el uso correcto de la aplicación web para el control de inventario, ventas, movimientos de productos y administración del cibercafé.

---

## 2. Acceso al Sistema

### 2.1. Ingresar al sistema

1. Abrir el navegador web (se recomienda Google Chrome o Microsoft Edge)
2. Ingresar a la dirección del sistema: [https://dbocel.github.io/inventario-cibercafe/](https://dbocel.github.io/inventario-cibercafe/)
3. Aparecerá la pantalla de **Inicio de Sesión**

### 2.2. Iniciar sesión

1. Escribir su **correo electrónico** registrado
2. Escribir su **contraseña**
3. Presionar el botón **Iniciar sesión**

**Notas:**
- Si el correo o contraseña son incorrectos, el sistema mostrará un mensaje de error
- Si el usuario no tiene perfil asignado, el sistema no permitirá el ingreso y mostrará un mensaje para contactar al administrador
- El acceso depende del rol asignado (`Administrador` o `Cajero`)

### 2.3. Cerrar sesión

Para salir del sistema, presionar el botón **Cerrar sesión** ubicado en la parte superior de la pantalla.

---

## 3. Navegación del Sistema

Una vez iniciada la sesión, se mostrará el menú con las siguientes pestañas:

| Pestaña | Función |
|---|---|
| **Resumen** | Vista general del sistema con información rápida |
| **Inventario** | Control de productos, existencias, venta rápida y exportación |
| **Registrar movimiento** | Registro manual de entradas y salidas de productos |
| **Cibercafé** | Control de equipos, inicio/cobro de sesiones e impresión |
| **Historial** | Consulta de movimientos y sesiones realizadas |

La navegación es por **pestañas** y se conserva al recargar la página.

---

## 4. Módulo Resumen

Muestra una vista general con la información más importante del sistema para tener un panorama rápido del estado actual.

---

## 5. Módulo Inventario

Este módulo permite llevar el control completo de los productos de la papelería.

### 5.1. Buscar y filtrar productos

En la barra superior se pueden utilizar los siguientes filtros:

- **Buscar producto o código** - Permite buscar por nombre o código del producto
- **Filtrar por categoría** - Muestra solo los productos de la categoría seleccionada
- **Filtrar por estado** - Permite filtrar por: `Todos los estados`, `Stock bajo` o `Agotados`

### 5.2. Consultar información del producto

En la tabla de inventario se muestra:

| Campo | Descripción |
|---|---|
| **Código** | Código único del producto |
| **Producto** | Nombre del producto |
| **Categoría** | Categoría a la que pertenece |
| **Stock** | Existencias actuales |
| **Mínimo** | Stock mínimo configurado |
| **Precio** | Precio de venta en Quetzales (Q) |
| **Estado** | `Disponible`, `Stock bajo` o `Agotado` |

### 5.3. Venta rápida

1. Buscar el producto a vender
2. Presionar el botón **Venta rápida**
3. Si el producto tiene existencias, se registrará automáticamente la salida por 1 unidad
4. El sistema actualizará el stock inmediatamente

> **Nota:** Solo se puede realizar venta rápida si hay existencias disponibles.

### 5.4. Registrar movimiento desde inventario

1. Seleccionar el producto deseado
2. Presionar el botón **Mover**
3. El sistema lo llevará automáticamente a la pestaña **Registrar movimiento** con el producto seleccionado

### 5.5. Agregar nuevo producto (Solo Administrador)

1. Presionar el botón **Nuevo producto**
2. Llenar los campos solicitados:
   - **Nombre** - Nombre completo del producto
   - **Categoría** - Seleccionar de la lista
   - **Código** - Se genera automáticamente, pero puede modificarse
   - **Stock inicial** - Cantidad al registrar el producto
   - **Stock mínimo** - Cantidad mínima para alerta
   - **Precio de venta (Q)** - Precio al público
3. Presionar **Guardar producto**

### 5.6. Exportar inventario

#### Exportar a CSV
1. Aplicar los filtros deseados (opcional)
2. Presionar **Descargar CSV**
3. Se descargará el archivo `inventario.csv` con los productos mostrados

#### Exportar a PDF (con previsualización)
1. Presionar **Previsualizar PDF**
2. Se abrirá un **modal de previsualización** con el formato **CONTROL DE INVENTARIO - INTERNET K-ROL**
3. Revisar la información mostrada:
   - Encabezado centrado
   - Fecha de generación
   - Agrupado por categorías
   - Apartados **MERCADERÍAS** y **NO CORRIENTE**
   - Columnas: CANTIDADES, PRODUCTO, COSTO UNITARIO, COSTO DE VENTA, COSTO TOTAL
4. Desde el modal presionar **Descargar PDF** para guardar el archivo
5. O presionar **Cerrar** para salir sin descargar

---

## 6. Módulo Registrar Movimiento

Permite registrar entradas y salidas manuales de productos con mayor detalle.

### 6.1. Registrar entrada o salida

1. Seleccionar el tipo: **Entrada** o **Salida**
2. Seleccionar el **Producto** de la lista desplegable
3. El sistema mostrará las **Existencia actual** del producto
4. Ingresar la **Cantidad** (debe ser mayor a 0 y entera)
5. Seleccionar el **Motivo**:
   - **Entrada:** Compra a proveedor, Devolución de cliente, Ajuste de inventario
   - **Salida:** Venta, Uso en el cibercafé, Merma o daño, Ajuste de inventario
6. Ingresar **Referencia (opcional)** - Ej.: No. de factura, ticket o nota
7. Presionar **Guardar entrada** o **Guardar salida**

### 6.2. Confirmación de movimiento

Al presionar guardar, aparecerá un **modal de confirmación** con el resumen:
- Tipo de movimiento (Entrada/Salida)
- Cantidad
- Producto
- Motivo y referencia

Presionar **Confirmar** para registrar o **Cancelar** para regresar.

### 6.3. Venta rápida desde este módulo

En el panel **Venta rápida** se muestran los productos más utilizados.  
Presionar el producto deseado para registrar una venta de **1 unidad**.  
El sistema solicitará confirmación antes de registrar.

---

## 7. Módulo Cibercafé

Controla el uso de las computadoras, tiempo, impresión y cobro.

### 7.1. Estado de los equipos

Cada equipo muestra:
- **Nombre del equipo** (Equipo 1, Equipo 2, etc.)
- **Estado:** `Libre` o `En uso`
- **Cronómetro** - Tiempo transcurrido (cuando está en uso)
- **Monto acumulado** - Cálculo automático según tarifa

### 7.2. Iniciar sesión en un equipo

1. Localizar el equipo en estado **Libre**
2. Presionar **Iniciar sesión**
3. El cronómetro comenzará a contar inmediatamente

### 7.3. Cobrar y terminar sesión

1. Cuando el cliente termine, presionar **Cobrar y terminar** en el equipo correspondiente
2. Se abrirá la ventana **Terminar [Nombre del equipo]**
3. Verificar:
   - **Tiempo de uso** - Calculado automáticamente
   - **Monto por tiempo** - Según tarifa y bloques
   - **Hojas impresas** - Ingresar la cantidad de hojas impresas (0 si no hay)
4. Revisar el **Total a cobrar** en Quetzales (Q)
5. Presionar **Cobrar y terminar**
6. Aparecerá un **modal de confirmación** con el desglose:
   - Equipo
   - Tiempo y monto de internet
   - Hojas impresas y monto de impresión
   - Total a cobrar
7. Presionar **Confirmar cobro** para finalizar

> **Nota:** Al cobrar, la sesión pasa al historial del día y el equipo queda libre nuevamente.

### 7.4. Botón +10 min (demo)

El botón **+10 min (demo)** agrega 10 minutos de prueba al cronómetro.  
**Este botón es únicamente local y NO se guarda en la base de datos.**

### 7.5. Configurar tarifas (Solo Administrador)

Si tiene rol de **Administrador**, aparecerá la sección **Tarifas**:

- **Tarifa por hora (Q)** - Puede modificarse directamente. Se guarda al cambiar el valor.
- **Cobro por bloques de** - Opciones: `1 minuto`, `15 minutos` o `30 minutos`. Define cómo se redondea el cobro.

**Cálculo:** Se cobra por bloques completos. Ejemplo con bloque de 15 min: 14 minutos se cobran como 15 minutos.

### 7.6. Sesiones de hoy

En la parte inferior se muestra el listado de **Sesiones de hoy** ya cobradas con:
- Hora de inicio
- Equipo
- Tiempo total (minutos)
- Hojas impresas
- Total cobrado (Q)

---

## 8. Módulo Historial

Permite consultar el registro histórico de movimientos y sesiones realizadas en el sistema.

Aquí se puede revisar el detalle de entradas, salidas, ventas y sesiones cobradas.

---

## 9. Consejos de Uso

- **Revisar existencias** antes de registrar salidas manuales
- **Usar Venta rápida** para agilizar ventas pequeñas
- **Verificar hojas impresas** al cobrar sesiones del cibercafé
- **Previsualizar PDF** antes de descargarlo para confirmar la información
- **Confirmar siempre** los modales antes de guardar (movimientos o cobros)
- **Usar filtros** en Inventario para encontrar productos rápidamente

---

## 10. Solución de Problemas Comunes

| Problema | Causa | Solución |
|---|---|---|
| **No puedo iniciar sesión** | Correo/contraseña incorrectos o sin perfil | Verificar credenciales con el administrador |
| **Mensaje "No se pudo cargar el perfil de acceso"** | Usuario existe pero sin perfil asignado | Solicitar al administrador que registre su perfil con rol |
| **No puedo registrar salida por falta de stock** | No hay existencias suficientes | Revisar inventario o registrar entrada primero |
| **El PDF no se ve completo en el modal** | Ventana pequeña | Maximizar el modal o usar el botón "Descargar PDF" para verlo completo |
| **No aparece botón "Nuevo producto"** | Rol Cajero | Solo el Administrador puede crear productos |
| **No aparecen opciones de tarifa** | Rol Cajero | Solo el Administrador puede modificar tarifas |

---

## 11. Información Importante

- **Moneda:** Todos los montos se muestran en **Quetzales (Q)**
- **Idioma:** Toda la interfaz está en **Español (Guatemala)**
- **Datos en tiempo real:** Al registrar movimientos o cobrar sesiones, el inventario se actualiza automáticamente
- **Seguridad:** Los permisos se aplican según el rol asignado
- **Respaldos:** El sistema utiliza Supabase como base de datos con políticas de seguridad activas

---

**Soporte:** Para cualquier duda o problema, contactar al Administrador del sistema.
