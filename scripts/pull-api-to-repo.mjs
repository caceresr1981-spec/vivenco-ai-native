#!/usr/bin/env node
/**
 * Trae projects + UAT desde la API (GET /api/export) y escribe apps/web/data/*.json,
 * luego ejecuta sync-tracker-data.mjs para regenerar *.data.js.
 *
 * Variables de entorno (mismas que en Railway / config.js del cliente):
 *   TRACKER_API_BASE   — ej. https://xxx.up.railway.app o http://localhost:3001
 *   TRACKER_API_TOKEN  — opcional; obligatorio si el servidor exige Bearer en escritura
 *                        (la lectura de /api/export suele ser pública, igual que GET /api/projects).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'apps', 'web', 'data');

function loadDotEnv() {
  var envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  var raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) return;
    var key = m[1];
    if (process.env[key] !== undefined) return;
    if (!key.startsWith('TRACKER_')) return;
    var val = m[2].trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  });
}

loadDotEnv();

var base = process.env.TRACKER_API_BASE || process.env.TRACKER_API_URL || '';
var token = process.env.TRACKER_API_TOKEN || '';

if (!base) {
  console.error('Defina TRACKER_API_BASE (ej. https://tu-api.up.railway.app o http://localhost:3001)');
  process.exit(1);
}

var clean = base.replace(/\/$/, '');
var exportUrl = clean + '/api/export';

var headers = { Accept: 'application/json' };
if (token) headers.Authorization = 'Bearer ' + token;

var res = await fetch(exportUrl, { headers });
if (!res.ok) {
  console.error('GET /api/export falló:', res.status, await res.text());
  process.exit(1);
}

var bundle = await res.json();
if (!bundle.projects || !bundle.uat) {
  console.error('Respuesta inválida: faltan projects o uat');
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });
var pPath = path.join(dataDir, 'projects.json');
var uPath = path.join(dataDir, 'uat.json');
fs.writeFileSync(pPath, JSON.stringify(bundle.projects, null, 2), 'utf8');
fs.writeFileSync(uPath, JSON.stringify(bundle.uat, null, 2), 'utf8');
console.log('OK: escritos', pPath, 'y', uPath);

execSync('node scripts/sync-tracker-data.mjs', { cwd: root, stdio: 'inherit' });
console.log('Listo para: git add apps/web/data && git commit');
