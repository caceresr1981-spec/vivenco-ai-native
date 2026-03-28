# Seguimiento de proyectos y UAT

## Estructura del repo

| Ruta | Rol |
|------|-----|
| `apps/web/` | Sitio estático (HTML/CSS/JS). **Vercel** despliega esta carpeta. |
| `apps/web/data/` | `projects.json`, `uat.json` y los `.data.js` generados. **Fuente de verdad en Git** para Cursor. |
| `apps/api/` | Servidor Node (Express): `GET/PUT /api/projects`, `/api/uat`, **`GET /api/export`** (paquete `{ projects, uat }`) y **`PUT /api/sync`**. **Docker / Railway**. |
| `scripts/sync-tracker-data.*` | Regenera `*.data.js` desde los JSON (local sin servidor). |
| `scripts/pull-api-to-repo.mjs` | API → escribe `apps/web/data/*.json` + `sync-tracker-data`. |
| `scripts/push-repo-to-api.mjs` | Repo → `PUT /api/sync`. |
| `scripts/import-export-file.mjs` | `tracker-export.json` descargado en el navegador → repo + sync. |

## Cargar datos en la web

1. **Scripts `data/*.data.js`** (doble clic / `file://`) — definen `window.__TRACKER_PROJECTS__` y `window.__TRACKER_UAT__`.
2. **`fetch` a `data/*.json`** — con cualquier servidor HTTP estático.
3. **API** — si `config.js` define `__TRACKER_API_BASE__`, se ignoran los `.data.js` para la carga y se usa la API (producción / equipo remoto).

Orden de prioridad en `tracker-shared.js`: **API configurada → variables globales de scripts → fetch JSON**.

## Sincronización: escenarios

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

5. **Aplicar cambios** en UAT llama a **`PUT /api/sync`** con `{ projects, uat }` para que **proyectos y UAT** se persistan juntos en el servidor (sincronización centralizada).

6. Sin API ni archivos vinculados, el navegador puede guardar UAT en **localStorage**; al recargar, si la copia local es más reciente que el JSON, se usa (solo en ese equipo). Para equipo/Git sigue haciendo falta API o el flujo siguiente.

### D) Git ↔ API (Railway / servidor)

Objetivo: que `apps/web/data` en el repo refleje lo que hay en el servidor, o al revés.

**Variables** (PowerShell / bash; opcionalmente copia `.env.example` a `.env` en la raíz del repo — ya está en `.gitignore`):

- `TRACKER_API_BASE` — URL de la API, sin barra final (ej. `https://tu-servicio.up.railway.app` o `http://localhost:3001`).
- `TRACKER_API_TOKEN` — mismo valor que `TRACKER_API_TOKEN` en Railway (solo obligatorio para **escritura**; lectura de `GET /api/export` es anónima, igual que `GET /api/projects`).

**Servidor → repo (para commit en Git)**

1. Engrane en `tracker.html` → **Descargar tracker-export.json** (requiere `config.js` con la API), **o** desde la raíz del repo:

   ```bash
   npm run pull-api
   ```

2. Revisa `apps/web/data/projects.json`, `uat.json` y los `*.data.js` generados; luego `git add` / `git commit` / `git push`.

**Archivo descargado en el navegador → repo** (si no ejecutaste `pull-api`):

```bash
npm run import-export -- Descargas/tracker-export.json
```

**Repo → servidor** (subir el JSON del disco al contenedor):

```bash
npm run push-api
```

**Nota:** en Railway los datos viven en el volumen o en la imagen; `pull-api` + commit es la forma habitual de alinear el código con el estado “oficial” del equipo.

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
