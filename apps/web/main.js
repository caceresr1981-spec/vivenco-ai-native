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
        var carousel = document.getElementById('home-carousel');
        if (carousel && !carousel.classList.contains('home-carousel--unlocked')) return;
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
  }

  // Form: evitar envío real (demo); mostrar mensaje
  var form = document.querySelector('.lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Gracias. En un entorno real aquí se enviaría la solicitud. Añade tu backend o servicio de formularios.');
    });
  }

  // Transición de salida hacia abajo para links puntuales (ex: slide 2 -> comparison)
  document.querySelectorAll('.js-transition-down').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      document.body.classList.add('page-exit-down');
      window.setTimeout(function () {
        window.location.href = href;
      }, 460);
    });
  });

  // Carrusel de introducción (inicio): hero → AI-native → soluciones → sitio completo (adelante / atrás)
  var homeCarousel = document.getElementById('home-carousel');
  if (homeCarousel) {
    var carouselHint = homeCarousel.querySelector('.home-carousel-hint');
    var carouselPrev = homeCarousel.querySelector('.home-carousel-prev');
    var carouselNext = homeCarousel.querySelector('.home-carousel-next');
    var carouselUnlocked = false;
    var maxSlide = 2;
    var slide2CtaRow = homeCarousel.querySelector('.ai-advantage-cta-row');
    var slide2CtaTimer = null;
    var slide3TopCta = homeCarousel.querySelector('.problems-top-cta');
    var slide3CtaTimer = null;
    var slideRevealDelayMs = 1500;

    function setNavActiveForSlide(slide) {
      if (!navEl) return;
      navEl.querySelectorAll('a.nav-link--active').forEach(function (x) {
        x.classList.remove('nav-link--active');
      });
      function activate(href) {
        var el = navEl.querySelector('a[href="' + href + '"]');
        if (el) el.classList.add('nav-link--active');
      }
      if (slide === 1) {
        activate('#porque-nosotros');
      } else if (slide >= maxSlide) {
        activate('#soluciones');
      }
    }

    function scheduleSlide2Cta(slide) {
      if (!slide2CtaRow) return;
      if (slide2CtaTimer) {
        window.clearTimeout(slide2CtaTimer);
        slide2CtaTimer = null;
      }
      slide2CtaRow.classList.remove('ai-advantage-cta-row--visible');
      if (slide !== 1) return;
      slide2CtaTimer = window.setTimeout(function () {
        slide2CtaRow.classList.add('ai-advantage-cta-row--visible');
      }, slideRevealDelayMs);
    }

    function scheduleSlide3Cta(slide) {
      if (!slide3TopCta) return;
      if (slide3CtaTimer) {
        window.clearTimeout(slide3CtaTimer);
        slide3CtaTimer = null;
      }
      slide3TopCta.classList.remove('problems-top-cta--visible');
      if (slide < maxSlide) return;
      slide3CtaTimer = window.setTimeout(function () {
        slide3TopCta.classList.add('problems-top-cta--visible');
      }, slideRevealDelayMs);
    }

    function relockHomeCarousel() {
      if (!carouselUnlocked) return;
      carouselUnlocked = false;
      homeCarousel.classList.remove('home-carousel--unlocked');
      setCarouselBodyScroll(true);
    }

    function setCarouselBodyScroll(lock) {
      if (carouselUnlocked) return;
      document.documentElement.style.overflow = lock ? 'hidden' : '';
      document.body.style.overflow = lock ? 'hidden' : '';
    }

    function getCarouselSlide() {
      return parseInt(homeCarousel.getAttribute('data-slide') || '0', 10);
    }

    function syncCarouselNav() {
      if (carouselUnlocked || !carouselPrev || !carouselNext) return;
      var slide = getCarouselSlide();
      carouselPrev.disabled = slide <= 0;
      carouselNext.disabled = slide >= maxSlide;
      carouselNext.classList.toggle('is-hidden', slide >= maxSlide);
    }

    function updateCarouselHint(slide) {
      if (!carouselHint) return;
      if (slide >= maxSlide) {
        carouselHint.textContent = 'Clic o → para ver el resto del sitio · ← para volver';
      } else {
        carouselHint.textContent = 'Clic o → para avanzar · ← o botón para volver';
      }
    }

    function applyCarouselSlide(slide) {
      homeCarousel.setAttribute('data-slide', String(slide));
      updateCarouselHint(slide);
      syncCarouselNav();
      setNavActiveForSlide(slide);
      scheduleSlide2Cta(slide);
      scheduleSlide3Cta(slide);
      setCarouselBodyScroll(true);
    }

    function carouselGoForward() {
      if (carouselUnlocked) return;
      var slide = getCarouselSlide();
      if (slide < maxSlide) {
        applyCarouselSlide(slide + 1);
      }
    }

    function carouselGoBack() {
      if (carouselUnlocked) return;
      var slide = getCarouselSlide();
      if (slide > 0) applyCarouselSlide(slide - 1);
    }

    function unlockHomeCarousel() {
      if (carouselUnlocked) return;
      carouselUnlocked = true;
      homeCarousel.classList.add('home-carousel--unlocked');
      homeCarousel.removeAttribute('data-slide');
      if (slide2CtaTimer) window.clearTimeout(slide2CtaTimer);
      if (slide2CtaRow) slide2CtaRow.classList.remove('ai-advantage-cta-row--visible');
      if (slide3CtaTimer) window.clearTimeout(slide3CtaTimer);
      if (slide3TopCta) slide3TopCta.classList.remove('problems-top-cta--visible');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    function scrollToDemos() {
      var demos = document.getElementById('demos');
      if (demos) demos.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function isInteractiveCarouselTarget(el) {
      if (!el || !el.closest) return true;
      if (el.closest('.header')) return true;
      if (el.closest('.modal')) return true;
      if (el.closest('a, button, input, select, textarea, label')) return true;
      if (el.closest('[contenteditable="true"]')) return true;
      return false;
    }

    if (carouselPrev) carouselPrev.addEventListener('click', carouselGoBack);
    if (carouselNext) carouselNext.addEventListener('click', carouselGoForward);

    document.addEventListener(
      'click',
      function (e) {
        if (!homeCarousel) return;
        var a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        if (href === '#diagnostico') return;

        if (href === '#soluciones') {
          e.preventDefault();
          relockHomeCarousel();
          applyCarouselSlide(maxSlide);
          return;
        }
        if (href === '#porque-nosotros') {
          e.preventDefault();
          relockHomeCarousel();
          applyCarouselSlide(1);
          return;
        }
        if (carouselUnlocked) return;

        var id = href.slice(1);
        var el = document.getElementById(id);
        if (!el) return;
        if (homeCarousel.contains(el)) return;

        e.preventDefault();
        unlockHomeCarousel();
        window.setTimeout(function () {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      },
      true
    );

    document.addEventListener(
      'click',
      function (e) {
        if (carouselUnlocked) return;
        if (!homeCarousel.contains(e.target)) return;
        if (isInteractiveCarouselTarget(e.target)) return;
        carouselGoForward();
      },
      false
    );

    document.addEventListener('keydown', function (e) {
      if (carouselUnlocked) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT'))
        return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        carouselGoBack();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        carouselGoForward();
      }
    });

    var initialSlide = 0;
    if (window.location.hash === '#porque-nosotros') {
      initialSlide = 1;
    } else if (window.location.hash === '#soluciones') {
      initialSlide = maxSlide;
    }
    applyCarouselSlide(initialSlide);
  }
})();
