# Seguimiento de proyectos y UAT

## Estructura del repo

| Ruta | Rol |
|------|-----|
| `apps/web/` | Sitio estático (HTML/CSS/JS). **Vercel** despliega esta carpeta. |
| `apps/web/data/` | `projects.json`, `uat.json` y los `.data.js` generados. **Fuente de verdad en Git** para Cursor. |
| `apps/api/` | Servidor Node (Express): `GET/PUT /api/projects`, `/api/uat`, y **`PUT /api/sync`** (proyectos + UAT en un solo request). **Docker / Railway**. |
| `scripts/sync-tracker-data.*` | Regenera `*.data.js` desde los JSON (local sin servidor). |

## Cargar datos en la web

1. **Scripts `data/*.data.js`** (doble clic / `file://`) — definen `window.__TRACKER_PROJECTS__` y `window.__TRACKER_UAT__`.
2. **`fetch` a `data/*.json`** — con cualquier servidor HTTP estático.
3. **API** — si `config.js` define `__TRACKER_API_BASE__`, se ignoran los `.data.js` para la carga y se usa la API (producción / equipo remoto).

Orden de prioridad en `tracker-shared.js`: **API configurada → variables globales de scripts → fetch JSON**.

## Sincronización: tres escenarios

### A) Solo Cursor (Git como fuente de verdad)

1. Edita `apps/web/data/projects.json` y `apps/web/data/uat.json`.
2. Ejecuta desde la raíz del repo:

   ```powershell
   .\scripts\sync-tracker-data.ps1
   ```

   o:

   ```bash
   node scripts/sync-tracker-data.mjs
   ```

3. Commit y push. La web en Vercel puede servir JSON estático **o** apuntar a la API en Railway según `config.js`.

### B) Cambios desde el navegador (local, disco)

1. Abre `tracker.html` con Chrome/Edge.
2. Engranaje → **Vincular** `projects.json` / `uat.json` en `apps/web/data/`.
3. **Aplicar cambios** en UAT intenta escribir **ambos** archivos si hay datos de proyectos en memoria y `projects.json` está vinculado (tras UAT, se escribe `projects.json` con el estado actual).
4. Ejecuta el script de sync si necesitas `*.data.js` para abrir sin servidor.

### C) Cambios desde el navegador (producción / API)

1. Despliega la API en Railway (Dockerfile en la raíz del repo).
2. Variables: `TRACKER_API_TOKEN` (obligatorio en producción), `DATA_DIR=/data` (por defecto en imagen).
3. En Vercel, proyecto con **Root Directory** = `apps/web`.
4. Genera `apps/web/config.js` en build o edita para:

   ```js
   window.__TRACKER_API_BASE__ = 'https://tu-servicio.up.railway.app';
   window.__TRACKER_API_TOKEN__ = 'el-mismo-token-que-railway';
   ```

5. **Aplicar cambios** en UAT llama a **`PUT /api/sync`** con `{ projects, uat }` para que **proyectos y UAT** se persistan juntos en el servidor (sincronización centralizada). No se fuerza descarga automática de JSON; el botón «Exportar uat.json» es solo respaldo manual.

**Git vs API en Railway:** los archivos viven en el contenedor. Para que Cursor vea los mismos datos, o bien **exportas** JSON (descarga desde la UI / endpoint) y commiteas, o montas **volumen persistente** y documentas copia manual, o evolucionas a base de datos + export.

## Esquema UAT (`items[]`)

| Campo | Descripción |
|--------|-------------|
| `id` | Identificador único del caso |
| `projectId` | Debe coincidir con el `id` del proyecto |
| `title` | Título del caso |
| `Descripción concisa del test case` | Texto breve (clave exacta en JSON) |
| `descripcionTecnica` | Detalle técnico |
| `accionesTester` | Qué debe verificar el tester |
| `priority` | `Alta` · `Media` · `Baja` |
| `status` | `Pendiente` · `En prueba` · `Bloqueado` · `Aprobado` |
| `fechaCreacion` / `fechaFinalizacion` | ISO `YYYY-MM-DD` |

## Evolución recomendada

- JSON Schema + CI sobre `apps/web/data/*.json`.
- Si varios editores concurrentes: base de datos o servicio externo con export a JSON.
