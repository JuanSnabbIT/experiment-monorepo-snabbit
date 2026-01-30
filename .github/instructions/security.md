# Security - Autenticacion, autorizacion y validacion

Basado en configuracion real del repo.

---

## JWT (Backend)

En `backend/sw_erp/settings.py`:

- `ACCESS_TOKEN_LIFETIME`: 5 horas
- `REFRESH_TOKEN_LIFETIME`: 10 horas
- `ALGORITHM`: HS256
- Header: `Authorization: Bearer <token>`

Auth classes habilitadas:
- `rest_framework_simplejwt.authentication.JWTAuthentication`
- `rest_framework.authentication.TokenAuthentication`

Permisos por defecto: `AllowAny`.
Cada ViewSet debe definir permisos explicitos.

---

## Endpoints de auth

En `backend/sw_erp/urls.py`:
- Djoser + JWT montado bajo `/auth/`.
- Refresh usado por frontend: `/auth/jwt/refresh`.

---

## Frontend (tokens)

- `BaseService` obtiene tokens desde Redux (`store.getState().auth`).
- No usa localStorage para inyectar JWT.
- Refresh automatico con `/auth/jwt/refresh`.

---

## CORS

- `CORS_ORIGIN_ALLOW_ALL = True` en settings (actual).
- Para produccion, definir `CORS_ALLOWED_ORIGINS` explicitos.

---

Ultima actualizacion: 2026-01-29
