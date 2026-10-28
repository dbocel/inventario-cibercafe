# Plan: del mockup al sistema funcional
**Inventario, cibercafé y papelería (Internet K-ROL)**

## 1. Qué contiene el Excel (`Libro1.xlsx`)

| Concepto | Dato |
|---|---|
| Hoja | `Hoja1`, 402 filas, con cuatro columnas: Cantidades, Producto, Costo unitario, Costo de venta y Costo total |
| Mercadería | 314 productos en 51 categorías (papel de china, fomy, cover, iris, lino, lapiceros, cuadernos, tintas Epson, etc.) |
| Existencias | 32,996 unidades, con valor al costo de Q29,114.60 |
| Activos fijos (no corriente) | 24 registros (muebles, 5 computadoras, 3 impresoras, fotocopiadora, cámaras, etc.), Q38,962 |
| Fórmulas | Solo 4 sumas de totales; el resto son valores escritos a mano |

**Lo que ya sirve:** casi todos los productos tienen costo y precio de venta, así que no hay que inventarlos.

**Lo que falta en el Excel y hay que definir:** código de producto, stock mínimo por producto, proveedores, historial de movimientos.

**Dato para el cibercafé:** el Excel registra **5 computadoras**, pero el mockup muestra 8 equipos. Hay que ajustar ese número.

## 2. Arquitectura recomendada

| Capa | Herramienta | Por qué |
|---|---|---|
| Base de datos | **Supabase** (PostgreSQL, plan gratuito) | SQL estándar, tablas relacionales, API lista, sin servidor propio |
| Usuarios y roles | Supabase Auth | Inicio de sesión con correo; roles de administrador y cajero |
| Interfaz | El mockup actual (HTML + JS) | Se conserva el diseño; se reemplazan los datos de ejemplo por llamadas a la base |
| Hospedaje | **GitHub Pages** | Gratis, ya definido |
| Librería | `@supabase/supabase-js` por CDN | Un solo `<script>`, sin compilar nada |

Alternativas si no quiere Supabase: Firebase (base NoSQL, menos natural para inventarios) o una base SQLite local con un servidor propio (más control, pero requiere mantener un servidor).

## 3. Fase 0 · Limpiar el Excel (medio día)

Revisar `avisos_revision.csv` (13 avisos) y corregir en el Excel antes de importar:

- **Papel fomy color negro: 5,015 unidades** (fila 51). Parece error de digitación y por sí solo es Q6,770 del valor total.
- Otras cantidades muy altas: papel iris rosado (1,802), anaranjado (1,011), ganchos de metal (1,293), hojas bond facela (2,217). Confirmar contra el conteo físico.
- **Cuadernos de 100 hojas cuadrícula grandes:** costo 40 y venta 4.50 (fila 317). Probablemente es 4.00.
- Sin costo ni precio: cuadernos de 100 y 70 hojas (filas 305 y 306), papel lustre (fila 358).
- Nombres repetidos: papel de china cris claro (filas 8 y 12), cover gris (63 y 69), iris crema (100 y 110). Decidir si se suman o son productos distintos.

## 4. Fase 1 · Crear la base de datos (1 día)

1. Crear cuenta en supabase.com y un proyecto nuevo.
2. En **SQL Editor** ejecutar:

```sql
create table categorias (id bigserial primary key, nombre text unique not null);

create table productos (
  id bigserial primary key,
  codigo text unique not null,
  nombre text not null,
  categoria_id bigint references categorias(id),
  costo numeric(10,2),
  precio numeric(10,2),
  stock_minimo int not null default 5,
  activo boolean not null default true
);

create table movimientos (
  id bigserial primary key,
  producto_id bigint not null references productos(id),
  tipo text not null check (tipo in ('entrada','salida')),
  cantidad int not null check (cantidad > 0),
  motivo text not null,
  referencia text,
  usuario_id uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

-- El stock se calcula con los movimientos; así nunca se desfasa
create view stock_actual with (security_invoker = true) as
select p.*, c.nombre as categoria,
  coalesce(sum(case m.tipo when 'entrada' then m.cantidad else -m.cantidad end), 0) as stock
from productos p
left join categorias c on c.id = p.categoria_id
left join movimientos m on m.producto_id = p.id
group by p.id, c.nombre;

-- Salida con validación de stock
create function registrar_movimiento(p_producto bigint, p_tipo text, p_cantidad int, p_motivo text, p_ref text default null)
returns void language plpgsql as $$
declare v_stock int;
begin
  perform 1 from productos where id = p_producto for update;
  select stock into v_stock from stock_actual where id = p_producto;
  if p_tipo = 'salida' and p_cantidad > v_stock then
    raise exception 'Stock insuficiente: quedan %', v_stock;
  end if;
  insert into movimientos(producto_id, tipo, cantidad, motivo, referencia)
  values (p_producto, p_tipo, p_cantidad, p_motivo, p_ref);
end $$;

-- Cibercafé
create table equipos (id serial primary key, nombre text not null, activo boolean default true);
create table configuracion (id int primary key default 1, tarifa_hora numeric(10,2) default 6,
  bloque_min int default 15, precio_hoja numeric(10,2) default 0.5);
create table sesiones (
  id bigserial primary key,
  equipo_id int references equipos(id),
  inicio timestamptz not null default now(),
  fin timestamptz,
  minutos int, hojas int default 0, total numeric(10,2),
  usuario_id uuid default auth.uid()
);

-- Activos fijos
create table activos_fijos (id serial primary key, grupo text, nombre text, cantidad int, costo_unitario numeric(10,2));

-- Roles
create table perfiles (usuario_id uuid primary key references auth.users(id), rol text not null check (rol in ('admin','cajero')));
insert into equipos(nombre) select 'Equipo ' || g from generate_series(1,5) g;
insert into configuracion default values;
```

## 5. Fase 2 · Importar el contenido del Excel (medio día)

1. Ejecutar el script incluido (genera los CSV a partir del Excel):
   ```bash
   pip install openpyxl
   python migrar_excel.py Libro1.xlsx
   ```
2. En Supabase crear una tabla temporal e importar `productos_importar.csv` desde **Table Editor → Import data from CSV**:
   ```sql
   create table staging_productos (codigo text, categoria text, nombre text,
     costo numeric, precio numeric, stock_inicial int, fila_excel int);
   ```
3. Pasar los datos a las tablas reales:
   ```sql
   insert into categorias(nombre) select distinct categoria from staging_productos;

   insert into productos(codigo, nombre, categoria_id, costo, precio)
   select s.codigo, s.nombre, c.id, s.costo, s.precio
   from staging_productos s join categorias c on c.nombre = s.categoria;

   -- El stock del Excel entra como un movimiento inicial
   insert into movimientos(producto_id, tipo, cantidad, motivo, referencia)
   select p.id, 'entrada', s.stock_inicial, 'Stock inicial', 'Carga Excel'
   from staging_productos s join productos p on p.codigo = s.codigo
   where s.stock_inicial > 0;

   drop table staging_productos;
   ```
4. Importar `activos_fijos_importar.csv` directamente en la tabla `activos_fijos` (ignorar la columna `fila_excel` o quitarla antes).
5. **Verificar:** que `select count(*) from productos` dé 314 y que la suma de `stock` coincida con 32,996 (o con el total corregido en la Fase 0).

## 6. Fase 3 · Conectar el mockup a la base (1 semana)

En el HTML se agrega la librería (con versión exacta fija) y se crea el cliente:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4"></script>
<script>
  const db = supabase.createClient("https://TU-PROYECTO.supabase.co", "TU_ANON_KEY");
</script>
```

Qué se reemplaza en el mockup:

| Función del mockup | Llamada real |
|---|---|
| Lista de productos e Inventario | `db.from('stock_actual').select('*').order('nombre')` |
| Registrar entrada o salida | `db.rpc('registrar_movimiento', {p_producto, p_tipo, p_cantidad, p_motivo, p_ref})` |
| Venta rápida | La misma función, con `p_tipo: 'salida'` y `p_motivo: 'Venta'` |
| Historial | `db.from('movimientos').select('*, productos(nombre)').order('creado_en', {ascending:false})` |
| Nuevo producto | `db.from('productos').insert({...})` y luego la entrada inicial |
| Iniciar sesión de equipo | `db.from('sesiones').insert({equipo_id})` |
| Cobrar y terminar | `db.from('sesiones').update({fin, minutos, hojas, total}).eq('id', id)` |
| Tarifa del cibercafé | `db.from('configuracion').select('*')` |
| Ingresos del día | Consulta sobre `sesiones` filtrando por fecha |

Ventaja importante: el cronómetro se calcula desde `inicio`, así que si se cierra el navegador o se recarga la página, las sesiones activas **no se pierden**.

Orden sugerido: primero Inventario y Movimientos, luego Historial, y al final Cibercafé.

## 7. Fase 4 · Seguridad y usuarios (2 días)

1. Crear los usuarios en **Authentication → Users** (administrador y cajeros) y agregar una pantalla de inicio de sesión al HTML (`db.auth.signInWithPassword`).
2. Activar **Row Level Security** en todas las tablas:
   ```sql
   alter table productos enable row level security;
   alter table movimientos enable row level security;
   -- repetir para las demás tablas

   create policy "leer" on productos for select to authenticated using (true);
   create policy "leer mov" on movimientos for select to authenticated using (true);
   create policy "registrar mov" on movimientos for insert to authenticated with check (true);
   create policy "admin edita productos" on productos for all to authenticated
     using (exists (select 1 from perfiles where usuario_id = auth.uid() and rol = 'admin'));
   ```
3. Regla: el cajero registra movimientos y sesiones; solo el administrador crea o edita productos, cambia tarifas y ve activos fijos y costos.
4. La clave `anon` puede ir en el HTML **solo si RLS está activo**. La clave `service_role` jamás va en el repositorio.

## 8. Fase 5 · Despliegue en GitHub Pages (medio día)

1. Guardar el HTML como `index.html` en el repositorio y activar Pages (Settings → Pages → rama `main`, carpeta raíz).
2. En Supabase, en **Authentication → URL Configuration**, agregar la dirección `https://SU-USUARIO.github.io/NOMBRE-REPO/`.
3. **No subir al repositorio** el Excel ni los CSV: contienen costos y existencias reales del negocio. Los datos viven solo en Supabase.
4. Probar desde un celular y desde la computadora del local.

## 9. Fase 6 · Mejoras posteriores

- Que las hojas impresas **descuenten papel** del inventario automáticamente.
- Reporte de ganancias (precio menos costo) por categoría y por mes.
- Alertas de stock bajo con un stock mínimo por categoría.
- Proveedores y órdenes de compra.
- Cierre de caja diario (ventas más cibercafé).
- Exportar a Excel, y **respaldo semanal** (Supabase permite exportar las tablas a CSV).

## 10. Cronograma estimado (medio tiempo)

| Semana | Entregable |
|---|---|
| 1 | Excel limpio, base creada y datos importados y verificados |
| 2 | Inventario, movimientos e historial funcionando con la base |
| 3 | Cibercafé, inicio de sesión y roles |
| 4 | Pruebas en el local, ajustes, capacitación al personal y despliegue final |

## 11. Riesgos y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| Cantidades erróneas en el Excel | Hacer la Fase 0 y un conteo físico de los productos de mayor valor |
| Que el personal no adopte el sistema | Mantener la interfaz simple y capacitar con casos reales de venta |
| Pérdida de datos | Respaldo semanal en CSV y no editar la base directamente en producción |
| Claves expuestas | RLS activo y nunca subir `service_role` |
| Falla de internet en el local | Fase futura: modo sin conexión; mientras tanto, anotar en papel y registrar después |

## 12. Lista de verificación

- [ ] Excel corregido (avisos revisados)
- [ ] Proyecto Supabase creado y tablas ejecutadas
- [ ] 314 productos y 51 categorías importados
- [ ] Equipos del cibercafé ajustados a 5
- [ ] HTML conectado a la base
- [ ] RLS activo y usuarios creados
- [ ] Sitio publicado en GitHub Pages
- [ ] Prueba completa: entrada, salida, venta rápida y sesión de cibercafé
