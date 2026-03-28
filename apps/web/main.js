(function () {
  'use strict';

  // Modal diagnóstico: abrir al hacer clic en enlaces #diagnostico
  var modal = document.getElementById('diagnostico');
  if (modal) {
    var backdrop = modal.querySelector('.modal-backdrop');
    var closeBtn = modal.querySelector('.modal-close');

    function openModal() {
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('a[href="#diagnostico"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  // Cerrar menú móvil al hacer clic en un enlace (si se añade menú desplegable)
  var menuToggle = document.querySelector('.menu-toggle');
  var navEl = document.querySelector('.header .nav');
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      var nav = document.querySelector('.nav');
      if (nav) nav.classList.toggle('is-open');
    });
  }

  if (navEl) {
    var hashLinks = navEl.querySelectorAll('a[href^="#"]');
    var sectionIds = [];
    hashLinks.forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href.length > 1) sectionIds.push(href.slice(1));
    });
    if (sectionIds.length) {
      function updateNavActive() {
        var headerH = 76;
        var probe = window.scrollY + headerH + 48;
        var current = null;
        sectionIds.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          var top = el.getBoundingClientRect().top + window.scrollY;
          if (probe >= top) current = id;
        });
        hashLinks.forEach(function (a) {
          var h = a.getAttribute('href');
          var id = h && h.length > 1 ? h.slice(1) : '';
          a.classList.toggle('nav-link--active', id === current);
        });
      }
      window.addEventListener('scroll', updateNavActive, { passive: true });
      window.addEventListener('load', updateNavActive);
      updateNavActive();
    }
    navEl.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        var nav = document.querySelector('.nav');
        if (nav && nav.classList.contains('is-open')) nav.classList.remove('is-open');
      });
    });
    navEl.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        window.setTimeout(function () {
          var h = a.getAttribute('href');
          if (!h || h.length < 2) return;
          navEl.querySelectorAll('a.nav-link--active').forEach(function (x) {
            x.classList.remove('nav-link--active');
          });
          a.classList.add('nav-link--active');
        }, 320);
      });
    });
  }

  // Form: evitar envío real (demo); mostrar mensaje
  var form = document.querySelector('.lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Gracias. En un entorno real aquí se enviaría la solicitud. Añade tu backend o servicio de formularios.');
    });
  }
})();
