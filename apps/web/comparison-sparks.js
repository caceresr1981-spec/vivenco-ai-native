(function () {
  'use strict';

  /** Dispara cuando ~1/4 del bloque es visible; root “encogido” abajo para centrar mejor el momento del efecto. */
  var OBSERVER_OPTS = {
    threshold: 0.28,
    rootMargin: '0px 0px -14% 0px'
  };

  /** Retraso entre filas (barras / sparks) para lectura más marcada. */
  var STAGGER_MS = 145;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Barras AI‑Native y Tradicional en #impacto-cliente (orden DOM: AI, trad por fila). */
  function fillImpactBars(container) {
    if (!container || container.dataset.impactBarsAnimated === '1') return;
    container.dataset.impactBarsAnimated = '1';
    var els = container.querySelectorAll('.bar-fill-ai--pending, .bar-fill-trad--pending');
    var reduced = prefersReducedMotion();
    els.forEach(function (el, i) {
      var w = el.getAttribute('data-bar-w');
      if (w == null) return;
      var go = function () {
        el.classList.remove('bar-fill-ai--pending', 'bar-fill-trad--pending');
        el.style.width = w + '%';
      };
      if (reduced) {
        go();
      } else {
        window.setTimeout(go, i * STAGGER_MS);
      }
    });
  }

  /** Sparks del comparador: por fila primero AI‑Native, luego Tradicional. */
  function fillComparatorSparks(container) {
    if (!container || container.dataset.comparatorSparksAnimated === '1') return;
    container.dataset.comparatorSparksAnimated = '1';
    var rows = container.querySelectorAll('.matrix-row');
    var els = [];
    rows.forEach(function (row) {
      var ai = row.querySelector('.spark-ai.spark-fill-pending');
      var tr = row.querySelector('.spark-trad.spark-fill-pending');
      if (ai) els.push(ai);
      if (tr) els.push(tr);
    });
    var reduced = prefersReducedMotion();
    els.forEach(function (el, i) {
      var v = el.getAttribute('data-spark-v');
      if (v == null) return;
      var go = function () {
        el.classList.remove('spark-fill-pending');
        el.style.setProperty('--v', v);
      };
      if (reduced) {
        go();
      } else {
        window.setTimeout(go, i * STAGGER_MS);
      }
    });
  }

  function observeSection(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      fn(el);
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) fn(entry.target);
        });
      },
      OBSERVER_OPTS
    );
    obs.observe(el);
  }

  function onNavigateToHash() {
    var h = location.hash;
    if (h === '#impacto-cliente') fillImpactBars(document.getElementById('impacto-cliente'));
    if (h === '#comparador') fillComparatorSparks(document.getElementById('comparador'));
  }

  document.addEventListener('DOMContentLoaded', function () {
    observeSection('impacto-cliente', fillImpactBars);
    observeSection('comparador', fillComparatorSparks);

    document.querySelectorAll('a[href="#impacto-cliente"], a[href="#comparador"]').forEach(function (a) {
      a.addEventListener('click', function () {
        window.setTimeout(onNavigateToHash, 220);
      });
    });
    window.addEventListener('hashchange', onNavigateToHash);
    if (location.hash) window.setTimeout(onNavigateToHash, 0);
  });
})();
