# ⚠️ DEPRECATION NOTICE - Funcionalidad Antigua de Guías 1:1 en Servicios/Soportes

**Fecha de Deprecación**: 2026-01-22  
**Versión**: ordentrabajov2  
**Estado**: DEPRECATED - Solo por compatibilidad backward

---

## Resumen

La funcionalidad anterior de vincular guías de salida **1:1 a servicios y soportes técnicos** está siendo deprecada.

A partir de 2026-01, todas las guías de salida deben vincularse **directamente a la Orden de Trabajo (OT)**, no a servicios o soportes individuales.

---

## Endpoints Deprecated

### **SoporteTecnicoViewSet**
- ❌ `POST /api/ordenes-de-trabajo/{id}/soportes-tecnicos/{id}/asociar-guia/`
- ❌ `POST /api/ordenes-de-trabajo/{id}/soportes-tecnicos/{id}/desasociar-guia/`

### **ServicioEnOTViewSet**
- ❌ `POST /api/ordenes-de-trabajo/{id}/servicios-generales/{id}/asociar-guia/`
- ❌ `POST /api/ordenes-de-trabajo/{id}/servicios-generales/{id}/desasociar-guia/`

**Alternativa**: Usar el nuevo endpoint de guías directas:
- ✅ `POST /api/ordenes-de-trabajo/{id}/insumos/{id}/desasociar-guia/`

---

## Campos de Modelo Deprecated

### **SoporteTecnico**
```python
guia_salida = models.OneToOneField(
    "bodegas.GuiaSalida",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="soporte_tecnico",
)  # ❌ DEPRECATED - No debe usarse
```

### **ServicioEnOT**
```python
guia_salida = models.OneToOneField(
    "bodegas.GuiaSalida",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="servicio_ot",
)  # ❌ DEPRECATED - No debe usarse
```

---

## Funciones Deprecated

### **Backend**
- `validar_guia_para_trabajo()` - Parte de la lógica antigua
- `actualizar_estado_guia_en_inicio_trabajo()` - En contexto de servicios/soportes

### **Frontend**
- `ModalVincularGuia` - Debe usar nuevos endpoints
- `desvincularGuia()` en ListaServiciosOT
- `desvincularGuia()` en ListaSoportesTecnicosOT
- Lógica de vinculación antigua

---

## Planificación de Deprecación

### **Fase 1** ✅ (Actual - 2026-01)
- [x] Endpoints marcados con `@deprecated`
- [x] Warnings en ejecución (`DeprecationWarning`)
- [x] Crear nuevo modelo de guías directas en OT
- [x] Nueva interfaz de usuario
- [x] Documentación de cambio

### **Fase 2** (Próximos 3 meses)
- [ ] Auditar data existente con guías 1:1
- [ ] Exportar información si es necesaria
- [ ] Migración de datos a nuevo modelo

### **Fase 3** (6 meses)
- [ ] Remover endpoints deprecated del código
- [ ] Remover serializers que incluyan `guia_salida` 1:1
- [ ] Limpiar referencias en frontend

### **Fase 4** (9 meses)
- [ ] Remover campos `guia_salida` de modelos (migration)
- [ ] Final removal

---

## Impacto en Clientes

Si tu aplicación frontend usa los endpoints antiguos:

**❌ ANTIGUO (No usar)**
```typescript
// Vincular guía a soporte
POST /api/ordenes-de-trabajo/{otId}/soportes-tecnicos/{soporteId}/asociar-guia/
Body: { guia_salida: 123 }

// Desvincular guía de soporte
POST /api/ordenes-de-trabajo/{otId}/soportes-tecnicos/{soporteId}/desasociar-guia/
```

**✅ NUEVO (Usar)**
```typescript
// Las guías se vinculan directamente a la OT durante la creación
// Ver ModalVincularGuia para interfaz nueva
POST /api/ordenes-de-trabajo/{otId}/insumos/{insumoId}/desasociar-guia/
```

---

## Preguntas Frecuentes

### ¿Qué pasa con las guías ya vinculadas a servicios/soportes?

Se mantienen funcionales por compatibilidad, pero se recomienda migrarlas al nuevo modelo.

### ¿Cuándo se removerán completamente?

Dentro de 9 meses (alrededor de octubre 2026). Se dará aviso adicional.

### ¿Hay impacto en reportes o PDFs?

No. La información se sigue mostrando. Solo cambió la forma de vincular.

### ¿Puedo seguir usando los endpoints antiguos?

Sí, pero verás warnings en logs. Migra cuando sea conveniente.

---

## Referencias Técnicas

- **Nuevo Endpoint**: `InsumoViewSet` en `ordentrabajov2/views.py`
- **Nueva UI**: `ModalVincularGuia` en frontend
- **Cambios Backend**: Commits recientes en rama main
- **Changelog**: Ver `dev/docs/changelog.md`

---

**Última actualización**: 2026-01-22  
**Responsable de deprecación**: DevOps Team
