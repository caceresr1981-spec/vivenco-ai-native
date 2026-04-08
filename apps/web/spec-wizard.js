(function () {
  'use strict';

  var STACK = 'Cursor (IDE + agentes) · Docker (contenedores locales/CI) · Railway (API + Postgres) · Vercel (web estática/Next.js)';

  var MATURITY_PROFILES = {
    mvp: {
      key: 'mvp',
      label: 'MVP - producto mínimo viable',
      shortLabel: 'MVP',
      delta: { discovery: -4, backend: -4, frontend: -4, devops: -6, integrations: -4, qa: -10 }
    },
    production: {
      key: 'production',
      label: 'SLPP (Sistema listo para producción)',
      shortLabel: 'SLPP / producción',
      delta: { discovery: 12, backend: 20, frontend: 14, devops: 28, integrations: 12, qa: 36 }
    }
  };

  var MATURITY_QUESTION_TEXT = '¿Buscás un MVP o un sistema listo para producción?';

  var PHASE_KEYS = ['discovery', 'backend', 'frontend', 'devops', 'integrations', 'qa'];
  var PHASE_LABELS = {
    discovery: 'Discovery y modelado',
    backend: 'API + datos (Railway / Postgres)',
    frontend: 'Interfaz web (Vercel)',
    devops: 'Docker, entornos y despliegue',
    integrations: 'Integraciones y APIs externas',
    qa: 'Pruebas, hardening y documentación'
  };

  var PRODUCTS = [
    {
      id: 'erp-light',
      name: 'ERP / inventario y compras (ligero)',
      blurb: 'Stock, órdenes de compra, catálogo y reportes operativos.',
      baseHours: { discovery: 18, backend: 44, frontend: 52, devops: 14, integrations: 22, qa: 26 }
    },
    {
      id: 'crm-sales',
      name: 'CRM y pipeline comercial',
      blurb: 'Contactos, oportunidades, secuencias y tablero de ventas.',
      baseHours: { discovery: 14, backend: 36, frontend: 48, devops: 12, integrations: 28, qa: 22 }
    },
    {
      id: 'wms-oms',
      name: 'WMS / OMS logístico',
      blurb: 'Movimientos de almacén, pedidos multicanal y trazabilidad.',
      baseHours: { discovery: 22, backend: 52, frontend: 44, devops: 16, integrations: 32, qa: 28 }
    },
    {
      id: 'bpm-auto',
      name: 'BPM y automatización de procesos',
      blurb: 'Flujos de aprobación, tareas y notificaciones.',
      baseHours: { discovery: 20, backend: 40, frontend: 40, devops: 12, integrations: 36, qa: 24 }
    },
    {
      id: 'bi-dashboard',
      name: 'BI y dashboards',
      blurb: 'KPIs, agregaciones y visualización sobre tus fuentes de datos.',
      baseHours: { discovery: 16, backend: 38, frontend: 56, devops: 10, integrations: 30, qa: 22 }
    },
    {
      id: 'api-integration',
      name: 'APIs e integraciones',
      blurb: 'Servicios REST, webhooks, ETL liviano y conectores.',
      baseHours: { discovery: 12, backend: 48, frontend: 24, devops: 14, integrations: 52, qa: 22 }
    },
    {
      id: 'custom',
      name: 'Personalizado',
      blurb: 'Indicále a nuestro asistente qué estás buscando',
      baseHours: { discovery: 20, backend: 40, frontend: 40, devops: 14, integrations: 30, qa: 24 }
    }
  ];

  function clonePhases(h) {
    var o = {};
    PHASE_KEYS.forEach(function (k) {
      o[k] = h[k] || 0;
    });
    return o;
  }

  function addDelta(phases, delta) {
    PHASE_KEYS.forEach(function (k) {
      if (delta[k]) phases[k] += delta[k];
    });
  }

  function invertDelta(delta) {
    var inv = {};
    PHASE_KEYS.forEach(function (k) {
      if (delta[k]) inv[k] = -delta[k];
    });
    return inv;
  }

  function totalWizardSteps(productId) {
    var pid = productId || state.productId;
    if (!pid) return 0;
    var nQ = allQuestionsForProduct(pid).length;
    var storyExtra = pid === 'custom' ? 1 : 0;
    return storyExtra + 1 + nQ;
  }

  function commonQuestions() {
    return [
      {
        id: 'org_size',
        text: '¿Qué tamaño tiene el equipo que usará el sistema en el día a día?',
        options: [
          { label: 'Menos de 10 usuarios', delta: { discovery: -2, qa: -4 } },
          { label: '10 a 50 usuarios', delta: {} },
          { label: '50 a 200 usuarios', delta: { backend: 8, frontend: 6, qa: 8 } },
          { label: 'Más de 200 usuarios', delta: { backend: 16, frontend: 10, devops: 8, qa: 14 } }
        ]
      },
      {
        id: 'data_sensitivity',
        text: '¿Qué nivel de sensibilidad tienen los datos?',
        options: [
          { label: 'Uso interno, sin datos personales críticos', delta: { qa: -2 } },
          { label: 'Datos personales o financieros (requiere controles)', delta: { discovery: 6, backend: 6, qa: 10 } },
          { label: 'Regulado (ej. sector salud, auditoría estricta)', delta: { discovery: 12, backend: 10, qa: 16, devops: 6 } }
        ]
      },
      {
        id: 'integrations_count',
        text: '¿Cuántos sistemas externos hay que integrar en la primera entrega?',
        options: [
          { label: 'Ninguno o uno (ej. solo email)', delta: { integrations: -8 } },
          { label: '2 a 4 sistemas (ERP, pasarela, etc.)', delta: {} },
          { label: '5 o más / APIs poco documentadas', delta: { integrations: 18, discovery: 6 } }
        ]
      },
      {
        id: 'auth_model',
        text: '¿Cómo deben autenticarse los usuarios?',
        options: [
          { label: 'Usuario y contraseña propios (MVP)', delta: {} },
          { label: 'SSO corporativo (Azure AD, Google Workspace, etc.)', delta: { backend: 10, integrations: 8, qa: 4 } },
          { label: 'Aún no definido / evaluar en discovery', delta: { discovery: 4 } }
        ]
      }
    ];
  }

  function productExtraQuestions(productId) {
    var map = {
      'erp-light': [
        {
          id: 'erp_scope',
          text: '¿Qué alcance tiene el módulo de inventario/compras en la primera versión?',
          options: [
            { label: 'Un almacén, catálogo simple y OC básicas', delta: { backend: -6, frontend: -6 } },
            { label: 'Multialmacén, lotes o vencimientos', delta: { backend: 12, frontend: 10 } },
            { label: 'Multimoneda, aprobaciones y reglas de negocio complejas', delta: { backend: 20, frontend: 14, discovery: 6 } }
          ]
        },
        {
          id: 'erp_reporting',
          text: '¿Qué necesidad de reportes y exportación hay?',
          options: [
            { label: 'Listados en pantalla y exportar CSV', delta: {} },
            { label: 'Dashboards y filtros avanzados', delta: { frontend: 12, backend: 8 } },
            { label: 'Reportes programados, PDF y envío automático', delta: { backend: 14, frontend: 6, integrations: 6 } }
          ]
        }
      ],
      'crm-sales': [
        {
          id: 'crm_channels',
          text: '¿Qué canales debe cubrir el pipeline?',
          options: [
            { label: 'Solo seguimiento manual de oportunidades', delta: {} },
            { label: 'Email y tareas automatizadas', delta: { integrations: 10, backend: 6 } },
            { label: 'Multicanal (email, WhatsApp API, llamadas log)', delta: { integrations: 22, backend: 10 } }
          ]
        },
        {
          id: 'crm_mobility',
          text: '¿Los vendedores necesitan uso móvil?',
          options: [
            { label: 'Web responsive es suficiente', delta: {} },
            { label: 'PWA o app móvil prioritaria', delta: { frontend: 18, qa: 6 } }
          ]
        }
      ],
      'wms-oms': [
        {
          id: 'wms_channels',
          text: '¿Desde dónde ingresan los pedidos?',
          options: [
            { label: 'Solo carga manual o Excel', delta: {} },
            { label: 'Integración con 1–2 marketplaces o tiendas', delta: { integrations: 14 } },
            { label: 'Varios canales + reglas de asignación de stock', delta: { integrations: 24, backend: 12 } }
          ]
        },
        {
          id: 'wms_scan',
          text: '¿Se requiere lectura de códigos de barras / picking?',
          options: [
            { label: 'No en el MVP', delta: {} },
            { label: 'Sí, flujo de picking básico', delta: { frontend: 12, backend: 6 } },
            { label: 'Sí, con validaciones y trazabilidad completa', delta: { frontend: 18, backend: 14, qa: 6 } }
          ]
        }
      ],
      'bpm-auto': [
        {
          id: 'bpm_complexity',
          text: '¿Cómo son los flujos de aprobación?',
          options: [
            { label: 'Secuencia simple (1–2 niveles)', delta: {} },
            { label: 'Ramas, delegación y SLAs', delta: { backend: 12, frontend: 10 } },
            { label: 'Múltiples procesos con formularios dinámicos', delta: { backend: 18, frontend: 16, discovery: 6 } }
          ]
        },
        {
          id: 'bpm_notify',
          text: '¿Qué canales de notificación?',
          options: [
            { label: 'Solo en la aplicación', delta: {} },
            { label: 'Email y en app', delta: { integrations: 6 } },
            { label: 'Email, Slack/Teams y webhooks', delta: { integrations: 14 } }
          ]
        }
      ],
      'bi-dashboard': [
        {
          id: 'bi_sources',
          text: '¿De dónde salen los datos?',
          options: [
            { label: 'Una base propia (ya modelada)', delta: {} },
            { label: 'Varias tablas / necesidad de ETL liviano', delta: { backend: 14, integrations: 10 } },
            { label: 'Fuentes externas + refresco programado', delta: { backend: 20, integrations: 16 } }
          ]
        },
        {
          id: 'bi_users',
          text: '¿Quién construye o modifica vistas?',
          options: [
            { label: 'Solo el equipo técnico', delta: { frontend: -6 } },
            { label: 'Usuarios de negocio con filtros guardados', delta: { frontend: 10, backend: 6 } }
          ]
        }
      ],
      'api-integration': [
        {
          id: 'api_pattern',
          text: '¿Qué patrón de integración predomina?',
          options: [
            { label: 'API REST consumida de forma puntual', delta: {} },
            { label: 'Sincronización batch (cron, colas)', delta: { backend: 12, devops: 6 } },
            { label: 'Tiempo real (webhooks + idempotencia + reintentos)', delta: { backend: 18, integrations: 12, qa: 8 } }
          ]
        },
        {
          id: 'api_docs',
          text: '¿Estado de la documentación de APIs externas?',
          options: [
            { label: 'OpenAPI / Postman claro', delta: {} },
            { label: 'Parcial, requiere pruebas exploratorias', delta: { discovery: 8, integrations: 10 } },
            { label: 'Muy pobre o inexistente', delta: { discovery: 14, integrations: 18, qa: 6 } }
          ]
        }
      ]
    };
    return map[productId] || [];
  }

  var state = {
    step: 'pick',
    productId: null,
    maturityChoice: null,
    qIndex: 0,
    answers: [],
    phases: null,
    customStory: null,
    customSolutionName: null
  };

  function getProductDisplayName(product) {
    if (!product) return '';
    if (product.id === 'custom') {
      var n = state.customSolutionName && String(state.customSolutionName).trim();
      return n || 'Personalizado';
    }
    return product.name;
  }

  function getMaturityTierShortLabel() {
    if (state.maturityChoice === 'mvp') return 'MVP';
    if (state.maturityChoice === 'production') return 'SLPP';
    return '';
  }

  /** Nombre de solución + " / MVP|SLPP" una vez elegido el nivel de entrega */
  function getProductLineWithTier(product) {
    var name = getProductDisplayName(product);
    var tier = getMaturityTierShortLabel();
    return tier ? name + ' / ' + tier : name;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function totalHours(phases) {
    var t = 0;
    PHASE_KEYS.forEach(function (k) {
      t += phases[k];
    });
    return Math.max(40, Math.round(t));
  }

  function demoHours(total) {
    return Math.max(24, Math.round(total * 0.34));
  }

  function weeksAt(hours, hPerWeek) {
    return Math.ceil(hours / hPerWeek);
  }

  /** Días de esfuerzo orientativos (8 h hábiles por día). */
  var HOURS_PER_WORKDAY = 8;

  function workDaysFromHours(hours) {
    var h = Number(hours);
    if (!h || h <= 0) return 0;
    return Math.ceil(h / HOURS_PER_WORKDAY);
  }

  function fmtHoursDays(h) {
    var d = workDaysFromHours(h);
    if (d <= 0) return h + ' h';
    return h + ' h (~' + d + ' días)';
  }

  function distributeDemo(phases, demoTotal, mvpTotal) {
    var ratio = demoTotal / mvpTotal;
    var raw = PHASE_KEYS.map(function (k) {
      return { k: k, v: phases[k] * ratio };
    });
    var floored = raw.map(function (x) {
      return { k: x.k, v: Math.floor(x.v) };
    });
    var sum = floored.reduce(function (a, x) {
      return a + x.v;
    }, 0);
    var remainder = demoTotal - sum;
    var i = 0;
    while (remainder > 0 && i < 100) {
      var idx = i % floored.length;
      floored[idx].v += 1;
      remainder -= 1;
      i += 1;
    }
    var out = {};
    floored.forEach(function (x) {
      out[x.k] = Math.max(0, x.v);
    });
    return out;
  }

  function getMaturityAnswer(answers) {
    for (var i = 0; i < answers.length; i++) {
      if (answers[i].qId === 'delivery_maturity') return answers[i];
    }
    return null;
  }

  function buildSpec(product, answers) {
    var mat = getMaturityAnswer(answers);
    var lines = [];
    lines.push('## Producto seleccionado');
    lines.push('- **Nombre:** ' + getProductLineWithTier(product));
    lines.push('- **Descripción:** ' + product.blurb);
    if (product.id === 'custom' && state.customStory) {
      lines.push('');
      lines.push('## Historia de usuario (solución personalizada)');
      lines.push('- **Como (usuario o sistema):** ' + state.customStory.como);
      lines.push('- **Quiero que (funcionalidad):** ' + state.customStory.quiero);
      lines.push('- **Para que (beneficio):** ' + state.customStory.para);
      lines.push('- **Criterios de aceptación — Dado que:** ' + state.customStory.dado);
      lines.push('- **Cuando:** ' + state.customStory.cuando);
      lines.push('- **Entonces:** ' + state.customStory.entonces);
    }
    lines.push('');
    lines.push('## Nivel de entrega');
    if (mat) {
      lines.push('- **Decisión:** ' + mat.choiceLabel);
      lines.push(
        '- **Implicancias:** la estimación de horas y el alcance del prompt se calibraron según esta elección (alcance funcional, rigor de QA, DevOps y hardening).'
      );
      if (mat.maturityKey === 'mvp') {
        lines.push(
          '- **MVP:** validación temprana, menos casos borde y operación mínima → **menor tiempo y costo** que un despliegue production-ready equivalente.'
        );
      } else if (mat.maturityKey === 'production') {
        lines.push(
          '- **Production-ready:** mayor superficie de calidad, seguridad y operación → **más tiempo y costo**, menor riesgo en escala y compliance.'
        );
      }
    } else {
      lines.push('- (No especificado en el wizard.)');
    }
    lines.push('');
    lines.push('## Stack de implementación');
    lines.push('- ' + STACK);
    lines.push('');
    lines.push('## Respuestas del cuestionario (multiple choice)');
    answers.forEach(function (a) {
      lines.push('- **' + a.qText + '** → ' + a.choiceLabel);
    });
    lines.push('');
    lines.push('## Directrices para el desarrollo');
    lines.push('- Monorepo o repo separados: API (Node) desplegada en **Railway** con **PostgreSQL**; frontend en **Vercel**; contenedores con **Docker** para paridad local/CI.');
    lines.push('- Priorizar contratos API (OpenAPI o Zod) y migraciones versionadas.');
    lines.push('- Autenticación y permisos alineados a las respuestas de sensibilidad de datos y modelo de auth.');
    lines.push('- Integraciones: reintentos, idempotencia y logs estructurados cuando aplique.');
    lines.push('');
    lines.push('## Entregables esperados');
    if (mat && mat.maturityKey === 'mvp') {
      lines.push('- **Enfoque MVP:** demo y primera versión acotadas a validar hipótesis; menos casos borde y operación mínima; puede planificarse una fase posterior de endurecimiento.');
    } else if (mat && mat.maturityKey === 'production') {
      lines.push(
        '- **Enfoque production-ready:** flujos principales robustos, pruebas y hardening ampliados, observabilidad, copias de seguridad, manejo de errores y documentación operativa alineada a uso real.'
      );
    } else {
      lines.push('- Demo funcional acotada al alcance acordado.');
      lines.push('- MVP con flujos principales, pruebas básicas y documentación de despliegue.');
    }
    return lines.join('\n');
  }

  function buildCursorPrompt(product, specMarkdown, phases, mvpTotal, demoTotal, maturityShort) {
    var maturityLine =
      maturityShort === 'mvp'
        ? '**Nivel de entrega:** MVP — priorizar tiempo de validación sobre perfección operativa; documentar deuda técnica explícita y próximos hardening.'
        : maturityShort === 'production'
          ? '**Nivel de entrega:** Production-ready — incluir observabilidad, resiliencia, seguridad y pruebas acordes a uso en producción con carga real.'
          : '**Nivel de entrega:** (definir con el cliente si no consta).';
    return [
      'Eres un arquitecto de software senior. A partir de la siguiente especificación generada con un wizard cliente, elabora un plan de implementación concreto para Cursor.',
      '',
      maturityLine,
      '',
      '### Contexto de stack',
      STACK,
      '',
      '### Especificación (pegar tal cual y refinar si hace falta)',
      specMarkdown,
      '',
      '### Estimación interna del wizard (horas)',
      '- **MVP total aproximado:** ' + fmtHoursDays(mvpTotal),
      '- **Demo aproximada:** ' + fmtHoursDays(demoTotal) + ' (~34% del MVP como referencia)',
      '- *Días orientativos:* ~' + HOURS_PER_WORKDAY + ' h hábiles por día de esfuerzo.',
      '',
      '### Fases (horas MVP)',
      PHASE_KEYS.map(function (k) {
        return '- ' + PHASE_LABELS[k] + ': ' + fmtHoursDays(phases[k]);
      }).join('\n'),
      '',
      '### Instrucciones',
      '1. Propón estructura de carpetas y tecnologías concretas (framework web, ORM, auth).',
      '2. Lista épicas e historias de usuario priorizadas para la demo y luego el MVP.',
      '3. Señala riesgos (integraciones, datos, compliance) y mitigaciones.',
      '4. Devuelve un checklist de tareas ordenado para pegar en el agente de Cursor.'
    ].join('\n');
  }

  function resetToPick() {
    state.step = 'pick';
    state.productId = null;
    state.maturityChoice = null;
    state.qIndex = 0;
    state.answers = [];
    state.phases = null;
    state.customStory = null;
    state.customSolutionName = null;
    el('spec-wizard-progress').hidden = true;
    el('spec-wizard-progress').setAttribute('aria-hidden', 'true');
    el('spec-wizard-reset-pick').hidden = true;
    renderPick();
  }

  function renderPick() {
    el('spec-wizard-stage').innerHTML =
      '<p class="spec-wizard-lead">Elegí el tipo de solución. Nuestro asistente te hará preguntas de negocio y operación (opción múltiple) para definir las especificaciones técnicas con la proyección de tiempos para tu demo y el producto final.</p>' +
      '<div class="spec-product-grid">' +
      PRODUCTS.map(function (p) {
        return (
          '<button type="button" class="spec-product-card" data-product-id="' +
          esc(p.id) +
          '">' +
          '<span class="spec-product-name"><span class="spec-product-name-highlight">' +
          esc(p.name) +
          '</span></span>' +
          '<span class="spec-product-blurb">' +
          esc(p.blurb) +
          '</span>' +
          '</button>'
        );
      }).join('') +
      '</div>';
    el('spec-wizard-stage').querySelectorAll('.spec-product-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startFlow(btn.getAttribute('data-product-id'));
      });
    });
    el('spec-wizard-progress').hidden = true;
    el('spec-wizard-progress').setAttribute('aria-hidden', 'true');
    el('spec-wizard-reset-pick').hidden = true;
  }

  function allQuestionsForProduct(productId) {
    return commonQuestions().concat(productExtraQuestions(productId));
  }

  function startFlow(productId) {
    var product = PRODUCTS.filter(function (p) {
      return p.id === productId;
    })[0];
    if (!product) return;
    state.productId = productId;
    state.maturityChoice = null;
    state.qIndex = 0;
    state.answers = [];
    state.phases = clonePhases(product.baseHours);
    if (productId === 'custom') {
      state.customStory = null;
      state.customSolutionName = null;
      state.step = 'custom_story';
    } else {
      state.customStory = null;
      state.customSolutionName = null;
      state.step = 'maturity';
    }
    el('spec-wizard-reset-pick').hidden = false;
    el('spec-wizard-progress').hidden = false;
    el('spec-wizard-progress').setAttribute('aria-hidden', 'false');
    el('spec-wizard-step-back').hidden = false;
    if (productId === 'custom') {
      renderCustomStory();
    } else {
      renderMaturity();
    }
  }

  function goBackStep() {
    if (state.step === 'pick' || state.step === 'done') return;
    if (state.step === 'questions') {
      if (state.qIndex > 0) {
        state.qIndex -= 1;
        var popped = state.answers.pop();
        if (popped && popped.delta) addDelta(state.phases, invertDelta(popped.delta));
        renderQuestion();
        return;
      }
      var matPop = state.answers.pop();
      if (matPop && matPop.delta) addDelta(state.phases, invertDelta(matPop.delta));
      state.maturityChoice = null;
      state.step = 'maturity';
      renderMaturity();
      return;
    }
    if (state.step === 'maturity') {
      var last = state.answers[state.answers.length - 1];
      if (last && last.qId === 'delivery_maturity') {
        state.answers.pop();
        addDelta(state.phases, invertDelta(last.delta));
        state.maturityChoice = null;
      }
      if (state.productId === 'custom') {
        state.step = 'custom_story';
        renderCustomStory();
      } else {
        resetToPick();
      }
      return;
    }
    if (state.step === 'custom_story') {
      resetToPick();
    }
  }

  function renderCustomStory() {
    var product = PRODUCTS.filter(function (p) {
      return p.id === 'custom';
    })[0];
    if (!product) return;
    var totalSteps = totalWizardSteps('custom');
    var cs = state.customStory || {};
    el('spec-wizard-progress-bar').style.width = Math.round((0.5 / totalSteps) * 100) + '%';
    el('spec-wizard-progress-text').textContent = 'Historia de usuario — paso 1 de ' + totalSteps;

    var defaultName =
      state.customSolutionName && String(state.customSolutionName).trim()
        ? state.customSolutionName.trim()
        : 'Personalizado';

    el('spec-wizard-stage').innerHTML =
      '<div class="spec-custom-story-header">' +
      '<h2 class="spec-question-title spec-custom-story-title">Describí tu necesidad en formato historia de usuario</h2>' +
      '<button type="button" class="spec-custom-help spec-custom-help--title" id="spec-us-help" aria-label="Ver ejemplo de historia de usuario">' +
      '<span aria-hidden="true">?</span>' +
      '</button>' +
      '</div>' +
      '<div class="spec-maturity-product spec-maturity-product--editable">' +
      '<label class="spec-custom-solution-label" for="spec-custom-solution-name">Nombre de tu solución</label>' +
      '<input type="text" class="spec-custom-solution-name" id="spec-custom-solution-name" maxlength="120" value="' +
      esc(defaultName) +
      '" placeholder="Ej.: Gestión de stock y órdenes" />' +
      '</div>' +
      '<p class="spec-custom-lead">Completá los campos. Luego vas a poder elegir <strong>MVP</strong> o <strong>SLPP</strong> para calibrar tiempos y alcance.</p>' +
      '<div class="spec-custom-form">' +
      '<label class="spec-custom-label" for="spec-us-como">Como (usuario / sistema)</label>' +
      '<textarea class="spec-custom-input" id="spec-us-como" rows="2" required placeholder="Ej.: responsable de depósito">' +
      esc(cs.como || '') +
      '</textarea>' +
      '<label class="spec-custom-label" for="spec-us-quiero">Quiero que (funcionalidad)</label>' +
      '<textarea class="spec-custom-input" id="spec-us-quiero" rows="2" required placeholder="Ej.: registrar ingresos y egresos con motivo">' +
      esc(cs.quiero || '') +
      '</textarea>' +
      '<label class="spec-custom-label" for="spec-us-para">Para que (beneficio)</label>' +
      '<textarea class="spec-custom-input" id="spec-us-para" rows="2" required placeholder="Ej.: tener trazabilidad y evitar faltantes">' +
      esc(cs.para || '') +
      '</textarea>' +
      '<div class="spec-custom-ca-head">' +
      '<span class="spec-custom-label">Criterios de aceptación</span>' +
      '</div>' +
      '<p class="spec-custom-hint">Usá el estilo <strong>Dado / Cuando / Entonces</strong> para que el equipo pueda probar el resultado.</p>' +
      '<label class="spec-custom-label" for="spec-us-dado">Dado que (contexto previo)</label>' +
      '<textarea class="spec-custom-input" id="spec-us-dado" rows="2" placeholder="Ej.: existen ítems en stock">' +
      esc(cs.dado || '') +
      '</textarea>' +
      '<label class="spec-custom-label" for="spec-us-cuando">Cuando (acción)</label>' +
      '<textarea class="spec-custom-input" id="spec-us-cuando" rows="2" placeholder="Ej.: confirmo un egreso">' +
      esc(cs.cuando || '') +
      '</textarea>' +
      '<label class="spec-custom-label" for="spec-us-entonces">Entonces (resultado esperado)</label>' +
      '<textarea class="spec-custom-input" id="spec-us-entonces" rows="2" placeholder="Ej.: se actualiza el stock y queda asiento en el log">' +
      esc(cs.entonces || '') +
      '</textarea>' +
      '</div>' +
      '<div class="spec-wizard-actions">' +
      '<button type="button" class="btn btn-primary" id="spec-us-continue">Continuar: elegir MVP o SLPP</button>' +
      '</div>';

    el('spec-us-continue').addEventListener('click', function () {
      var solInput = el('spec-custom-solution-name');
      var solName = solInput ? solInput.value.trim() : '';
      state.customSolutionName = solName || 'Personalizado';
      var como = el('spec-us-como').value.trim();
      var quiero = el('spec-us-quiero').value.trim();
      var para = el('spec-us-para').value.trim();
      if (!como || !quiero || !para) {
        alert('Completá al menos Como, Quiero que y Para que.');
        return;
      }
      state.customStory = {
        como: como,
        quiero: quiero,
        para: para,
        dado: el('spec-us-dado').value.trim(),
        cuando: el('spec-us-cuando').value.trim(),
        entonces: el('spec-us-entonces').value.trim()
      };
      state.step = 'maturity';
      renderMaturity();
    });
    el('spec-us-help').addEventListener('click', function () {
      el('spec-us-modal').hidden = false;
      document.body.style.overflow = 'hidden';
    });
  }

  function renderMaturity() {
    var product = PRODUCTS.filter(function (p) {
      return p.id === state.productId;
    })[0];
    if (!product) return;
    var totalSteps = totalWizardSteps(state.productId);
    var maturityStepNum = state.productId === 'custom' ? 2 : 1;
    el('spec-wizard-progress-bar').style.width =
      Math.round(((maturityStepNum - 0.5) / totalSteps) * 100) + '%';
    el('spec-wizard-progress-text').textContent =
      'Nivel de entrega — paso ' + maturityStepNum + ' de ' + totalSteps;

    el('spec-wizard-stage').innerHTML =
      '<h2 class="spec-question-title">' +
      esc(MATURITY_QUESTION_TEXT) +
      '</h2>' +
      '<p class="spec-maturity-product"><strong>' +
      esc(getProductDisplayName(product)) +
      '</strong></p>' +
      '<div class="spec-maturity-explainer" role="region" aria-label="Qué significa MVP y production-ready">' +
      '<div class="spec-maturity-col">' +
      '<h3 class="spec-maturity-subtitle">' +
      '<button type="button" class="spec-maturity-title-chip spec-maturity-title-chip--mvp" data-maturity="mvp" aria-label="Elegir MVP - producto mínimo viable">' +
      'MVP - producto mínimo viable' +
      '</button></h3>' +
      '<p>Es la forma más rápida y eficiente de llevar tu idea a la realidad.</p>' +
      '<p>Creamos una primera versión del producto con lo esencial para que funcione y pueda ser utilizada por usuarios reales. Esto permite validar si la idea tiene potencial, recoger feedback y ajustar el rumbo antes de hacer una inversión mayor.</p>' +
      '<p>Incluye lo necesario para operar desde el inicio, sin complejidad innecesaria.</p>' +
      '<h4 class="spec-maturity-subheading spec-maturity-subheading--steel">Alcance, tiempos e inversión</h4>' +
      '<p>Al tratarse de una versión enfocada y simplificada:</p>' +
      '<ul class="spec-maturity-list">' +
      '<li>El alcance es acotado, priorizando las funcionalidades clave</li>' +
      '<li>Los tiempos de desarrollo son más cortos</li>' +
      '<li>La inversión inicial es menor</li>' +
      '</ul>' +
      '<p class="spec-maturity-highlight"><strong>Y lo más importante:</strong> reduce el riesgo, ya que permite validar la idea antes de escalar y hacer una inversión mayor.</p>' +
      '</div>' +
      '<div class="spec-maturity-col">' +
      '<h3 class="spec-maturity-subtitle">' +
      '<button type="button" class="spec-maturity-title-chip spec-maturity-title-chip--slpp" data-maturity="production" aria-label="Elegir SLPP - sistema listo para producción">' +
      'SLPP · Sistema listo para producción' +
      '</button></h3>' +
      '<p>Es una solución pensada para acompañar el funcionamiento real de tu negocio, desde el primer día y a medida que crece.</p>' +
      '<p>Está diseñada para operar de forma continua, con estabilidad, seguridad y capacidad de respuesta ante situaciones reales, asegurando que todo funcione de manera confiable incluso con mayor volumen de usuarios y operaciones.</p>' +
      '<p>Incluye todo lo necesario para trabajar con tranquilidad: control de accesos, manejo de errores, visibilidad del sistema y una base sólida que facilita su mantenimiento y evolución.</p>' +
      '<h4 class="spec-maturity-subheading spec-maturity-subheading--steel">Alcance, tiempos e inversión</h4>' +
      '<p>Al tratarse de una solución más completa y robusta:</p>' +
      '<ul class="spec-maturity-list">' +
      '<li>El alcance es más amplio, contemplando no solo lo funcional sino también la estabilidad y operación en el tiempo</li>' +
      '<li>Los tiempos de desarrollo son mayores, ya que se cuidan más detalles y escenarios</li>' +
      '<li>La inversión inicial es más alta, pero con un retorno en menor riesgo y mayor confiabilidad</li>' +
      '</ul>' +
      '<p class="spec-maturity-highlight"><strong>Y lo más importante:</strong> te permite escalar con seguridad, cumplir con exigencias más altas y evitar problemas a medida que el negocio crece.</p>' +
      '</div>' +
      '</div>' +
      '<p class="spec-maturity-hint">Hacé clic en <strong>MVP</strong> o <strong>SLPP</strong> arriba para elegir. La estimación de horas del resumen final <strong>se ajusta</strong> según la opción.</p>';

    el('spec-wizard-stage').querySelectorAll('[data-maturity]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-maturity');
        var profile = MATURITY_PROFILES[key];
        if (!profile) return;
        state.maturityChoice = profile.key;
        state.answers.push({
          qId: 'delivery_maturity',
          maturityKey: profile.key,
          qText: MATURITY_QUESTION_TEXT,
          choiceLabel: profile.label,
          delta: profile.delta
        });
        addDelta(state.phases, profile.delta);
        state.step = 'questions';
        renderQuestion();
      });
    });
  }

  function renderQuestion() {
    var product = PRODUCTS.filter(function (p) {
      return p.id === state.productId;
    })[0];
    var qs = allQuestionsForProduct(state.productId);
    var total = qs.length;
    if (state.qIndex >= total) {
      finishFlow(product, qs);
      return;
    }
    var q = qs[state.qIndex];
    var totalSteps = totalWizardSteps(state.productId);
    var baseStep = state.productId === 'custom' ? 3 : 2;
    var stepNum = baseStep + state.qIndex;
    var pct = Math.round(((stepNum - 0.5) / totalSteps) * 100);
    el('spec-wizard-progress-bar').style.width = pct + '%';
    el('spec-wizard-progress-text').textContent =
      'Pregunta ' +
      (state.qIndex + 1) +
      ' de ' +
      total +
      ' (paso ' +
      stepNum +
      ' de ' +
      totalSteps +
      ')';

    el('spec-wizard-stage').innerHTML =
      '<h2 class="spec-question-title">' +
      esc(q.text) +
      '</h2>' +
      '<p class="spec-maturity-product"><strong>' +
      esc(getProductLineWithTier(product)) +
      '</strong></p>' +
      '<div class="spec-options" role="radiogroup" aria-labelledby="spec-q-label">' +
      '<span id="spec-q-label" class="visually-hidden">' +
      esc(q.text) +
      '</span>' +
      q.options
        .map(function (opt, idx) {
          return (
            '<label class="spec-option">' +
            '<input type="radio" name="spec-q" value="' +
            idx +
            '" />' +
            '<span class="spec-option-label">' +
            esc(opt.label) +
            '</span>' +
            '</label>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="spec-wizard-actions">' +
      '<button type="button" class="btn btn-primary" id="spec-next-q" disabled>Siguiente</button>' +
      '</div>';

    var nextBtn = el('spec-next-q');
    var radios = el('spec-wizard-stage').querySelectorAll('input[name="spec-q"]');
    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        nextBtn.disabled = false;
      });
    });
    nextBtn.addEventListener('click', function () {
      var sel = el('spec-wizard-stage').querySelector('input[name="spec-q"]:checked');
      if (!sel) return;
      var optIdx = parseInt(sel.value, 10);
      var opt = q.options[optIdx];
      state.answers.push({
        qId: q.id,
        qText: q.text,
        choiceLabel: opt.label,
        delta: opt.delta || {}
      });
      addDelta(state.phases, opt.delta || {});
      state.qIndex += 1;
      renderQuestion();
    });
  }

  function finishFlow(product, qs) {
    state.step = 'done';
    el('spec-wizard-progress-bar').style.width = '100%';
    el('spec-wizard-progress-text').textContent = 'Completado';
    el('spec-wizard-step-back').hidden = true;

    var mvpTotal = totalHours(state.phases);
    var demoTotal = demoHours(mvpTotal);
    var demoPhases = distributeDemo(state.phases, demoTotal, mvpTotal);
    var specMd = buildSpec(product, state.answers);
    var cursorPrompt = buildCursorPrompt(
      product,
      specMd,
      state.phases,
      mvpTotal,
      demoTotal,
      state.maturityChoice
    );
    var matAns = getMaturityAnswer(state.answers);
    var daysMvpByPhase = {};
    var daysDemoByPhase = {};
    PHASE_KEYS.forEach(function (k) {
      daysMvpByPhase[k] = workDaysFromHours(state.phases[k]);
      daysDemoByPhase[k] = workDaysFromHours(demoPhases[k]);
    });

    var isV2 = typeof document !== 'undefined' && document.body && document.body.classList.contains('spec-wizard--v2');
    var jsonExport = {
      generatedAt: new Date().toISOString(),
      experience: {
        id: isV2 ? 'vivenco-ai-native-2' : 'vivenco-ai-native-1',
        label: isV2 ? 'Vivenco AI-Native 2.0' : 'Vivenco AI-Native'
      },
      stack: STACK,
      product: {
        id: product.id,
        name: getProductLineWithTier(product),
        blurb: product.blurb
      },
      customStory: state.customStory,
      deliveryMaturity: state.maturityChoice,
      deliveryMaturityLabel: matAns ? matAns.choiceLabel : null,
      answers: state.answers,
      hoursMvpByPhase: state.phases,
      hoursMvpTotal: mvpTotal,
      hoursDemoByPhase: demoPhases,
      hoursDemoTotal: demoTotal,
      workdaysAssumptionHoursPerDay: HOURS_PER_WORKDAY,
      daysMvpByPhase: daysMvpByPhase,
      daysDemoByPhase: daysDemoByPhase,
      daysMvpTotal: workDaysFromHours(mvpTotal),
      daysDemoTotal: workDaysFromHours(demoTotal),
      specMarkdown: specMd,
      cursorPrompt: cursorPrompt
    };

    var tableRows = PHASE_KEYS.map(function (k) {
      return (
        '<tr><td>' +
        esc(PHASE_LABELS[k]) +
        '</td><td class="num">' +
        esc(fmtHoursDays(state.phases[k])) +
        '</td><td class="num">' +
        esc(fmtHoursDays(demoPhases[k])) +
        '</td></tr>'
      );
    }).join('');

    el('spec-wizard-stage').innerHTML =
      '<div class="spec-result-grid">' +
      '<section class="spec-result-card">' +
      '<h2 class="spec-result-heading">Resumen</h2>' +
      '<p class="spec-result-product spec-maturity-product spec-maturity-product--result"><strong>' +
      esc(getProductLineWithTier(product)) +
      '</strong></p>' +
      '<ul class="spec-result-stats">' +
      '<li><span>Horas MVP (referencia)</span><strong>' +
      esc(fmtHoursDays(mvpTotal)) +
      '</strong></li>' +
      '<li><span>Horas demo (referencia)</span><strong>' +
      esc(fmtHoursDays(demoTotal)) +
      '</strong></li>' +
      '<li><span>Calendario demo (~32 h/sem)</span><strong>~' +
      weeksAt(demoTotal, 32) +
      ' sem</strong></li>' +
      '<li><span>Calendario MVP (~32 h/sem)</span><strong>~' +
      weeksAt(mvpTotal, 32) +
      ' sem</strong></li>' +
      '</ul>' +
      '<p class="spec-result-note">Los días entre paréntesis son <strong>esfuerzo</strong> (~' +
      HOURS_PER_WORKDAY +
      ' h hábiles por día). Las semanas de calendario son orientativas (1 perfil dedicado, ~32 h/sem). Ajustá según equipo real.</p>' +
      '</section>' +
      '<section class="spec-result-card">' +
      '<h2 class="spec-result-heading">Actividades por fase</h2>' +
      '<div class="table-wrap">' +
      '<table class="detail-table spec-hours-table">' +
      '<thead><tr><th>Fase</th><th class="num">MVP (h)</th><th class="num">Demo (h)</th></tr></thead>' +
      '<tbody>' +
      tableRows +
      '<tr class="spec-hours-total"><td><strong>Total</strong></td><td class="num"><strong>' +
      esc(fmtHoursDays(mvpTotal)) +
      '</strong></td><td class="num"><strong>' +
      esc(fmtHoursDays(demoTotal)) +
      '</strong></td></tr>' +
      '</tbody></table></div>' +
      '</section>' +
      '</div>' +
      '<section class="spec-result-card spec-result-wide">' +
      '<h2 class="spec-result-heading">Especificación (Markdown)</h2>' +
      '<pre class="spec-pre" id="spec-md-pre"></pre>' +
      '</section>' +
      '<section class="spec-result-card spec-result-wide">' +
      '<h2 class="spec-result-heading">Prompt para Cursor</h2>' +
      '<p class="spec-muted">Copiá este bloque en Cursor (Composer / agente) como punto de partida. Podés iterar con ChatGPT usando el JSON exportado.</p>' +
      '<textarea class="spec-textarea" id="spec-cursor-ta" rows="14" readonly></textarea>' +
      '<div class="spec-wizard-actions">' +
      '<button type="button" class="btn btn-primary" id="spec-copy-prompt">Copiar prompt</button>' +
      '<button type="button" class="btn btn-outline" id="spec-download-json">Descargar JSON</button>' +
      '</div>' +
      '</section>';

    el('spec-md-pre').textContent = specMd;
    el('spec-cursor-ta').value = cursorPrompt;

    el('spec-copy-prompt').addEventListener('click', function () {
      var text = el('spec-cursor-ta').value;
      var btn = el('spec-copy-prompt');
      function ok() {
        btn.textContent = 'Copiado';
        setTimeout(function () {
          btn.textContent = 'Copiar prompt';
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok).catch(function () {
          el('spec-cursor-ta').select();
          document.execCommand('copy');
          ok();
        });
      } else {
        el('spec-cursor-ta').select();
        document.execCommand('copy');
        ok();
      }
    });

    el('spec-download-json').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(jsonExport, null, 2)], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'especificacion-vivenco-' + product.id + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    window.__SPEC_WIZARD_LAST__ = jsonExport;
  }

  function init() {
    el('spec-wizard-reset-pick').addEventListener('click', function () {
      resetToPick();
    });
    el('spec-wizard-step-back').addEventListener('click', function () {
      goBackStep();
    });
    var modal = el('spec-us-modal');
    var backdrop = el('spec-us-modal-backdrop');
    var closeBtn = el('spec-us-modal-close');
    function closeUserStoryModal() {
      if (!modal) return;
      modal.hidden = true;
      document.body.style.overflow = '';
    }
    if (closeBtn) closeBtn.addEventListener('click', closeUserStoryModal);
    if (backdrop) backdrop.addEventListener('click', closeUserStoryModal);

    renderPick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
