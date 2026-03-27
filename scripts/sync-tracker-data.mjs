#!/usr/bin/env node
/**
 * Misma lógica que sync-tracker-data.ps1 (Node, multiplataforma).
 * Uso: node scripts/sync-tracker-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'apps', 'web', 'data');

const pJson = path.join(dataDir, 'projects.json');
const uJson = path.join(dataDir, 'uat.json');
const pJs = path.join(dataDir, 'projects.data.js');
const uJs = path.join(dataDir, 'uat.data.js');

if (!fs.existsSync(pJson) || !fs.existsSync(uJson)) {
  console.error('Faltan projects.json o uat.json en apps/web/data');
  process.exit(1);
}

const pj = fs.readFileSync(pJson, 'utf8');
const uj = fs.readFileSync(uJson, 'utf8');

fs.writeFileSync(pJs, `window.__TRACKER_PROJECTS__ = ${pj}\n`, 'utf8');
fs.writeFileSync(uJs, `window.__TRACKER_UAT__ = ${uj}\n`, 'utf8');

console.log('OK:', pJs, 'y', uJs, 'actualizados.');
