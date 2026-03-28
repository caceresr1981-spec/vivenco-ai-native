#!/usr/bin/env node
/**
 * Lee apps/web/data/projects.json y uat.json del repo y envía PUT /api/sync al servidor.
 *
 * Variables de entorno:
 *   TRACKER_API_BASE   — obligatorio
 *   TRACKER_API_TOKEN  — obligatorio si TRACKER_API_TOKEN está definido en el servidor
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  console.error('Defina TRACKER_API_BASE');
  process.exit(1);
}

var pPath = path.join(dataDir, 'projects.json');
var uPath = path.join(dataDir, 'uat.json');
if (!fs.existsSync(pPath) || !fs.existsSync(uPath)) {
  console.error('Faltan', pPath, 'o', uPath);
  process.exit(1);
}

var projects = JSON.parse(fs.readFileSync(pPath, 'utf8'));
var uat = JSON.parse(fs.readFileSync(uPath, 'utf8'));

var clean = base.replace(/\/$/, '');
var url = clean + '/api/sync';
var headers = { 'Content-Type': 'application/json' };
if (token) headers.Authorization = 'Bearer ' + token;

var res = await fetch(url, {
  method: 'PUT',
  headers: headers,
  body: JSON.stringify({ projects: projects, uat: uat })
});

if (res.status === 401) {
  console.error('401: revisa TRACKER_API_TOKEN (debe coincidir con el servidor)');
  process.exit(1);
}

if (!res.ok) {
  console.error('PUT /api/sync falló:', res.status, await res.text());
  process.exit(1);
}

var body = await res.json();
console.log('OK:', body);
