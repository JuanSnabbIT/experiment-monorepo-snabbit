---
name: afp-consulta-afiliacion
description: Análisis del endpoint de consulta AFP (spensiones.cl) y decisiones de arquitectura para integrarlo en el ERP. Relevante al implementar la feature de consulta de afiliación en ficha de trabajador y wizard de contrato.
metadata:
  type: project
---

# Consulta de Afiliación AFP — Análisis de Endpoint y Decisiones

## Hallazgos del endpoint (verificados 2026-06-18)

**URL del formulario:** `https://www.spensiones.cl/apps/certificados/formConsultaAfiliacion.php`
**URL de procesamiento:** `https://www.spensiones.cl/apps/certificados/consultaAfiliacion.php`
**Método:** POST
**Content-Type:** `application/x-www-form-urlencoded`

### Campos del POST
| Campo | Tipo | Observación |
|---|---|---|
| `rut` | text | RUT sin puntos, con guión (ej: `21473665-9`), 7-10 chars |
| `sessionid` | hidden | Token generado por el servidor en el GET del form. Debe extraerse del HTML antes del POST. |
| `g-recaptcha-response` | text | El backend NO valida el token, pero el campo DEBE ir presente; sin él la respuesta es una página de error corta (~1099 chars vs ~2648 con datos). Cualquier valor funciona. |

### ⚠️ Requisitos del POST verificados en implementación (2026-06-18)
Descubiertos al hacer el smoke test real — NO estaban documentados y el plan original fallaba:
1. **Header `Referer` obligatorio** apuntando a `FORM_URL`. Sin él, el POST redirige a `https://www.spensiones.cl/4404.HTML` (404). Esta es la causa #1 de fallo.
2. **Encoding `iso-8859-1`** (Latin-1). La página lo declara; hay que hacer `resp.encoding = "iso-8859-1"` antes de parsear o los acentos/ñ llegan corruptos y rompen el matching de nombres.
3. Usar `requests.Session()` para que la cookie del GET viaje en el POST.

### Estructura real de la respuesta (texto plano, un solo bloque)
"Certifico que el(la) señor(a) {NOMBRE}, RUT N° {RUT} se encuentra incorporado(a) a **AFP {NOMBRE_AFP}**, con fecha {fecha AFP}. ... actualizada al último día hábil del **mes de {Mes AAAA}** ... [lista de todas las AFP] ... De acuerdo a la información proporcionada por las **AFC**, actualizada al último día hábil del mes de {Mes AAAA}, don(ña) {NOMBRE}, RUT N° {RUT}, se encuentra incorporado(a) a la AFC con fecha {fecha AFC}."
El parser (`_parsear_respuesta`) hace `re.split(r"\bAFC\b", ...)` para separar bloque AFP/AFC y extrae fechas/mes con regex. Verificado: produce el JSON esperado exacto.

### Respuesta exitosa
HTML plano con dos párrafos:
1. AFP: nombre completo, RUT, nombre AFP, fecha de afiliación AFP
2. AFC: nombre completo, RUT, fecha de afiliación AFC

Los datos de AFP se actualizan al **último día hábil del mes anterior** (lag de ~1 mes).
Los datos de AFC se actualizan con ~2 meses de lag.

### Seguridad real del endpoint
- **reCAPTCHA v3 no se valida en el servidor** — el backend devuelve datos con cualquier valor en `g-recaptcha-response`, incluso una cadena fake como `"FAKE_TOKEN"`.
- El `sessionid` SÍ debe ser un token real extraído del form (requiere GET previo).
- Sin Cloudflare, sin rate limiting detectado, sin User-Agent check.
- Headers de seguridad presentes: `X-Frame-Options`, `X-Content-Type-Options`, CSP — pero ninguno afecta el scraping.

**Why:** Esta info cambia radicalmente el costo técnico de implementación. No necesitamos CAPTCHA solver ni Playwright — un simple GET+POST con BeautifulSoup es suficiente.

**How to apply:** Al implementar, el flujo es siempre: GET form → extraer `sessionid` → POST inmediato. No reutilizar sessionid entre requests (puede expirar).

---

## Decisiones de arquitectura acordadas

### 1. Enfoque: scraping HTTP puro (sin headless browser)
Dado que el reCAPTCHA no se valida server-side, la implementación usa `requests` + `BeautifulSoup4`. No se necesita Playwright/Puppeteer ni servicios de CAPTCHA solving.

### 2. Ejecución: Celery task asíncrona
El botón "Consultar Afiliación" en la UI dispara una Celery task, no una llamada síncrona. El endpoint Django retorna inmediatamente con `task_id`. El frontend hace polling (o usa un mecanismo de notificación) para obtener el resultado.

**Why:** La consulta HTTP a spensiones.cl puede tardar 1-3 segundos. Bloquear el worker Django es inaceptable en un wizard de contrato.

### 3. Cache: Redis con TTL de 30 días
- **Key:** `afp_afiliacion:{rut_sin_guion}` (ej: `afp_afiliacion:214736659`)
- **TTL:** 30 días (los datos del sitio se actualizan mensualmente)
- **Invalidación manual:** El botón "Actualizar Consulta" del mockup dispara la tarea ignorando el cache
- **Estructura almacenada (JSON):**
```json
{
  "nombre_completo": "JUAN JOSE IGNACIO MONSALVEZ BRAVO",
  "rut": "21473665-9",
  "afp_nombre": "AFP MODELO",
  "afp_fecha_afiliacion": "2023-08-01",
  "afc_afiliado": true,
  "afc_fecha_afiliacion": "2023-08-07",
  "afp_datos_al_mes": "Mayo 2026",
  "afc_datos_al_mes": "Abril 2026",
  "consultado_en": "2026-06-18T20:51:27Z"
}
```

### 4. Dónde vive el código (IMPLEMENTADO 2026-06-18)
- **App Django:** `rrhh/`
- **Archivos:** `rrhh/afp_scraper.py` (módulo puro, GET+POST+parser+`normalizar_rut`/`rut_sin_guion`), task `consultar_afiliacion_afp` + `_match_afp_catalogo` en `rrhh/tasks.py`, `@action(detail=False)` `consultar_afp` en `ContratoTrabajadorViewSet`.
- **Endpoint REAL:** `/api/rrhh/contratos-trabajador/consultar-afp/` — **action de colección keyed por RUT**, NO `/trabajadores/{id}/`. Razón: el wizard en modo `nuevo` no tiene id de contrato aún, solo un RUT. POST `{rut, forzar?}` → 202 + task_id (o cache hit); GET `?rut=` → polling. Con `forzar` se borra la clave de cache para no devolver datos viejos.
- **CACHES (prerequisito implementado):** `settings.py` no tenía `CACHES` → Django caía a LocMemCache por-proceso y el polling nunca veía el resultado del worker. Se agregó `RedisCache` nativo en **DB 1** (broker Celery usa DB 0). `requests` + `beautifulsoup4` agregados a `req.txt`.
- **Frontend:** hook `useConsultaAfp.ts` (dispara mutation + pollea query), endpoints `dispararConsultaAfp`/`getConsultaAfp` en `contratoTrabajadorApi.ts`, integrado en `StepPrevisionBanco.tsx` (Step 5) y `TabPrevisionTrabajador.tsx` (modal informativo, sin persistir). `StepTrabajador.tsx` propaga `trab_rut` al elegir trabajador existente.
- **Decisiones de producto confirmadas:** auto-match nombre→`AfpCatalogo` con fallback manual (no auto-crear); resultado es solo sugerencia/pre-llenado, persiste vía flujos existentes.

### 5. Puntos de integración en el frontend
1. **Ficha del Trabajador:** Card "Previsión y Salud" → botón "Consultar Afiliación" → modal con resultado (mockup: `Ficha del Trabajador con Modal de Previsión`)
2. **Wizard Nuevo Contrato — Step 5 "Previsión":** comportamiento condicional según `trab_modo`:

| Escenario | Comportamiento en Step 5 |
|---|---|
| `existente` + cache Redis con hit | Pre-llenar select AFP, mostrar badge "Última consulta: X" |
| `existente` + sin cache Redis | Pre-llenar AFP desde DB (`UsuarioEmpresa.afp`), botón "Consultar Afiliación" visible como sugerencia |
| `nuevo` + RUT ingresado en Step 2 | Botón "Consultar Afiliación" prominente pero **no automático** — usuario lo dispara |

**Why:** Automatizar la consulta para trabajadores nuevos requeriría disparar la Celery task en Step 2 y hacer polling hasta Step 5 — complejidad desproporcionada al valor. El usuario igual debe revisar y confirmar el resultado, así que no se ahorra ningún click real.

**Nota implementación:** El RUT está disponible en Formik en ambos modos (`trab_rut` para nuevo, derivable de `trab_usuario_empresa_id` para existente). La key Redis `afp_afiliacion:{rut}` funciona igual en los dos casos.

### 6. Consideración legal (pendiente resolución)
La validación reCAPTCHA solo en frontend sugiere que el organismo no prohíbe activamente el acceso automatizado. Los datos son públicos. Sin embargo, no hay ToS explícita que lo permita.
**Decisión tomada:** Proceder con implementación. Agregar rate limiting propio (máx 1 consulta/RUT/día sin forzar actualización) para ser respetuosos con el servidor externo.

---

## Riesgos residuales

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Cambio de HTML en spensiones.cl rompe el parser | Media | Test de smoke en cada deploy; alerta si el response no tiene el patrón esperado |
| Activación de reCAPTCHA server-side en el futuro | Baja | Arquitectura Celery permite agregar CAPTCHA solver sin cambiar la interfaz |
| sessionid con TTL corto | Baja | Siempre hacer GET+POST en la misma tarea Celery sin delay entre ellos |
| Lag de datos (hasta 2 meses para AFC) | Certeza | Mostrar siempre en UI el mes al que están actualizados los datos (ya incluido en mockup) |
