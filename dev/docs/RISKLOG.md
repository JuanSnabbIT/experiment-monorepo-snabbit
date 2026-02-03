# RISKLOG - Inventario de Vulnerabilidades Identificadas

Documento de seguimiento de vulnerabilidades de seguridad y riesgos técnicos identificados mediante auditoría 2025-02-12.

---

## Estado General

- **Auditoría realizada:** 2025-02-12
- **ViewSets auditados:** 50+
- **Vulnerabilidades críticas identificadas:** 10+
- **Estado de corrección:** 🔴 PENDIENTE
- **Responsable de corrección:** Equipo Backend

---

## Vulnerabilidades Críticas (CVE-like)

### CVE-ERP-001: Acceso Público Sin Autenticación a CategoriaViewSet

**Severidad:** 🔴 CRÍTICO  
**CVSS Score:** 8.2 (Alto)  
**Archivo:** `backend/items/views.py`  
**Línea:** 13-16

```python
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    # ❌ SIN permission_classes - Heredita AllowAny por defecto
```

**Impacto:**
- Cualquier persona sin autenticación puede:
  - Listar todas las categorías de todas las empresas
  - Ver estructura de catálogo de la organización (recon)
  - No puede crear/editar (POST, PATCH heredan permission_classes)

**Remediación:**
```python
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]  # ← AGREGAR
```

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-002: Acceso Público Sin Autenticación a FabricanteViewSet

**Severidad:** 🔴 CRÍTICO  
**CVSS Score:** 8.2  
**Archivo:** `backend/items/views.py`  
**Línea:** 20-23

```python
class FabricanteViewSet(viewsets.ModelViewSet):
    queryset = Fabricante.objects.all()
    serializer_class = FabricanteSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Mismo que CVE-ERP-001 (recon de proveedores, fabricantes)

**Remediación:** Agregar `permission_classes = [permissions.IsAuthenticated]`

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-003: Fuga Multi-tenancy - LicenciaViewSet Sin Filtro por Empresa

**Severidad:** 🔴 CRÍTICO  
**CVSS Score:** 9.0 (Muy Alto)  
**Archivo:** `backend/contratos/views.py`  
**Línea:** 530-531

```python
class LicenciaViewSet(viewsets.ModelViewSet):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    # ❌ SIN get_queryset() override - Expone TODAS las licencias de TODAS las empresas
```

**Impacto:**
- Usuario de Empresa A puede ver licencias de Empresa B, C, D, ...
- Usuario de Empresa A puede acceder a detalles de licencias ajenas
- Fuga de información confidencial sobre clientes y servicios

**Remediación:**
```python
class LicenciaViewSet(viewsets.ModelViewSet):
    queryset = Licencia.objects.all()
    serializer_class = LicenciaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return Licencia.objects.filter(
                empresa=personalizacion.sucursal_principal.empresa
            )
        return Licencia.objects.none()
```

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-004: Acceso Público a ServicioViewSet

**Severidad:** 🟡 ALTO  
**CVSS Score:** 7.5  
**Archivo:** `backend/contratos/views.py`  
**Línea:** 506-508

```python
class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Revelación de servicios ofrecidos, precios, características

**Remediación:** Agregar `permission_classes = [permissions.IsAuthenticated]`

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-005: Acceso Público a PlanServicioViewSet

**Severidad:** 🟡 ALTO  
**CVSS Score:** 7.5  
**Archivo:** `backend/contratos/views.py`  
**Línea:** 511-513

```python
class PlanServicioViewSet(viewsets.ModelViewSet):
    queryset = PlanServicio.objects.all()
    serializer_class = PlanServicioSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Fuga de información sobre planes y pricing

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-006: Acceso Público a CaracteristicaServicioViewSet

**Severidad:** 🟡 ALTO  
**CVSS Score:** 7.5  
**Archivo:** `backend/contratos/views.py`  
**Línea:** 515-517

```python
class CaracteristicaServicioViewSet(viewsets.ModelViewSet):
    queryset = CaracteristicaServicio.objects.all()
    serializer_class = CaracteristicaServicioSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Revelación de características de servicios

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-007: Acceso Público a VisitaViewSet (Plantilla)

**Severidad:** 🟡 ALTO  
**CVSS Score:** 7.5  
**Archivo:** `backend/contratos/views.py`  
**Línea:** 521-523

```python
class VisitaViewSet(viewsets.ModelViewSet):
    queryset = Visita.objects.all()
    serializer_class = VisitaSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Fuga de estructura de visitas de soporte

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-008: Acceso Público a CondicionEspecialViewSet

**Severidad:** 🟡 ALTO  
**CVSS Score:** 7.5  
**Archivo:** `backend/contratos/views.py`  
**Línea:** 527-529

```python
class CondicionEspecialViewSet(viewsets.ModelViewSet):
    queryset = CondicionEspecial.objects.all()
    serializer_class = CondicionEspecialSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Revelación de condiciones especiales contractuales

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-009: Acceso Público a SoftwareViewSet (Catálogo)

**Severidad:** 🟡 ALTO  
**CVSS Score:** 7.5  
**Archivo:** `backend/core/views.py`

```python
class SoftwareViewSet(viewsets.ModelViewSet):
    queryset = Software.objects.all()
    serializer_class = SoftwareSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Revelación de software usado en la organización

**Estatus corrección:** ⏳ PENDIENTE

---

### CVE-ERP-010: Acceso Público a AcuerdoConfidencialidadBaseViewSet

**Severidad:** 🟠 MEDIO  
**CVSS Score:** 6.5  
**Archivo:** `backend/core/views.py`

```python
class AcuerdoConfidencialidadBaseViewSet(viewsets.ModelViewSet):
    queryset = AcuerdoConfidencialidadBase.objects.all()
    serializer_class = AcuerdoConfidencialidadBaseSerializer
    # ❌ SIN permission_classes
```

**Impacto:** Revelación de términos confidenciales

**Estatus corrección:** ⏳ PENDIENTE

---

## Vulnerabilidades Altas (Sin Autenticación Explícita)

### RISK-HIGH-001: AsistenciaUsuarioViewSet Sin Filtro Multi-tenancy

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/visitas/views.py`  
**Línea:** 10-13

```python
class AsistenciaUsuarioViewSet(viewsets.ModelViewSet):
    queryset = AsistenciaUsuario.objects.all()
    serializer_class = AsistenciaUsuarioSerializer
    # ✅ Tiene permission_classes implícito (verificar)
    # ❌ PERO sin get_queryset() override - Expone datos de todas las empresas
    
    def get_queryset(self):
        return super().get_queryset().filter(visita_id=self.kwargs.get('visita_soporte_pk'))
        # ↑ Solo filtra por visita, NO por empresa
```

**Impacto:** Usuario de Empresa A podría ver asistencias de Empresa B si la URL es manipulada

**Remediación:** Agregar filtro por empresa en `get_queryset()`

---

### RISK-HIGH-002: EntregaDeEquipoViewSet Sin Filtro Explícito

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/visitas/views.py`

**Impacto:** Sin filtro multi-tenancy, expone entregas de todas las empresas

---

### RISK-HIGH-003: SoftwareInstaladoViewSet Sin Permission Classes

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/recursos/views.py`

```python
class SoftwareInstaladoViewSet(viewsets.ModelViewSet):
    queryset = SoftwareInstalado.objects.all()
    serializer_class = SoftwareInstaladoSerializer
    # ❌ SIN permission_classes ni filtro
```

**Impacto:** Acceso público a software instalado (inventario sensible)

---

### RISK-HIGH-004: UsuarioEquipoViewSet Sin Permission Classes

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/recursos/views.py`

---

### RISK-HIGH-005: MonitorEquipoViewSet Sin Permission Classes

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/recursos/views.py`

---

### RISK-HIGH-006: AlmacenamientoEquipoViewSet Sin Permission Classes

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/recursos/views.py`

---

### RISK-HIGH-007: FotoEquipoViewSet Sin Permission Classes

**Severidad:** ⚠️ ALTO  
**Archivo:** `backend/recursos/views.py`

---

## Vulnerabilidades Medias

### RISK-MED-001: ItemEmpresaViewset - Filtro Incompleto

**Severidad:** 🟠 MEDIO  
**Archivo:** `backend/items/views.py`

**Problema:**
```python
class ItemEmpresaViewset(viewsets.ModelViewSet):
    # Filtra por empresa_pk en URL
    def get_queryset(self):
        empresa_pk = self.kwargs.get('empresa_pk')
        if empresa_pk:
            return ItemEmpresa.objects.filter(empresa_id=empresa_pk)
        return ItemEmpresa.objects.all()  # ← Falla: Sin empresa_pk, retorna todos
```

**Impacto:** Si se accede SIN `empresa_pk` en URL, expone todos los items

**Remediación:** Agregar validación que requiera empresa_pk

---

## Plan de Remediación

### Fase 1: CRÍTICO (Esta semana)

- [ ] Agregar `permission_classes = [IsAuthenticated]` a:
  - `CategoriaViewSet`
  - `FabricanteViewSet`
  - `ServicioViewSet`
  - `PlanServicioViewSet`
  - `CaracteristicaServicioViewSet`
  - `VisitaViewSet`
  - `CondicionEspecialViewSet`
  - `SoftwareViewSet`
  - `AcuerdoConfidencialidadBaseViewSet`

- [ ] Implementar filtro multi-tenancy en `LicenciaViewSet`

- [ ] Tests de seguridad que validen aislamiento de datos

**Tiempo estimado:** 8-12 horas  
**Responsable:** Backend Lead

### Fase 2: ALTO (Próximas 2 semanas)

- [ ] Implementar filtro multi-tenancy en recursos (`UsuarioEquipoViewSet`, etc.)
- [ ] Crear custom permission `EsDeEmpresa` reutilizable
- [ ] Agregar `permission_classes` a viewsets de recursos
- [ ] Tests e integración

**Tiempo estimado:** 16-20 horas

### Fase 3: MEDIO (Sprint siguiente)

- [ ] Middleware de auditoría (loguear accesos)
- [ ] Rate limiting en endpoints públicos
- [ ] Renovación de documentación de seguridad

---

## Métricas de Riesgo

| Métrica | Antes | Objetivo |
|---------|-------|----------|
| **ViewSets sin permission_classes** | 10+ | 0 |
| **ViewSets sin filtro multi-tenancy** | 15+ | 0 |
| **Vulnerabilidades críticas** | 10 | 0 |
| **Cobertura de tests de seguridad** | 0% | >80% |

---

## Aprobación y Seguimiento

- **Auditoría realizada por:** Agente de IA (Copilot)
- **Fecha de auditoría:** 2025-02-12
- **Siguiente review:** 2025-02-19
- **Responsable de fix:** Equipo Backend
- **Estado de corrección:** 🔴 PENDIENTE

---

**NOTA:** Este documento debe actualizarse conforme se corrijan vulnerabilidades. Cada fix debe registrarse con fecha y responsable.

Última actualización: 2025-02-12
