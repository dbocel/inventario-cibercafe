# AGENTS.md

## Qué es este repo

Sistema de inventario para cibercafé + papelería ("Internet K-ROL"), en español (es-GT, precios en Quetzales "Q"). `index.html` es una app estática (HTML + JS vanilla, sin framework ni build) **conectada a Supabase** (PostgreSQL + Auth + RLS). Fases 0–4 del plan ejecutadas; pendientes: Fase 5 (GitHub Pages), Fase 6 (mejoras) y el conteo físico de datos.

No hay `package.json`, lint, tests ni CI. Verificación: `node --check` del script + harness jsdom (ver Testing).

## Estructura

- `index.html` — toda la app. Pestañas: resumen, inventario, movimientos, cibercafe, historial (`data-tab` / `#tab-*`, sincronizados en `showTab()`).
  - `syncAll()` consulta 6 tablas en paralelo y re-renderiza; las escrituras van por RPC `registrar_movimiento` o inserts REST, luego `syncAll()`.
  - Flujo de acceso: `#loginView` bloquea todo hasta `signInWithPassword`; `afterLogin()` lee `perfiles.rol` y aplica clase `no-admin` en `<body>` (oculta "Nuevo producto" y las tarifas del cibercafé).
- `Libro1.xlsx` — datos reales del negocio (314 productos, 51 categorías, 24 activos fijos). **Sensible: está en `.gitignore`, no subirlo jamás.** Lo mismo para `plan de implementacion/*.csv`.
- `plan de implementacion/`:
  - `PLAN_inventario_funcional.md` — fuente de verdad del roadmap (léelo antes de tocar arquitectura). Sus números ya fueron verificados: 314 productos / 51 categorías / 32.996 unidades / Q38.962 activos ✓. Los Q29.114.60 de valor al costo del plan están desactualizados: la corrección de la fila 317 (costo 40→4) da Q28.502,60.
  - `migrar_excel.py` — genera los CSV desde el Excel (salida a `plan de implementacion/`).
  - `fase1_crear_base.sql`, `fase4_seguridad.sql` — SQL ejecutado en Supabase (reutilizable si se recrea el proyecto).
- `.gitignore` — Excel + CSVs de datos. Los CSV con costos son sensibles igual que el Excel.

## Comandos

```bash
# Regenerar CSV tras corregir el Excel (Python 3.12 instalado con winget + openpyxl)
python "plan de implementacion/migrar_excel.py" Libro1.xlsx
# Esperado: 314 productos | 51 categorías | 24 activos | 12 avisos
```

```powershell
# Chequeo de sintaxis del JS de index.html (extraer el último bloque <script> primero)
node --check app_extract.js
```

## Supabase (proyecto `tvxlscokuqaztbumdgby`, región us-east-2)

- URL: `https://tvxlscokuqaztbumdgby.supabase.co`. La clave anon está embebida en `index.html` (válida **porque RLS está activo** — el plan prohíbe publicar con RLS apagado; `service_role` jamás va al repo).
- **Usuario real:** `wendysac150@gmail.com` con rol `admin` en `perfiles` (la contraseña se entregó una sola vez en conversación; si se pierde, regenerar desde el dashboard o con `update auth.users set encrypted_password = crypt(...)`).
- Usuarios se crean **desde el dashboard** (Authentication → Users): la Management API no tiene endpoint de creación y el `signup` con `mailer_autoconfirm` topa con rate limit de correo (429). Alternativa usada: `update auth.users set email_confirmed_at = now()`. Al crear un usuario, el trigger `on_auth_user_created` da de alta `perfiles` con rol `cajero` (promover a `admin` con un `update`).
- **Cómo ejecutar SQL** (no hay `psql`): Management API `POST https://api.supabase.com/v1/projects/tvxlscokuqaztbumdgby/database/query` con `Authorization: Bearer <PAT>` y body `{"query": "..."}`. PAT de la cuenta del usuario (no la repitas en commits).
- **Quirks de PowerShell 5.1 en este entorno** (costaron errores reales):
  - `ConvertTo-Json` de un string de `Get-Content -Raw` sale como `{"value":...}` → castear `[string]$sql = ...`; enviar body como bytes UTF-8 con `ContentType "application/json; charset=utf-8"`.
  - `Invoke-RestMethod` no tiene `-Property`; para capturar el cuerpo de un POST usar cabecera `Prefer: return=representation`.
  - Ejecutar CLI de Supabase como `& "$env:APPDATA\npm\supabase.cmd" ...` (el `.ps1` está bloqueado por ExecutionPolicy; igual `npm.cmd`, no `npm.ps1`).
  - `Invoke-RestMethod` aplana múltiples resultsets: devolver una sola fila `json_build_object(...)`.
- **Diseño de seguridad (no romper):**
  - RLS activo en las 8 tablas públicas.
  - `movimientos` **no tiene política de INSERT para clientes**: los movimientos entran SOLO por la RPC `registrar_movimiento` (SECURITY DEFINER). Ceder aquí reintroduce el bypass de validación de stock.
  - `activos_fijos` es solo-admin; `productos` escribe solo-admin; `sesiones` las escribe cualquier autenticado.
  - Los cargos de cibercafé se calculan desde `sesiones.inicio`; el botón "+10 min (demo)" es estado local que no persiste (a propósito).
  - Simplificación conocida del plan: `productos.costo` es visible para cajeros (el plan no define control a nivel de columna).

## Testing

- Harness E2E en `C:\Users\dboce\AppData\Local\Temp\opencode\fase3-test\harness3.js` (jsdom + credenciales reales en el archivo → **no commitear**): gate de login → login → lecturas → venta rápida → revert → logout. Última corrida: 18/18 PASS. Los `harness.js`/`harness2.js` de la misma carpeta son pre-RLS y ya no sirven.
- Tras RLS, cualquier prueba REST sin JWT autenticado da 401 — es esperado.
- Al terminar una prueba de escritura, revertir borrando el movimiento creado (el stock se deriva: se restaura solo).

## Pendientes / convenciones

- Toda la UI, comentarios y textos al usuario van en **español**. Sin tooling: seguir el estilo existente (`var`/`function`, strings concatenados, CSS custom properties para el tema).
- Fase 5 (GitHub Pages): RLS ya activo → se puede publicar; subir solo `index.html` (+ opcional plan/SQL), nunca Excel/CSV.
- Fase 0: quedan 12 avisos de `avisos_revision.csv` a la espera del conteo físico del local (cantidades altas y3 productos sin costo/precio). Nombres repetidos se dejaron **separados** por decisión del dueño.
- La descarga de CSV desde `index.html` puede fallar en algunos entornos (el toast lo avisa); no es bug.
