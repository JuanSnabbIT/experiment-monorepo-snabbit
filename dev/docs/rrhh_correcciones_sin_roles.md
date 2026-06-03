# 🔧 CORRECCIONES RRHH - SIN MOTOR DE ROLES (IMPLEMENTABLES AHORA)

**Status:** Motor de roles NO existe aún - fuera de scope  
**Correcciones implementables:** 4 de 5  
**Timeline:** 1 hora 20 minutos  
**Riesgo:** Bajo

---

## 📊 RESUMEN SIN ROLES

```
VULNERABILIDADES ENCONTRADAS: 5
├─ ❌ SIN VALIDACIÓN ROLES: FIX #1 (BLOQUEADO - no existe motor)
├─ ✅ Ownership en CREATE: FIX #2 (IMPLEMENTABLE AHORA)
├─ ✅ Anexos sin vigente: FIX #3 (IMPLEMENTABLE AHORA)  
├─ ✅ Terminar sin motivo: FIX #4 (IMPLEMENTABLE AHORA)
└─ ✅ Gate aprobación débil: FIX #5 (IMPLEMENTABLE AHORA)

IMPLEMENTABLES AHORA: 4 vulnerabilidades (3 ALTA + 1 CRÍTICA)
FUERA DE SCOPE: 1 (FIX #1 - requiere motor de roles)
```

---

## ✅ FIX #1: VALIDACIÓN DE OWNERSHIP EN CREATE

**Severidad:** 🔴 CRÍTICA  
**Esfuerzo:** 45 minutos  
**Archivo:** `backend/rrhh/views.py`  
**Por qué es crítica:** Usuario A podría crear contrato para trabajador de Empresa B

### CAMBIO

```python
# backend/rrhh/views.py línea ~620

def crear_con_trabajador(self, request):
    """
    Crea (o reusa) un UsuarioEmpresa y le asocia un contrato laboral 
    en una sola operacion.
    
    ADICIONADO: Validación de ownership de empresa/sucursal
    """
    validador = CrearContratoConTrabajadorSerializer(data=request.data)
    validador.is_valid(raise_exception=True)
    trabajador_data = validador.validated_data["trabajador"]
    contrato_data = dict(validador.validated_data["contrato"])

    empresa = _empresa_actual(request)
    if not empresa:
        return Response(
            {"detail": "Usuario sin empresa asociada."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    ids_visibles = [empresa.id, *_empresas_clientes_ids(empresa)]

    # ============================================================
    # VALIDACIÓN DE OWNERSHIP
    # ============================================================
    
    if trabajador_data["modo"] == "existente":
        # Validar que UsuarioEmpresa pertenece a empresa del usuario
        ue_id = trabajador_data["usuario_empresa_id"]
        ue = UsuarioEmpresa.objects.filter(
            pk=ue_id,
            sucursal__empresa_id__in=ids_visibles  # ← VALIDACIÓN
        ).first()
        
        if not ue:
            return Response(
                {
                    "detail": (
                        "UsuarioEmpresa no encontrado o fuera de tu alcance. "
                        "Debe pertenecer a tu empresa o uno de tus clientes."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    
    else:  # modo == "nuevo"
        # Validar que sucursal pertenece a empresa del usuario
        sucursal_id = trabajador_data["sucursal_id"]
        sucursal = SucursalEmpresa.objects.filter(
            pk=sucursal_id,
            empresa_id__in=ids_visibles  # ← VALIDACIÓN
        ).first()
        
        if not sucursal:
            return Response(
                {
                    "detail": (
                        "Sucursal no encontrada o fuera de tu alcance. "
                        "Debe pertenecer a tu empresa o uno de tus clientes."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    
    # ============================================================
    # Resto del código igual
    # ============================================================

    invitacion_enviada = False
    # ... crear usuario/contrato (sin cambios)
```

### TEST

```python
def test_crear_contrato_usuario_empresa_ajena_error(self):
    """Usuario A NO puede crear contrato para usuario de Empresa B"""
    
    # Empresas
    empresa_a = Empresa.objects.create(nombre="Empresa A")
    empresa_b = Empresa.objects.create(nombre="Empresa B")
    
    # Sucursales
    sucursal_a = SucursalEmpresa.objects.create(empresa=empresa_a, nombre="Centro A")
    sucursal_b = SucursalEmpresa.objects.create(empresa=empresa_b, nombre="Centro B")
    
    # Usuario A (Empresa A)
    usuario_a = User.objects.create_user(username='rrhh_a')
    usuario_a.personalizacion = PersonalizacionUsuario.objects.create(
        usuario=usuario_a,
        sucursal_principal=sucursal_a
    )
    
    # Usuario B (Empresa B)
    user_b = User.objects.create_user(username='trabajador_b')
    ue_b = UsuarioEmpresa.objects.create(
        usuario=user_b,
        sucursal=sucursal_b
    )
    
    # Usuario A intenta crear contrato para ue_b
    self.client.force_authenticate(user=usuario_a)
    
    response = self.client.post(
        '/api/rrhh/contratos/crear-con-trabajador/',
        {
            "trabajador": {
                "modo": "existente",
                "usuario_empresa_id": ue_b.id  # ← De Empresa B
            },
            "contrato": {...}
        },
        format='json'
    )
    
    # Debe fallar
    self.assertEqual(response.status_code, 400)
    self.assertIn("fuera de tu alcance", response.data['detail'])
```

---

## ✅ FIX #2: VALIDAR ANEXO EN VIGENTE

**Severidad:** 🟠 ALTA  
**Esfuerzo:** 20 minutos  
**Archivo:** `backend/rrhh/views.py`  
**Por qué es importante:** Anexos solo pueden crearse en contratos vigentes

### CAMBIO

```python
# backend/rrhh/views.py línea ~348

class AnexoContratoViewSet(viewsets.ModelViewSet):
    serializer_class = AnexoContratoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        empresa = _empresa_actual(self.request)
        if not empresa:
            return AnexoContrato.objects.none()
        ids_visibles = [empresa.id, *_empresas_clientes_ids(empresa)]
        qs = AnexoContrato.objects.filter(
            contrato__usuario_empresa__sucursal__empresa_id__in=ids_visibles,
        ).select_related("contrato")
        contrato_id = self.request.query_params.get("contrato")
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)
        return qs.order_by("-fecha_efectiva", "-fecha_creacion")

    def perform_create(self, serializer):
        # ============================================================
        # VALIDAR ESTADO VIGENTE
        # ============================================================
        
        anexo = serializer.save(creado_por=self.request.user)
        
        # Validar que contrato sea vigente
        if anexo.contrato.estado != "vigente":
            # Rollback
            anexo.delete()
            raise ValidationError(
                {
                    "error": "Anexo no permitido en este estado",
                    "detail": (
                        f"Solo se crean anexos en contratos VIGENTE. "
                        f"Estado actual: {anexo.contrato.estado}"
                    ),
                    "estado_contrato": anexo.contrato.estado,
                }
            )
        
        # ============================================================
        
        # Resto igual: actualizar fecha_termino si prórroga
        if anexo.tipo == "prorroga" and anexo.nueva_fecha_termino:
            contrato = anexo.contrato
            contrato.fecha_termino = anexo.nueva_fecha_termino
            contrato.save(update_fields=["fecha_termino"])
```

### TEST

```python
def test_crear_anexo_borrador_error(self):
    """No se puede crear anexo en contrato BORRADOR"""
    contrato = ContratoTrabajador.objects.create(
        estado='borrador',  # ← No vigente
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/anexos/',
        {"tipo": "modificacion_sueldo", "fecha_efectiva": "2025-06-01", "descripcion": "..."},
        format='json'
    )
    
    self.assertEqual(response.status_code, 400)
    self.assertEqual(AnexoContrato.objects.filter(contrato=contrato).count(), 0)

def test_crear_anexo_vigente_ok(self):
    """Se puede crear anexo en contrato VIGENTE"""
    contrato = ContratoTrabajador.objects.create(
        estado='vigente',  # ← Vigente ✓
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/anexos/',
        {"tipo": "modificacion_sueldo", "fecha_efectiva": "2025-06-01", "descripcion": "..."},
        format='json'
    )
    
    self.assertEqual(response.status_code, 201)
    self.assertEqual(AnexoContrato.objects.filter(contrato=contrato).count(), 1)
```

---

## ✅ FIX #3: TERMINAR REQUIERE MOTIVO OBLIGATORIO

**Severidad:** 🟠 ALTA  
**Esfuerzo:** 15 minutos  
**Archivo:** `backend/rrhh/views.py`  
**Por qué es importante:** Legal - auditoría completa del fin del contrato

### CAMBIO

```python
# backend/rrhh/views.py línea ~429

# En el método cambiar_estado()

if nuevo_estado == "terminado":
    # ============================================================
    # VALIDAR MOTIVO OBLIGATORIO
    # ============================================================
    
    motivo = (request.data.get("motivo_termino") or "").strip()
    if not motivo:
        return Response(
            {
                "motivo_termino": (
                    "Este campo es requerido al terminar un contrato. "
                    "Opciones: renuncia, mutuo_acuerdo, vencimiento_plazo, "
                    "necesidades_empresa, incumplimiento_grave, falta_probidad, "
                    "inasistencias_injustificadas, abandono_trabajo, "
                    "caso_fortuito_fuerza_mayor, otro"
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ============================================================
    
    contrato.fecha_termino_real = (
        request.data.get("fecha_termino_real") or timezone.now().date()
    )
    contrato.motivo_termino = motivo
    observaciones = request.data.get("observaciones_termino")
    if observaciones is not None:
        contrato.observaciones_termino = observaciones
```

### TEST

```python
def test_terminar_sin_motivo_error(self):
    """No se puede terminar sin motivo"""
    contrato = ContratoTrabajador.objects.create(
        estado='vigente',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/cambiar-estado/',
        {"estado": "terminado", "fecha_termino_real": "2025-06-01"},
        # motivo_termino: OMITIDO
        format='json'
    )
    
    self.assertEqual(response.status_code, 400)
    self.assertIn("motivo_termino", response.data)

def test_terminar_con_motivo_ok(self):
    """Se puede terminar CON motivo"""
    contrato = ContratoTrabajador.objects.create(
        estado='vigente',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/cambiar-estado/',
        {
            "estado": "terminado",
            "motivo_termino": "renuncia",
            "fecha_termino_real": "2025-06-01"
        },
        format='json'
    )
    
    self.assertEqual(response.status_code, 200)
    contrato.refresh_from_db()
    self.assertEqual(contrato.motivo_termino, 'renuncia')
```

---

## ✅ FIX #4: REFORZAR GATE DE APROBACIÓN

**Severidad:** 🔴 CRÍTICA  
**Esfuerzo:** 20 minutos  
**Archivo:** `backend/rrhh/views.py`  
**Por qué es crítica:** Contrato podría pasar a vigente sin aprobación empleador

### CAMBIO

```python
# backend/rrhh/views.py línea ~452

@action(detail=True, methods=["post"], url_path="aceptar")
def aceptar(self, request, pk=None):
    """Acepta contrato si empleador aprobó"""
    contrato = self.get_object()

    if contrato.estado != "pendiente_aprobacion":
        return Response(
            {
                "detail": "Solo se aceptan contratos en 'pendiente_aprobacion'",
                "estado_actual": contrato.estado,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # GATE FUERTE - VALIDAR APROBACIÓN
    # ============================================================
    
    envio_activo = contrato.envios_aprobacion_empleador.filter(
        expirado=False
    ).order_by("-fecha_envio").first()
    
    # Si NO hay envio activo: error
    if not envio_activo:
        return Response(
            {
                "detail": (
                    "No hay envío de aprobación activo. "
                    "Debe enviar el contrato al empleador primero."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # Si hay envio pero NO fue APROBADO: error
    if envio_activo.decision != "aprobado":
        DECISION_LABELS = {
            "pendiente": "Aún pendiente de respuesta",
            "rechazado": "Rechazado por el empleador",
            "cambios_solicitados": "Empleador solicitó cambios",
        }
        label = DECISION_LABELS.get(envio_activo.decision, envio_activo.decision)
        
        return Response(
            {
                "detail": f"Empleador no aprobó. Estado: {label}",
                "decision": envio_activo.decision,
                "fecha_respuesta": envio_activo.fecha_respuesta,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ============================================================
    # Ahora sí permitir aceptar
    # ============================================================

    contrato.estado = "vigente"
    contrato.fecha_aprobacion = timezone.now()
    contrato.aceptado_por = request.user

    ue = contrato.usuario_empresa
    if contrato.cargo:
        ue.cargo = contrato.cargo
    if contrato.fecha_inicio and not ue.fecha_contrato:
        ue.fecha_contrato = contrato.fecha_inicio
    ue.save(update_fields=["cargo", "fecha_contrato"])

    contrato.save()
    return Response(ContratoTrabajadorSerializer(contrato).data)
```

### TEST

```python
def test_aceptar_sin_envio_error(self):
    """No se puede aceptar sin envío activo"""
    contrato = ContratoTrabajador.objects.create(
        estado='pendiente_aprobacion',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    # SIN crear EnvioAprobacionEmpleador
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/aceptar/',
        format='json'
    )
    
    self.assertEqual(response.status_code, 400)
    self.assertIn("No hay envío", response.data['detail'])

def test_aceptar_sin_aprobacion_error(self):
    """No se puede aceptar si empleador NO aprobó"""
    contrato = ContratoTrabajador.objects.create(
        estado='pendiente_aprobacion',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    EnvioAprobacionEmpleador.objects.create(
        contrato=contrato,
        pdf_congelado=b'pdf',
        enviado_a='jefe@empresa.com',
        decision='rechazado',  # ← NO aprobado
        fecha_respuesta=timezone.now()
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/aceptar/',
        format='json'
    )
    
    self.assertEqual(response.status_code, 400)
    self.assertIn("no aprobó", response.data['detail'])

def test_aceptar_aprobado_ok(self):
    """Se puede aceptar si empleador APROBÓ"""
    contrato = ContratoTrabajador.objects.create(
        estado='pendiente_aprobacion',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    EnvioAprobacionEmpleador.objects.create(
        contrato=contrato,
        pdf_congelado=b'pdf',
        enviado_a='jefe@empresa.com',
        decision='aprobado',  # ← APROBADO
        fecha_respuesta=timezone.now()
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/aceptar/',
        format='json'
    )
    
    self.assertEqual(response.status_code, 200)
    contrato.refresh_from_db()
    self.assertEqual(contrato.estado, 'vigente')
```

---

## 📊 RESUMEN IMPLEMENTABLE

```
┌────────────────────────────────────────────────────────┐
│       FIX                  │ Tiempo │ Severidad       │
├────────────────────────────────────────────────────────┤
│ FIX #1: Ownership CREATE   │ 45 min │ 🔴 CRÍTICA      │
│ FIX #2: Anexo vigente      │ 20 min │ 🟠 ALTA         │
│ FIX #3: Motivo termino     │ 15 min │ 🟠 ALTA         │
│ FIX #4: Gate aprobación    │ 20 min │ 🔴 CRÍTICA      │
├────────────────────────────────────────────────────────┤
│ TOTAL                      │ 1h 40m │ 2 CRÍTICA + 2 ALTA
└────────────────────────────────────────────────────────┘

FUERA DE SCOPE (requiere motor de roles):
  ❌ FIX #0: Validación de rol RRHH
     Estado: BLOQUEADO - no existe motor de roles
     Será implementado cuando exista sistema de permisos
```

---

## ✅ CHECKLIST IMPLEMENTACIÓN

```
[ ] FIX #1: Ownership en CREATE (45 min)
    [ ] Modificar crear_con_trabajador()
    [ ] Validar UsuarioEmpresa.empresa
    [ ] Validar SucursalEmpresa.empresa
    [ ] Tests

[ ] FIX #2: Anexo vigente (20 min)
    [ ] Modificar AnexoContratoViewSet.perform_create()
    [ ] Validar estado vigente
    [ ] Rollback si no es vigente
    [ ] Tests

[ ] FIX #3: Motivo termino (15 min)
    [ ] Modificar cambiar_estado() para "terminado"
    [ ] Hacer motivo obligatorio
    [ ] Tests

[ ] FIX #4: Gate aprobación (20 min)
    [ ] Modificar aceptar()
    [ ] Validar envio_activo existe
    [ ] Validar decision == "aprobado"
    [ ] Tests

[ ] TESTING: Unit tests todos pasan
[ ] CODE REVIEW
[ ] MERGE a develop
```

---

## ⏱️ TIMELINE

**Desarrollo:** 1h 40min  
**Testing:** 20min  
**Code Review:** 15min  
**TOTAL:** 2h 15min  

**Riesgo de Regresión:** Bajo (cambios quirúrgicos)

