(function () {
  'use strict';

  function fillTradBars(container) {
    if (!container || container.dataset.tradBarsAnimated === '1') return;
    container.dataset.tradBarsAnimated = '1';
    container.querySelectorAll('.bar-fill-trad--pending').forEach(function (el) {
      var w = el.getAttribute('data-bar-w');
      if (w == null) return;
      el.classList.remove('bar-fill-trad--pending');
      el.style.width = w + '%';
    });
  }

  function fillTradSparks(container) {
    if (!container || container.dataset.tradSparksAnimated === '1') return;
    container.dataset.tradSparksAnimated = '1';
    container.querySelectorAll('.spark-trad.spark-fill-pending').forEach(function (el) {
      var v = el.getAttribute('data-spark-v');
      if (v == null) return;
      el.classList.remove('spark-fill-pending');
      el.style.setProperty('--v', v);
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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
  }

  function onNavigateToHash() {
    var h = location.hash;
    if (h === '#impacto-cliente') fillTradBars(document.getElementById('impacto-cliente'));
    if (h === '#comparador') fillTradSparks(document.getElementById('comparador'));
  }

  document.addEventListener('DOMContentLoaded', function () {
    observeSection('impacto-cliente', fillTradBars);
    observeSection('comparador', fillTradSparks);

    document.querySelectorAll('a[href="#impacto-cliente"], a[href="#comparador"]').forEach(function (a) {
      a.addEventListener('click', function () {
        window.setTimeout(onNavigateToHash, 120);
      });
    });
    window.addEventListener('hashchange', onNavigateToHash);
    if (location.hash) window.setTimeout(onNavigateToHash, 0);
  });
})();
