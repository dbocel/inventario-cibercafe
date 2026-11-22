# Manual Técnico - Inventario Cibercafé + Papelería Internet K-ROL

**Versión:** 1.0  
**Fecha:** Octubre 2026  
**Tecnologías:** Angular 22, TypeScript 6, Vitest, Supabase (Auth, Postgres, RLS, RPC), jsPDF  
**Idioma de la aplicación:** Español (es-GT)  
**Moneda:** Quetzales (Q)

---

## 1. Objetivo

El presente manual describe la arquitectura, estructura, configuración, seguridad, despliegue y mantenimiento del sistema de inventario para cibercafé y papelería Internet K-ROL. Su finalidad es servir como referencia técnica para desarrolladores, administradores y personal de soporte.

---

## 2. Arquitectura General

El proyecto está dividido en dos partes principales:

| Componente | Ubicación | Descripción |
|---|---|---|
| **Frontend Angular** | `frontend/` | Aplicación SPA con navegación por fragmentos. Es la interfaz oficial vigente. |
| **Aplicación Legacy** | `index.html` (raíz) | Versión estática anterior. Se mantiene únicamente como referencia. No debe eliminarse ni reemplazarse sin autorización. |

La aplicación se comunica directamente con **Supabase** utilizando la clave pública `anon`. Toda la autorización se delega a **Row Level Security (RLS)**.

---

## 3. Estructura del Proyecto

```text
inventario-cibercafe/
├── frontend/                    # Aplicación Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── auth/       # Autenticación y gestión de sesión/rol
│   │   │   │   ├── data/       # Servicios de datos (Inventario, movimientos, sesiones)
│   │   │   │   └── supabase/   # Cliente Supabase
│   │   │   ├── features/       # Vistas principales
│   │   │   │   ├── dashboard/
│   │   │   │   ├── inventory/
│   │   │   │   ├── movements/
│   │   │   │   ├── cybercafe/
│   │   │   │   ├── history/
│   │   │   │   └── login/
│   │   │   ├── layout/         # Shell, navegación y tema
│   │   │   └── shared/         # Directivas/componentes compartidos
│   │   ├── environments/       # Configuración de entorno
│   │   └── styles.css
│   ├── dist/                   # Build generado (NO editar manualmente)
│   └── package.json
├── index.html                  # Legacy (referencia)
├── AGENTS.md                   # Reglas para agentes IA
├── README.md
└── MANUAL_TECNICO.md           # Este documento
```

---

## 4. Tecnologías Utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| **Angular** | 22.2.0 | Framework principal |
| **TypeScript** | 6.0.2 | Lenguaje |
| **RxJS** | 7.8.0 | Programación reactiva |
| **Supabase JS** | 2.99.0 | Cliente para Auth, BD y RPC |
| **Vitest** | 5.0.0 | Testing unitario/componente |
| **jsPDF** | ^3.x | Generación de PDF |
| **jspdf-autotable** | ^5.x | Tablas para PDF |

---

## 5. Configuración de Entorno

**Archivo:** `frontend/src/environments/environment.ts`

```typescript
export const environment = {
  supabaseUrl: 'https://tvxlscokuqaztbumdgby.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

> **Nota:** La clave `anon` es pública. Su seguridad depende completamente de **RLS activo**. **Nunca** agregar `service_role`, contraseñas o credenciales al repositorio.

---

## 6. Autenticación y Autorización

### Flujo de autenticación

1. **Inicialización** (`App.ts`) → Llama a `AuthService.initialize()`
2. **Sesión existente** → `auth.getSession()` valida token
3. **Carga de perfil** → Consulta `perfiles` con `usuario_id = auth.user.id`
4. **Validación** → Si existe `rol` (`admin` o `cajero`), se autoriza el acceso
5. **Denegación** → Si no existe perfil, se cierra sesión con mensaje de error

### Tablas involucradas

| Tabla | Propósito |
|---|---|
| `auth.users` | Usuarios autenticados por Supabase Auth (UUID, email) |
| `public.perfiles` | Roles de aplicación (`usuario_id` FK a `auth.users`, `rol` ENUM `admin`/`cajero`) |

### Reglas importantes

- **Ambas tablas son obligatorias.** Estar en `auth.users` permite iniciar sesión, pero **estar en `perfiles` es obligatorio para acceder a la aplicación**.
- **Ocultación de controles = UX únicamente.** La verdadera autorización es **RLS**.
- **Roles válidos:** `admin` y `cajero`

---

## 7. Modelo de Datos (Supabase)

### Tablas principales

| Tabla | Descripción |
|---|---|
| `productos` | Catálogo de productos (código, nombre, categoría, precio, costo, stock_mínimo, activo) |
| `categorias` | Categorías de productos |
| `movimientos` | Historial de entradas/salidas (audit trail) |
| `equipos` | Equipos de cómputo del cibercafé |
| `sesiones` | Sesiones de uso de equipos (inicio, fin, minutos, hojas, total) |
| `configuracion` | Tarifas (`tarifa_hora`, `bloque_min`, `precio_hoja`) |
| `perfiles` | Roles de usuarios |
| `activos_fijos` | Inventario de activos (mobiliario, equipo, etc.) |

### Vistas

**`stock_actual` (security_invoker = true)**

Calcula el stock en tiempo real:

```sql
select p.*, c.nombre as categoria,
  coalesce(sum(case m.tipo when 'entrada' then m.cantidad else -m.cantidad end), 0) as stock
from productos p
left join categorias c on c.id = p.categoria_id
left join movimientos m on m.producto_id = p.id
group by p.id, c.nombre;
```

### Funciones RPC

**`registrar_movimiento(p_producto, p_tipo, p_cantidad, p_motivo, p_ref)`**

- Valida existencia con `FOR UPDATE`
- Verifica stock para salidas
- Inserta movimiento directamente
- **ÚNICA vía permitida para escribir movimientos de inventario**

> **CRÍTICO:** Nunca insertar directamente en `movimientos`. Siempre usar esta RPC.

---

## 8. Funcionalidades por Módulo

| Módulo | Ruta/Fragmento | Descripción |
|---|---|---|
| **Login** | N/A | Autenticación con email/contraseña |
| **Resumen** | `#resumen` | Dashboard con métricas generales |
| **Inventario** | `#inventario` | Listado, filtros, venta rápida, alta de productos, **exportación CSV/PDF con previsualización** |
| **Registrar Movimiento** | `#movimientos` | Entradas/salidas manuales con **modal de confirmación**, venta rápida |
| **Cibercafé** | `#cibercafe` | Control de equipos, inicio/cobro de sesiones, tarifas, impresión |
| **Historial** | `#historial` | Historial de movimientos y sesiones |

### Características destacadas

- **PDF de Inventario:** Formato "CONTROL DE INVENTARIO / INTERNET K-ROL", agrupado por categorías, incluye MERCADERÍAS y NO CORRIENTE, previsualización modal, descarga desde previsualización
- **Modales de confirmación:** Para movimientos de entrada/salida, venta rápida y cobro de sesión
- **Carga optimizada:** Carga crítica (productos/equipos/config/categorías) primero, movimientos/sesiones diferidos. Caché en memoria (60s)
- **Tema claro por defecto:** Sin forzar modo oscuro por preferencia del sistema
- **Navegación por fragmentos:** Compatible con GitHub Pages

---

## 9. Comandos de Desarrollo

Todos los comandos se ejecutan desde `frontend/` con **PowerShell**.

```powershell
# Instalar dependencias
npm.cmd ci

# Servidor de desarrollo
npm.cmd start  # http://localhost:4200/

# Tests (sin watch)
npm.cmd test -- --watch=false

# Build de producción
npm.cmd run build
```

### Ubicación del build

- **Salida general:** `frontend/dist/frontend/`
- **Archivos publicables:** `frontend/dist/frontend/browser/` (`index.html`, JS, CSS, favicon)
- **Licencias:** `frontend/dist/frontend/3rdpartylicenses.txt` (queda un nivel arriba de `browser/`)

> **Importante:** Verificar assets y enlaces bajo subruta antes de despliegue a GitHub Pages. `src/index.html` usa base relativa `./`.

---

## 10. Testing

- **Framework:** Vitest con Angular TestBed
- **Archivos:** `*.spec.ts`
- **Comando:** `npm.cmd test -- --watch=false`
- **Cobertura:** 79 tests pasando (estado actual)
- **Entorno jsdom:** Configurado para compatibilidad con componentes

---

## 11. Despliegue a GitHub Pages

**URL:** [https://dbocel.github.io/inventario-cibercafe/](https://dbocel.github.io/inventario-cibercafe/)

### Proceso manual

1. **Build** desde `frontend/`: `npm.cmd ci`, `npm.cmd test -- --watch=false`, `npm.cmd run build`
2. **Preparar artefacto:** Copiar **únicamente** contenido de `frontend/dist/frontend/browser/` a carpeta temporal
3. **Agregar:** Archivo `.nojekyll` vacío en raíz
4. **Desplegar:** Rama huérfana `gh-pages` con contenido en **raíz** (sin carpeta `browser/`)
5. **Configurar Pages:** Settings → Pages → Deploy from a branch → `gh-pages` → `/(root)`

### Comandos PowerShell (resumidos)

```powershell
$temp = "$env:TEMP\ghpages-deploy"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Force -Path $temp | Out-Null
Copy-Item -Path "frontend\dist\frontend\browser\*" -Destination $temp -Recurse -Force
New-Item -ItemType File -Path "$temp\.nojekyll" -Force | Out-Null
cd $temp
git init
git checkout --orphan gh-pages
git add .
git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git remote add origin https://github.com/dbocel/inventario-cibercafe.git
git push -f origin gh-pages
cd D:\Inventario\inventario-cibercafe
```

### Requisitos post-despliegue

- **Supabase Auth:** Agregar `https://dbocel.github.io/inventario-cibercafe/` a **Redirect URLs** si se requiere redirección
- **RLS:** Debe permanecer activo. Clave anon pública depende de ello
- **Cache:** Si hay problemas visuales, hacer hard reload (`Ctrl+Shift+R`)

---

## 12. Seguridad

### Reglas obligatorias

- [x] **NO** modificar proyecto, Auth, esquema, RPC o RLS
- [x] **NO** conceder nuevos permisos
- [x] **NO** insertar directamente en `movimientos`
- [x] **TODOS** los movimientos deben ir por `registrar_movimiento`
- [x] **NO** exponer `service_role` en código fuente
- [x] **NO** incluir contraseñas, PATs o credenciales
- [x] **NO** agregar archivos sensibles (Excel/CSV de negocio) al repo o build
- [x] **RLS siempre activo**

### Archivos sensibles

Ignorados/no versionados o que nunca deben agregarse:
- `Libro1.xlsx`
- Archivos CSV de negocio
- `frontend/dist/` (regenerable, no editar manualmente)
- Credenciales de cualquier tipo

### Tests "live"

Los archivos de pruebas con Supabase real deben permanecer en:
`%LOCALAPPDATA%\Temp\opencode\fase3-test/` y **nunca** copiarse al repo o build.

---

## 13. Solución de Problemas

| Problema | Causa | Solución |
|---|---|---|
| **"No se pudo cargar el perfil de acceso"** | Usuario existe en `auth.users` pero no en `public.perfiles` | Agregar fila en `perfiles` con `usuario_id` (UUID) y `rol` válido |
| **"Correo o contraseña incorrectos"** | Usuario no existe en `auth.users` | Crear usuario en Authentication → Users |
| **App lenta al cargar** | `stock_actual` es vista con GROUP BY | Ya optimizado con carga crítica + diferida |
| **Modal no aparece en tests** | jsdom no soporta `dialog.showModal()` | Manejador defensivo implementado en `ModalDirective` |
| **Tema oscuro aparece por defecto** | Preferencia del sistema | Corregido: modo claro por defecto |
| **PDF no se visualiza completo** | Modal pequeño | Modal ampliado a 95vw x 90vh con iframe 100% |

---

## 14. Mantenimiento

### Buenas prácticas

- Seguir convenciones Angular/TypeScript existentes
- Mantener interfaz y mensajes en **español (es-GT)**
- Precios siempre en **quetzales (Q)**
- Usar `npm.cmd` en Windows/PowerShell
- Ejecutar tests antes de cualquier build/despliegue
- Verificar build bajo subruta antes de Pages

### Checklist pre-despliegue

- [ ] `npm.cmd test -- --watch=false` pasa
- [ ] `npm.cmd run build` genera sin errores críticos
- [ ] Revisar `frontend/dist/frontend/browser/` correcto
- [ ] `.nojekyll` incluido
- [ ] Solo contenido de `browser/` en raíz de `gh-pages`
- [ ] RLS activo
- [ ] Sin credenciales en código

---

**Documento generado para referencia técnica del proyecto Inventario Cibercafé + Papelería Internet K-ROL.**
