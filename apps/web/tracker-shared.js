(function (global) {
  'use strict';

  var LOCAL_UAT_KEY = 'vivenco-tracker-uat';
  var LOCAL_UAT_TS_KEY = 'vivenco-tracker-uat-ts';

  /** Si hay copia local más reciente que el JSON cargado, úsala (sin API ni archivos vinculados). */
  function mergeUatFromLocalStorage(uat) {
    if (!uat) return uat;
    try {
      var raw = global.localStorage.getItem(LOCAL_UAT_KEY);
      if (!raw) return uat;
      var local = JSON.parse(raw);
      if (!local || !local.items) return uat;
      var localTs = parseInt(global.localStorage.getItem(LOCAL_UAT_TS_KEY) || '0', 10);
      var remoteTs = 0;
      if (uat.updatedAt) {
        remoteTs = new Date(uat.updatedAt + 'T12:00:00').getTime();
      }
      if (localTs > remoteTs) {
        return local;
      }
    } catch (e) {}
    return uat;
  }

  var TrackerShared = {
    escapeHtml: function (s) {
      if (s == null) return '';
      var div = document.createElement('div');
      div.textContent = String(s);
      return div.innerHTML;
    },

    statusClass: function (status) {
      var map = {
        'Planificación': 'status-plan',
        'En desarrollo': 'status-dev',
        UAT: 'status-uat',
        Producción: 'status-prod',
        Pausado: 'status-pause'
      };
      return map[status] || 'status-default';
    },

    uatStatusClass: function (status) {
      var map = {
        Pendiente: 'uat-pend',
        'En prueba': 'uat-test',
        Bloqueado: 'uat-block',
        Aprobado: 'uat-ok'
      };
      return map[status] || 'uat-default';
    },

    totalHours: function (activities) {
      if (!activities || !activities.length) return 0;
      return activities.reduce(function (sum, a) {
        return sum + (Number(a.hours) || 0);
      }, 0);
    },

    loadTrackerData: function () {
      var TA = global.TrackerApi;
      if (TA && TA.isConfigured()) {
        return Promise.all([TA.fetchJson('projects'), TA.fetchJson('uat')]).then(function (pair) {
          global.__TRACKER_PROJECTS__ = pair[0];
          global.__TRACKER_UAT__ = mergeUatFromLocalStorage(pair[1]);
          return [pair[0], global.__TRACKER_UAT__];
        });
      }
      if (global.__TRACKER_PROJECTS__ && global.__TRACKER_UAT__) {
        global.__TRACKER_UAT__ = mergeUatFromLocalStorage(global.__TRACKER_UAT__);
        return Promise.resolve([global.__TRACKER_PROJECTS__, global.__TRACKER_UAT__]);
      }
      return Promise.all([
        fetch('data/projects.json').then(function (r) {
          if (!r.ok) throw new Error('projects.json');
          return r.json();
        }),
        fetch('data/uat.json').then(function (r) {
          if (!r.ok) throw new Error('uat.json');
          return r.json();
        })
      ]).then(function (pair) {
        global.__TRACKER_PROJECTS__ = pair[0];
        global.__TRACKER_UAT__ = mergeUatFromLocalStorage(pair[1]);
        return [pair[0], global.__TRACKER_UAT__];
      });
    }
  };

  global.TrackerShared = TrackerShared;
})(window);
