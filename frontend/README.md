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

2. Crear o actualizar una rama huérfana local `gh-pages` y publicar en su raíz **únicamente el contenido** de `frontend/dist/frontend/browser/` (no la carpeta que lo contiene), junto con un archivo vacío `.nojekyll`. No incluir `frontend/dist/frontend/3rdpartylicenses.txt`, source, dependencias u otros archivos del repositorio. Revisar el árbol antes de confirmar y publicar la rama.
3. En GitHub, configurar **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` → `/(root)`**.

El `index.html` legado de la raíz de la rama principal se conserva intacto y no forma parte del sitio publicado. La build usa `<base href="./">` para la subruta del proyecto.

**Handoff manual de Supabase Auth:** el dueño debe agregar `https://dbocel.github.io/inventario-cibercafe/` a la allowlist de URLs de redirección de Supabase cuando los flujos de autenticación redirijan al sitio. Este cambio de allowlist se realiza manualmente en Supabase y no forma parte de publicar la rama. Mantener sin cambios el proyecto, Auth, esquema, RPC y RLS; la clave anon pública solo es segura con RLS activo.

No incluya `Libro1.xlsx`, CSV reales, `Inventario.pdf`, credenciales, PAT, claves `service_role` ni harnesses de prueba en el sitio. Los movimientos de inventario solo se registran mediante `registrar_movimiento`.
