# inventario-cibercafe

Sistema de inventario para cibercafé y papelería Internet K-ROL. La interfaz Angular se mantiene en `frontend/`; el `index.html` legado de la raíz se conserva como referencia.

## Sitio

GitHub Pages: <https://dbocel.github.io/inventario-cibercafe/>. La publicación autorizada es manual: compilar desde `frontend/` y publicar únicamente el contenido de `frontend/dist/frontend/browser/` más `.nojekyll` en la raíz de una rama huérfana `gh-pages`. En **Settings → Pages**, seleccionar **Deploy from a branch**, rama `gh-pages` y carpeta `/(root)`. No hay publicación automática; cada actualización requiere repetir manualmente el build y la publicación. Consultar [`frontend/README.md`](frontend/README.md) para los pasos completos.

Antes del handoff de autenticación, agregar manualmente `https://dbocel.github.io/inventario-cibercafe/` a la allowlist de URLs de redirección en Supabase si Auth redirige al sitio. No cambiar el proyecto, Auth, esquema ni RLS como parte de la publicación. Mantener activa RLS; la app usa únicamente la clave pública anon.
