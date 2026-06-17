# CLINE.md — Monorepo ERP Snabbit

Punto de entrada único para agentes Cline.

## Sistema

### ¿Qué es?

ERP multi-empresa para gestión de servicios de TI. Permite a empresas prestadoras gestionar:
- **Órdenes de trabajo** (soporte técnico, servicios generales)
- **Cotizaciones** y presupuestos con multi-moneda (CLP, USD, UF)
- **Inventario** y bodegas con movimientos de stock
- **Contratos laborales** con firma digital (RRHH)
- **Contratos comerciales** (B2B) con plantillas editables
- **Rendiciones** de gastos, **recursos**, **vacaciones**, **calendario**

### Stack

| Capa | Tecnología |
|------|------------|
| **Backend** | Django 5.1.x + DRF + Celery + Redis |
| **Frontend** | React 18 + TypeScript 5 + Vite 5 |
| **Estado** | Redux Toolkit + RTK Query |
| **Auth** | Djoser + SimpleJWT (5h access / 10h refresh) |
| **BD Dev** | SQLite |
| **BD Prod** | PostgreSQL |
| **Tema Visual** | Fyr (read-only) en `tema_base/fyr-vite/` |

## Patrones Críticos

### 🔴 Multi-tenancy (OBLIGATORIO)

```python
# Todos los ViewSets DEBEN filtrar por empresa:
def get_queryset(self):
    user = self.request.user
    personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
    if personalizacion and personalizacion.sucursal_principal:
        empresa = personalizacion.sucursal_principal.empresa
        return MiModelo.objects.filter(empresa=empresa)
    return MiModelo.objects.none()
```

### 💱 Sistema de Monedas

```python
from contratos.currency_utils import convertir_precio_item_safe, obtener_tipos_cambio_actuales, consolidar_totales_items

dolar, uf = obtener_tipos_cambio_actuales()
total_convertido = convertir_precio_item_safe(monto=5000, moneda_origen='USD', moneda_destino='CLP', dolar_observado=dolar)
total_en_clp = consolidar_totales_items(items, moneda_cobro='CLP')
```

### 📋 Motor de Plantillas V2

```python
from contratos.adaptadores import AdaptadorContratoB2B
from contratos.motor_plantillas_v2 import generar_secciones_v2, renderizar_seccion_v2

adaptador = AdaptadorContratoB2B(contrato)
secciones = generar_secciones_v2(adaptador)
contenido = renderizar_seccion_v2("[cliente.nombre] contrata...", adaptador=adaptador, etiquetas_map={...})
```

### 🔄 RTK Query

```tsx
// ✅ CORRECTO - invalidar automáticamente:
const [updateSomething] = useUpdateSomethingMutation();
await updateSomething(payload).unwrap();
// RTK refetch automático via invalidatesTags

// ❌ INCORRECTO - NO usar refetch manual post-mutation
```

### ⚠️ Versiones de OT

| Versión | Estado | URL Backend | URL Frontend | Notas |
|---------|--------|-------------|--------------|-------|
| V1 | ❌ DEPRECADA | — | — | No usar |
| V2 | ⚠️ DEPRECADA | `/api/ordenes-de-trabajo/` | — | Código existe, usar V3 para nuevo |
| V3 | ✅ ACTIVA | `/api/v3/ordenes/` | `/orden-trabajo-v3/` | **Usar siempre para nuevas OT** |

## Comandos de Desarrollo

### Backend
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
python manage.py makemigrations
python manage.py migrate
python manage.py test
celery -A sw_erp worker --loglevel=info
celery -A sw_erp beat --loglevel=info
```

### Frontend
```bash
cd frontend
npm run dev          # Dev server
npm run build        # Build prod
npm run lint         # ESLint
npm run prettier:fix # Formatear
```

## Reglas Transversales

1. **Planificación antes de ejecución** — Proponer plan para cambios multi-archivo
2. **Alcance controlado** — Cargar solo instrucciones pertinentes
3. **Cambios coherentes** — Agrupar lógicamente, no mezclar refactor con fixes funcionales
4. **Respeto por contexto** — Seguir patrones existentes, no introducir deuda técnica
5. **Documentación controlada** — Solo en `dev/docs/`, máximo 1 archivo por dominio
6. **Anti-inflación documental** — No documentar análisis, planes, bugs, migraciones pasadas

## Referencias Rápidas

- **Glosario de términos:** `.github/instructions/glossary.md`
- **Postman:** Colecciones en `postman/`
- **Workspace config:** `erp-snabbit.code-workspace`

## Checklist Final (Antes de Finalizar)

- [ ] Archivos modificados listados explícitamente
- [ ] Resumen claro de cambios y justificación
- [ ] Comandos relevantes ejecutados (lint, build, tests)
- [ ] Multi-tenancy verificado (si backend)
- [ ] RTK Query invalidations correctas (si frontend)
- [ ] Cambios alineados con patrones existentes