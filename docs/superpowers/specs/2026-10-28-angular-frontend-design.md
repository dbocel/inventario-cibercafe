# Diseño: migración del frontend de Internet K-ROL a Angular

## Intención

Migrar el frontend actual, concentrado en `index.html`, a Angular para organizar mejor la interfaz y el flujo de acceso, conservando **todo el funcionamiento actual**. La motivación del dueño es evitar problemas de inicio de sesión y de carga de la app. Angular no cambia por sí solo la autenticación: la migración debe conservar explícitamente la integración de Supabase y probar el ciclo completo de sesión.

## Decisiones confirmadas por el dueño

- Migrar todo lo que pertenece al frontend a Angular.
- Mantener Supabase como backend y conservar sus datos, Auth, RPC, roles y políticas RLS; no modificar el esquema ni relajar la seguridad.
- Seguir entregando un sitio estático publicable en GitHub Pages; no usar renderizado del lado del servidor ni requerir un servidor de aplicación.
- Mantener el diseño visual actual.
- Preservar todo el funcionamiento existente, no solo la pantalla de inicio de sesión.

## Alcance funcional

La aplicación Angular debe conservar:

- Inicio de sesión, persistencia/restauración de sesión, cierre de sesión y mensajes de error claros en español.
- Lectura del perfil en `perfiles.rol` y restricciones visuales por rol; la autorización real continúa siendo responsabilidad de RLS.
- Resumen de inventario y cibercafé.
- Inventario: filtros, búsqueda, categorías, estados de stock y venta rápida.
- Movimientos: entradas y salidas por la RPC `registrar_movimiento`, validación de stock, historial y filtros.
- Cibercafé: equipos, sesiones, cronómetro, cobro, tarifas editables por admin y ajuste local de demostración de +10 minutos.
- Historial y descarga de CSV, con los avisos existentes cuando el navegador bloquee una descarga.
- Tema visual y distribución actuales, incluyendo textos en español (es-GT) y precios en quetzales. El selector de tema actualmente cambia el tema en memoria y respeta la preferencia del sistema al cargar; no persiste la elección tras recargar, y la migración conservará ese comportamiento.
- Temporizador de cibercafé: el tiempo parte del `inicio` persistido en Supabase, se actualiza cada segundo mientras la app está abierta y se reconstruye al recargar consultando la sesión activa. El botón `+10 min (demo)` solo ajusta el estado local y no persiste.

No se agrega funcionalidad comercial nueva ni se rediseñan pantallas durante esta migración. No se incluye la publicación efectiva de Fase 5 salvo aprobación posterior del dueño.

## Arquitectura propuesta

- Crear un proyecto Angular con TypeScript y componentes standalone, usando Angular CLI y su compilación estática.
- Separar la interfaz por áreas (acceso, resumen, inventario, movimientos, cibercafé e historial) y encapsular Auth/consultas Supabase en servicios Angular. La partición exacta de componentes queda al implementador mientras no cambie UX ni comportamiento.
- Incorporar `@supabase/supabase-js` como dependencia npm compatible con Angular. Mantener la URL del proyecto y la clave `anon` existentes; jamás incluir `service_role`, PAT ni credenciales de usuario en el bundle o en Git.
- Conservar las mismas consultas y escrituras: movimientos exclusivamente por `registrar_movimiento`; sesiones/configuración/productos según permisos existentes. No cambiar nombres de tablas/columnas, RPC ni contratos.
- Producir únicamente archivos estáticos para GitHub Pages. Configurar ruta/base del proyecto para Pages y documentar comando de build/deploy; Pages debe servir la app desde subruta sin romper rutas, CSS, assets o recarga.
- No introducir SSR, API propia, proxy con secretos ni cambios a RLS. Las políticas actuales siguen siendo el límite de seguridad.

## Compatibilidad y seguridad

- Mantener RLS habilitado en las ocho tablas públicas y el modelo vigente de roles.
- Cajeros no deben obtener permisos nuevos por la migración; ocultar controles no sustituye RLS.
- Mantener las operaciones de escritura verificadas en Supabase, y no exponer costos/secretos más allá del comportamiento actualmente permitido.
- Nunca subir `Libro1.xlsx`, CSV reales, contraseñas, PAT, `service_role` ni harnesses con credenciales.
- Asegurar que GitHub Pages y el origen local de desarrollo usen solo la clave anon pública con RLS activo.

## Criterios de aceptación

1. La apariencia y el contenido funcional de las cinco áreas existentes se conservan.
2. Login, restauración de sesión y logout funcionan tanto en sesión fresca como al recargar; un fallo de Auth/perfil/carga queda visible y no deja el acceso indefinidamente bloqueado sin explicación.
3. Un admin puede realizar las operaciones que hoy le corresponden; un cajero sigue sujeto a las mismas restricciones. La verificación cubre los permisos del servidor, no solo la visibilidad de botones.
4. Las lecturas y escrituras siguen usando el mismo proyecto y contrato Supabase; una prueba de movimiento usa la RPC y restaura el estado de prueba.
5. La build de producción genera un sitio estático que funciona bajo la ruta de GitHub Pages.
6. Ningún secreto ni dato real sensible aparece en archivos publicados, configuración versionada o bundle.
7. Verificación mínima: build Angular, revisión de rutas y assets del build, pruebas del flujo Auth/roles, y E2E de operaciones principales; reporte explícito de cualquier prueba no ejecutada.

## Llamadas de implementación

- Se propone Angular standalone para reducir estructura ceremonial y facilitar separar la app por áreas.
- Se conserva la apariencia existente; cualquier retoque requerido solo para equivalencia responsive/accesibilidad debe ser visualmente discreto y no alterar el diseño aprobado.
- La versión concreta de Angular y la estrategia de publicación se seleccionan al implementar, según compatibilidad vigente y el repositorio; deben respetar los requisitos de sitio estático.
- La implementación se hará después de que el dueño apruebe este diseño y su plan.
