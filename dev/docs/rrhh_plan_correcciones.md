# 🔧 PLAN DE CORRECCIONES: RRHH Contratos Laborales

**Prioridad:** CRÍTICA  
**Timeline:** 2.5 horas  
**Riesgo de Regresión:** Bajo  
**Testing:** Unit tests + Postman

---

## 📋 CORRECCIONES ORDENADAS POR PRIORIDAD

---

## FIX #1: AGREGAR VALIDACIÓN DE ROL RRHH (CRÍTICA)
**Severidad:** 🔴 CRÍTICA  
**Esfuerzo:** 30 minutos  
**Archivo:** `backend/rrhh/permissions.py` (CREAR) + `backend/rrhh/views.py`

### PASO 1: Crear clase de permiso

```python
# backend/rrhh/permissions.py (NUEVO ARCHIVO)

from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Group

class IsRRHH(BasePermission):
    """
    Solo usuarios en grupo 'rrhh' pueden acceder.
    
    Verifica que el usuario:
    1. Esté autenticado
    2. Sea parte del grupo 'rrhh'
    
    Alternativas:
    - Validar is_staff=True
    - Validar permisos específicos ('rrhh.add_contrato_trabajador')
    - Validar rol en tabla de roles personalizada
    """
    message = "Solo usuarios RRHH tienen acceso a esta operación."
    
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.groups.filter(name='rrhh').exists()
        )
```

### PASO 2: Aplicar a todos los ViewSets RRHH

```python
# backend/rrhh/views.py

from rest_framework.permissions import IsAuthenticated
from .permissions import IsRRHH  # ← IMPORT

# ViewSet 1: Cargos
class CargoCatalogoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual

# ViewSet 2: AFP
class AfpCatalogoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual

# ViewSet 3: Bancos
class BancoCatalogoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual

# ViewSet 4: Configuración Laboral
class ConfiguracionLaboralViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual

# ViewSet 5: Turnos Laborales
class TurnoLaboralViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual

# ViewSet 6: Anexos
class AnexoContratoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual

# ViewSet 7: CONTRATO (principal)
class ContratoTrabajadorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsRRHH]  # ← AGREGAR IsRRHH
    # ... resto igual
```

### PASO 3: Crear migración para agregar grupo RRHH

```python
# backend/rrhh/migrations/0018_create_rrhh_group.py

from django.db import migrations
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

def create_rrhh_group(apps, schema_editor):
    """Crea grupo 'rrhh' con permisos necesarios"""
    
    # Crear grupo
    rrhh_group, created = Group.objects.get_or_create(name='rrhh')
    
    if created:
        # Asignar permisos relevantes (opcional, si usas permisos granulares)
        # Por ahora, solo la membresía en grupo es suficiente
        
        ContratoTrabajador = apps.get_model('rrhh', 'ContratoTrabajador')
        AnexoContrato = apps.get_model('rrhh', 'AnexoContrato')
        
        permisos = Permission.objects.filter(
            content_type__in=[
                ContentType.objects.get_for_model(ContratoTrabajador),
                ContentType.objects.get_for_model(AnexoContrato),
            ]
        )
        
        rrhh_group.permissions.set(permisos)

def reverse_rrhh_group(apps, schema_editor):
    """Elimina grupo 'rrhh'"""
    Group.objects.filter(name='rrhh').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('rrhh', '0017_add_turno_laboral'),
    ]
    
    operations = [
        migrations.RunPython(create_rrhh_group, reverse_rrhh_group),
    ]
```

### PASO 4: Asignar usuarios RRHH al grupo

```bash
# En shell Django:
from django.contrib.auth.models import User, Group

rrhh_group = Group.objects.get(name='rrhh')

# Agregar usuario a grupo RRHH
usuario = User.objects.get(username='juan.rrhh')
rrhh_group.user_set.add(usuario)
```

### TESTING

```python
# backend/rrhh/tests/test_permissions.py (NUEVO)

from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User, Group

class RRHHPermissionTests(APITestCase):
    
    def setUp(self):
        self.client = APIClient()
        
        # Usuario RRHH
        self.rrhh_user = User.objects.create_user(
            username='juan.rrhh',
            email='juan@rrhh.com',
            password='pass123'
        )
        rrhh_group = Group.objects.get_or_create(name='rrhh')[0]
        rrhh_group.user_set.add(self.rrhh_user)
        
        # Usuario NO RRHH
        self.contador_user = User.objects.create_user(
            username='carlos.contador',
            email='carlos@empresa.com',
            password='pass123'
        )
    
    def test_rrhh_puede_crear_contrato(self):
        """RRHH autenticado puede crear contrato"""
        self.client.force_authenticate(user=self.rrhh_user)
        
        response = self.client.post(
            '/api/rrhh/contratos/crear-con-trabajador/',
            data={...},
            format='json'
        )
        
        self.assertEqual(response.status_code, 201)
    
    def test_no_rrhh_no_puede_crear_contrato(self):
        """Usuario no-RRHH recibe 403"""
        self.client.force_authenticate(user=self.contador_user)
        
        response = self.client.post(
            '/api/rrhh/contratos/crear-con-trabajador/',
            data={...},
            format='json'
        )
        
        self.assertEqual(response.status_code, 403)
        self.assertIn('RRHH', response.data['detail'])
    
    def test_no_autenticado_no_puede_crear(self):
        """Usuario no autenticado recibe 401"""
        response = self.client.post(
            '/api/rrhh/contratos/crear-con-trabajador/',
            data={...},
            format='json'
        )
        
        self.assertEqual(response.status_code, 401)
```

---

## FIX #2: VALIDAR OWNERSHIP EN CREATE (CRÍTICA)
**Severidad:** 🔴 CRÍTICA  
**Esfuerzo:** 45 minutos  
**Archivo:** `backend/rrhh/views.py`

### CAMBIO EN ContratoTrabajadorViewSet

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
    # FIX #2: VALIDACIÓN DE OWNERSHIP
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
    # FIN FIX #2
    # ============================================================

    # Resto del código igual (línea ~636+)
    invitacion_enviada = False
    
    # ... crear usuario/contrato (resto sin cambios)
```

### TESTING

```python
# backend/rrhh/tests/test_ownership.py (NUEVO)

from rest_framework.test import APITestCase
from django.contrib.auth.models import User, Group
from empresas.models import Empresa, SucursalEmpresa, UsuarioEmpresa

class OwnershipValidationTests(APITestCase):
    
    def setUp(self):
        # Empresas
        self.empresa_a = Empresa.objects.create(nombre="Empresa A")
        self.empresa_b = Empresa.objects.create(nombre="Empresa B")
        
        # Sucursales
        self.sucursal_a = SucursalEmpresa.objects.create(
            empresa=self.empresa_a,
            nombre="Centro A"
        )
        self.sucursal_b = SucursalEmpresa.objects.create(
            empresa=self.empresa_b,
            nombre="Centro B"
        )
        
        # Usuarios
        self.rrhh_a = User.objects.create_user(username='rrhh_a')
        self.rrhh_a.groups.add(Group.objects.get(name='rrhh'))
        self.rrhh_a.personalizacion = PersonalizacionUsuario.objects.create(
            usuario=self.rrhh_a,
            sucursal_principal=self.sucursal_a
        )
        
        # Usuario empresa (pertenece a Empresa B)
        self.user_b = User.objects.create_user(username='user_b')
        self.ue_b = UsuarioEmpresa.objects.create(
            usuario=self.user_b,
            sucursal=self.sucursal_b
        )
    
    def test_crear_contrato_usuario_empresa_propio(self):
        """RRHH A puede crear contrato para trabajador de su empresa"""
        self.client.force_authenticate(user=self.rrhh_a)
        
        response = self.client.post(
            '/api/rrhh/contratos/crear-con-trabajador/',
            {
                "trabajador": {
                    "modo": "existente",
                    "usuario_empresa_id": self.ue_b.id  # ← De Empresa B (ajena)
                },
                "contrato": {...}
            },
            format='json'
        )
        
        # Debe fallar: usuario_empresa no pertenece a empresa de RRHH_A
        self.assertEqual(response.status_code, 400)
        self.assertIn("fuera de tu alcance", response.data['detail'])
    
    def test_crear_contrato_sucursal_propia(self):
        """RRHH A puede crear contrato nuevo en su sucursal"""
        self.client.force_authenticate(user=self.rrhh_a)
        
        response = self.client.post(
            '/api/rrhh/contratos/crear-con-trabajador/',
            {
                "trabajador": {
                    "modo": "nuevo",
                    "email": "nuevo@email.com",
                    "first_name": "Juan",
                    "sucursal_id": self.sucursal_a.id  # ← De su empresa ✓
                },
                "contrato": {...}
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, 201)
```

---

## FIX #3: VALIDAR ANEXO EN VIGENTE (ALTA)
**Severidad:** 🟠 ALTA  
**Esfuerzo:** 20 minutos  
**Archivo:** `backend/rrhh/views.py`

### CAMBIO EN AnexoContratoViewSet

```python
# backend/rrhh/views.py línea ~348

class AnexoContratoViewSet(viewsets.ModelViewSet):
    serializer_class = AnexoContratoSerializer
    permission_classes = [IsAuthenticated, IsRRHH]  # (FIX #1)
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
        # FIX #3: VALIDAR ESTADO VIGENTE
        # ============================================================
        
        anexo = serializer.save(creado_por=self.request.user)
        
        # Validar que contrato sea vigente
        if anexo.contrato.estado != "vigente":
            # Rollback: eliminar el anexo creado
            anexo.delete()
            raise ValidationError(
                {
                    "error": "Anexo no permitido en este estado",
                    "detail": (
                        f"Solo se crean anexos en contratos VIGENTE. "
                        f"Estado actual del contrato: {anexo.contrato.estado}"
                    ),
                    "estado_contrato": anexo.contrato.estado,
                    "estados_permitidos": ["vigente"],
                }
            )
        
        # ============================================================
        # FIN FIX #3
        # ============================================================
        
        # Resto del código igual (actualizar fecha_termino si prórroga)
        if anexo.tipo == "prorroga" and anexo.nueva_fecha_termino:
            contrato = anexo.contrato
            contrato.fecha_termino = anexo.nueva_fecha_termino
            contrato.save(update_fields=["fecha_termino"])
```

### TESTING

```python
# backend/rrhh/tests/test_anexos.py

def test_crear_anexo_en_borrador_error(self):
    """No se puede crear anexo si contrato está en borrador"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
        estado='borrador',  # ← Borrador, no vigente
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/anexos/',
        {
            "tipo": "modificacion_sueldo",
            "fecha_efectiva": "2025-06-01",
            "descripcion": "Cambio sueldo"
        },
        format='json'
    )
    
    # Debe fallar
    self.assertEqual(response.status_code, 400)
    self.assertIn("vigente", response.data['detail'])
    
    # Anexo no debe existir
    self.assertEqual(
        AnexoContrato.objects.filter(contrato=contrato).count(),
        0
    )

def test_crear_anexo_vigente_ok(self):
    """Se puede crear anexo si contrato está vigente"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
        estado='vigente',  # ← Vigente ✓
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/anexos/',
        {
            "tipo": "modificacion_sueldo",
            "fecha_efectiva": "2025-06-01",
            "descripcion": "Cambio de 1.5M a 1.6M"
        },
        format='json'
    )
    
    # Debe funcionar
    self.assertEqual(response.status_code, 201)
    
    # Anexo debe existir
    self.assertEqual(
        AnexoContrato.objects.filter(contrato=contrato).count(),
        1
    )
```

---

## FIX #4: TERMINAR REQUIERE MOTIVO (ALTA)
**Severidad:** 🟠 ALTA  
**Esfuerzo:** 15 minutos  
**Archivo:** `backend/rrhh/views.py`

### CAMBIO EN cambiar_estado

```python
# backend/rrhh/views.py línea ~429

# ... en cambiar_estado()

if nuevo_estado == "terminado":
    # ============================================================
    # FIX #4: VALIDAR MOTIVO OBLIGATORIO
    # ============================================================
    
    motivo = (request.data.get("motivo_termino") or "").strip()
    if not motivo:
        return Response(
            {
                "motivo_termino": (
                    "Este campo es requerido al terminar un contrato. "
                    "Opciones: renuncia, mutuo_acuerdo, vencimiento_plazo, "
                    "necesidades_empresa, incumplimiento_grave, "
                    "falta_probidad, inasistencias_injustificadas, "
                    "abandono_trabajo, caso_fortuito_fuerza_mayor, otro"
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ============================================================
    # FIN FIX #4
    # ============================================================
    
    contrato.fecha_termino_real = (
        request.data.get("fecha_termino_real") or timezone.now().date()
    )
    contrato.motivo_termino = motivo
    observaciones = request.data.get("observaciones_termino")
    if observaciones is not None:
        contrato.observaciones_termino = observaciones
```

### TESTING

```python
def test_terminar_sin_motivo_error(self):
    """No se puede terminar sin motivo"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
        estado='vigente',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/cambiar-estado/',
        {
            "estado": "terminado",
            "fecha_termino_real": "2025-06-01"
            # motivo_termino: OMITIDO
        },
        format='json'
    )
    
    # Debe fallar
    self.assertEqual(response.status_code, 400)
    self.assertIn("motivo_termino", response.data)
    
    # Contrato sigue vigente
    contrato.refresh_from_db()
    self.assertEqual(contrato.estado, 'vigente')

def test_terminar_con_motivo_ok(self):
    """Se puede terminar CON motivo"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
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
    
    # Debe funcionar
    self.assertEqual(response.status_code, 200)
    
    # Contrato terminado
    contrato.refresh_from_db()
    self.assertEqual(contrato.estado, 'terminado')
    self.assertEqual(contrato.motivo_termino, 'renuncia')
```

---

## FIX #5: REFORZAR GATE DE APROBACIÓN (CRÍTICA)
**Severidad:** 🔴 CRÍTICA  
**Esfuerzo:** 20 minutos  
**Archivo:** `backend/rrhh/views.py`

### CAMBIO EN aceptar

```python
# backend/rrhh/views.py línea ~452

@action(detail=True, methods=["post"], url_path="aceptar")
def aceptar(self, request, pk=None):
    """
    Acepta un contrato en 'pendiente_aprobacion' si empleador aprobó.
    Transiciona a 'vigente' y registra aprobación.
    
    ADICIONADO: Gate más fuerte para validar aprobación
    """
    contrato = self.get_object()

    if contrato.estado != "pendiente_aprobacion":
        return Response(
            {
                "detail": "Solo se pueden aceptar contratos en estado 'pendiente_aprobacion'.",
                "estado_actual": contrato.estado,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ============================================================
    # FIX #5: GATE FUERTE - VALIDAR APROBACIÓN
    # ============================================================
    
    # Buscar envio activo no expirado
    envio_activo = contrato.envios_aprobacion_empleador.filter(
        expirado=False
    ).order_by("-fecha_envio").first()
    
    # Si NO hay envio: error
    if not envio_activo:
        return Response(
            {
                "detail": (
                    "No hay envío de aprobación activo o vigente. "
                    "Debe enviar el contrato al empleador primero."
                ),
                "envios_totales": contrato.envios_aprobacion_empleador.count(),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # Si hay envio pero NO fue aprobado: error
    if envio_activo.decision != "aprobado":
        DECISION_LABELS = {
            "pendiente": "Aún pendiente de respuesta",
            "rechazado": "Rechazado por el empleador",
            "cambios_solicitados": "Empleador solicitó cambios",
        }
        label = DECISION_LABELS.get(
            envio_activo.decision,
            envio_activo.decision
        )
        
        return Response(
            {
                "detail": (
                    f"No se puede aceptar: empleador no aprobó. "
                    f"Estado: {label}"
                ),
                "decision": envio_activo.decision,
                "decision_label": envio_activo.get_decision_display(),
                "fecha_respuesta": envio_activo.fecha_respuesta,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ============================================================
    # FIN FIX #5 - Ahora sí permite aceptar
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

### TESTING

```python
def test_aceptar_sin_envio_error(self):
    """No se puede aceptar sin envío de aprobación"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
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
    
    # Debe fallar
    self.assertEqual(response.status_code, 400)
    self.assertIn("No hay envío", response.data['detail'])

def test_aceptar_sin_aprobacion_error(self):
    """No se puede aceptar si empleador rechazó"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
        estado='pendiente_aprobacion',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    envio = EnvioAprobacionEmpleador.objects.create(
        contrato=contrato,
        pdf_congelado=b'fake_pdf',
        enviado_a='jefe@empresa.com',
        decision='rechazado',  # ← RECHAZADO
        motivo_rechazo='Cargo no existe',
        fecha_respuesta=timezone.now()
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/aceptar/',
        format='json'
    )
    
    # Debe fallar
    self.assertEqual(response.status_code, 400)
    self.assertIn("empleador no aprobó", response.data['detail'])

def test_aceptar_aprobado_ok(self):
    """Se puede aceptar si empleador aprobó"""
    contrato = ContratoTrabajador.objects.create(
        usuario_empresa=self.ue,
        estado='pendiente_aprobacion',
        tipo_contrato='indefinido',
        fecha_inicio='2025-01-01',
        cargo='Ingeniero'
    )
    
    envio = EnvioAprobacionEmpleador.objects.create(
        contrato=contrato,
        pdf_congelado=b'fake_pdf',
        enviado_a='jefe@empresa.com',
        decision='aprobado',  # ← APROBADO
        fecha_respuesta=timezone.now()
    )
    
    response = self.client.post(
        f'/api/rrhh/contratos/{contrato.id}/aceptar/',
        format='json'
    )
    
    # Debe funcionar
    self.assertEqual(response.status_code, 200)
    
    # Contrato vigente
    contrato.refresh_from_db()
    self.assertEqual(contrato.estado, 'vigente')
    self.assertIsNotNone(contrato.fecha_aprobacion)
```

---

## 📊 CHECKLIST DE IMPLEMENTACIÓN

```
[ ] FIX #1: Crear IsRRHH permission
    [ ] Crear backend/rrhh/permissions.py
    [ ] Aplicar a todos 7 ViewSets
    [ ] Crear migración: create_rrhh_group
    [ ] Escribir tests

[ ] FIX #2: Validar ownership en CREATE
    [ ] Modificar crear_con_trabajador()
    [ ] Validar UsuarioEmpresa.empresa
    [ ] Validar SucursalEmpresa.empresa
    [ ] Escribir tests

[ ] FIX #3: Validar anexo en vigente
    [ ] Modificar AnexoContratoViewSet.perform_create()
    [ ] Agregar check estado vigente
    [ ] Rollback si no es vigente
    [ ] Escribir tests

[ ] FIX #4: Terminar requiere motivo
    [ ] Modificar cambiar_estado() para "terminado"
    [ ] Hacer motivo obligatorio
    [ ] Validar contra MOTIVO_TERMINO choices
    [ ] Escribir tests

[ ] FIX #5: Reforzar gate aprobación
    [ ] Modificar aceptar()
    [ ] Validar envio_activo no es None
    [ ] Validar decision == "aprobado"
    [ ] Mejorar mensajes de error
    [ ] Escribir tests

[ ] TESTING
    [ ] Ejecutar todos los tests new
    [ ] Test cases de violación (seguridad)
    [ ] Test cases de flujo normal
    [ ] Postman: 5 fixes principales

[ ] CODE REVIEW
    [ ] Self-review código
    [ ] Verificar no hay regressions
    [ ] Update CHANGELOG

[ ] DEPLOY
    [ ] Merge a develop
    [ ] Pull request a main
    [ ] Deploy a staging
    [ ] Deploy a producción
```

---

## ⏱️ TIMELINE ESTIMADO

| Tarea | Tiempo |
|-------|--------|
| FIX #1 (rol) | 30 min |
| FIX #2 (ownership) | 45 min |
| FIX #3 (anexo) | 20 min |
| FIX #4 (motivo) | 15 min |
| FIX #5 (aprobación) | 20 min |
| **Testing + Code Review** | 30 min |
| **TOTAL** | **2 horas 40 min** |

---

## 🎯 EJECUCIÓN RECOMENDADA

1. **Orden de implementación:** FIX #1 → #2 → #3 → #4 → #5
2. **Testing:** Crear tests mientras implementas (TDD)
3. **Pull Request:** Una PR con todos los fixes (mantiene coherencia)
4. **Merge:** Requiere code review + tests green
5. **Deploy:** Post-merge a staging, luego producción

