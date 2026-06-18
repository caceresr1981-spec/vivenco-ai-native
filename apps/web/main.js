(function () {
  'use strict';

  var THEME_KEY = 'vivenco-theme';

  function applyTheme(mode) {
    var isLight = mode === 'light';
    document.body.classList.toggle('theme-light', isLight);
    document.body.classList.toggle('theme-dark', !isLight);
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
    syncThemeBackgroundVideos(isLight ? 'light' : 'dark');
  }

  function syncThemeBackgroundVideos(mode) {
    var useDarkVideo = mode === 'dark';
    var targetSrc = useDarkVideo ? 'assets/videos/BG9.mkv' : 'assets/videos/BG3.mp4';
    var targetType = useDarkVideo ? 'video/x-matroska' : 'video/mp4';
    document.querySelectorAll('.hero-video, .page-compare-video').forEach(function (video) {
      var source = video.querySelector('source');
      if (!source) {
        source = document.createElement('source');
        video.appendChild(source);
      }
      if (source.getAttribute('src') === targetSrc && source.getAttribute('type') === targetType) return;
      source.setAttribute('src', targetSrc);
      source.setAttribute('type', targetType);
      try {
        video.load();
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (e) {}
    });
  }

  function initThemeToggle() {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (e) {}
    var mode = saved === 'light' ? 'light' : 'dark';
    applyTheme(mode);

    var headerInner = document.querySelector('.header .header-inner');
    if (!headerInner) return;
    var menuBtn = headerInner.querySelector('.menu-toggle');
    var wrap = document.createElement('div');
    wrap.className = 'theme-toggle-wrap';
    wrap.innerHTML =
      '<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Cambiar tema claro/oscuro" aria-pressed="' +
      String(mode === 'light') +
      '">' +
      '<span class="theme-toggle-track" aria-hidden="true"><span class="theme-toggle-thumb"></span></span>' +
      '<span class="theme-toggle-label">Contraste claro</span>' +
      '</button>';
    if (menuBtn && menuBtn.parentNode === headerInner) {
      headerInner.insertBefore(wrap, menuBtn);
    } else {
      headerInner.appendChild(wrap);
    }

    var btn = wrap.querySelector('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var isLight = document.body.classList.contains('theme-light');
      var next = isLight ? 'dark' : 'light';
      applyTheme(next);
      btn.setAttribute('aria-pressed', String(next === 'light'));
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  function tuneBackgroundVideos() {
    var prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (prefersReducedMotion) return;
    document.querySelectorAll('.hero-video, .page-compare-video').forEach(function (video) {
      try {
        video.defaultPlaybackRate = 1;
        video.playbackRate = 1;
      } catch (e) {}
    });
  }

  initThemeToggle();
  tuneBackgroundVideos();
  initLogoIntro();

  function initLogoIntro() {
    var INTRO_KEY = 'vivenco-logo-intro-seen';
    var introRoot = document.getElementById('logo-intro');
    var introStage = document.getElementById('logo-intro-stage');
    var introPlain = document.getElementById('logo-intro-plain');
    var introAccent = document.getElementById('logo-intro-accent');
    var headerLogo = document.querySelector('.header .logo');
    if (!introRoot || !introStage || !introPlain || !introAccent || !headerLogo) return;

    var prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (prefersReducedMotion) {
      introRoot.remove();
      return;
    }

    try {
      if (sessionStorage.getItem(INTRO_KEY) === '1') {
        introRoot.remove();
        return;
      }
    } catch (e) {}

    document.body.classList.add('logo-intro-pending');
    introRoot.classList.add('is-active');
    introRoot.setAttribute('aria-hidden', 'false');

    var charDelayMs = 72;
    var charIndex = 0;

    function appendChars(container, text, variant) {
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (ch === ' ') {
          container.appendChild(document.createTextNode(' '));
          continue;
        }
        var span = document.createElement('span');
        span.className = 'logo-intro-char logo-intro-char--' + variant;
        span.textContent = ch;
        span.style.animationDelay = charIndex * charDelayMs + 'ms';
        container.appendChild(span);
        charIndex += 1;
      }
    }

    appendChars(introPlain, 'VIVENCO', 'plain');
    introPlain.appendChild(document.createTextNode(' '));
    appendChars(introAccent, 'AI-Native', 'accent');

    window.requestAnimationFrame(function () {
      introStage.offsetHeight;
      var spellDurationMs = Math.max(1600, charIndex * charDelayMs + 520);
      window.setTimeout(function () {
        morphIntroLogoToHeader(introRoot, introStage, headerLogo, INTRO_KEY);
      }, spellDurationMs + 380);
    });
  }

  function morphIntroLogoToHeader(introRoot, introStage, headerLogo, storageKey) {
    var start = introStage.getBoundingClientRect();
    var end = headerLogo.getBoundingClientRect();
    if (!start.width || !end.width) {
      finishLogoIntro(introRoot, headerLogo, storageKey);
      return;
    }

    introRoot.classList.add('is-morphing');
    introStage.classList.add('is-morphing');

    var dx = end.left + end.width / 2 - (start.left + start.width / 2);
    var dy = end.top + end.height / 2 - (start.top + start.height / 2);
    var scale = end.width / start.width;

    introStage.style.position = 'fixed';
    introStage.style.left = start.left + 'px';
    introStage.style.top = start.top + 'px';
    introStage.style.margin = '0';
    introStage.style.transform = 'translate(0, 0) scale(1)';
    introStage.style.transformOrigin = 'center center';

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        introStage.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
      });
    });

    window.setTimeout(function () {
      finishLogoIntro(introRoot, headerLogo, storageKey);
    }, 1180);
  }

  function finishLogoIntro(introRoot, headerLogo, storageKey) {
    document.body.classList.remove('logo-intro-pending');
    headerLogo.style.opacity = '';
    introRoot.remove();
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('logo-intro-complete'));
    } catch (e2) {}
  }

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
    var carouselPrev = homeCarousel.querySelector('.home-carousel-prev');
    var carouselNext = homeCarousel.querySelector('.home-carousel-next');
    var carouselUnlocked = false;
    var maxSlide = 2;
    var slide2CtaRow = homeCarousel.querySelector('.ai-advantage-cta-row');
    var slide2CtaTimer = null;
    var slide3TopCta = homeCarousel.querySelector('.problems-top-cta');
    var slide3CtaTimer = null;
    var slideRevealDelayMs = 1500;
    var carouselTransitionMs = 950;
    var carouselTitleRevealMs = 320;
    var slideEntranceTimer = null;
    var slideTitleRevealTimer = null;
    var slide2HeadAlignTimer = null;
    var carouselBooting = true;

    function clearSlideEntranceTimers() {
      if (slideEntranceTimer) {
        window.clearTimeout(slideEntranceTimer);
        slideEntranceTimer = null;
      }
      if (slideTitleRevealTimer) {
        window.clearTimeout(slideTitleRevealTimer);
        slideTitleRevealTimer = null;
      }
    }

    function readCarouselLengthVar(name) {
      var raw = getComputedStyle(homeCarousel).getPropertyValue(name).trim();
      if (!raw) return 0;
      if (raw.endsWith('rem')) {
        return parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize);
      }
      if (raw.endsWith('px')) {
        return parseFloat(raw);
      }
      return parseFloat(raw) || 0;
    }

    function syncCarouselTitleRow() {
      if (!homeCarousel || carouselUnlocked) return;
      var slides = homeCarousel.querySelectorAll('.home-carousel-slide');
      if (slides.length < 3) return;

      var slide1 = slides[0];
      var slide3 = slides[2];
      var refTitle = slide3.querySelector('.section-title');
      var heroInner = slide1.querySelector('.hero-inner');
      var heroTitle = slide1.querySelector('.hero-title');
      if (!refTitle || !heroInner || !heroTitle) return;

      var slide3Top = slide3.getBoundingClientRect().top;
      var titleRowOffset = refTitle.getBoundingClientRect().top - slide3Top;
      var slide1Top = slide1.getBoundingClientRect().top;
      var heroTitleOffset = heroTitle.getBoundingClientRect().top - slide1Top;
      var heroExtraDown = readCarouselLengthVar('--carousel-hero-extra-down');
      var heroInnerShift = titleRowOffset - heroTitleOffset + heroExtraDown;

      homeCarousel.style.setProperty('--carousel-title-row-offset', titleRowOffset + 'px');
      homeCarousel.style.setProperty('--carousel-hero-inner-shift', heroInnerShift + 'px');
    }

    function scheduleCarouselTitleRow() {
      if (slide2HeadAlignTimer) window.clearTimeout(slide2HeadAlignTimer);
      slide2HeadAlignTimer = window.setTimeout(syncCarouselTitleRow, 50);
    }

    window.addEventListener('resize', scheduleCarouselTitleRow);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleCarouselTitleRow);
    }
    scheduleCarouselTitleRow();
    window.addEventListener('logo-intro-complete', function () {
      maybePlaySlideEntrance(getCarouselSlide(), false);
    });
    window.addEventListener('logo-intro-complete', scheduleCarouselTitleRow);

    function getCarouselHash(href) {
      if (!href) return '';
      var hashIndex = href.indexOf('#');
      if (hashIndex === -1) return '';
      return href.slice(hashIndex).split('?')[0];
    }

    function slideForCarouselHash(hash) {
      if (hash === '#porque-nosotros') return 1;
      if (hash === '#soluciones') return 2;
      return null;
    }

    function isIndexCarouselLink(anchor) {
      if (!anchor) return false;
      var href = anchor.getAttribute('href');
      if (!href) return false;
      if (href.charAt(0) === '#') return true;
      try {
        var url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        var path = url.pathname.replace(/\\/g, '/');
        return path === '/' || /\/index\.html$/i.test(path);
      } catch (e) {
        return /index\.html/i.test(href);
      }
    }

    function scrollCarouselIntoView() {
      window.scrollTo(0, 0);
      try {
        homeCarousel.scrollIntoView({ block: 'start' });
      } catch (e) {}
    }

    function goToCarouselSlide(slide) {
      relockHomeCarousel();
      applyCarouselSlide(slide);
      scrollCarouselIntoView();
    }

    function navigateToCarouselHash(hash) {
      var slide = slideForCarouselHash(hash);
      if (slide === null) return false;
      goToCarouselSlide(slide);
      return true;
    }

    function setNavActiveForSlide(slide) {
      if (!navEl) return;
      navEl.querySelectorAll('a.nav-link--active').forEach(function (x) {
        x.classList.remove('nav-link--active');
      });
      function activate(href) {
        var el = navEl.querySelector('a[href="' + href + '"]');
        if (el) el.classList.add('nav-link--active');
      }
      if (slide === 0) {
        return;
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

    function applyCarouselSlide(slide) {
      var prevSlide = getCarouselSlide();
      homeCarousel.setAttribute('data-slide', String(slide));
      syncCarouselNav();
      setNavActiveForSlide(slide);
      scheduleSlide2Cta(slide);
      scheduleSlide3Cta(slide);
      setCarouselBodyScroll(true);
      scheduleCarouselTitleRow();
      var afterTransition = !carouselBooting && prevSlide !== slide;
      maybePlaySlideEntrance(slide, afterTransition);
      carouselBooting = false;
    }

    function resetSlideEntrances() {
      resetHeroCopyEntrance();
      homeCarousel.querySelectorAll('.carousel-section--reveal, .carousel-section--title-reveal').forEach(function (section) {
        section.classList.remove('carousel-section--reveal');
        section.classList.remove('carousel-section--title-reveal');
      });
    }

    function triggerSectionTitleReveal(section) {
      section.classList.add('carousel-section--title-reveal');
    }

    function triggerSectionReveal(section) {
      section.classList.add('carousel-section--reveal');
    }

    function playSlideEntrance(slide, afterTransition) {
      if (document.body.classList.contains('logo-intro-pending')) return;

      var delay = afterTransition ? carouselTransitionMs : 0;

      if (slide === 0) {
        if (delay) {
          clearSlideEntranceTimers();
          slideEntranceTimer = window.setTimeout(function () {
            slideEntranceTimer = null;
            if (getCarouselSlide() !== 0) return;
            playHeroCopyEntrance();
          }, delay);
        } else {
          playHeroCopyEntrance();
        }
        return;
      }

      var sectionSelector = slide === 1 ? '.section.ai-advantage' : slide === 2 ? '.section.problems' : '';
      if (!sectionSelector) return;

      var section = homeCarousel.querySelector(sectionSelector);
      if (!section) return;

      section.classList.remove('carousel-section--reveal');
      section.classList.remove('carousel-section--title-reveal');

      if (delay) {
        clearSlideEntranceTimers();
        slideTitleRevealTimer = window.setTimeout(function () {
          slideTitleRevealTimer = null;
          if (getCarouselSlide() !== slide) return;
          triggerSectionTitleReveal(section);
        }, carouselTitleRevealMs);
        slideEntranceTimer = window.setTimeout(function () {
          slideEntranceTimer = null;
          if (getCarouselSlide() !== slide) return;
          triggerSectionReveal(section);
        }, delay);
      } else {
        triggerSectionReveal(section);
      }
    }

    function maybePlaySlideEntrance(slide, afterTransition) {
      clearSlideEntranceTimers();
      resetSlideEntrances();
      playSlideEntrance(slide, afterTransition);
    }

    function playHeroCopyEntrance() {
      var hero = homeCarousel.querySelector('.home-carousel-slide .hero');
      if (!hero) return;
      hero.classList.remove('hero--copy-animate');
      void hero.offsetWidth;
      hero.classList.add('hero--copy-animate');
    }

    function resetHeroCopyEntrance() {
      var hero = homeCarousel.querySelector('.home-carousel-slide .hero');
      if (hero) hero.classList.remove('hero--copy-animate');
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
        var a = e.target.closest && e.target.closest('a[href*="#"]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        if (href === '#diagnostico') return;

        var hash = getCarouselHash(href);
        if (slideForCarouselHash(hash) !== null && isIndexCarouselLink(a)) {
          e.preventDefault();
          if (hash !== window.location.hash) {
            try {
              history.pushState(null, '', hash);
            } catch (err) {
              window.location.hash = hash.slice(1);
            }
          }
          navigateToCarouselHash(hash);
          return;
        }

        if (carouselUnlocked) return;

        var id = hash.slice(1);
        if (!id) return;
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

    window.addEventListener('hashchange', function () {
      if (!homeCarousel) return;
      navigateToCarouselHash(window.location.hash || '');
    });

    var logoLink = document.querySelector('.header .logo');
    if (logoLink && isIndexCarouselLink(logoLink)) {
      logoLink.addEventListener('click', function (e) {
        if (!homeCarousel) return;
        e.preventDefault();
        try {
          history.pushState(null, '', window.location.pathname + window.location.search);
        } catch (err) {
          window.location.hash = '';
        }
        goToCarouselSlide(0);
      });
    }

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

    var hash = window.location.hash || '';
    var carouselSlide = slideForCarouselHash(hash);
    if (carouselSlide !== null) {
      goToCarouselSlide(carouselSlide);
    } else {
      applyCarouselSlide(0);
      if (hash && hash !== '#diagnostico') {
        var target = document.getElementById(hash.slice(1));
        if (target && !homeCarousel.contains(target)) {
          unlockHomeCarousel();
          window.setTimeout(function () {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
          }, 0);
        }
      }
    }
  }
})();
