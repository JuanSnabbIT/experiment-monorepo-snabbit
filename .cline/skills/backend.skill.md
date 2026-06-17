---
name: backend
description: "Guía de backend Django + DRF del ERP Snabbit. Usar cuando: crear o modificar endpoints, modelos, serializers, viewsets, multi-tenancy, currency, plantillas."
---

# Skill: Backend — Django + DRF

## Puntos clave
- Multi-tenancy obligatorio: filtrar por `PersonalizacionUsuario.sucursal_principal.empresa`
- Modelos base: heredar de `ModeloBase` o `ModeloBaseHistorico` (SSOT en `core/models.py`)
- Conversión de monedas: usar `currency_utils.py`, congelar tasas en snapshots
- Plantillas V2: patrón polimórfico de adaptadores

## Referencias
- Guía completa: `.github/instructions/backend-guide.md`
- Currency: `.github/instructions/currency-system.md`
- Plantillas: `.github/instructions/motor-plantillas-v2.md`
- AGENTS.md: `.github/AGENTS.md`