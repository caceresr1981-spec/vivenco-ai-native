window.__TRACKER_PROJECTS__ = {
  "updatedAt": "2026-03-29",
  "projects": [
    {
      "id": "demo-erp-01",
      "name": "Módulo inventario y compras",
      "client": "Retail Demo SA",
      "system": "ERP",
      "status": "En desarrollo",
      "summary": "Automatización de órdenes de compra e integración con proveedores.",
      "activities": [
        {
          "id": "demo-erp-01-act-0",
          "title": "Modelo de datos y reglas de negocio",
          "hours": 24,
          "hoursImplemented": 8,
          "assignee": "Equipo A",
          "priority": "Alta",
          "estado": "En curso",
          "inProgress": true,
          "fechaInicio": "2026-03-01",
          "fechaFin": "",
          "storyRole": "analista de inventario",
          "storyWant": "definir el modelo de datos y las reglas de negocio de stock",
          "storyBenefit": "evitar inconsistencias entre almacén y compras"
        },
        {
          "id": "demo-erp-01-act-1",
          "title": "API de integración proveedores",
          "hours": 18,
          "hoursImplemented": 0,
          "assignee": "Equipo A",
          "priority": "Alta",
          "estado": "En curso",
          "inProgress": true,
          "fechaInicio": "2026-03-15",
          "fechaFin": "",
          "storyRole": "integrador",
          "storyWant": "exponer endpoints para altas de OC hacia proveedores",
          "storyBenefit": "automatizar el envío de pedidos"
        },
        {
          "id": "demo-erp-01-act-2",
          "title": "Pantallas de aprobación BPM",
          "hours": 12,
          "hoursImplemented": 12,
          "assignee": "Equipo B",
          "priority": "Media",
          "estado": "Completada",
          "inProgress": false,
          "fechaInicio": "2026-02-10",
          "fechaFin": "2026-03-20",
          "storyRole": "aprobador",
          "storyWant": "aprobar o rechazar órdenes desde un panel simple",
          "storyBenefit": "reducir el tiempo de ciclo de compras"
        }
      ],
      "milestones": [
        { "title": "Demo interna", "date": "2026-04-10" },
        { "title": "Inicio UAT cliente", "date": "2026-04-22" },
        { "title": "Go-live piloto", "date": "2026-05-15" }
      ]
    },
    {
      "id": "demo-crm-02",
      "name": "Pipeline y automatización comercial",
      "client": "Seguros Demo",
      "system": "CRM",
      "status": "UAT",
      "summary": "Seguimiento de oportunidades y secuencias de email.",
      "activities": [
        {
          "id": "demo-crm-02-act-0",
          "title": "Ajustes post feedback UAT",
          "hours": 6,
          "hoursImplemented": 2,
          "assignee": "Equipo B",
          "priority": "Media",
          "estado": "En curso",
          "inProgress": true,
          "fechaInicio": "2026-03-25",
          "fechaFin": "",
          "storyRole": "equipo de producto",
          "storyWant": "corregir los hallazgos del UAT en el flujo de oportunidades",
          "storyBenefit": "cerrar el ciclo de pruebas con el cliente"
        }
      ],
      "milestones": [
        { "title": "Cierre UAT", "date": "2026-03-30" },
        { "title": "Producción", "date": "2026-04-05" }
      ]
    },
    {
      "id": "oms-wms-mvp",
      "name": "OMS + WMS — Panel operativo MVP",
      "client": "Retail / Operaciones (demo)",
      "system": "OMS + WMS",
      "status": "En desarrollo",
      "summary": "Monorepo Node 20: API Fastify + Zod + PostgreSQL (Railway/Docker) y web Next.js App Router con proxy mismo origen (Vercel). Maestro de productos paginado, inventario y movimientos WMS, kardex con filtros y CSV, pedidos por canal (Mercado Libre / Tiendanube) con ingestión y estados, rentabilidad y KPIs, exportación de facturación pendiente y conciliación pedido-factura, integraciones mock (publish/sync). Health de API y de base; auth opcional por cookie con APP_PASSWORD.",
      "activities": [
        {
          "id": "oms-wms-mvp-act-0",
          "title": "Persistencia Postgres, migraciones y health /health/db",
          "hours": 16,
          "hoursImplemented": 14,
          "assignee": "Equipo A",
          "priority": "Alta",
          "estado": "En curso",
          "inProgress": true,
          "fechaInicio": "2026-02-01",
          "fechaFin": "",
          "storyRole": "backend",
          "storyWant": "tener migraciones y health de base estable",
          "storyBenefit": "desplegar con confianza en Railway"
        },
        {
          "id": "oms-wms-mvp-act-1",
          "title": "Módulos web: inventario, kardex, pedidos, rentabilidad, reportes, facturación, integraciones",
          "hours": 32,
          "hoursImplemented": 10,
          "assignee": "Equipo A",
          "priority": "Alta",
          "estado": "En curso",
          "inProgress": true,
          "fechaInicio": "2026-02-15",
          "fechaFin": "",
          "storyRole": "usuario de operaciones",
          "storyWant": "operar stock y pedidos desde el panel web",
          "storyBenefit": "reemplazar hojas de cálculo"
        },
        {
          "id": "oms-wms-mvp-act-2",
          "title": "Proxy CORS, despliegue API (Railway) y web (Vercel), variables DATABASE_URL / BACKEND_URL",
          "hours": 12,
          "hoursImplemented": 12,
          "assignee": "Equipo B",
          "priority": "Media",
          "estado": "Completada",
          "inProgress": false,
          "fechaInicio": "2026-01-20",
          "fechaFin": "2026-03-01",
          "storyRole": "DevOps",
          "storyWant": "publicar API y web con variables coherentes",
          "storyBenefit": "entornos reproducibles"
        },
        {
          "id": "oms-wms-mvp-act-3",
          "title": "Auth MVP (middleware, login/logout) y checklist UAT cliente",
          "hours": 8,
          "hoursImplemented": 0,
          "assignee": "Equipo B",
          "priority": "Baja",
          "estado": "Pendiente",
          "inProgress": false,
          "fechaInicio": "",
          "fechaFin": "",
          "storyRole": "visitante",
          "storyWant": "iniciar sesión con contraseña de aplicación",
          "storyBenefit": "proteger el panel en staging"
        }
      ],
      "milestones": [
        { "title": "DB estable y panel end-to-end en staging", "date": "2026-04-01" },
        { "title": "UAT funcional (stock, pedidos, reportes)", "date": "2026-04-18" },
        { "title": "Go-live piloto OMS+WMS", "date": "2026-05-10" }
      ]
    }
  ]
};
