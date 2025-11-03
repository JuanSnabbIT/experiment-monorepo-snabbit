---
title: "Seguridad"
scope: "full-stack"
status: "active"
last_updated: "2025-11-03"
---

# Seguridad

## Objetivo
Establecer prácticas de seguridad para proteger el sistema ERP contra vulnerabilidades comunes (exposición de secretos, ataques CSRF/XSS, acceso no autorizado). Aplicable a backend (Django) y frontend (React).

## Reglas clave

### 1. Manejo de secretos y variables de entorno

#### Backend
- **No hardcodear**: `SECRET_KEY`, `REDIS_HOST`, `DATABASE_URL`, credenciales de terceros.
- **Variables en `.env`**: usar `python-dotenv` para cargar; nunca versionar `.env` (añadir a `.gitignore`).
- **`.env.example`**: proporcionar plantilla con placeholders.
- Ejemplo `.env`:
  ```bash
  SECRET_KEY=<genera_con_get_random_secret_key>
  DEBUG_ENABLE=False
  REDIS_HOST=127.0.0.1
  REDIS_PORT=6379
  DATABASE_URL=postgres://user:pass@host:5432/db
  ```

#### Frontend
- **Variables públicas**: solo usar variables con prefijo `VITE_` (expuestas al cliente).
- **No secretos en frontend**: nunca almacenar API keys, tokens de terceros o credenciales sensibles.
- Ejemplo `.env`:
  ```bash
  VITE_API_URL=https://api.example.com
  ```

### 2. Autenticación y autorización (JWT)

#### Backend (Django)
- **JWT con SimpleJWT**: `access` (5h), `refresh` (10h) configurables en `SIMPLE_JWT`.
- **Rotación y blacklist**: `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`.
- **Reducir lifetimes en producción**: considerar `access` 15-60 min, `refresh` 7-30 días.
- **Permisos explícitos**: `IsAuthenticated` por defecto; `AllowAny` debe justificarse y auditarse.
- **Grupos y roles**: usar `django.contrib.auth.models.Group` para control granular; asignar permisos en migraciones.

#### Frontend (React)
- **Almacenamiento**: `localStorage` o `sessionStorage` para tokens (considerar `httpOnly` cookies en producción para mayor seguridad).
- **Refresh automático**: implementar en `BaseService.ts` con interceptores Axios.
- **Validación de rutas**: componente `PrivateRoute` que verifique token antes de renderizar.

### 3. CORS y CSRF

#### CORS (Cross-Origin Resource Sharing)
- **Desarrollo**: `CORS_ORIGIN_ALLOW_ALL=True` solo en local.
- **Producción**: usar `CORS_ALLOWED_ORIGINS` con lista blanca de dominios frontend.
- Ejemplo:
  ```python
  CORS_ALLOWED_ORIGINS = [
      'https://app.example.com',
      'https://www.example.com',
  ]
  ```

#### CSRF (Cross-Site Request Forgery)
- **APIs REST**: generalmente exentas si solo usan JWT (no cookies de sesión).
- **Endpoints con sesión**: asegurar `CSRF_TRUSTED_ORIGINS` incluye dominio frontend.
- **Tokens CSRF**: incluir en formularios si se usa autenticación por sesión.

### 4. Validaciones y sanitización

#### Backend
- **Validar entradas**: usar serializers de DRF; validar tipos, longitud, formato.
- **Escapar outputs**: Django hace esto por defecto en templates; cuidado con `mark_safe`.
- **SQL Injection**: usar ORM de Django (evita SQL crudo sin parámetros).

#### Frontend
- **Validar entradas**: validaciones en frontend para UX; confiar siempre en validación backend.
- **XSS**: React escapa por defecto; evitar `dangerouslySetInnerHTML` sin sanitización (usar bibliotecas como `DOMPurify`).

### 5. Rotación de claves y secretos

- **SECRET_KEY**: rotar periódicamente en producción; coordinar despliegue sin downtime.
- **JWT signing key**: actualmente usa `SECRET_KEY` simétrico (HS256); considerar claves asimétricas (RS256) para múltiples servicios.
- **Passwords de DB/Redis**: rotar anualmente o tras incidentes; actualizar en `.env` y servicios.

### 6. Logging y auditoría

- **No loguear secretos**: evitar imprimir tokens, passwords, datos sensibles en logs.
- **Auditar accesos**: registrar intentos de login fallidos, cambios de permisos, accesos a recursos críticos.
- **Niveles de log**: usar `INFO` para eventos normales, `WARNING` para situaciones anómalas, `ERROR` para fallos.

### 7. Dependencias y CVEs

- **Actualizar dependencias**: revisar `req.txt` (backend) y `package.json` (frontend) trimestralmente.
- **Escaneo de vulnerabilidades**: usar `safety` (Python) o `npm audit` (Node).
- **Parches críticos**: aplicar inmediatamente CVEs de alta severidad.

### 8. Limitaciones actuales y mejoras propuestas

- **JWT lifetimes largos**: reducir en producción (access 15-60 min, refresh 7-30 días).
- **Firma simétrica (HS256)**: migrar a RS256 con gestión de claves si hay microservicios.
- **No hay scopes JWT**: implementar granularidad basada en roles/grupos Django.
- **`TokenAuthentication` habilitado**: revisar si es necesario (superficie de ataque adicional).
- **Throttling**: implementar en endpoints sensibles (login, registro, reset password).

## Checklist de seguridad

- [ ] `.env` no versionado; `.env.example` actualizado con placeholders.
- [ ] JWT configurado con lifetimes apropiados (reducir en producción).
- [ ] Permisos explícitos (`IsAuthenticated` por defecto; `AllowAny` justificado).
- [ ] CORS con lista blanca en producción; CSRF configurado si usa sesiones.
- [ ] Validaciones en serializers (backend) y formularios (frontend).
- [ ] No hay secretos hardcodeados en código ni logs.
- [ ] Dependencias actualizadas; CVEs críticos parcheados.
- [ ] Throttling en endpoints sensibles (login, API pública).
- [ ] Auditoría de accesos y eventos críticos habilitada.

## Referencias cruzadas
- [Backend (Django)](./backend-instructions.md): autenticación JWT, permisos, validaciones.
- [Frontend (React)](./frontend-instructions.md): manejo de tokens, rutas privadas.
- [Observabilidad](./observability.md): logging seguro, métricas de accesos.
- [PR Flow](./pr-flow.md): revisión de seguridad en PRs.

---
