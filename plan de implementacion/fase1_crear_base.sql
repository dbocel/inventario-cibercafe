-- Fase 1 · Crear la base de datos (extraído de PLAN_inventario_funcional.md, sección 4)
-- Ejecutar en el SQL Editor de Supabase (o Management API).

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
