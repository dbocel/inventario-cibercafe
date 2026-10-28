-- Fase 4 · Seguridad y usuarios (PLAN_inventario_funcional.md, sección 7)
-- Incluye las correcciones acordadas en el análisis del plan:
--   a) registrar_movimiento pasa a SECURITY DEFINER y los clientes pierden el INSERT
--      directo sobre movimientos (cierra el bypass de validación de stock).
--   b) trigger que da de alta perfiles con rol 'cajero' al crear un usuario
--      (el admin lo promueve a 'admin' cuando corresponda).

-- ============================================================
-- 1. Utilidades
-- ============================================================
create or replace function es_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from perfiles where usuario_id = auth.uid() and rol = 'admin') $$;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into perfiles(usuario_id, rol) values (new.id, 'cajero')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Row Level Security en todas las tablas
-- ============================================================
alter table categorias     enable row level security;
alter table productos      enable row level security;
alter table movimientos    enable row level security;
alter table equipos        enable row level security;
alter table configuracion  enable row level security;
alter table sesiones       enable row level security;
alter table activos_fijos  enable row level security;
alter table perfiles       enable row level security;

-- ============================================================
-- 3. Políticas
-- ============================================================
-- Lectura: todo el personal autenticado (equipo del local)
create policy "leer categorias"    on categorias    for select to authenticated using (true);
create policy "leer productos"     on productos     for select to authenticated using (true);
create policy "leer movimientos"   on movimientos   for select to authenticated using (true);
create policy "leer equipos"       on equipos       for select to authenticated using (true);
create policy "leer configuracion" on configuracion for select to authenticated using (true);
create policy "leer sesiones"      on sesiones      for select to authenticated using (true);

-- Productos: solo admin crea/edita/borra (Fase 4, regla 3)
create policy "admin inserta productos"  on productos for insert to authenticated with check (es_admin());
create policy "admin actualiza productos" on productos for update to authenticated using (es_admin()) with check (es_admin());
create policy "admin borra productos"    on productos for delete to authenticated using (es_admin());

-- Catálogo y configuración: solo admin
create policy "admin gestiona categorias"    on categorias    for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin gestiona equipos"       on equipos       for all to authenticated using (es_admin()) with check (es_admin());
create policy "admin gestiona configuracion" on configuracion for all to authenticated using (es_admin()) with check (es_admin());

-- Movimientos: SIN política de insert para clientes (solo la RPC, SECURITY DEFINER).
-- Así se cierra el bypass: un insert directo por REST queda rechazado.
create policy "admin actualiza movimientos" on movimientos for update to authenticated using (es_admin()) with check (es_admin());
create policy "admin borra movimientos"     on movimientos for delete to authenticated using (es_admin());

-- Sesiones del cibercafé: el personal inicia y cobra; solo admin borra
create policy "personal crea sesiones" on sesiones for insert to authenticated with check (true);
create policy "personal cobra sesiones" on sesiones for update to authenticated using (true) with check (true);
create policy "admin borra sesiones"   on sesiones for delete to authenticated using (es_admin());

-- Activos fijos: solo admin (ni lectura para cajeros)
create policy "admin gestiona activos" on activos_fijos for all to authenticated using (es_admin()) with check (es_admin());

-- Perfiles: cada quien ve el suyo; admin ve y gestiona todos
create policy "lee su perfil"    on perfiles for select to authenticated using (usuario_id = auth.uid());
create policy "admin lee perfiles" on perfiles for select to authenticated using (es_admin());
create policy "admin gestiona perfiles" on perfiles for all to authenticated using (es_admin()) with check (es_admin());

-- ============================================================
-- 4. RPC: SECURITY DEFINER + acceso solo autenticado
-- ============================================================
create or replace function registrar_movimiento(p_producto bigint, p_tipo text, p_cantidad int, p_motivo text, p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_stock int;
begin
  perform 1 from productos where id = p_producto for update;
  select stock into v_stock from stock_actual where id = p_producto;
  if p_tipo = 'salida' and p_cantidad > v_stock then
    raise exception 'Stock insuficiente: quedan %', v_stock;
  end if;
  insert into movimientos(producto_id, tipo, cantidad, motivo, referencia, usuario_id)
  values (p_producto, p_tipo, p_cantidad, p_motivo, p_ref, auth.uid());
end $$;

revoke execute on function registrar_movimiento(bigint, text, int, text, text) from public, anon;
revoke execute on function es_admin() from public, anon;
grant execute on function registrar_movimiento(bigint, text, int, text, text) to authenticated;
grant execute on function es_admin() to authenticated;

-- ============================================================
-- 5. Privilegios: los clientes usan sus propios grants + RLS;
--    el rol anon pierde acceso a datos (solo sirve para iniciar sesión)
-- ============================================================
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
