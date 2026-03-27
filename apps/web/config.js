/**
 * API del tracker (Railway u otro host). Vacío = solo datos locales (.data.js / fetch a data/*.json).
 * En Vercel: genera este archivo en build o edita antes del deploy.
 * Ejemplo: window.__TRACKER_API_BASE__ = 'https://tu-api.up.railway.app';
 */
(function (global) {
  global.__TRACKER_API_BASE__ = global.__TRACKER_API_BASE__ || '';
  global.__TRACKER_API_TOKEN__ = global.__TRACKER_API_TOKEN__ || '';
})(window);
