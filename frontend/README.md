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

## GitHub Pages (publicación autorizada, pendiente de Task 2)

El workflow **Deploy to GitHub Pages** (`.github/workflows/deploy-pages.yml`) se ejecuta al hacer push a `main` o manualmente con `workflow_dispatch`. Primero ejecuta `npm ci`, `npm test -- --watch=false` y `npm run build` en `frontend/` con Node.js 24; solo si todo pasa, publica como artefacto el contenido estático de `frontend/dist/frontend/browser/`. El `index.html` de la raíz se conserva como referencia y no forma parte del despliegue.

URL del sitio: <https://dbocel.github.io/inventario-cibercafe/>. La build conserva `<base href="./">` para servir correctamente bajo la subruta del proyecto.

**Handoff de Supabase Auth:** el dueño debe agregar `https://dbocel.github.io/inventario-cibercafe/` a la allowlist de URLs de redirección de Supabase si los flujos de autenticación usan redirecciones al sitio. No cambiar la configuración de Supabase como parte de este despliegue.

No incluya `Libro1.xlsx`, CSV reales, `Inventario.pdf`, credenciales, PAT, claves `service_role` ni harnesses de prueba en el sitio. Las políticas RLS de Supabase deben seguir activas; los movimientos de inventario solo se registran mediante `registrar_movimiento`.
