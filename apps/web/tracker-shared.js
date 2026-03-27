(function (global) {
  'use strict';

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
          global.__TRACKER_UAT__ = pair[1];
          return pair;
        });
      }
      if (global.__TRACKER_PROJECTS__ && global.__TRACKER_UAT__) {
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
        global.__TRACKER_UAT__ = pair[1];
        return pair;
      });
    }
  };

  global.TrackerShared = TrackerShared;
})(window);
