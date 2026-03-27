(function () {
  'use strict';

  var J = window.JsonDiskSync;

  function downloadBlob(filename, obj) {
    var json = JSON.stringify(obj, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function setPanelMsg(text) {
    var el = document.getElementById('tracker-settings-msg');
    if (el) el.textContent = text || '';
  }

  function init() {
    var toggle = document.getElementById('tracker-settings-toggle');
    var panel = document.getElementById('tracker-settings-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', function () {
      if (!panel.hidden) {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    var lp = document.getElementById('link-projects-json');
    if (lp && J) {
      lp.addEventListener('click', function () {
        J.linkFile('projects')
          .then(function (r) {
            if (r && r.ok) {
              setPanelMsg('projects.json vinculado correctamente.');
            } else if (r && r.reason === 'wrong_name') {
              setPanelMsg(r.message || 'Nombre de archivo incorrecto.');
            } else {
              setPanelMsg('No se pudo vincular. Usa Chrome/Edge y elige el archivo indicado abajo.');
            }
          })
          .catch(function () {
            setPanelMsg('Selección cancelada.');
          });
      });
    }

    var lu = document.getElementById('link-uat-json');
    if (lu && J) {
      lu.addEventListener('click', function () {
        J.linkFile('uat')
          .then(function (r) {
            if (r && r.ok) {
              setPanelMsg('uat.json vinculado. «Aplicar cambios» en UAT escribirá en este archivo.');
            } else if (r && r.reason === 'wrong_name') {
              setPanelMsg(r.message || 'Nombre de archivo incorrecto.');
            } else {
              setPanelMsg('No se pudo vincular. Usa Chrome/Edge.');
            }
          })
          .catch(function () {
            setPanelMsg('Selección cancelada.');
          });
      });
    }

    var dp = document.getElementById('download-projects-json');
    if (dp) {
      dp.addEventListener('click', function () {
        if (!window.__TRACKER_PROJECTS__) {
          setPanelMsg('No hay datos de proyectos cargados.');
          return;
        }
        downloadBlob('projects.json', window.__TRACKER_PROJECTS__);
        setPanelMsg('Descarga de projects.json iniciada.');
      });
    }

    var du = document.getElementById('download-uat-json');
    if (du) {
      du.addEventListener('click', function () {
        if (!window.__TRACKER_UAT__) {
          setPanelMsg('No hay datos UAT cargados.');
          return;
        }
        downloadBlob('uat.json', window.__TRACKER_UAT__);
        setPanelMsg('Descarga de uat.json iniciada.');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
