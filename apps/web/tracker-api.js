(function (global) {
  'use strict';

  function getBase() {
    var b = global.__TRACKER_API_BASE__;
    return typeof b === 'string' ? b.replace(/\/$/, '') : '';
  }

  function getToken() {
    var t = global.__TRACKER_API_TOKEN__;
    return typeof t === 'string' ? t : '';
  }

  function isConfigured() {
    return !!getBase();
  }

  function headersJson() {
    var h = { 'Content-Type': 'application/json' };
    var tok = getToken();
    if (tok) h.Authorization = 'Bearer ' + tok;
    return h;
  }

  function fetchJson(kind) {
    var base = getBase();
    var path = kind === 'projects' ? '/api/projects' : '/api/uat';
    return fetch(base + path, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error(kind + ' ' + r.status);
      return r.json();
    });
  }

  function putJson(kind, body) {
    var base = getBase();
    if (!base) {
      return Promise.resolve({ ok: false, reason: 'no_api' });
    }
    var path = kind === 'projects' ? '/api/projects' : '/api/uat';
    return fetch(base + path, {
      method: 'PUT',
      headers: headersJson(),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 401) return { ok: false, reason: 'unauthorized' };
      if (!r.ok) return { ok: false, reason: 'http_' + r.status };
      return { ok: true };
    });
  }

  /**
   * Sincronización centralizada en el servidor: envía proyectos + UAT en un solo PUT.
   * Así projects.json y uat.json quedan alineados en el mismo request.
   */
  function putSync(payload) {
    var base = getBase();
    if (!base) {
      return Promise.resolve({ ok: false, reason: 'no_api' });
    }
    return fetch(base + '/api/sync', {
      method: 'PUT',
      headers: headersJson(),
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.status === 401) return { ok: false, reason: 'unauthorized' };
      if (!r.ok) return { ok: false, reason: 'http_' + r.status };
      return { ok: true };
    });
  }

  /** GET /api/export — { exportedAt, projects, uat } para Git o respaldo. */
  function fetchExportBundle() {
    var base = getBase();
    if (!base) {
      return Promise.reject(new Error('no_api'));
    }
    return fetch(base + '/api/export', { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('export_' + r.status);
      return r.json();
    });
  }

  global.TrackerApi = {
    getBase: getBase,
    getToken: getToken,
    isConfigured: isConfigured,
    fetchJson: fetchJson,
    putJson: putJson,
    putSync: putSync,
    fetchExportBundle: fetchExportBundle
  };
})(window);
