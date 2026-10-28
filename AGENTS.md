# AGENTS.md

## Arquitectura

- App Angular en `frontend/`. El `index.html` de la raíz es app estática **legacy**: conservar como referencia, no eliminar/reemplazar sin aprobación explícita. No publicar desde este worktree sin autorización.
- Rutas por fragmentos: `#resumen`, `#inventario`, `#movimientos`, `#cibercafe`, `#historial`. `frontend/src/index.html` usa base relativa `./`.
- Mapeo clave: `frontend/src/app/core/auth/` (Supabase Auth + rol desde `perfiles.rol`), `frontend/src/app/core/data/` (lecturas/escrituras), `frontend/src/app/features/` (vistas), `frontend/src/app/layout/` (shell + tema). 
- Entorno: `frontend/src/environments/environment.ts` solo con URL de Supabase y clave anon pública.
- Referencia/sensibles (ignorados): `index.html` raíz, `plan de implementacion/`, `Libro1.xlsx`. **Nunca** agregar CSV/Excel de negocio, credenciales o `service_role` al repo/build.
- Idioma: español (es-GT), precios en quetzales (Q). Seguir estilo Angular/TypeScript existente.

## Comandos (PowerShell, desde `frontend/`)

```powershell
npm.cmd ci
npm.cmd start        # http://localhost:4200/
npm.cmd test -- --watch=false  # Angular + Vitest
npm.cmd run build
```

- Build salida: `frontend/dist/frontend/`. **Archivos publicables**: `frontend/dist/frontend/browser/` (`index.html`, JS/CSS, favicon). `3rdpartylicenses.txt` queda en `frontend/dist/frontend/`. No editar `dist/` a mano.
- Verificar assets/enlaces bajo subruta (Pages) antes de handoff; respetar base relativa `./` y los 5 fragmentos.

## Supabase / Reglas críticas

- Mantener proyecto/Auth/esquema/RPC/RLS tal como están. No cambiar SQL ni conceder permisos.
- Clave anon pública solo segura con **RLS activo**. Nunca meter contraseñas, PAT, `service_role` o creds de prueba en source/tests/versionados/logs/dist/commits.
- **Todos los movimientos de inventario** (venta rápida e inventario inicial) deben escribirse **exclusivamente vía RPC `registrar_movimiento`**. No insertar directo en `movimientos`, no cambiar sus políticas.
- Ocultar controles por rol es solo UX; RLS es la autorización real.
- Sesiones de cibercafé usan columnas/políticas existentes. Botón `+10 min (demo)` solo local, nunca persiste. `productos.costo` mantener visibilidad actual (no ampliar).

## Verificación / E2E

1. `npm.cmd test -- --watch=false` y `npm.cmd run build` desde `frontend/`.
2. Servir `frontend/dist/frontend/browser/` con prefijo de proyecto y validar los 5 fragmentos + assets.
3. Si hay E2E con Supabase real: usar credenciales solo en archivo temporal fuera del repo. Antes de escribir, autenticar/revisar stock/sesiones activas; elegir producto con stock y equipo libre. **No** tocar sesiones existentes. Probar movimiento por RPC y revertirlo/restaurar stock; crear/terminar **únicamente** sesión de prueba y eliminarla. Registrar limpieza. Si no se garantiza reversión → no escribir, reportar limitación y cubrir con mocks/component tests.
4. Auditar source rastreado y `frontend/dist/frontend/` contra Excel/CSV sensibles, contraseñas, PAT, `service_role`. Tests "live" quedan en `%LOCALAPPDATA%\Temp\opencode\fase3-test/` y **nunca** van a repo/build.

## Publicación GitHub Pages (manual)

- URL: `https://dbocel.github.io/inventario-cibercafe/`
- Sin workflow automático. En rama huérfana `gh-pages`: desde `frontend/` ejecutar `npm.cmd ci`, `npm.cmd test -- --watch=false`, `npm.cmd run build`. Publicar **únicamente** el contenido de `frontend/dist/frontend/browser/` en la **raíz** de `gh-pages` + `.nojekyll` vacío. **No** incluir carpeta `browser/`, `3rdpartylicenses.txt`, código fuente, deps ni archivos ajenos.
- En **Settings → Pages → Build and deployment**: **Deploy from a branch → `gh-pages` → `/(root)`**. Repetir build+publicación por cada cambio. `index.html` legado de rama principal se conserva intacto.
- Agregar `https://dbocel.github.io/inventario-cibercafe/` a allowlist de redirect URLs de Supabase si Auth redirige. No tocar Auth/RLS/esquema. Clave anon pública requiere RLS activo.
