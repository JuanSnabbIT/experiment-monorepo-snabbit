# Frontend Guide - React + TypeScript + Redux

Guia concisa basada en el repositorio actual.

---

## Estructura de `src/`

```
src/
├── components/
├── pages/
├── services/         # ApiService, BaseService, RtkQueryService
├── store/            # slices, hook.ts, index.ts
├── hooks/
├── routes/           # asideRoutes/contentRoutes/footerRoutes/headerRoutes
├── interface/        # Tipos e interfaces (carpeta singular)
├── styles/
├── utils/
├── App.tsx
└── main.tsx
```

Notas:
- La carpeta es `interface/` (no `interfaces/`).
- El hook tipado de Redux esta en `store/hook.ts`.

---

## Servicios HTTP

- `ApiService` envuelve `BaseService` y es el punto unico de llamadas HTTP.
- `BaseService` inyecta JWT desde Redux (`auth.access`) y maneja refresh.
- Evita crear servicios por modulo en `services/`.

---

## Estado global

- Redux Toolkit con slices en `store/slices/`.
- `store/index.ts` configura el store.

---

## Rutas

- Rutas definidas en `src/routes/` (aside/content/header/footer).

---

## Alertas y confirmaciones

- Confirmaciones: `confirmAlert` (ver `src/utils/sweetAlert.ts`).
- Feedback post-accion: `toast` (react-toastify).

---

## Validaciones locales

- Lint: `npm run lint`
- Build: `npm run build`
- Formato: `npm run prettier:fix`

---

Ultima actualizacion: 2026-01-29
