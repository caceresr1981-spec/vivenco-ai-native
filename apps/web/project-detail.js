(function () {
  'use strict';

  var TS = window.TrackerShared;
  if (!TS) return;

  var UAT_STATUSES = ['Pendiente', 'En prueba', 'Bloqueado', 'Aprobado'];
  var PRIORITIES = ['Alta', 'Media', 'Baja'];
  /** Clave exacta en uat.json (coincide con el nombre del campo en el archivo). */
  var KEY_DESC_CONCISA = 'Descripción concisa del test case';

  /** True si el usuario editó el modal sin guardar con «Aplicar cambios». */
  var uatModalDirty = false;
  var uatBeforeUnloadBound = false;

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

  /** Mensaje visible dentro del modal (el estado bajo la tabla queda tapado por el modal). */
  function setModalFeedback(message, isError) {
    var el = document.getElementById('uat-modal-feedback');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('uat-modal-feedback--error', !!isError);
    el.classList.toggle('uat-modal-feedback--ok', !isError && !!message);
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
      '<button type="button" class="btn btn-outline btn-sm" id="uat-export-backup">Exportar uat.json (respaldo)</button>' +
      '</div>' +
      '<p class="uat-save-hint">Sin API ni archivos vinculados, «Aplicar cambios» guarda en <strong>este navegador</strong> (localStorage) y al recargar se recupera la copia más reciente. Con la API en <code>config.js</code> se sincroniza en el servidor; con el engranaje se escriben los JSON vinculados. La exportación es copia manual de respaldo.</p>'
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
      '<p id="uat-modal-feedback" class="uat-modal-feedback" role="status" aria-live="polite"></p>' +
      '<div class="uat-modal-actions">' +
      '<button type="button" class="btn btn-primary" id="uat-modal-apply">Aplicar cambios</button>' +
      '<button type="button" class="btn btn-outline" id="uat-modal-cancel">Cerrar</button>' +
      '</div>';

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    uatModalDirty = false;
    body.addEventListener(
      'input',
      function () {
        uatModalDirty = true;
      },
      true
    );
    body.addEventListener(
      'change',
      function () {
        uatModalDirty = true;
      },
      true
    );

    document.getElementById('uat-modal-apply').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      applyUatModal();
    });
    document.getElementById('uat-modal-cancel').addEventListener('click', function () {
      closeUatModal(false);
    });
  }

  function readModalField(name) {
    var root = document.getElementById('uat-case-modal-body');
    var el = root ? root.querySelector('[data-modal-field="' + name + '"]') : null;
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

    var applyBtn = document.getElementById('uat-modal-apply');
    var applyLabel = applyBtn ? applyBtn.textContent : '';
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.textContent = 'Guardando…';
    }
    setModalFeedback('Guardando cambios…', false);

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

    var fullUatBackup = JSON.parse(JSON.stringify(state.fullUat));
    state.fullUat.items[idx] = updated;
    state.fullUat.updatedAt = new Date().toISOString().slice(0, 10);
    refreshUatRow(id);

    persistUatToDisk()
      .then(function (r) {
        if (applyBtn) {
          applyBtn.disabled = false;
          applyBtn.textContent = applyLabel;
        }
        if (r && r.ok) {
          uatModalDirty = false;
          setModalFeedback('', false);
          if (r.source === 'api') {
            var msgApi =
              r.syncMode === 'uat_only'
                ? 'UAT guardado en el servidor (solo uat.json).'
                : 'Sincronizado: proyectos + UAT en el servidor (una sola petición).';
            setSyncStatus(msgApi);
            if (window.__TRACKER_UAT__ && window.__PROJECT_UAT_STATE__ && window.__PROJECT_UAT_STATE__.fullUat) {
              window.__TRACKER_UAT__ = JSON.parse(JSON.stringify(window.__PROJECT_UAT_STATE__.fullUat));
            }
          } else if (r.source === 'disk' && r.wroteProjects) {
            setSyncStatus('Guardado en disco: UAT y projects.json vinculados.');
          } else if (r.source === 'disk') {
            setSyncStatus(
              'UAT guardado en disco. Si también quieres actualizar projects.json, vincúlalo en Proyectos (engranaje) o usa la API.'
            );
          } else if (r.source === 'localStorage') {
            setSyncStatus(
              'UAT guardado en este navegador (localStorage). Para el repo u otro equipo, configura la API o exporta JSON.'
            );
          } else {
            setSyncStatus('Cambios guardados.');
          }
          closeUatModal(true);
        } else {
          state.fullUat = fullUatBackup;
          refreshUatRow(id);
          var errMsg = 'No se pudo guardar. Cambios revertidos.';
          if (r && r.reason === 'no_handle') {
            errMsg =
              'No se guardó: vincula uat.json en Proyectos (engranaje) o configura la API en config.js. Los cambios se revirtieron.';
          } else if (r && r.reason === 'permission_denied') {
            errMsg = 'Permiso denegado al escribir en disco. Cambios revertidos.';
          } else if (r && r.reason === 'unsupported') {
            errMsg =
              'Este navegador no puede guardar en disco. Configura la API en config.js o usa Chrome/Edge y vincula los JSON.';
          } else if (r && r.reason === 'api_unauthorized') {
            errMsg = 'API: token inválido o ausente. Revisa config.js y Railway.';
          } else if (r && r.reason === 'api_failed') {
            errMsg = 'Error al guardar en la API. Revisa red, CORS y que el servicio esté activo.';
          } else if (r && r.reason === 'no_storage') {
            errMsg =
              'No se pudo guardar ni en disco ni en el almacenamiento del navegador (modo privado o bloqueado).';
          }
          setSyncStatus(errMsg);
          setModalFeedback(errMsg, true);
        }
      })
      .catch(function () {
        if (applyBtn) {
          applyBtn.disabled = false;
          applyBtn.textContent = applyLabel;
        }
        state.fullUat = fullUatBackup;
        refreshUatRow(id);
        var errMsg = 'Error al guardar. Cambios revertidos; revisa la consola o la red.';
        setSyncStatus(errMsg);
        setModalFeedback(errMsg, true);
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

  function saveUatToLocalStorage() {
    var state = getState();
    if (!state || !state.fullUat) {
      return Promise.resolve({ ok: false, reason: 'no_state' });
    }
    try {
      localStorage.setItem('vivenco-tracker-uat', JSON.stringify(state.fullUat));
      localStorage.setItem('vivenco-tracker-uat-ts', String(Date.now()));
      return Promise.resolve({ ok: true, source: 'localStorage' });
    } catch (e) {
      return Promise.resolve({ ok: false, reason: 'no_storage' });
    }
  }

  function persistUatToDisk() {
    var state = getState();
    if (!state || !state.fullUat) {
      return Promise.resolve({ ok: false, reason: 'no_state' });
    }
    state.fullUat.updatedAt = new Date().toISOString().slice(0, 10);
    var body = state.fullUat;

    if (window.TrackerApi && window.TrackerApi.isConfigured()) {
      var projects = window.__TRACKER_PROJECTS__;
      if (projects && window.TrackerApi.putSync) {
        return window.TrackerApi.putSync({ uat: body, projects: projects }).then(function (r) {
          if (r && r.ok) return { ok: true, source: 'api' };
          if (r && r.reason === 'unauthorized') {
            return { ok: false, reason: 'api_unauthorized' };
          }
          return saveUatToLocalStorage();
        });
      }
      if (window.TrackerApi.putJson) {
        return window.TrackerApi.putJson('uat', body).then(function (r) {
          if (r && r.ok) return { ok: true, source: 'api', syncMode: 'uat_only' };
          if (r && r.reason === 'unauthorized') {
            return { ok: false, reason: 'api_unauthorized' };
          }
          return saveUatToLocalStorage();
        });
      }
    }

    var jsonUat = JSON.stringify(body, null, 2);
    var J = window.JsonDiskSync;
    if (J && J.supported && J.writeJsonString) {
      return J.writeJsonString('uat', jsonUat).then(function (ru) {
        if (!ru.ok) {
          if (ru.reason === 'no_handle' || ru.reason === 'permission_denied') {
            return saveUatToLocalStorage();
          }
          return ru;
        }
        var pj = window.__TRACKER_PROJECTS__;
        if (!pj) return { ok: true, source: 'disk', wroteProjects: false };
        var jsonP = JSON.stringify(pj, null, 2);
        return J.writeJsonString('projects', jsonP).then(function (rp) {
          return {
            ok: true,
            source: 'disk',
            wroteProjects: !!(rp && rp.ok)
          };
        });
      });
    }
    if (window.UatDiskSync && window.UatDiskSync.supported) {
      return window.UatDiskSync.writeJsonString(jsonUat).then(function (ru) {
        if (ru && ru.ok) return { ok: true, source: 'disk', wroteProjects: false };
        return saveUatToLocalStorage();
      });
    }
    return saveUatToLocalStorage();
  }

  function closeUatModal(forceClose) {
    if (forceClose !== true && uatModalDirty) {
      if (
        !window.confirm(
          '¿Cerrar sin guardar? Los cambios solo se aplican al pulsar «Aplicar cambios» (API, archivos vinculados o almacenamiento del navegador).'
        )
      ) {
        return;
      }
    }
    uatModalDirty = false;
    setModalFeedback('', false);
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

    var exportBtn = document.getElementById('uat-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        downloadCurrentUatJson();
        setSyncStatus('Descarga de uat.json iniciada (respaldo manual).');
      });
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
    if (backdrop) backdrop.addEventListener('click', function () { closeUatModal(false); });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeUatModal(false); });

    var modal = document.getElementById('uat-case-modal');
    if (modal) {
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
          closeUatModal(false);
        }
      });
    }

    if (!uatBeforeUnloadBound) {
      uatBeforeUnloadBound = true;
      window.addEventListener('beforeunload', function (e) {
        if (uatModalDirty) {
          e.preventDefault();
          e.returnValue = '';
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
