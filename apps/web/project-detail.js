(function () {
  'use strict';

  var TS = window.TrackerShared;
  if (!TS) return;

  var UAT_STATUSES = ['Pendiente', 'En prueba', 'Bloqueado', 'Aprobado'];
  var PRIORITIES = ['Alta', 'Media', 'Baja'];
  /** Clave exacta en uat.json (coincide con el nombre del campo en el archivo). */
  var KEY_DESC_CONCISA = 'Descripción concisa del test case';

  function getDescConcisa(it) {
    if (!it) return '';
    return it[KEY_DESC_CONCISA] || it.descripcionConcisa || '';
  }

  function escapeAttr(s) {
    return TS.escapeHtml(s).replace(/"/g, '&quot;');
  }

  function getProjectIdFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function getState() {
    return window.__PROJECT_UAT_STATE__;
  }

  function findUatItemById(id) {
    var state = getState();
    if (!state || !state.fullUat || !state.fullUat.items) return null;
    var found = null;
    state.fullUat.items.forEach(function (it) {
      if (it.id === id) found = it;
    });
    return found;
  }

  function renderError(message) {
    var root = document.getElementById('project-detail-root');
    if (!root) return;
    root.innerHTML =
      '<div class="project-detail-error">' +
      '<p>' +
      TS.escapeHtml(message) +
      '</p>' +
      '<p><a class="btn btn-primary" href="tracker.html">Volver a proyectos</a></p>' +
      '</div>';
    document.title = 'Proyecto no encontrado | VIVENCO AI-Native';
    window.__PROJECT_UAT_STATE__ = null;
  }

  function selectOptionsHtml(values, current) {
    return values
      .map(function (v) {
        return (
          '<option value="' +
          escapeAttr(v) +
          '"' +
          (v === current ? ' selected' : '') +
          '>' +
          TS.escapeHtml(v) +
          '</option>'
        );
      })
      .join('');
  }

  function priorityBadgeClass(p) {
    if (p === 'Alta') return 'uat-prio-badge uat-prio-alta';
    if (p === 'Media') return 'uat-prio-badge uat-prio-media';
    return 'uat-prio-badge uat-prio-baja';
  }

  function setSyncStatus(message) {
    var el = document.getElementById('uat-sync-status');
    if (el) el.textContent = message || '';
  }

  function buildUatToolbar() {
    return (
      '<p id="uat-sync-status" class="uat-sync-status" aria-live="polite"></p>' +
      '<div class="uat-toolbar">' +
      '<label class="uat-filter-label">' +
      '<span>Filtrar por estado</span>' +
      '<select id="uat-filter" class="uat-filter-select" aria-label="Filtrar casos UAT por estado">' +
      '<option value="">Todos</option>' +
      selectOptionsHtml(UAT_STATUSES, '') +
      '</select>' +
      '</label>' +
      '</div>' +
      '<p class="uat-save-hint">Si configuraste la API (<code>config.js</code>), «Aplicar cambios» guarda en el servidor. Si no, vincula <code>uat.json</code> en <a href="tracker.html">Proyectos</a> (engranaje) o descarga el JSON. Con <code>uat.data.js</code> local ejecuta <code>scripts/sync-tracker-data.ps1</code> tras editar archivos.</p>'
    );
  }

  function buildUatRow(it) {
    return (
      '<tr class="uat-row uat-row-clickable" data-uat-id="' +
      TS.escapeHtml(it.id) +
      '" data-status="' +
      TS.escapeHtml(it.status) +
      '" tabindex="0" role="button" aria-label="Abrir detalle del caso UAT">' +
      '<td class="uat-col-title"><span class="uat-title-text">' +
      TS.escapeHtml(it.title) +
      '</span></td>' +
      '<td class="uat-col-desc"><span class="uat-desc-preview">' +
      TS.escapeHtml(getDescConcisa(it) || '—') +
      '</span></td>' +
      '<td class="uat-col-prio-cell"><span class="' +
      priorityBadgeClass(it.priority) +
      '">' +
      TS.escapeHtml(it.priority || '—') +
      '</span></td>' +
      '<td class="uat-col-status-cell"><span class="uat-badge ' +
      TS.uatStatusClass(it.status) +
      '">' +
      TS.escapeHtml(it.status) +
      '</span></td>' +
      '</tr>'
    );
  }

  function applyUatFilter() {
    var sel = document.getElementById('uat-filter');
    if (!sel) return;
    var v = sel.value;
    document.querySelectorAll('#uat-table tbody tr.uat-row').forEach(function (tr) {
      if (!v || tr.getAttribute('data-status') === v) {
        tr.hidden = false;
      } else {
        tr.hidden = true;
      }
    });
  }

  function refreshUatRow(id) {
    var it = findUatItemById(id);
    if (!it) return;
    var tr = document.querySelector('#uat-table tbody tr[data-uat-id="' + id + '"]');
    if (!tr) return;
    tr.setAttribute('data-status', it.status);
    var titleEl = tr.querySelector('.uat-title-text');
    var descEl = tr.querySelector('.uat-desc-preview');
    var prioEl = tr.querySelector('.uat-col-prio-cell span');
    var statusEl = tr.querySelector('.uat-col-status-cell .uat-badge');
    if (titleEl) titleEl.textContent = it.title;
    if (descEl) descEl.textContent = getDescConcisa(it) || '—';
    if (prioEl) {
      prioEl.className = priorityBadgeClass(it.priority);
      prioEl.textContent = it.priority || '—';
    }
    if (statusEl) {
      statusEl.className = 'uat-badge ' + TS.uatStatusClass(it.status);
      statusEl.textContent = it.status;
    }
    applyUatFilter();
  }

  function openUatModal(id) {
    var it = findUatItemById(id);
    if (!it) return;
    var modal = document.getElementById('uat-case-modal');
    var body = document.getElementById('uat-case-modal-body');
    var titleEl = document.getElementById('uat-case-modal-title');
    if (!modal || !body || !titleEl) return;

    titleEl.textContent = it.title;
    modal.dataset.currentUatId = id;

    body.innerHTML =
      '<div class="uat-modal-fields">' +
      '<p class="uat-modal-id"><strong>ID:</strong> <code>' +
      TS.escapeHtml(it.id) +
      '</code></p>' +
      '<label class="uat-modal-label">' +
      '<span>Título del caso</span>' +
      '<input type="text" class="uat-input uat-modal-input" data-modal-field="title" value="' +
      escapeAttr(it.title) +
      '" />' +
      '</label>' +
      '<label class="uat-modal-label">' +
      '<span>Descripción del test case</span>' +
      '<textarea class="uat-textarea" data-modal-field="descripcionConcisa" rows="2" spellcheck="false">' +
      TS.escapeHtml(getDescConcisa(it)) +
      '</textarea>' +
      '</label>' +
      '<label class="uat-modal-label">' +
      '<span>Descripción técnica</span>' +
      '<textarea class="uat-textarea" data-modal-field="descripcionTecnica" rows="4" spellcheck="false">' +
      TS.escapeHtml(it.descripcionTecnica || '') +
      '</textarea>' +
      '</label>' +
      '<label class="uat-modal-label">' +
      '<span>Acciones del tester</span>' +
      '<textarea class="uat-textarea" data-modal-field="accionesTester" rows="3" spellcheck="false">' +
      TS.escapeHtml(it.accionesTester || '') +
      '</textarea>' +
      '</label>' +
      '<div class="uat-modal-row2">' +
      '<label class="uat-modal-label">' +
      '<span>Prioridad</span>' +
      '<select class="uat-select" data-modal-field="priority">' +
      selectOptionsHtml(PRIORITIES, it.priority || 'Media') +
      '</select>' +
      '</label>' +
      '<label class="uat-modal-label">' +
      '<span>Estado</span>' +
      '<select class="uat-select" data-modal-field="status">' +
      selectOptionsHtml(UAT_STATUSES, it.status || 'Pendiente') +
      '</select>' +
      '</label>' +
      '</div>' +
      '<div class="uat-modal-row2">' +
      '<label class="uat-modal-label">' +
      '<span>Fecha de creación</span>' +
      '<input type="date" class="uat-input uat-modal-input" data-modal-field="fechaCreacion" value="' +
      escapeAttr(it.fechaCreacion || '') +
      '" />' +
      '</label>' +
      '<label class="uat-modal-label">' +
      '<span>Fecha de finalización</span>' +
      '<input type="date" class="uat-input uat-modal-input" data-modal-field="fechaFinalizacion" value="' +
      escapeAttr(it.fechaFinalizacion || '') +
      '" />' +
      '</label>' +
      '</div>' +
      '</div>' +
      '<div class="uat-modal-actions">' +
      '<button type="button" class="btn btn-primary" id="uat-modal-apply">Aplicar cambios</button>' +
      '<button type="button" class="btn btn-outline" id="uat-modal-cancel">Cerrar</button>' +
      '</div>';

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    document.getElementById('uat-modal-apply').addEventListener('click', applyUatModal);
    document.getElementById('uat-modal-cancel').addEventListener('click', closeUatModal);
  }

  function readModalField(name) {
    var el = document.querySelector('[data-modal-field="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function applyUatModal() {
    var modal = document.getElementById('uat-case-modal');
    if (!modal) return;
    var id = modal.dataset.currentUatId;
    if (!id) return;

    var state = getState();
    if (!state || !state.fullUat) return;

    var idx = -1;
    state.fullUat.items.forEach(function (it, i) {
      if (it.id === id) idx = i;
    });
    if (idx < 0) return;

    var prev = state.fullUat.items[idx];
    var updated = {
      id: prev.id,
      projectId: prev.projectId,
      title: readModalField('title') || prev.title,
      descripcionTecnica: readModalField('descripcionTecnica'),
      accionesTester: readModalField('accionesTester'),
      priority: readModalField('priority') || 'Media',
      status: readModalField('status') || 'Pendiente',
      fechaCreacion: readModalField('fechaCreacion'),
      fechaFinalizacion: readModalField('fechaFinalizacion')
    };
    updated[KEY_DESC_CONCISA] = readModalField('descripcionConcisa');

    state.fullUat.items[idx] = updated;
    refreshUatRow(id);

    persistUatToDisk()
      .then(function (r) {
        if (r && r.ok) {
          if (r.source === 'api') {
            setSyncStatus(
              'Cambios guardados en el servidor (API). En Cursor: pull o copia el JSON desde el volumen si aplica.'
            );
            if (window.__TRACKER_UAT__ && window.__PROJECT_UAT_STATE__ && window.__PROJECT_UAT_STATE__.fullUat) {
              window.__TRACKER_UAT__ = JSON.parse(JSON.stringify(window.__PROJECT_UAT_STATE__.fullUat));
            }
          } else {
            setSyncStatus('Cambios guardados en el archivo vinculado (uat.json).');
          }
        } else if (r && r.reason === 'no_handle') {
          setSyncStatus(
            'No hay archivo vinculado: el navegador no puede escribir en tu disco sin permiso. Se descarga uat.json — reemplázalo en data/ y ejecuta sync-tracker-data.ps1. O vincula en Proyectos (engranaje).'
          );
          downloadCurrentUatJson();
        } else if (r && r.reason === 'permission_denied') {
          setSyncStatus('Permiso denegado al escribir. Se descarga uat.json para que lo copies a data/.');
          downloadCurrentUatJson();
        } else if (r && r.reason === 'unsupported') {
          setSyncStatus(
            'Este navegador no puede escribir en disco. Se descarga uat.json — guárdalo en data/ (Chrome/Edge permite vincular archivo).'
          );
          downloadCurrentUatJson();
        } else if (r && r.reason === 'api_unauthorized') {
          setSyncStatus('API: token inválido. Revisa __TRACKER_API_TOKEN__ en config.js o la variable en Railway.');
        } else if (r && r.reason === 'api_failed') {
          setSyncStatus('No se pudo guardar en la API. Revisa la red o el servidor.');
          downloadCurrentUatJson();
        } else {
          setSyncStatus(
            'Cambios en memoria. Vincula uat.json en Proyectos (engranaje) o usa la descarga automática.'
          );
          downloadCurrentUatJson();
        }
        closeUatModal();
      })
      .catch(function () {
        setSyncStatus('Error al escribir en disco. Se descarga uat.json para que lo reemplaces en data/.');
        downloadCurrentUatJson();
        closeUatModal();
      });
  }

  function downloadCurrentUatJson() {
    var state = getState();
    if (!state || !state.fullUat) return;
    var json = JSON.stringify(state.fullUat, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'uat.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function persistUatToDisk() {
    var state = getState();
    if (!state || !state.fullUat) {
      return Promise.resolve({ ok: false, reason: 'no_state' });
    }
    state.fullUat.updatedAt = new Date().toISOString().slice(0, 10);
    var body = state.fullUat;
    if (window.TrackerApi && window.TrackerApi.isConfigured()) {
      return window.TrackerApi.putJson('uat', body).then(function (r) {
        if (r && r.ok) return { ok: true, source: 'api' };
        if (r && r.reason === 'unauthorized') {
          return { ok: false, reason: 'api_unauthorized' };
        }
        return { ok: false, reason: 'api_failed' };
      });
    }
    var json = JSON.stringify(body, null, 2);
    if (window.JsonDiskSync && window.JsonDiskSync.supported && window.JsonDiskSync.writeJsonString) {
      return window.JsonDiskSync.writeJsonString('uat', json);
    }
    if (window.UatDiskSync && window.UatDiskSync.supported) {
      return window.UatDiskSync.writeJsonString(json);
    }
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  function closeUatModal() {
    var modal = document.getElementById('uat-case-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.dataset.currentUatId = '';
    var body = document.getElementById('uat-case-modal-body');
    if (body) body.innerHTML = '';
  }

  function bindUatSection() {
    var filter = document.getElementById('uat-filter');
    if (filter) {
      filter.addEventListener('change', applyUatFilter);
    }

    var tbody = document.querySelector('#uat-table tbody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var tr = e.target.closest('tr.uat-row-clickable');
        if (!tr) return;
        var id = tr.getAttribute('data-uat-id');
        if (id) openUatModal(id);
      });
      tbody.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var tr = e.target.closest('tr.uat-row-clickable');
        if (!tr) return;
        e.preventDefault();
        var id = tr.getAttribute('data-uat-id');
        if (id) openUatModal(id);
      });
    }

    var backdrop = document.getElementById('uat-case-modal-backdrop');
    var closeBtn = document.getElementById('uat-case-modal-close');
    if (backdrop) backdrop.addEventListener('click', closeUatModal);
    if (closeBtn) closeBtn.addEventListener('click', closeUatModal);

    var modal = document.getElementById('uat-case-modal');
    if (modal) {
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
          closeUatModal();
        }
      });
    }
  }

  function renderProject(project, uatItems, projectsData, uatData) {
    var root = document.getElementById('project-detail-root');
    if (!root) return;

    document.title = project.name + ' | VIVENCO AI-Native';

    window.__PROJECT_UAT_STATE__ = {
      fullUat: JSON.parse(JSON.stringify(uatData)),
      projectId: project.id
    };

    var hoursTotal = TS.totalHours(project.activities);
    var inProgress = (project.activities || []).filter(function (a) {
      return a.inProgress;
    });

    var activitiesRows = (project.activities || [])
      .map(function (a) {
        return (
          '<tr>' +
          '<td>' +
          (a.inProgress ? '<span class="dot-inprogress"></span> ' : '') +
          TS.escapeHtml(a.title) +
          '</td>' +
          '<td>' +
          TS.escapeHtml(a.assignee || '—') +
          '</td>' +
          '<td class="num">' +
          TS.escapeHtml(a.hours != null ? String(a.hours) : '—') +
          '</td>' +
          '<td>' +
          (a.inProgress ? '<span class="badge-ip">En curso</span>' : '—') +
          '</td>' +
          '</tr>'
        );
      })
      .join('');

    var milestonesList = (project.milestones || [])
      .map(function (m) {
        return (
          '<li><time datetime="' +
          TS.escapeHtml(m.date) +
          '">' +
          TS.escapeHtml(m.date) +
          '</time> — ' +
          TS.escapeHtml(m.title) +
          '</li>'
        );
      })
      .join('');

    var state = getState();
    var itemsForRows = uatItems.map(function (it) {
      var full = null;
      state.fullUat.items.forEach(function (x) {
        if (x.id === it.id) full = x;
      });
      return full || it;
    });
    var uatRows = itemsForRows.map(buildUatRow).join('');

    var uatBlock =
      '<section class="project-section project-section-uat" id="uat">' +
      '<h2 class="project-section-title">UAT — pruebas de este proyecto</h2>' +
      '<p class="uat-list-hint">Haz clic en una fila para ver y editar el detalle completo del caso.</p>' +
      (uatRows
        ? buildUatToolbar() +
          '<div class="uat-wrap uat-wrap-list">' +
          '<table class="uat-table uat-table-list" id="uat-table">' +
          '<thead><tr>' +
          '<th>Título del caso</th>' +
          '<th>Descripción del test case</th>' +
          '<th>Prioridad</th>' +
          '<th>Estado</th>' +
          '</tr></thead><tbody>' +
          uatRows +
          '</tbody></table></div>'
        : '<p class="project-muted">No hay casos UAT asociados a este proyecto (<code>projectId</code> en <code>data/uat.json</code>).</p>') +
      '</section>';

    root.innerHTML =
      '<nav class="project-breadcrumb" aria-label="Migas de pan">' +
      '<a href="tracker.html">Proyectos</a>' +
      ' <span class="bc-sep">/</span> ' +
      '<span class="bc-current">' +
      TS.escapeHtml(project.name) +
      '</span>' +
      '</nav>' +
      '<header class="project-detail-hero">' +
      '<p class="project-detail-badge">' +
      TS.escapeHtml(project.system) +
      '</p>' +
      '<h1 class="project-detail-title">' +
      TS.escapeHtml(project.name) +
      '</h1>' +
      '<p class="project-detail-client"><strong>Cliente:</strong> ' +
      TS.escapeHtml(project.client) +
      '</p>' +
      '<p class="project-detail-status-wrap">Estado: <span class="tracker-status ' +
      TS.statusClass(project.status) +
      '">' +
      TS.escapeHtml(project.status) +
      '</span></p>' +
      '</header>' +
      '<p class="project-detail-meta-line">Datos actualizados: ' +
      TS.escapeHtml(projectsData.updatedAt || '—') +
      ' (proyectos) · ' +
      TS.escapeHtml(uatData.updatedAt || '—') +
      ' (UAT)</p>' +
      '<section class="project-section" id="resumen">' +
      '<h2 class="project-section-title">Resumen</h2>' +
      (project.summary
        ? '<p class="project-summary">' + TS.escapeHtml(project.summary) + '</p>'
        : '<p class="project-muted">Sin resumen.</p>') +
      '<div class="project-detail-stats">' +
      '<div class="stat"><span class="stat-label">Horas registradas</span><span class="stat-value">' +
      hoursTotal +
      ' h</span></div>' +
      '<div class="stat"><span class="stat-label">Actividades en curso</span><span class="stat-value">' +
      inProgress.length +
      '</span></div>' +
      '</div>' +
      '</section>' +
      '<section class="project-section" id="actividades">' +
      '<h2 class="project-section-title">Actividades</h2>' +
      '<div class="table-wrap">' +
      '<table class="detail-table">' +
      '<thead><tr><th>Actividad</th><th>Responsable</th><th>Horas</th><th>Estado</th></tr></thead>' +
      '<tbody>' +
      (activitiesRows || '<tr><td colspan="4">Sin actividades</td></tr>') +
      '</tbody></table></div>' +
      '</section>' +
      '<section class="project-section" id="milestones">' +
      '<h2 class="project-section-title">Milestones</h2>' +
      '<ul class="milestone-list project-milestone-list">' +
      (milestonesList || '<li>Sin milestones definidos.</li>') +
      '</ul>' +
      '</section>' +
      uatBlock;

    var nav = document.getElementById('project-section-nav');
    if (nav) nav.hidden = false;

    bindUatSection();
  }

  function init() {
    var id = getProjectIdFromQuery();
    if (!id) {
      renderError('Falta el parámetro id en la URL. Ejemplo: project.html?id=demo-erp-01');
      return;
    }

    TS.loadTrackerData()
      .then(function (results) {
        var projectsData = results[0];
        var uatData = results[1];
        var projects = projectsData.projects || [];
        var project = null;
        projects.forEach(function (p) {
          if (p.id === id) project = p;
        });
        if (!project) {
          renderError('No existe un proyecto con id «' + id + '».');
          return;
        }
        var uatItems = (uatData.items || []).filter(function (it) {
          return it.projectId === id;
        });
        renderProject(project, uatItems, projectsData, uatData);
      })
      .catch(function () {
        renderError(
          'No se pudieron cargar los datos. Incluye los scripts data/*.data.js o usa un servidor local.'
        );
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
