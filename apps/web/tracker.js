(function () {
  'use strict';

  var TS = window.TrackerShared;
  if (!TS) return;

  var PROJECT_STATUSES = [
    'Planificación',
    'Pendiente Aprobación',
    'En desarrollo',
    'UAT',
    'Producción',
    'Pausado',
    'Rechazado'
  ];
  var DELETE_OPTION = '__delete__';
  var LOCAL_UAT_KEY = 'vivenco-tracker-uat';
  var LOCAL_UAT_TS_KEY = 'vivenco-tracker-uat-ts';
  var LOCAL_PROJECTS_KEY = 'vivenco-tracker-projects';
  var LOCAL_PROJECTS_TS_KEY = 'vivenco-tracker-projects-ts';

  function getState() {
    return {
      projects: window.__TRACKER_PROJECTS__,
      uat: window.__TRACKER_UAT__
    };
  }

  function setActionStatus(message, isError) {
    var el = document.getElementById('tracker-action-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('tracker-action-status--error', !!isError);
    el.classList.toggle('tracker-action-status--ok', !isError && !!message);
  }

  function persistToLocalStorage(projectsBody, uatBody) {
    try {
      if (projectsBody) {
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projectsBody));
        localStorage.setItem(LOCAL_PROJECTS_TS_KEY, String(Date.now()));
      }
      if (uatBody) {
        localStorage.setItem(LOCAL_UAT_KEY, JSON.stringify(uatBody));
        localStorage.setItem(LOCAL_UAT_TS_KEY, String(Date.now()));
      }
      return Promise.resolve({ ok: true, source: 'localStorage' });
    } catch (e) {
      return Promise.resolve({ ok: false, reason: 'no_storage' });
    }
  }

  function persistTrackerState(syncUat) {
    var st = getState();
    var projectsBody = st.projects;
    var uatBody = st.uat;
    if (!projectsBody || !projectsBody.projects) return Promise.resolve({ ok: false, reason: 'no_state' });
    projectsBody.updatedAt = new Date().toISOString().slice(0, 10);
    if (syncUat && uatBody) uatBody.updatedAt = projectsBody.updatedAt;

    var TA = window.TrackerApi;
    if (TA && TA.isConfigured()) {
      if (TA.putSync && syncUat && uatBody) {
        return TA.putSync({ projects: projectsBody, uat: uatBody }).then(function (r) {
          if (r && r.ok) return { ok: true, source: 'api' };
          if (r && r.reason === 'unauthorized') return { ok: false, reason: 'api_unauthorized' };
          return persistToLocalStorage(projectsBody, uatBody);
        });
      }
      if (TA.putJson) {
        return TA
          .putJson('projects', projectsBody)
          .then(function (rProjects) {
            if (!rProjects || !rProjects.ok) {
              if (rProjects && rProjects.reason === 'unauthorized') return { ok: false, reason: 'api_unauthorized' };
              return persistToLocalStorage(projectsBody, syncUat ? uatBody : null);
            }
            if (!(syncUat && uatBody)) return { ok: true, source: 'api' };
            return TA.putJson('uat', uatBody).then(function (rUat) {
              if (rUat && rUat.ok) return { ok: true, source: 'api' };
              if (rUat && rUat.reason === 'unauthorized') return { ok: false, reason: 'api_unauthorized' };
              return persistToLocalStorage(projectsBody, uatBody);
            });
          })
          .catch(function () {
            return persistToLocalStorage(projectsBody, syncUat ? uatBody : null);
          });
      }
    }

    var J = window.JsonDiskSync;
    if (J && J.supported && J.writeJsonString) {
      var projectsJson = JSON.stringify(projectsBody, null, 2);
      return J.writeJsonString('projects', projectsJson).then(function (rp) {
        if (!rp || !rp.ok) return persistToLocalStorage(projectsBody, syncUat ? uatBody : null);
        if (!(syncUat && uatBody)) return { ok: true, source: 'disk' };
        var uatJson = JSON.stringify(uatBody, null, 2);
        return J.writeJsonString('uat', uatJson).then(function (ru) {
          if (ru && ru.ok) return { ok: true, source: 'disk' };
          return persistToLocalStorage(projectsBody, uatBody);
        });
      });
    }

    return persistToLocalStorage(projectsBody, syncUat ? uatBody : null);
  }

  function statusSelectHtml(current) {
    var opts = PROJECT_STATUSES.map(function (s) {
      return (
        '<option value="' +
        TS.escapeHtml(s) +
        '"' +
        (s === current ? ' selected' : '') +
        '>' +
        TS.escapeHtml(s) +
        '</option>'
      );
    }).join('');
    opts += '<option value="' + DELETE_OPTION + '">Eliminar proyecto…</option>';
    return opts;
  }

  function renderProjects(projects, container) {
    container.innerHTML = '';
    if (!projects.length) {
      container.innerHTML =
        '<p class="tracker-empty">No hay proyectos. Edita <code>data/projects.data.js</code> o <code>data/projects.json</code>.</p>';
      return;
    }
    projects.forEach(function (p) {
      var a = document.createElement('article');
      a.className = 'tracker-card';
      a.setAttribute('data-project-id', p.id);
      a.innerHTML =
        '<div class="tracker-card-top">' +
        '<span class="tracker-system">' +
        TS.escapeHtml(p.system) +
        '</span>' +
        '<div class="tracker-card-status-wrap">' +
        '<span class="tracker-status ' + TS.statusClass(p.status) + '">' + TS.escapeHtml(p.status) + '</span>' +
        '<select class="tracker-status-select" aria-label="Cambiar estado del proyecto">' +
        statusSelectHtml(p.status) +
        '</select>' +
        '</div>' +
        '</div>' +
        '<h2 class="tracker-card-title">' +
        '<a class="tracker-card-link" href="project.html?id=' +
        encodeURIComponent(p.id) +
        '">' +
        TS.escapeHtml(p.name) +
        '</a>' +
        '</h2>' +
        '<p class="tracker-client"><strong>Cliente:</strong> ' +
        TS.escapeHtml(p.client) +
        '</p>' +
        '<div class="tracker-card-actions">' +
        '<a class="btn btn-outline btn-sm tracker-open-btn" href="project.html?id=' +
        encodeURIComponent(p.id) +
        '">Ver ficha del proyecto</a>' +
        '</div>';
      container.appendChild(a);
    });
  }

  function updateCardStatusChip(projectId, status) {
    var card = document.querySelector('.tracker-card[data-project-id="' + projectId + '"]');
    if (!card) return;
    var chip = card.querySelector('.tracker-status');
    if (!chip) return;
    chip.className = 'tracker-status ' + TS.statusClass(status);
    chip.textContent = status;
  }

  function changeProjectStatus(projectId, nextStatus, selectEl) {
    var st = getState();
    var body = st.projects;
    if (!body || !body.projects) return;
    var project = null;
    body.projects.forEach(function (p) {
      if (p.id === projectId) project = p;
    });
    if (!project) return;
    var prev = project.status || '';
    if (nextStatus === prev) return;
    project.status = nextStatus;
    setActionStatus('Guardando estado…');
    persistTrackerState(false).then(function (r) {
      if (r && r.ok) {
        updateCardStatusChip(projectId, nextStatus);
        setActionStatus('Estado actualizado a "' + nextStatus + '".', false);
      } else {
        project.status = prev;
        if (selectEl) selectEl.value = prev;
        setActionStatus('No se pudo actualizar el estado.', true);
      }
    });
  }

  function deleteProject(projectId, selectEl, grid) {
    var st = getState();
    var projectsBody = st.projects;
    var uatBody = st.uat;
    if (!projectsBody || !projectsBody.projects) return;
    var idx = -1;
    projectsBody.projects.forEach(function (p, i) {
      if (p.id === projectId) idx = i;
    });
    if (idx < 0) return;
    var projectName = projectsBody.projects[idx].name || projectId;
    if (!window.confirm('¿Eliminar el proyecto "' + projectName + '"? Esta acción también quitará sus casos UAT asociados.')) {
      if (selectEl) selectEl.value = projectsBody.projects[idx].status || '';
      return;
    }
    var prevProjects = JSON.parse(JSON.stringify(projectsBody.projects));
    var prevUat = uatBody && uatBody.items ? JSON.parse(JSON.stringify(uatBody.items)) : null;
    projectsBody.projects.splice(idx, 1);
    if (uatBody && uatBody.items) {
      uatBody.items = uatBody.items.filter(function (it) {
        return it.projectId !== projectId;
      });
    }
    setActionStatus('Eliminando proyecto…');
    persistTrackerState(true).then(function (r) {
      if (r && r.ok) {
        renderProjects(projectsBody.projects || [], grid);
        setActionStatus('Proyecto eliminado.', false);
      } else {
        projectsBody.projects = prevProjects;
        if (uatBody && prevUat) uatBody.items = prevUat;
        renderProjects(projectsBody.projects || [], grid);
        setActionStatus('No se pudo eliminar el proyecto.', true);
      }
    });
  }

  function bindProjectCardActions(grid) {
    grid.addEventListener('change', function (e) {
      var sel = e.target.closest('.tracker-status-select');
      if (!sel) return;
      var card = sel.closest('.tracker-card');
      if (!card) return;
      var projectId = card.getAttribute('data-project-id');
      if (!projectId) return;
      var next = sel.value;
      if (next === DELETE_OPTION) {
        deleteProject(projectId, sel, grid);
        return;
      }
      changeProjectStatus(projectId, next, sel);
    });
  }

  function init() {
    var grid = document.getElementById('tracker-projects');
    var meta = document.getElementById('tracker-meta');
    if (!grid) return;

    TS.loadTrackerData()
      .then(function (results) {
        var projectsData = results[0];
        var uatData = results[1];
        var projects = projectsData.projects || [];

        if (meta) {
          meta.textContent =
            'Última actualización datos: ' +
            (projectsData.updatedAt || '—') +
            ' (proyectos) · ' +
            (uatData.updatedAt || '—') +
            ' (UAT)';
        }

        renderProjects(projects, grid);
        bindProjectCardActions(grid);
      })
      .catch(function () {
        grid.innerHTML =
          '<p class="tracker-error">No se pudieron cargar los datos. Incluye <code>data/projects.data.js</code> y <code>data/uat.data.js</code> antes de los scripts, o usa un servidor local con los <code>.json</code>.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
