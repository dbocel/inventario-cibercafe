# AGENTS.md

## Repo y arquitectura

Sistema de inventario para cibercafé + papelería Internet K-ROL. La nueva interfaz Angular está en `frontend/`; el `index.html` de la raíz es la app estática anterior y se conserva como referencia hasta que el dueño verifique Angular en un navegador real. No eliminarlo ni reemplazarlo como parte de tareas de implementación sin aprobación explícita. No publicar desde este worktree.

- `frontend/src/app/core/auth/`: autenticación Supabase, restauración de sesión y rol desde `perfiles.rol`.
- `frontend/src/app/core/data/`: lecturas y escrituras de inventario, movimientos y sesiones.
- `frontend/src/app/features/`: resumen, inventario, movimientos, cibercafé, historial e inicio de sesión.
- `frontend/src/app/layout/`: shell, navegación por fragmentos y controles de tema.
- `frontend/src/environments/environment.ts`: solo URL de Supabase y clave pública anon existente.
- `frontend/dist/frontend/browser/`: archivos estáticos publicables de producción; regenerable, no editar a mano. `3rdpartylicenses.txt` queda en `frontend/dist/frontend/`.
- `index.html`, `plan de implementacion/`, y `Libro1.xlsx`: referencia y datos del sistema legado. El Excel y los CSV reales son sensibles, están ignorados y nunca deben agregarse a la app Angular, commits ni build.

Toda la interfaz y los mensajes al usuario van en español (es-GT), con precios en quetzales (Q). Seguir el estilo Angular/TypeScript existente.

## Comandos (PowerShell, desde `frontend/`)

```powershell
npm.cmd ci
npm.cmd start
npm.cmd test -- --watch=false
npm.cmd run build
```

El servidor local abre `http://localhost:4200/`. Los tests se ejecutan con Angular/Vitest. La build se escribe en `frontend/dist/frontend/`; los estáticos publicables (`index.html`, JS/CSS, favicon) están en **`frontend/dist/frontend/browser/`** (ejecutando build dentro de `frontend/`); `3rdpartylicenses.txt` queda un nivel arriba. `src/index.html` usa base relativa `./`, y las pestañas son los fragmentos `#resumen`, `#inventario`, `#movimientos`, `#cibercafe` y `#historial`; verificar esos assets y enlaces bajo una subruta antes del handoff a Pages.

## Supabase y límites de seguridad (no modificar como parte de la migración UI)

- Mantener el mismo proyecto, Auth, esquema, RPC y RLS. No cambiar SQL ni conceder nuevos permisos.
- La clave anon es pública y solo es segura con RLS activo. Nunca incorporar contraseñas, PAT, `service_role` ni credenciales de pruebas al source, tests versionados, logs, dist o commits.
- La app lee los datos bajo la sesión autenticada y muestra fallos de perfil/carga claramente; la ocultación de controles por rol solo es UX, RLS sigue siendo la autorización real.
- **Todos los movimientos de inventario (incluida venta rápida y stock inicial) se escriben exclusivamente mediante RPC `registrar_movimiento`.** No insertar directamente en `movimientos` ni cambiar sus políticas.
- Productos/configuración siguen con sus permisos existentes; las sesiones de cibercafé usan columnas existentes y políticas actuales. El botón `+10 min (demo)` afecta solo estado local, nunca se persiste.
- `productos.costo` mantiene la visibilidad permitida actualmente por el modelo; no ampliar exposición.

## Procedimiento de verificación / E2E

1. Ejecutar `npm.cmd test -- --watch=false` y `npm.cmd run build` en `frontend/`.
2. Servir `frontend/dist/frontend/browser/` bajo una URL con prefijo de proyecto y verificar carga de todos los assets y los cinco fragmentos.
3. Para E2E con Supabase real, usar solo credenciales existentes en archivos temporales fuera del repo. Antes de escribir, autenticar y revisar stock y sesiones activas; elegir producto con stock y equipo libre. No tocar sesiones existentes. Probar movimiento por RPC y borrarlo/confirmar stock restaurado; cerrar/terminar y eliminar únicamente la sesión creada por la prueba. Registrar evidencia de limpieza. Si no puede garantizarse la reversión, no hacer escrituras; informar la limitación y cubrir comportamiento con tests mock/componentes.
4. Auditar source rastreado y `frontend/dist/frontend/` por Excel, CSV de negocio, contraseñas, PAT, service-role y harnesses con credenciales. Los archivos de pruebas live permanecen en `%LOCALAPPDATA%\Temp\opencode\fase3-test\` y nunca se copian al repo/build.

## Handoff GitHub Pages

No hay publicación ni workflow automático configurado. Solo después de la verificación del dueño y aprobación aparte, compilar y servir **el contenido** de `frontend/dist/frontend/browser/` como raíz del sitio del proyecto Pages (la base `./` permite subruta). Publicar únicamente artefactos estáticos permitidos; conservar el `index.html` raíz hasta dicha verificación. Ver `frontend/README.md` para pasos de handoff.
