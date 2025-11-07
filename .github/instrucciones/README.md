# 📖 Instrucciones Técnicas

Esta carpeta contiene referencias técnicas detalladas organizadas por stack y tipo.

## 📂 Estructura

```
instrucciones/
├── backend/          # Django, DRF, Celery, modelos, serializers
├── frontend/         # React, Redux, TypeScript, componentes
├── procesos/         # Standards, security, testing, CI/CD
└── soporte/          # Glossary, playbooks, troubleshooting
```

## 🔧 Backend

**General**:
- [general.md](./backend/general.md) - Instrucciones generales de Django + DRF

**Apps Documentadas** (95 modelos):
- [core-cuentas.md](./backend/core-cuentas.md) - Core + Autenticación
- [empresas-cotizaciones.md](./backend/empresas-cotizaciones.md) - Empresas + Quotes
- [contratos-bodegas-items.md](./backend/contratos-bodegas-items.md) - Contratos + Inventory
- [ordentrabajo-recursos-rendiciones-visitas.md](./backend/ordentrabajo-recursos-rendiciones-visitas.md) - Operations
- [vacaciones-calendario-activos-retroalimentacion.md](./backend/vacaciones-calendario-activos-retroalimentacion.md) - Support

**Permisos**:
- [permisos-guardian.md](./backend/permisos-guardian.md) - Django Guardian
- [permisos-sistema.md](./backend/permisos-sistema.md) - Sistema de permisos

**Referencia**:
- [referencia-endpoints.md](./backend/referencia-endpoints.md) - Quick reference de API

## 🎨 Frontend

- [general.md](./frontend/general.md) - React + TypeScript + Vite
- [redux-thunks.md](./frontend/redux-thunks.md) - Redux Toolkit y operaciones asíncronas
- [store-structure.md](./frontend/store-structure.md) - Índice de 14 slices Redux

## 📋 Procesos

- [standards.md](./procesos/standards.md) - Estándares de código (PEP 8, ESLint)
- [security.md](./procesos/security.md) - JWT, CORS, secretos, validaciones
- [pr-flow.md](./procesos/pr-flow.md) - Flujo de PRs y commits
- [ci-cd.md](./procesos/ci-cd.md) - Pipelines CI/CD
- [testing.md](./procesos/testing.md) - Unit, integration, e2e
- [performance.md](./procesos/performance.md) - N+1, índices, caché
- [observability.md](./procesos/observability.md) - Logging, métricas, tracing

## 🆘 Soporte

- [playbooks.md](./soporte/playbooks.md) - Troubleshooting común
- [glossary.md](./soporte/glossary.md) - Glosario de términos
- [tasks.md](./soporte/tasks.md) - VS Code tasks

---

**Última actualización**: 2025-11-07
