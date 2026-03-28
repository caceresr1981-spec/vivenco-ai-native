#!/usr/bin/env node
/**
 * Importa un JSON descargado desde el navegador (tracker-export.json) al repo:
 * escribe projects.json y uat.json y regenera *.data.js.
 *
 * Uso: node scripts/import-export-file.mjs ruta/al/tracker-export.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'apps', 'web', 'data');

var arg = process.argv[2];
if (!arg) {
  console.error('Uso: node scripts/import-export-file.mjs <tracker-export.json>');
  process.exit(1);
}

var full = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
if (!fs.existsSync(full)) {
  console.error('No existe:', full);
  process.exit(1);
}

var raw = fs.readFileSync(full, 'utf8');
var data = JSON.parse(raw);
if (!data.projects || !data.uat) {
  console.error('Se esperaba JSON con keys "projects" y "uat" (export de GET /api/export)');
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });
var pPath = path.join(dataDir, 'projects.json');
var uPath = path.join(dataDir, 'uat.json');
fs.writeFileSync(pPath, JSON.stringify(data.projects, null, 2), 'utf8');
fs.writeFileSync(uPath, JSON.stringify(data.uat, null, 2), 'utf8');
console.log('OK:', pPath, 'y', uPath);

execSync('node scripts/sync-tracker-data.mjs', { cwd: root, stdio: 'inherit' });
