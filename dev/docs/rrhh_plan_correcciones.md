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

## FIX #6: EDITOR DE TEXTO DEL DOCUMENTO GENERADO (v2.9) EN BORRADOR (FUTURO)
**Severidad:** 🟡 MEJORA (no bloquea firma, no es un bug)
**Esfuerzo:** 4-6 horas (backend + frontend nuevo, no es un fix puntual)
**Archivo:** `backend/rrhh/views.py` (endpoint nuevo) + `backend/rrhh/serializers.py` + componente frontend nuevo

### CONTEXTO

Ya existe el modelo `DocumentoContratoGeneradoV29` (`backend/contratos/models.py:2286-2332`) que congela el HTML ya interpolado por contrato específico (`html_generado`) y tiene un flag `fue_editado_manualmente` que el motor (`backend/contratos/motor_v29.py:658,687`) ya respeta — si está en `True`, el documento nunca se regenera automáticamente. El modelo soporta tanto `ContratoEmpresaCliente` como `ContratoTrabajador` vía FK.

**El modelo está huérfano**: no hay ningún endpoint ni componente frontend que lea o escriba `html_generado`. Lo único similar que existe (`TabDocumento.tsx` + `SeccionContratoGeneradaViewSet`, `contratos/views.py:4052-4068`) es del motor v2 legacy (`SeccionContratoGenerada`, edición por sección con `Textarea` plano, solo para contratos B2B) — un sistema distinto al que efectivamente genera el PDF de contratos de trabajador hoy.

### OBJETIVO

Permitir editar a mano, desde el detalle de un contrato de trabajador en estado `borrador`, el texto ya generado del documento (no la plantilla compartida, no los campos del formulario), sin afectar otros contratos que usan la misma plantilla.

### DECISIÓN PENDIENTE (bloquea el diseño final, no solo la implementación)

El flag `fue_editado_manualmente` congela el documento para siempre — ni el fix del FIX visual de campos obligatorios (placeholder rojo, ya implementado en `motor_v29.py`/`adaptadores.py`) ni ningún cambio posterior de datos vuelve a tocar ese HTML una vez editado a mano. Dos caminos:

- **Opción simple**: aceptar el trade-off tal cual está diseñado el modelo (edición manual = control total, sin red de seguridad después). Menor esfuerzo.
- **Opción segura**: correr la misma validación de campos obligatorios (`adaptador.es_campo_obligatorio`) sobre el HTML antes de permitir guardar la edición manual, para no dejar pasar un placeholder sin resolver congelado para siempre.

### ESBOZO DE IMPLEMENTACIÓN

**Backend** — acción nueva sobre `ContratoTrabajadorViewSet` (mismo patrón que `SeccionContratoGeneradaViewSet.perform_update`, `contratos/views.py:4067-4068`):

```python
# backend/rrhh/views.py

@action(detail=True, methods=["get", "patch"], url_path="documento-v29")
def documento_v29(self, request, pk=None):
    """GET: retorna el html_generado vigente. PATCH: lo actualiza y marca
    fue_editado_manualmente=True (el motor deja de regenerar este contrato)."""
    contrato = self.get_object()
    from contratos.models import DocumentoContratoGeneradoV29
    documento = DocumentoContratoGeneradoV29.objects.filter(
        contrato_trabajador=contrato
    ).order_by("-fecha_creacion").first()

    if request.method == "GET":
        if not documento:
            return Response({"detail": "Documento aun no generado."}, status=404)
        return Response({"html_generado": documento.html_generado})

    # PATCH
    if not documento:
        return Response({"detail": "Documento aun no generado."}, status=404)
    documento.html_generado = request.data.get("html_generado", documento.html_generado)
    documento.fue_editado_manualmente = True
    documento.save(update_fields=["html_generado", "fue_editado_manualmente", "fecha_modificacion"])
    return Response({"html_generado": documento.html_generado})
```

**Frontend** — componente nuevo (NO reusar `EditorDocumentoV29.tsx`, que edita la plantilla compartida — mezclar ambos repite el error que el modelo ya resolvió al separar `plantilla.contenido_documento_v29` de `DocumentoContratoGeneradoV29.html_generado`):

- Editor de texto enriquecido sobre HTML plano (no requiere el árbol Slate de la plantilla — `html_generado` ya es HTML final).
- Cargar vía el endpoint `GET`, guardar vía `PATCH`.
- Visible solo en contratos `estado=borrador` (`puedeEditar` como en `TabDocumento.tsx`).
- Si se adopta la "opción segura": validar campos obligatorios en el HTML antes de habilitar el botón guardar.

### TESTING

- Test que confirma que tras el PATCH, `fue_editado_manualmente=True` y el motor (`obtener_o_generar_documento_v29` en `motor_v29.py`) ya no sobreescribe `html_generado` aunque cambien los datos del contrato.
- Test de permisos: solo con contrato en `borrador` se puede editar (mismo criterio que otros FIX de este documento — `IsRRHH` + ownership).

---

## FIX #7: NOMBRE Y RUT BAJO LA LÍNEA DE FIRMA (FUTURO)
**Severidad:** 🟡 MEJORA (pedido explícito de negocio, no bloquea firma hoy)
**Esfuerzo:** por estimar — toca código compartido entre todos los tipos de contrato (B2B + trabajador), requiere cuidado
**Archivo:** `backend/contratos/motor_v29.py` (nodo tipo `firma`, líneas 125-143)

### CONTEXTO

Piden que bajo cada línea de firma aparezcan nombre y RUT de quien firma, no solo el rol genérico. Hoy `_nodo_a_html` renderiza el bloque de firma así (confirmado en `contrato_75.pdf`, página 2 — solo dice "Empleador" / "Trabajador" bajo la línea, sin nombre ni RUT):

```python
# motor_v29.py:133-139
columnas = "".join(
    '<div style="display:inline-block;text-align:center;margin:0 20pt;">'
    '<div style="border-top:1px solid #000;width:180px;margin:0 auto;">&nbsp;</div>'
    f'<div style="font-size:9pt;margin-top:4pt;">{_esc(str(f.get("rol", "")))}</div>'
    "</div>"
    for f in firmantes
)
```

`f.get("rol", "")` solo trae el string del rol (`"Empleador"`, `"Trabajador"`, pero también `"Proveedor"`, `"Cliente"`, `"Vendedor"`, `"Comprador"`, `"Licenciante"`, `"Licenciatario"` para contratos B2B — este nodo es compartido entre `DOC_TRABAJADOR`, `DOC_SERVICIOS`, `DOC_VENTA` y `DOC_LICENCIA`, `seed_plantillas_v29_globales.py`).

### RIESGO A RESOLVER ANTES DE IMPLEMENTAR

No existe hoy un mapeo de "rol de firmante" → "de dónde saco su nombre/RUT", y ese mapeo es distinto para cada tipo de contrato (para `Trabajador` es `trabajador.nombre_completo`/`trabajador.rut`; para `Empleador` es `empresa.nombre` — pero el RUT de la empresa firmante, ¿es `empresa.rut` o el `rut_representante` de la persona que firma por ella?; para B2B, `Proveedor`/`Cliente` resuelven contra otro adaptador completamente). Hay que definir ese mapeo con quien pidió el cambio antes de tocar `motor_v29.py`, porque es código compartido — un error acá rompe la firma de los 5 tipos de contrato a la vez, no solo el de trabajador.

### TESTING (cuando se implemente)

- Test por cada tipo de contrato (trabajador, servicios, venta, licencia) confirmando que el nombre/RUT bajo la firma corresponde a la parte correcta.
- Test de regresión sobre `NodoFirmaBreakInsideTest` (`test_motor_v29.py`) para no romper el `break-inside:avoid` ya existente en ese bloque.

---

## FIX #8: ADVERTENCIA DE DATOS FALTANTES AL CREAR CONTRATO (✅ IMPLEMENTADO)
**Severidad:** 🟠 ALTA (previene contratos con campos legales vacíos, detectado con evidencia real en `contrato_75.pdf`)
**Archivo:** `backend/contratos/adaptadores.py`, `backend/rrhh/views.py`, `backend/rrhh/models.py` (migraciones 0041/0042), `frontend/src/pages/RRHH/modals/CrearContratoTrabajadorWizard.tsx`, `frontend/src/pages/RRHH/modals/CamposFaltantesModal.tsx` (nuevo)

### DISEÑO FINAL (evolucionó respecto al esbozo original de abajo)

En vez de una alerta de solo lectura, quedó un **modal editable** que aparece justo después de crear el contrato (no bloquea, es opcional — "Omitir por ahora" cierra igual). Para cada campo faltante:
- Campos que viven en el contrato (`estado_civil`, `nombre_cargo`, `funciones_cargo`): input simple, se guardan directo en el contrato.
- Campos que viven en Usuario/Empresa (`rut_trabajador`, `rut_empresa`, `representante_legal`, `rut_representante`): input + checkbox "Guardar permanentemente" — marcado actualiza el registro compartido (afecta a todos los contratos de esa empresa/trabajador); sin marcar, se guarda en un campo `*_override` nuevo en `ContratoTrabajador` que el adaptador revisa antes de caer al dato compartido.

**Bug encontrado y corregido de paso**: el alias `rut_empresa` en `adaptadores.py` apuntaba a `empresa.rut` (no existe) y `rut_representante` a `empresa.rut_representante_legal` (no existe) — los campos reales son `rut_empresa` y `rut_representante`. Esto hacía que el RUT de la empresa saliera como "faltante" en TODOS los PDF aunque la empresa sí lo tuviera cargado. Corregido en el mismo cambio.

Verificado de punta a punta con Playwright: creación con datos incompletos → modal aparece → RUT trabajador con "guardar siempre" (actualiza `User.rut`) + RUT representante sin marcar (queda en `contrato.rut_representante_override`, no toca `Empresa`) → confirmado en base de datos que cada uno fue al lugar correcto.

### ESBOZO ORIGINAL (referencia histórica, ya no vigente)

### CONTEXTO

El PDF ya muestra en rojo los campos obligatorios vacíos (FIX de síntoma #5, ya implementado en `motor_v29.py`/`adaptadores.py`), pero **eso solo se ve después de generar el documento**. El usuario reportó que al presionar "Crear contrato" al final del wizard no hay ningún aviso previo de que a la empresa o al trabajador le faltan datos — se entera recién al mirar el PDF.

### DECISIÓN DE DISEÑO YA TOMADA (confirmar antes de programar)

Los campos obligatorios caen en dos categorías que **no pueden tratarse igual en la UI**:

1. **Editables en este wizard** (`estado_civil`, `nombre_cargo`/`cargo`, `funciones_cargo`/`funciones`) → el aviso debe ofrecer volver al paso correspondiente.
2. **NO editables en este wizard** (`rut_empresa`, `representante_legal`, `rut_representante` — viven en la ficha de `Empresa`, fuera de este flujo; `rut_trabajador` si el trabajador es "existente" y no tiene RUT cargado) → el aviso debe decir explícitamente que hay que completarlo en otra pantalla (Configuración de Empresa / Ficha del Trabajador), no ofrecer un botón que no resuelve nada.

Pendiente de esta sesión: agregar `lugar_firma`/`fecha_firma` al set de obligatorios (visto en blanco en `contrato_75.pdf`, no estaban en `_CAMPOS_OBLIGATORIOS` porque se asumió que se llenan al firmar — confirmar con negocio si deben avisarse ya en la creación).

### ESBOZO DE IMPLEMENTACIÓN

**Backend** — reusar `AdaptadorContratoTrabajador._CAMPOS_OBLIGATORIOS` (ya existe, `adaptadores.py`) como fuente única, pero enriquecerlo con metadata de ubicación:

```python
# backend/contratos/adaptadores.py — reemplaza el frozenset actual
_CAMPOS_OBLIGATORIOS: dict[str, dict] = {
    "rut_trabajador":      {"label": "RUT del trabajador", "ubicacion": "trabajador"},
    "nombre_trabajador":   {"label": "Nombre del trabajador", "ubicacion": "trabajador"},
    "estado_civil":        {"label": "Estado civil", "ubicacion": "wizard", "paso": 2},
    "rut_empresa":         {"label": "RUT de la empresa", "ubicacion": "empresa"},
    "nombre_empresa":      {"label": "Nombre de la empresa", "ubicacion": "empresa"},
    "representante_legal": {"label": "Representante legal", "ubicacion": "empresa"},
    "rut_representante":   {"label": "RUT del representante legal", "ubicacion": "empresa"},
    "nombre_cargo":        {"label": "Cargo", "ubicacion": "wizard", "paso": 3},
    "funciones_cargo":     {"label": "Funciones del cargo", "ubicacion": "wizard", "paso": 3},
}

def es_campo_obligatorio(self, clave: str) -> bool:
    return clave in self._CAMPOS_OBLIGATORIOS

def campos_faltantes(self) -> list[dict]:
    """Para el endpoint de validacion pre-creacion: cada campo obligatorio
    cuyo valor resuelto sea vacio, con su metadata de ubicacion."""
    faltantes = []
    for clave, meta in self._CAMPOS_OBLIGATORIOS.items():
        valor = self.resolver_ruta_extendida(clave)
        if not valor:
            faltantes.append({"clave": clave, **meta})
    return faltantes
```

Endpoint nuevo en `backend/rrhh/views.py` (mismo `ContratoTrabajadorViewSet`):

```python
@action(detail=True, methods=["get"], url_path="campos-faltantes")
def campos_faltantes(self, request, pk=None):
    contrato = self.get_object()
    from contratos.adaptadores import AdaptadorContratoTrabajador
    adaptador = AdaptadorContratoTrabajador(contrato)
    return Response({"campos_faltantes": adaptador.campos_faltantes()})
```

**Frontend** — en el paso 7 (Revisión), antes de disparar la mutation de creación:

```tsx
const handleCrearContrato = async () => {
    // El contrato ya existe en 'borrador' en este punto del wizard (o se crea
    // primero y se valida despues — depende del flujo actual, confirmar).
    const { data } = await triggerCamposFaltantes(contratoId);
    if (data?.campos_faltantes?.length) {
        const editables = data.campos_faltantes.filter((c) => c.ubicacion === 'wizard');
        const externos = data.campos_faltantes.filter((c) => c.ubicacion !== 'wizard');
        const confirmado = await confirmAlert({
            title: 'Faltan datos en el contrato',
            html: renderListaCamposFaltantes(editables, externos), // agrupados, con link a Configuración de Empresa si aplica
            confirmButtonText: 'Crear de todas formas',
            cancelButtonText: 'Revisar antes de crear',
        });
        if (!confirmado) return; // vuelve al wizard, no crea
    }
    crearContrato();
};
```

### TESTING

- Backend: test que confirma `campos_faltantes()` detecta cada campo del set y no falsos positivos en campos condicionales (bonos, cuenta bancaria) que son válidamente vacíos.
- Frontend: test manual con el mismo trabajador/empresa demo (`contrato_75`) que ya tiene los campos vacíos confirmados — debe listar exactamente `rut_empresa`, `representante_legal`, `rut_representante`, `rut_trabajador`, `estado_civil`, `funciones_cargo`.

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

[ ] FIX #6: Editor de texto del documento generado v2.9 (FUTURO — no priorizado aun)
    [ ] Decidir: opcion simple vs opcion segura (validar antes de congelar)
    [ ] Crear endpoint GET/PATCH documento-v29 en ContratoTrabajadorViewSet
    [ ] Crear componente frontend de edicion (HTML, no Slate)
    [ ] Restringir a contratos en estado borrador
    [ ] Escribir tests

[ ] FIX #7: Nombre y RUT bajo la firma (FUTURO — no priorizado aun)
    [ ] Definir con negocio de donde sale el RUT del Empleador (empresa vs representante)
    [ ] Definir mapeo rol -> datos para los 4 tipos de contrato B2B + trabajador
    [ ] Modificar nodo 'firma' en motor_v29.py:125-143
    [ ] Test de regresion en NodoFirmaBreakInsideTest

[x] FIX #8: Advertencia de datos faltantes al crear contrato
    [x] Enriquecer _CAMPOS_OBLIGATORIOS con metadata de ubicacion
    [x] Agregar campos_faltantes() al adaptador
    [x] Endpoint GET campos-faltantes en ContratoTrabajadorViewSet
    [x] lugar_firma/fecha_firma quedan fuera del set (se llenan al firmar)
    [x] Modal editable (CamposFaltantesModal) con guardar siempre / solo contrato
    [x] Overrides *_override en ContratoTrabajador + adaptador los revisa primero
    [x] Endpoint PATCH completar-campos-faltantes (transaction.atomic)
    [x] Bug fix de paso: alias rut_empresa/rut_representante corregidos
    [x] Verificado end-to-end con Playwright + limpieza de datos de prueba

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
| **TOTAL (FIX #1-5)** | **2 horas 40 min** |
| FIX #6 (editor documento v2.9 — futuro, no priorizado) | 4-6 horas |
| FIX #7 (nombre/RUT en firma — futuro, no priorizado, requiere definición previa de negocio) | por estimar |
| FIX #8 (advertencia datos faltantes al crear) | ✅ implementado |

---

## 🎯 EJECUCIÓN RECOMENDADA

1. **Orden de implementación:** FIX #1 → #2 → #3 → #4 → #5
2. **Testing:** Crear tests mientras implementas (TDD)
3. **Pull Request:** Una PR con todos los fixes (mantiene coherencia)
4. **Merge:** Requiere code review + tests green
5. **Deploy:** Post-merge a staging, luego producción

