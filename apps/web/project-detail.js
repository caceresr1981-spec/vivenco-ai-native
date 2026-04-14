(function () {
  'use strict';

  var TS = window.TrackerShared;
  if (!TS) return;

  var UAT_STATUSES = ['Pendiente', 'En prueba', 'Bloqueado', 'Aprobado'];
  var PRIORITIES = ['Alta', 'Media', 'Baja'];
  var ACTIVITY_ESTADOS = ['Pendiente', 'En curso', 'Completada'];
  var ACTIVITY_ASSIGNEES = ['Equipo A', 'Equipo B', 'Equipo C', 'Cliente'];
  /** Clave exacta en uat.json (coincide con el nombre del campo en el archivo). */
  var KEY_DESC_CONCISA = 'Descripción concisa del test case';

  /** True si el usuario editó el modal sin guardar con «Aplicar cambios». */
  var uatModalDirty = false;
  var activityModalDirty = false;
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

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function setActivitySyncStatus(message) {
    var el = document.getElementById('activity-sync-status');
    if (el) el.textContent = message || '';
  }

  function nextActivityId(project) {
    var st = getState();
    var pid = (st && st.projectId) || (project && project.id) || 'proj';
    var used = {};
    (project && project.activities ? project.activities : []).forEach(function (a, idx) {
      var n = TS.normalizeActivity(a, idx, pid);
      used[n.id] = true;
    });
    var i = (project && project.activities ? project.activities.length : 0) + 1;
    var candidate = pid + '-act-' + i;
    while (used[candidate]) {
      i += 1;
      candidate = pid + '-act-' + i;
    }
    return candidate;
  }

  function nextUatId(fullUat, projectId) {
    var prefix = projectId || 'proj';
    var used = {};
    var maxIdx = 0;
    (fullUat && fullUat.items ? fullUat.items : []).forEach(function (it) {
      if (!it || !it.id) return;
      used[it.id] = true;
      var m = String(it.id).match(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-uat-(\\d+)$'));
      if (m) {
        var n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxIdx) maxIdx = n;
      }
    });
    var i = maxIdx + 1;
    var candidate = prefix + '-uat-' + i;
    while (used[candidate]) {
      i += 1;
      candidate = prefix + '-uat-' + i;
    }
    return candidate;
  }

  function rerenderCurrentProject() {
    var st = getState();
    var projectsData = window.__TRACKER_PROJECTS__;
    if (!st || !st.project || !st.fullUat || !projectsData) return;
    var uatItems = (st.fullUat.items || []).filter(function (it) {
      return it.projectId === st.projectId;
    });
    renderProject(st.project, uatItems, projectsData, st.fullUat);
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

  function collectAssigneeOptions(project) {
    var set = {};
    ACTIVITY_ASSIGNEES.forEach(function (a) {
      set[a] = true;
    });
    (project && project.activities ? project.activities : []).forEach(function (a) {
      if (a && a.assignee) set[a.assignee] = true;
    });
    return Object.keys(set).sort();
  }

  function assigneeOptionsHtml(project, current) {
    var opts = collectAssigneeOptions(project);
    return opts
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

  function hoursCellHtml(a) {
    var total = a.hours != null ? Number(a.hours) : 0;
    var done = a.hoursImplemented != null ? Number(a.hoursImplemented) : 0;
    if (done > 0) {
      return TS.escapeHtml(String(done)) + ' / ' + TS.escapeHtml(String(total)) + ' h';
    }
    return TS.escapeHtml(String(total)) + ' h';
  }

  function syncActivityModalSelects() {
    var root = document.getElementById('activity-modal-body');
    if (!root) return;
    var pr = root.querySelector('select[data-activity-field="priority"]');
    var st = root.querySelector('select[data-activity-field="estado"]');
    if (pr) {
      pr.classList.remove('activity-select--prio-alta', 'activity-select--prio-media', 'activity-select--prio-baja');
      if (pr.value === 'Alta') pr.classList.add('activity-select--prio-alta');
      else if (pr.value === 'Media') pr.classList.add('activity-select--prio-media');
      else pr.classList.add('activity-select--prio-baja');
    }
    if (st) {
      st.classList.remove('activity-select--est-pend', 'activity-select--est-curso', 'activity-select--est-hecha');
      var em = { Pendiente: 'activity-select--est-pend', 'En curso': 'activity-select--est-curso', Completada: 'activity-select--est-hecha' };
      st.classList.add(em[st.value] || 'activity-select--est-pend');
    }
  }

  function syncTrackerProjectsFromState() {
    var st = getState();
    if (!st || !st.project || !st.projectId) return;
    var bundle = window.__TRACKER_PROJECTS__;
    if (!bundle || !bundle.projects) return;
    for (var i = 0; i < bundle.projects.length; i++) {
      if (bundle.projects[i].id === st.projectId) {
        bundle.projects[i] = JSON.parse(JSON.stringify(st.project));
        break;
      }
    }
    bundle.updatedAt = new Date().toISOString().slice(0, 10);
  }

  function saveProjectsToLocalStorage() {
    var body = window.__TRACKER_PROJECTS__;
    if (!body) {
      return Promise.resolve({ ok: false, reason: 'no_state' });
    }
    try {
      body.updatedAt = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem('vivenco-tracker-projects', JSON.stringify(body));
      window.localStorage.setItem('vivenco-tracker-projects-ts', String(Date.now()));
      return Promise.resolve({ ok: true, source: 'localStorage' });
    } catch (e) {
      return Promise.resolve({ ok: false, reason: 'no_storage' });
    }
  }

  function persistProjectsToDisk() {
    syncTrackerProjectsFromState();
    var body = window.__TRACKER_PROJECTS__;
    if (!body) {
      return Promise.resolve({ ok: false, reason: 'no_state' });
    }
    body.updatedAt = new Date().toISOString().slice(0, 10);
    if (window.TrackerApi && window.TrackerApi.isConfigured() && window.TrackerApi.putJson) {
      return window.TrackerApi
        .putJson('projects', body)
        .then(function (r) {
          if (r && r.ok) return { ok: true, source: 'api' };
          if (r && r.reason === 'unauthorized') return { ok: false, reason: 'api_unauthorized' };
          return saveProjectsToLocalStorage();
        })
        .catch(function () {
          return saveProjectsToLocalStorage();
        });
    }
    var json = JSON.stringify(body, null, 2);
    var J = window.JsonDiskSync;
    if (J && J.supported && J.writeJsonString) {
      return J.writeJsonString('projects', json).then(function (ru) {
        if (ru && ru.ok) return { ok: true, source: 'disk' };
        if (ru && (ru.reason === 'no_handle' || ru.reason === 'permission_denied')) {
          return saveProjectsToLocalStorage();
        }
        return saveProjectsToLocalStorage();
      });
    }
    return saveProjectsToLocalStorage();
  }

  function findActivityIndexById(activityId) {
    var st = getState();
    if (!st || !st.project || !st.project.activities) return -1;
    for (var i = 0; i < st.project.activities.length; i++) {
      var n = TS.normalizeActivity(st.project.activities[i], i, st.projectId);
      if (n.id === activityId) return i;
    }
    return -1;
  }

  function updateActivityRowAndStats(activityId) {
    var st = getState();
    if (!st || !st.project) return;
    var idx = findActivityIndexById(activityId);
    if (idx < 0) return;
    var a = TS.normalizeActivity(st.project.activities[idx], idx, st.projectId);
    var tr = document.querySelector('#actividades-table tbody tr[data-activity-id="' + activityId + '"]');
    if (tr) {
      var dot = a.estado === 'En curso' ? '<span class="dot-inprogress" aria-hidden="true"></span> ' : '';
      tr.innerHTML =
        '<td>' +
        dot +
        TS.escapeHtml(a.title) +
        '</td>' +
        '<td><span class="' +
        priorityBadgeClass(a.priority) +
        '">' +
        TS.escapeHtml(a.priority || '—') +
        '</span></td>' +
        '<td class="num">' +
        hoursCellHtml(a) +
        '</td>' +
        '<td><span class="activity-est-badge ' +
        TS.activityEstadoClass(a.estado) +
        '">' +
        TS.escapeHtml(a.estado) +
        '</span></td>';
    }
    var m = TS.activityProjectMetrics(st.project.activities, st.projectId);
    var el = function (sel, val) {
      var e = document.querySelector(sel);
      if (e) e.textContent = val;
    };
    el('[data-stat="horas-por-implementar"]', String(m.horasPorImplementar) + ' h');
    el('[data-stat="horas-implementadas"]', String(m.horasImplementadas) + ' h');
    el('[data-stat="actividades-completadas"]', String(m.actividadesCompletadas));
    el('[data-stat="actividades-en-curso"]', String(m.actividadesEnCurso));
  }

  function closeActivityModal(forceClose) {
    if (forceClose !== true && activityModalDirty) {
      if (
        !window.confirm(
          '¿Cerrar sin guardar? Los cambios solo se aplican al pulsar «Guardar actividad» (API o archivo vinculado).'
        )
      ) {
        return;
      }
    }
    activityModalDirty = false;
    var modal = document.getElementById('activity-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.dataset.currentActivityId = '';
    var body = document.getElementById('activity-modal-body');
    if (body) body.innerHTML = '';
  }

  function openActivityModal(activityId) {
    var st = getState();
    if (!st || !st.project) return;
    var idx = findActivityIndexById(activityId);
    if (idx < 0) return;
    var raw = st.project.activities[idx];
    var a = TS.normalizeActivity(raw, idx, st.projectId);

    var modal = document.getElementById('activity-modal');
    var body = document.getElementById('activity-modal-body');
    if (!modal || !body) return;

    activityModalDirty = false;
    modal.dataset.currentActivityId = activityId;

    body.innerHTML =
      '<div class="activity-modal-inner">' +
      '<p class="activity-modal-id">ID: <code>' +
      TS.escapeHtml(a.id) +
      '</code></p>' +
      '<label class="uat-modal-label"><span>Título</span>' +
      '<input type="text" class="uat-input uat-modal-input" data-activity-field="title" value="' +
      escapeAttr(a.title || '') +
      '" /></label>' +
      '<div class="activity-story-block">' +
      '<p class="activity-story-title">Historia de usuario</p>' +
      '<p class="activity-story-line"><span class="activity-story-k">Como</span>' +
      '<input type="text" class="uat-input activity-story-input" data-activity-field="storyRole" value="' +
      escapeAttr(a.storyRole || '') +
      '" placeholder="rol o persona" /></p>' +
      '<p class="activity-story-line"><span class="activity-story-k">quiero</span>' +
      '<input type="text" class="uat-input activity-story-input" data-activity-field="storyWant" value="' +
      escapeAttr(a.storyWant || '') +
      '" placeholder="acción o funcionalidad" /></p>' +
      '<p class="activity-story-line"><span class="activity-story-k">para</span>' +
      '<input type="text" class="uat-input activity-story-input" data-activity-field="storyBenefit" value="' +
      escapeAttr(a.storyBenefit || '') +
      '" placeholder="beneficio" /></p>' +
      '</div>' +
      '<div class="uat-modal-fields">' +
      '<div class="uat-modal-row">' +
      '<label class="uat-modal-label"><span>Responsable</span>' +
      '<select class="uat-select activity-assignee-select" data-activity-field="assignee">' +
      assigneeOptionsHtml(st.project, a.assignee || ACTIVITY_ASSIGNEES[0]) +
      '</select></label>' +
      '<label class="uat-modal-label"><span>Estado</span>' +
      '<select class="uat-select" data-activity-field="estado">' +
      selectOptionsHtml(ACTIVITY_ESTADOS, a.estado || 'Pendiente') +
      '</select></label>' +
      '<label class="uat-modal-label"><span>Prioridad</span>' +
      '<select class="uat-select" data-activity-field="priority">' +
      selectOptionsHtml(PRIORITIES, a.priority || 'Media') +
      '</select></label>' +
      '</div>' +
      '<div class="uat-modal-row2">' +
      '<label class="uat-modal-label"><span>Horas estimadas</span>' +
      '<input type="number" min="0" step="1" class="uat-input uat-modal-input" data-activity-field="hours" value="' +
      escapeAttr(a.hours != null ? String(a.hours) : '0') +
      '" /></label>' +
      '<label class="uat-modal-label"><span>Horas implementadas</span>' +
      '<input type="number" min="0" step="1" class="uat-input uat-modal-input" data-activity-field="hoursImplemented" value="' +
      escapeAttr(a.hoursImplemented != null ? String(a.hoursImplemented) : '0') +
      '" /></label>' +
      '<label class="uat-modal-label"><span>Fecha de inicio</span>' +
      '<input type="date" class="uat-input uat-modal-input" data-activity-field="fechaInicio" value="' +
      escapeAttr(a.fechaInicio || '') +
      '" /></label>' +
      '<label class="uat-modal-label"><span>Fecha de finalización</span>' +
      '<input type="date" class="uat-input uat-modal-input" data-activity-field="fechaFin" value="' +
      escapeAttr(a.fechaFin || '') +
      '" /></label>' +
      '</div></div>' +
      '<p id="activity-modal-feedback" class="uat-modal-feedback" role="status" aria-live="polite"></p>' +
      '<div class="uat-modal-actions">' +
      '<button type="button" class="btn btn-primary" id="activity-modal-save">Guardar actividad</button>' +
      '<button type="button" class="btn btn-outline" id="activity-modal-cancel">Cerrar</button>' +
      '</div></div>';

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var titleEl = document.getElementById('activity-modal-title');
    if (titleEl) titleEl.textContent = a.title || 'Actividad';
    syncActivityModalSelects();

  }

  function readActivityField(name) {
    var root = document.getElementById('activity-modal-body');
    var el = root ? root.querySelector('[data-activity-field="' + name + '"]') : null;
    return el ? String(el.value).trim() : '';
  }

  function setActivityFeedback(message, isError) {
    var el = document.getElementById('activity-modal-feedback');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('uat-modal-feedback--error', !!isError);
    el.classList.toggle('uat-modal-feedback--ok', !isError && !!message);
  }

  function applyActivityModal() {
    var modal = document.getElementById('activity-modal');
    if (!modal) return;
    var activityId = modal.dataset.currentActivityId;
    if (!activityId) return;
    var st = getState();
    if (!st || !st.project) return;
    var idx = findActivityIndexById(activityId);
    if (idx < 0) return;

    var title = readActivityField('title');
    var estado = readActivityField('estado') || 'Pendiente';
    var hours = parseFloat(readActivityField('hours'));
    var hoursImpl = parseFloat(readActivityField('hoursImplemented'));
    if (isNaN(hours) || hours < 0) hours = 0;
    if (isNaN(hoursImpl) || hoursImpl < 0) hoursImpl = 0;
    if (estado === 'Completada' && hoursImpl === 0 && hours > 0) hoursImpl = hours;

    var updated = Object.assign({}, st.project.activities[idx], {
      title: title || st.project.activities[idx].title,
      storyRole: readActivityField('storyRole'),
      storyWant: readActivityField('storyWant'),
      storyBenefit: readActivityField('storyBenefit'),
      assignee: readActivityField('assignee'),
      estado: estado,
      priority: readActivityField('priority') || 'Media',
      hours: hours,
      hoursImplemented: hoursImpl,
      fechaInicio: readActivityField('fechaInicio'),
      fechaFin: readActivityField('fechaFin'),
      inProgress: estado === 'En curso'
    });

    var backup = JSON.parse(JSON.stringify(st.project.activities[idx]));
    st.project.activities[idx] = updated;

    var saveBtn = document.getElementById('activity-modal-save');
    var saveLabel = saveBtn ? saveBtn.textContent : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando…';
    }
    setActivityFeedback('Guardando…', false);

    persistProjectsToDisk()
      .then(function (r) {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = saveLabel;
        }
        if (r && r.ok) {
          activityModalDirty = false;
          var okMsg =
            r.source === 'localStorage'
              ? 'Guardado en este navegador (localStorage). Al recargar se recupera la copia más reciente.'
              : 'Guardado.';
          setActivityFeedback(okMsg, false);
          updateActivityRowAndStats(activityId);
          closeActivityModal(true);
        } else {
          st.project.activities[idx] = backup;
          syncTrackerProjectsFromState();
          var msg =
            r && r.reason === 'api_unauthorized'
              ? 'API: token inválido o ausente.'
              : r && r.reason === 'no_storage'
                ? 'No se pudo guardar: almacenamiento del navegador bloqueado o lleno (p. ej. modo privado).'
                : 'No se pudo guardar el proyecto.';
          setActivityFeedback(msg, true);
        }
      })
      .catch(function () {
        st.project.activities[idx] = backup;
        syncTrackerProjectsFromState();
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = saveLabel;
        }
        setActivityFeedback('Error al guardar.', true);
      });
  }

  /** Semáforo en el <select> cerrado; las <option> del desplegable siguen neutras (CSS). */
  function syncUatModalSelectTraffic() {
    var root = document.getElementById('uat-case-modal-body');
    if (!root) return;
    var pr = root.querySelector('select[data-modal-field="priority"]');
    var st = root.querySelector('select[data-modal-field="status"]');
    if (pr) {
      pr.classList.remove('uat-select--prio-alta', 'uat-select--prio-media', 'uat-select--prio-baja');
      if (pr.value === 'Alta') pr.classList.add('uat-select--prio-alta');
      else if (pr.value === 'Media') pr.classList.add('uat-select--prio-media');
      else pr.classList.add('uat-select--prio-baja');
    }
    if (st) {
      st.classList.remove(
        'uat-select--stat-pend',
        'uat-select--stat-test',
        'uat-select--stat-block',
        'uat-select--stat-ok'
      );
      var map = {
        Pendiente: 'uat-select--stat-pend',
        'En prueba': 'uat-select--stat-test',
        Bloqueado: 'uat-select--stat-block',
        Aprobado: 'uat-select--stat-ok'
      };
      st.classList.add(map[st.value] || 'uat-select--stat-pend');
    }
  }

  function setSyncStatus(message) {
    var el = document.getElementById('uat-sync-status');
    if (el) el.textContent = message || '';
  }

  function createManualActivity() {
    var st = getState();
    if (!st || !st.project) return;
    if (!st.project.activities) st.project.activities = [];
    var newId = nextActivityId(st.project);
    var base = {
      id: newId,
      title: 'Nueva actividad',
      storyRole: '',
      storyWant: '',
      storyBenefit: '',
      assignee: ACTIVITY_ASSIGNEES[0],
      estado: 'Pendiente',
      priority: 'Media',
      hours: 0,
      hoursImplemented: 0,
      fechaInicio: todayIso(),
      fechaFin: '',
      inProgress: false
    };
    st.project.activities.push(base);
    setActivitySyncStatus('Creando actividad…');
    persistProjectsToDisk()
      .then(function (r) {
        if (r && r.ok) {
          setActivitySyncStatus('Actividad creada. Completa sus datos en el modal.');
          rerenderCurrentProject();
          openActivityModal(newId);
        } else {
          st.project.activities = st.project.activities.filter(function (a) { return a.id !== newId; });
          syncTrackerProjectsFromState();
          setActivitySyncStatus('No se pudo crear la actividad. Revisa API/archivo vinculado.');
        }
      })
      .catch(function () {
        st.project.activities = st.project.activities.filter(function (a) { return a.id !== newId; });
        syncTrackerProjectsFromState();
        setActivitySyncStatus('Error al crear actividad.');
      });
  }

  function createManualUatCase() {
    var st = getState();
    if (!st || !st.fullUat) return;
    if (!st.fullUat.items) st.fullUat.items = [];
    var newId = nextUatId(st.fullUat, st.projectId);
    var item = {
      id: newId,
      projectId: st.projectId,
      title: 'Nuevo caso UAT',
      descripcionTecnica: '',
      accionesTester: '',
      priority: 'Media',
      status: 'Pendiente',
      fechaCreacion: todayIso(),
      fechaFinalizacion: ''
    };
    item[KEY_DESC_CONCISA] = '';
    st.fullUat.items.push(item);
    st.fullUat.updatedAt = todayIso();
    setSyncStatus('Creando caso UAT…');
    persistUatToDisk()
      .then(function (r) {
        if (r && r.ok) {
          setSyncStatus('Caso UAT creado. Completa sus datos en el modal.');
          rerenderCurrentProject();
          openUatModal(newId);
        } else {
          st.fullUat.items = st.fullUat.items.filter(function (x) { return x.id !== newId; });
          setSyncStatus('No se pudo crear el caso UAT. Revisa API/archivo vinculado.');
        }
      })
      .catch(function () {
        st.fullUat.items = st.fullUat.items.filter(function (x) { return x.id !== newId; });
        setSyncStatus('Error al crear caso UAT.');
      });
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
    syncUatModalSelectTraffic();
    body.addEventListener(
      'input',
      function () {
        uatModalDirty = true;
      },
      true
    );
    body.addEventListener(
      'change',
      function (e) {
        uatModalDirty = true;
        var t = e.target;
        if (
          t &&
          t.getAttribute &&
          (t.getAttribute('data-modal-field') === 'priority' || t.getAttribute('data-modal-field') === 'status')
        ) {
          syncUatModalSelectTraffic();
        }
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
    var addBtn = document.getElementById('uat-add-manual');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        createManualUatCase();
      });
    }

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
        if (uatModalDirty || activityModalDirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    }
  }

  function initActivityModalOnce() {
    if (initActivityModalOnce.done) return;
    initActivityModalOnce.done = true;
    document.addEventListener('input', function (e) {
      if (!e.target.closest('#activity-modal-body')) return;
      activityModalDirty = true;
    }, true);
    document.addEventListener('change', function (e) {
      if (!e.target.closest('#activity-modal-body')) return;
      activityModalDirty = true;
      var t = e.target;
      if (
        t &&
        t.getAttribute &&
        (t.getAttribute('data-activity-field') === 'priority' || t.getAttribute('data-activity-field') === 'estado')
      ) {
        syncActivityModalSelects();
      }
    }, true);
    document.addEventListener('click', function (e) {
      if (e.target.closest('#activity-modal-save')) {
        e.preventDefault();
        applyActivityModal();
        return;
      }
      if (e.target.closest('#activity-modal-cancel')) {
        e.preventDefault();
        closeActivityModal(false);
        return;
      }
      if (e.target.closest('#activity-add-manual')) {
        e.preventDefault();
        createManualActivity();
        return;
      }
      var tr = e.target.closest('#actividades-table tbody tr.activity-row-clickable');
      if (!tr) return;
      var id = tr.getAttribute('data-activity-id');
      if (id) openActivityModal(id);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest('#actividades-table tbody tr.activity-row-clickable');
      if (!tr) return;
      e.preventDefault();
      var id = tr.getAttribute('data-activity-id');
      if (id) openActivityModal(id);
    });
    var backdrop = document.getElementById('activity-modal-backdrop');
    var closeBtn = document.getElementById('activity-modal-close');
    if (backdrop) backdrop.addEventListener('click', function () { closeActivityModal(false); });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeActivityModal(false); });
    var modal = document.getElementById('activity-modal');
    if (modal) {
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
          closeActivityModal(false);
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
      projectId: project.id,
      project: JSON.parse(JSON.stringify(project))
    };

    var metrics = TS.activityProjectMetrics(project.activities, project.id);
    var companyName = project.companyName || project.client || '—';
    var contactName = project.contactName || '—';
    var contactEmail = project.contactEmail || '—';

    var activitiesRows = (project.activities || [])
      .map(function (a, idx) {
        var n = TS.normalizeActivity(a, idx, project.id);
        var dot = n.estado === 'En curso' ? '<span class="dot-inprogress" aria-hidden="true"></span> ' : '';
        return (
          '<tr class="activity-row activity-row-clickable" data-activity-id="' +
          escapeAttr(n.id) +
          '" tabindex="0" role="button" aria-label="Abrir detalle de actividad">' +
          '<td>' +
          dot +
          TS.escapeHtml(n.title) +
          '</td>' +
          '<td><span class="' +
          priorityBadgeClass(n.priority) +
          '">' +
          TS.escapeHtml(n.priority || '—') +
          '</span></td>' +
          '<td class="num">' +
          hoursCellHtml(n) +
          '</td>' +
          '<td><span class="activity-est-badge ' +
          TS.activityEstadoClass(n.estado) +
          '">' +
          TS.escapeHtml(n.estado) +
          '</span></td>' +
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
      '<div class="project-section-head">' +
      '<h2 class="project-section-title">UAT — pruebas de este proyecto</h2>' +
      '<button type="button" class="btn btn-outline btn-sm" id="uat-add-manual">+ Caso UAT manual</button>' +
      '</div>' +
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

    var internalSpecBlock = '';
    if (project.specMarkdown || project.cursorPrompt) {
      internalSpecBlock =
        '<section class="project-section" id="especificacion-interna">' +
        '<h2 class="project-section-title">Especificación interna</h2>' +
        (project.specMarkdown
          ? '<h3 class="spec-result-subheading">Especificación (Markdown)</h3>' +
            '<pre class="spec-pre">' +
            TS.escapeHtml(project.specMarkdown) +
            '</pre>'
          : '') +
        (project.cursorPrompt
          ? '<h3 class="spec-result-subheading">Prompt de Cursor</h3>' +
            '<textarea class="spec-textarea" rows="12" readonly>' +
            TS.escapeHtml(project.cursorPrompt) +
            '</textarea>'
          : '') +
        '</section>';
    }

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
      '<p class="project-detail-client"><strong>Empresa:</strong> ' +
      TS.escapeHtml(companyName) +
      '</p>' +
      '<p class="project-detail-client"><strong>Persona:</strong> ' +
      TS.escapeHtml(contactName) +
      '</p>' +
      '<p class="project-detail-client"><strong>Email:</strong> ' +
      TS.escapeHtml(contactEmail) +
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
      '<div class="stat stat--hours-pending"><span class="stat-label">Horas por implementar</span><span class="stat-value" data-stat="horas-por-implementar">' +
      metrics.horasPorImplementar +
      ' h</span></div>' +
      '<div class="stat stat--hours-done"><span class="stat-label">Horas implementadas</span><span class="stat-value" data-stat="horas-implementadas">' +
      metrics.horasImplementadas +
      ' h</span></div>' +
      '<div class="stat stat--acts-done"><span class="stat-label">Actividades completadas</span><span class="stat-value" data-stat="actividades-completadas">' +
      metrics.actividadesCompletadas +
      '</span></div>' +
      '<div class="stat stat--acts-wip"><span class="stat-label">Actividades en curso</span><span class="stat-value" data-stat="actividades-en-curso">' +
      metrics.actividadesEnCurso +
      '</span></div>' +
      '</div>' +
      '</section>' +
      '<section class="project-section" id="actividades">' +
      '<div class="project-section-head">' +
      '<h2 class="project-section-title">Actividades</h2>' +
      '<button type="button" class="btn btn-outline btn-sm" id="activity-add-manual">+ Actividad manual</button>' +
      '</div>' +
      '<p class="uat-list-hint">Haz clic en una fila para ver la historia de usuario y editar responsable, estado y fechas. Sin API ni <code>projects.json</code> vinculado, «Guardar actividad» guarda en <strong>este navegador</strong> (localStorage).</p>' +
      '<p id="activity-sync-status" class="uat-sync-status" aria-live="polite"></p>' +
      '<div class="table-wrap">' +
      '<table class="detail-table" id="actividades-table">' +
      '<thead><tr><th>Actividad</th><th>Prioridad</th><th>Horas</th><th>Estado</th></tr></thead>' +
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
      internalSpecBlock +
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
    document.addEventListener('DOMContentLoaded', function () {
      init();
      initActivityModalOnce();
    });
  } else {
    init();
    initActivityModalOnce();
  }
})();
