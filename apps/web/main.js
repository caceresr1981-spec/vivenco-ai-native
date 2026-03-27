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
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      var nav = document.querySelector('.nav');
      if (nav) nav.classList.toggle('is-open');
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
