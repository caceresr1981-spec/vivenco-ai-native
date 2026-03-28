# AI-Native Development — Landing + tracker interno

Landing comercial (tema oscuro, acento ámbar) y páginas internas de **seguimiento de proyectos y UAT**.

## Estructura (GitHub)

```
├── apps/
│   ├── web/              # Sitio estático → Vercel (Root Directory: apps/web)
│   │   ├── data/         # projects.json, uat.json, *.data.js
│   │   ├── config.js     # Base URL y token de la API (opcional)
│   │   └── …
│   └── api/              # Express (Railway / Docker)
│       └── src/index.js
├── scripts/
│   ├── sync-tracker-data.ps1
│   └── sync-tracker-data.mjs
├── Dockerfile            # Imagen de la API (contexto: raíz del repo)
├── docker-compose.yml    # web (nginx) + api local
├── package.json
└── TRACKING.md           # Flujo de datos y sincronización
```

## Ver la web en local

```bash
cd apps/web
python -m http.server 8080
# http://localhost:8080
```

## API en local (opcional)

```bash
# desde la raíz del repo
npm install   # no obligatorio si solo usas la API con su propia carpeta
cd apps/api && npm install && cd ../..
set DATA_DIR=apps\web\data
set TRACKER_API_TOKEN=dev-local-token
set PORT=3001
node apps/api/src/index.js
```

En `apps/web/config.js`:

```js
window.__TRACKER_API_BASE__ = 'http://localhost:3001';
window.__TRACKER_API_TOKEN__ = 'dev-local-token';
```

## Docker Compose

```bash
docker compose up --build
```

- Web: `http://localhost:8080`
- API: `http://localhost:3001` (token por defecto `dev-local-token` en `docker-compose.yml`)

Ajusta `apps/web/config.js` con esa base URL y token antes de probar guardado desde la UI.

## Vercel (frontend)

1. Conecta el repo en Vercel.
2. **Root Directory:** `apps/web` (obligatorio para que `/` sirva `index.html`).
3. Sin framework; despliegue estático.
4. Añade un paso de build opcional que genere `config.js` con la URL pública de Railway, o edita `config.js` en el repo (menos ideal si incluye token; para uso interno puede valer).

### Error 404 NOT_FOUND en Vercel

Suele pasar si **Root Directory** quedó en la raíz del monorepo: ahí no hay `index.html`, solo en `apps/web/`.

- **Solución recomendada:** Vercel → proyecto → **Settings → General → Root Directory** → `apps/web` → **Redeploy**.
- **Si despliegas desde la raíz del repo:** el repo incluye `vercel.json` (redirección `/` → `/apps/web/`) y un `index.html` de respaldo en la raíz; tras pull, vuelve a desplegar.

Las URLs limpias (`/`, `/tracker.html`) funcionan cuando el directorio raíz del proyecto en Vercel es **`apps/web`**.

## Railway (API)

1. Nuevo servicio desde el mismo repo.
2. **Dockerfile path:** `Dockerfile` (raíz).
3. Variables de entorno:
   - `TRACKER_API_TOKEN` — mismo valor que `__TRACKER_API_TOKEN__` en el cliente.
   - `PORT` — Railway suele inyectarlo; la app ya lo usa.
4. Opcional: volumen persistente montado en `/data` para conservar JSON entre despliegues; si no, los datos viven en la imagen construida con el último commit de `apps/web/data`.

## Sincronizar JSON ↔ Cursor

- **Fuente en disco:** edita `apps/web/data/*.json` y ejecuta `npm run sync` (o `.\scripts\sync-tracker-data.ps1`) para regenerar los `.data.js`.
- **API ↔ Git:** con `TRACKER_API_BASE` (y token si aplica) en el entorno o en `.env` en la raíz del repo:

  - `npm run pull-api` — `GET /api/export` → escribe `apps/web/data/*.json` y ejecuta sync.
  - `npm run push-api` — lee esos JSON y `PUT /api/sync`.
  - `npm run import-export -- ruta/tracker-export.json` — importa el archivo descargado desde el engranaje del tracker.

Detalle en **[TRACKING.md](TRACKING.md)**.

## Contenido del marketing (index)

Hero, soluciones, AI-native, demos, casos de uso, metodología, ofertas y CTAs — ver `apps/web/index.html` y `styles.css`.
