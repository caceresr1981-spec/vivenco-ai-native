(function () {
  'use strict';

  var TS = window.TrackerShared;
  if (!TS) return;

  function renderProjects(projects, container) {
    container.innerHTML = '';
    if (!projects.length) {
      container.innerHTML =
        '<p class="tracker-empty">No hay proyectos. Edita <code>data/projects.data.js</code> o <code>data/projects.json</code>.</p>';
      return;
    }
    projects.forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'tracker-card';
      a.href = 'project.html?id=' + encodeURIComponent(p.id);
      a.innerHTML =
        '<div class="tracker-card-top">' +
        '<span class="tracker-system">' +
        TS.escapeHtml(p.system) +
        '</span>' +
        '<span class="tracker-status ' +
        TS.statusClass(p.status) +
        '">' +
        TS.escapeHtml(p.status) +
        '</span>' +
        '</div>' +
        '<h2 class="tracker-card-title">' +
        TS.escapeHtml(p.name) +
        '</h2>' +
        '<p class="tracker-client"><strong>Cliente:</strong> ' +
        TS.escapeHtml(p.client) +
        '</p>' +
        '<p class="tracker-card-hint">Ver ficha del proyecto →</p>';
      container.appendChild(a);
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
