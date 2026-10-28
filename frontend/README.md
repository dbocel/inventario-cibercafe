# Frontend Angular — Internet K-ROL

Aplicación estática Angular para inventario de cibercafé y papelería. La interfaz está en español (es-GT) y usa quetzales (Q). Supabase sigue siendo el backend; esta migración no cambia tablas, RPC, Auth ni políticas RLS.

## Requisitos y desarrollo

Requiere Node.js compatible con Angular 22 y npm. Desde `frontend/`:

```powershell
npm.cmd ci
npm.cmd start
```

Abra `http://localhost:4200/`. La configuración versionada usa únicamente la URL y la clave pública anon de Supabase. No añada contraseñas, PAT ni claves `service_role`.

## Pruebas y build de producción

Desde `frontend/`:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

Las pruebas usan el runner Angular/Vitest. La build queda en `frontend/dist/frontend/`; los archivos estáticos publicables están en **`frontend/dist/frontend/browser/`** (`index.html`, bundles JS/CSS y favicon). `3rdpartylicenses.txt` queda un nivel arriba, en `frontend/dist/frontend/`. `src/index.html` usa `<base href="./">` y la navegación existente por fragmentos (`#resumen`, `#inventario`, `#movimientos`, `#cibercafe`, `#historial`), por lo que los assets son relativos y la app puede alojarse en una subruta de GitHub Pages.

## GitHub Pages (publicación manual)

URL del sitio: <https://dbocel.github.io/inventario-cibercafe/>. La publicación se realiza manualmente en la rama `gh-pages`; no hay despliegue automático. Los futuros cambios requieren repetir estos pasos y publicar el nuevo build de forma manual.

1. Desde `frontend/`, instalar dependencias y verificar/buildar la aplicación:

   ```powershell
   npm.cmd ci
   npm.cmd test -- --watch=false
   npm.cmd run build
   ```

2. Desde la raíz del repositorio, crea el worktree huérfano solo la primera vez:

   ```powershell
   git worktree add --orphan gh-pages ..\gh-pages
   ```

   Para una actualización posterior, reutiliza el worktree; antes de copiar el nuevo build, elimina sus archivos versionados:

   ```powershell
   git -C ..\gh-pages rm -r -- .
   ```

   En ambos casos, copia y publica únicamente el contenido de browser:

   ```powershell
   Get-ChildItem .\frontend\dist\frontend\browser -Force | Copy-Item -Destination ..\gh-pages -Recurse -Force
   git -C ..\gh-pages add -A
   git -C ..\gh-pages status --short
   git -C ..\gh-pages diff --cached --stat
   git -C ..\gh-pages commit -m "Deploy GitHub Pages"
   git -C ..\gh-pages push -u origin gh-pages
   ```

   La copia coloca en la raíz **solo el contenido** de `frontend/dist/frontend/browser/`, incluido el `.nojekyll` vacío; no copiar `frontend/dist/frontend/3rdpartylicenses.txt`, source, dependencias ni otros archivos. Revisar el árbol preparado antes del commit/push. Cada actualización requiere repetir manualmente build, copia, commit y push.

3. En GitHub, configurar **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` → `/(root)`**.

El `index.html` legado de la raíz de la rama principal se conserva intacto y no forma parte del sitio publicado. La build usa `<base href="./">` para la subruta del proyecto.

**Handoff manual de Supabase Auth:** el dueño debe agregar `https://dbocel.github.io/inventario-cibercafe/` a la allowlist de URLs de redirección de Supabase cuando los flujos de autenticación redirijan al sitio. Este cambio de allowlist se realiza manualmente en Supabase y no forma parte de publicar la rama. Mantener sin cambios el proyecto, Auth, esquema, RPC y RLS; la clave anon pública solo es segura con RLS activo.

No incluya `Libro1.xlsx`, CSV reales, `Inventario.pdf`, credenciales, PAT, claves `service_role` ni harnesses de prueba en el sitio. Los movimientos de inventario solo se registran mediante `registrar_movimiento`.
