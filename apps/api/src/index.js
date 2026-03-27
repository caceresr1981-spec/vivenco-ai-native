'use strict';

const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const cors = require('cors');

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', '..', 'web', 'data');
const TOKEN = process.env.TRACKER_API_TOKEN || '';

const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const UAT_FILE = path.join(DATA_DIR, 'uat.json');

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '4mb' }));

function requireWriteAuth(req, res, next) {
  if (!TOKEN) return next();
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m || m[1] !== TOKEN) {
    return res.status(401).json({ error: 'unauthorized', message: 'Bearer token inválido o ausente' });
  }
  next();
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJsonAtomic(filePath, obj) {
  const json = JSON.stringify(obj, null, 2);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, json, 'utf8');
  await fs.rename(tmp, filePath);
}

app.get('/health', function (req, res) {
  res.json({ ok: true, service: 'tracker-api', dataDir: DATA_DIR });
});

app.get('/api/projects', async function (req, res) {
  try {
    const data = await readJsonFile(PROJECTS_FILE);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'read_failed', message: String(e.message) });
  }
});

app.get('/api/uat', async function (req, res) {
  try {
    const data = await readJsonFile(UAT_FILE);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'read_failed', message: String(e.message) });
  }
});

app.put('/api/projects', requireWriteAuth, async function (req, res) {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'invalid_body' });
    }
    await writeJsonAtomic(PROJECTS_FILE, req.body);
    res.json({ ok: true, updatedAt: req.body.updatedAt || null });
  } catch (e) {
    res.status(500).json({ error: 'write_failed', message: String(e.message) });
  }
});

app.put('/api/uat', requireWriteAuth, async function (req, res) {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'invalid_body' });
    }
    await writeJsonAtomic(UAT_FILE, req.body);
    res.json({ ok: true, updatedAt: req.body.updatedAt || null });
  } catch (e) {
    res.status(500).json({ error: 'write_failed', message: String(e.message) });
  }
});

/** Sincronización centralizada: escribe projects.json y/o uat.json en una sola petición. */
app.put('/api/sync', requireWriteAuth, async function (req, res) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'invalid_body' });
    }
    const hasProjects = body.projects != null && typeof body.projects === 'object';
    const hasUat = body.uat != null && typeof body.uat === 'object';
    if (!hasProjects && !hasUat) {
      return res.status(400).json({ error: 'need_projects_or_uat' });
    }
    if (hasProjects) await writeJsonAtomic(PROJECTS_FILE, body.projects);
    if (hasUat) await writeJsonAtomic(UAT_FILE, body.uat);
    res.json({
      ok: true,
      wroteProjects: hasProjects,
      wroteUat: hasUat,
      updatedAtProjects: hasProjects ? body.projects.updatedAt || null : null,
      updatedAtUat: hasUat ? body.uat.updatedAt || null : null
    });
  } catch (e) {
    res.status(500).json({ error: 'write_failed', message: String(e.message) });
  }
});

app.listen(PORT, function () {
  console.log('tracker-api listening on port', PORT, 'DATA_DIR=', DATA_DIR, 'auth=', TOKEN ? 'on' : 'off');
});
