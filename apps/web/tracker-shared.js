(function (global) {
  'use strict';

  var LOCAL_UAT_KEY = 'vivenco-tracker-uat';
  var LOCAL_UAT_TS_KEY = 'vivenco-tracker-uat-ts';
  var LOCAL_PROJECTS_KEY = 'vivenco-tracker-projects';
  var LOCAL_PROJECTS_TS_KEY = 'vivenco-tracker-projects-ts';

  /** Si hay copia local más reciente que el JSON cargado, úsala (sin API ni archivos vinculados). */
  function mergeProjectsFromLocalStorage(projects) {
    if (!projects) return projects;
    try {
      var raw = global.localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (!raw) return projects;
      var local = JSON.parse(raw);
      if (!local || !local.projects) return projects;
      var localTs = parseInt(global.localStorage.getItem(LOCAL_PROJECTS_TS_KEY) || '0', 10);
      var remoteTs = 0;
      if (projects.updatedAt) {
        remoteTs = new Date(projects.updatedAt + 'T12:00:00').getTime();
      }
      if (localTs > remoteTs) {
        return local;
      }
    } catch (e) {}
    return projects;
  }

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
        'Pendiente de aprobación': 'status-pending-approval',
        'Pendiente Aprobación': 'status-pending-approval',
        'En desarrollo': 'status-dev',
        UAT: 'status-uat',
        Producción: 'status-prod',
        Pausado: 'status-pause',
        Rechazado: 'status-rejected'
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

    /** Normaliza actividad (legacy inProgress → estado; id estable). */
    normalizeActivity: function (a, idx, projectId) {
      var pid = projectId || 'proj';
      if (!a) {
        return {
          id: pid + '-act-' + idx,
          title: '',
          hours: 0,
          estado: 'Pendiente',
          priority: 'Media',
          assignee: ''
        };
      }
      var estado = a.estado;
      if (!estado) {
        estado = a.inProgress ? 'En curso' : 'Pendiente';
      }
      var id = a.id || pid + '-act-' + idx;
      var priority = a.priority || 'Media';
      return Object.assign({}, a, { id: id, estado: estado, priority: priority });
    },

    activityImplementedHours: function (a) {
      if (!a) return 0;
      if (a.estado === 'Completada') {
        return a.hoursImplemented != null ? Number(a.hoursImplemented) : Number(a.hours) || 0;
      }
      return Number(a.hoursImplemented) || 0;
    },

    activityRemainingHours: function (a) {
      if (!a || a.estado === 'Completada') return 0;
      var total = Number(a.hours) || 0;
      var done = Number(a.hoursImplemented) || 0;
      return Math.max(0, total - done);
    },

    /** Métricas de resumen: horas pendientes / hechas y conteos por estado. */
    activityProjectMetrics: function (activities, projectId) {
      var list = activities || [];
      var horasPorImplementar = 0;
      var horasImplementadas = 0;
      var actividadesCompletadas = 0;
      var actividadesEnCurso = 0;
      list.forEach(function (raw, idx) {
        var a = TrackerShared.normalizeActivity(raw, idx, projectId);
        horasImplementadas += TrackerShared.activityImplementedHours(a);
        if (a.estado === 'Completada') {
          actividadesCompletadas += 1;
        } else {
          horasPorImplementar += TrackerShared.activityRemainingHours(a);
          if (a.estado === 'En curso') actividadesEnCurso += 1;
        }
      });
      return {
        horasPorImplementar: horasPorImplementar,
        horasImplementadas: horasImplementadas,
        actividadesCompletadas: actividadesCompletadas,
        actividadesEnCurso: actividadesEnCurso
      };
    },

    activityEstadoClass: function (estado) {
      var map = {
        Pendiente: 'act-est-pendiente',
        'En curso': 'act-est-curso',
        Completada: 'act-est-hecha'
      };
      return map[estado] || 'act-est-pendiente';
    },

    loadTrackerData: function () {
      var TA = global.TrackerApi;
      if (TA && TA.isConfigured()) {
        return Promise.all([TA.fetchJson('projects'), TA.fetchJson('uat')]).then(function (pair) {
          global.__TRACKER_PROJECTS__ = mergeProjectsFromLocalStorage(pair[0]);
          global.__TRACKER_UAT__ = mergeUatFromLocalStorage(pair[1]);
          return [global.__TRACKER_PROJECTS__, global.__TRACKER_UAT__];
        });
      }
      if (global.__TRACKER_PROJECTS__ && global.__TRACKER_UAT__) {
        global.__TRACKER_PROJECTS__ = mergeProjectsFromLocalStorage(global.__TRACKER_PROJECTS__);
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
        global.__TRACKER_PROJECTS__ = mergeProjectsFromLocalStorage(pair[0]);
        global.__TRACKER_UAT__ = mergeUatFromLocalStorage(pair[1]);
        return [global.__TRACKER_PROJECTS__, global.__TRACKER_UAT__];
      });
    }
  };

  global.TrackerShared = TrackerShared;
})(window);
