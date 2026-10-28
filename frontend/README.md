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

## Handoff manual a GitHub Pages (no publicado)

La salida aún no está publicada y el `index.html` de la raíz se conserva como referencia funcional. Después de la verificación del dueño y de una aprobación separada para publicar:

1. Ejecute `npm.cmd ci` y `npm.cmd run build` desde `frontend/`.
2. Configure Pages para servir el contenido de `frontend/dist/frontend/browser/` desde la raíz del sitio del proyecto. Si se usa una rama de publicación, copie **el contenido** de ese directorio (no el directorio contenedor) al directorio que Pages sirve; puede incluir `frontend/dist/frontend/3rdpartylicenses.txt` si desea publicar las licencias. No se requiere workflow automático.
3. Compruebe la URL de proyecto bajo su subruta y los cinco fragmentos; no configure el sitio como dominio raíz sin revisar la base de assets.
4. Publique solo la salida estática. Nunca incluya `Libro1.xlsx`, CSV reales, credenciales, PAT, claves `service_role` ni harnesses de prueba.

No se configura ni ejecuta despliegue con este README. Las políticas RLS de Supabase deben seguir activas; los movimientos de inventario solo se registran mediante `registrar_movimiento`.
