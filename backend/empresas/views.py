from io import BytesIO

from django.db import transaction
from django.http import HttpResponse
from core.models import PersonalizacionUsuario
from cuentas.functions import obtener_usuario_empresa
from recursos.models import Equipo
from recursos.serializers import EquipoSerializer
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.permissions import requiere_roles
from rrhh.mixins import TrabajadoresClienteMixin
from vacaciones.models import SolicitudVacaciones

from .models import *
from .pdfs.certificado_antiguedad import generar_certificado_antiguedad_pdf
from .serializers import *


class EmpresaViewSet(TrabajadoresClienteMixin, viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff", "multi-empresas")]

    # Acciones de solo lectura usadas transversalmente por cualquier rol para
    # navegar su propio contexto (selector de empresa/cliente, sucursales,
    # equipos, usuarios) — no son administracion de la entidad Empresa, asi
    # que no llevan el gate de rol restringido de la clase.
    ACTIONS_CONTEXTO_ABIERTO = (
        "select_empresas",
        "mis_clientes",
        "mis_prospectos",
        "sucursales",
        "equipos",
        "usuarios",
        "usuarios_de_clientes",
        "trabajadores",
        "equipos_de_mis_clientes",
        "equipos_asignados",
    )

    def get_permissions(self):
        if self.action in self.ACTIONS_CONTEXTO_ABIERTO:
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=["get"], url_path="select-empresas")
    def select_empresas(self, request):
        user = request.user
        usuario = obtener_usuario_empresa(request.user)

        # Si no existe UsuarioEmpresa asociado, devolvemos vacío
        if not usuario:
            return Response([], status=200)

        # Obtenemos los nombres de los grupos desde UsuarioEmpresa
        grupos = usuario.grupos.values_list("name", flat=True)

        if "staff" in grupos:
            empresas = Empresa.objects.all()
        else:
            sucursal_principal = getattr(
                user.personalizacionusuario, "sucursal_principal", None
            )
            if sucursal_principal:
                empresas = Empresa.objects.filter(pk=sucursal_principal.empresa.pk)
            else:
                empresas = Empresa.objects.none()

        serializer = self.get_serializer(empresas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="mis-clientes")
    def mis_clientes(self, request, pk=None):
        empresa = self.get_object()
        # Por defecto solo devuelve relaciones de tipo 'prestador-cliente'.
        # Pasar ?tipo=prospecto para obtener prospectos.
        tipo = request.query_params.get("tipo", "prestador-cliente")
        if empresa:
            relaciones = RelacionEmpresa.objects.filter(
                prestador_servicios=empresa, tipo_relacion=tipo
            )
        else:
            relaciones = RelacionEmpresa.objects.none()

        serializer = RelacionEmpresaSerializer(relaciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="mis-prospectos")
    def mis_prospectos(self, request, pk=None):
        empresa = self.get_object()
        relaciones = RelacionEmpresa.objects.filter(
            prestador_servicios=empresa, tipo_relacion="prospecto"
        )
        serializer = RelacionEmpresaSerializer(relaciones, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="crear-prospecto")
    def crear_prospecto(self, request, pk=None):
        empresa = self.get_object()
        serializer = CrearProspectoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            prospecto = Empresa.objects.create(
                nombre=data["nombre"],
                rut_empresa=data.get("rut_empresa") or None,
                email=data.get("email") or None,
                telefono=data.get("telefono") or None,
                direccion_principal="",
            )
            relacion = RelacionEmpresa.objects.create(
                prestador_servicios=empresa,
                cliente=prospecto,
                tipo_relacion="prospecto",
            )

        return Response(RelacionEmpresaSerializer(relacion).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="sucursales")
    def sucursales(self, request, pk=None):
        empresa = self.get_object()
        sucursales = empresa.sucursales.all()
        serializer = SucursalEmpresaSerializer(sucursales, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="equipos")
    def equipos(self, request, pk=None):
        empresa = self.get_object()
        equipos_cliente = empresa.equipos_cliente.all()
        serializer = EquipoSerializer(equipos_cliente, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="usuarios")
    def usuarios(self, request, pk=None):
        """
        Lista todos los UsuarioEmpresa de una empresa específica.
        Endpoint: GET /api/empresas/{pk}/usuarios/
        """
        empresa = self.get_object()
        usuarios = (
            UsuarioEmpresa.objects.filter(sucursal__empresa=empresa)
            .select_related("usuario", "sucursal")
            .prefetch_related("grupos")
        )
        serializer = UsuarioEmpresaSerializer(usuarios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="usuarios-de-clientes")
    def usuarios_de_clientes(self, request, pk=None):
        """
        Retorna todos los usuarios que pertenecen a los clientes
        de la empresa con ID `pk`.
        """
        try:
            empresa = self.get_object()  # Empresa con id=pk
        except Empresa.DoesNotExist:
            return Response(
                {"detail": "Empresa no existe"}, status=status.HTTP_404_NOT_FOUND
            )

        # 1) Obtener las relaciones donde esta empresa es el prestador de servicios
        relaciones = RelacionEmpresa.objects.filter(prestador_servicios=empresa)

        # 2) Extraer todos los clientes (empresas) a partir de esas relaciones
        clientes_ids = relaciones.values_list("cliente_id", flat=True)

        # 3) Obtener todas las sucursales de esos clientes
        #    y luego los usuarios asociados.
        usuarios_de_clientes_qs = UsuarioEmpresa.objects.filter(
            sucursal__empresa_id__in=clientes_ids
        ).select_related("usuario", "sucursal")

        # 4) Serializar la data
        serializer = UsuarioEmpresaSerializer(usuarios_de_clientes_qs, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="trabajadores")
    def trabajadores(self, request, pk=None):
        """Lista unificada de trabajadores de una empresa cliente.

        Combina UsuarioEmpresa confirmados y ContratoTrabajador pendientes
        (sin cuenta aún) en una forma normalizada.
        Endpoint: GET /api/empresas/{pk}/trabajadores/
        """
        empresa = self.get_object()
        data = self.get_trabajadores_cliente(empresa.id)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="equipos-clientes")
    def equipos_de_mis_clientes(self, request, pk=None):
        empresa = self.get_object()

        # Opción 1: Usando la relación ManyToMany (si está bien configurada)
        # clientes = empresa.clientes.all()

        # Opción 2: Consultando directamente la tabla intermedia
        relaciones = RelacionEmpresa.objects.filter(prestador_servicios=empresa)
        clientes_ids = relaciones.values_list("cliente__id", flat=True)

        # Obtener los equipos de las empresas cliente
        equipos = Equipo.objects.filter(cliente__id__in=clientes_ids)

        serializer = EquipoSerializer(equipos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="equipos-asignados")
    def equipos_asignados(self, request, pk=None):
        """
        Lista todos los UsuarioEquipo (equipos asignados) de todos los usuarios de una empresa.
        Endpoint: GET /api/empresas/{pk}/equipos-asignados/
        """
        from recursos.models import UsuarioEquipo
        from recursos.serializers import UsuarioEquipoListSerializer

        empresa = self.get_object()

        # Obtener todos los UsuarioEmpresa de esta empresa
        usuarios_empresa = UsuarioEmpresa.objects.filter(sucursal__empresa=empresa)

        # Obtener todos los UsuarioEquipo de estos usuarios
        usuario_equipos = UsuarioEquipo.objects.filter(
            usuario__in=usuarios_empresa
        ).select_related("equipo", "usuario__usuario", "usuario__sucursal")

        serializer = UsuarioEquipoListSerializer(usuario_equipos, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SucursalEmpresaViewSet(viewsets.ModelViewSet):
    queryset = SucursalEmpresa.objects.all()
    serializer_class = SucursalEmpresaSerializer
    permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff")]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Si la URL incluye empresa_pk (nested route), filtrar por esa empresa
        empresa_pk = self.kwargs.get("empresa_pk")
        if empresa_pk:
            queryset = queryset.filter(empresa_id=empresa_pk)
        return queryset

    @action(detail=True, methods=["get"], url_path="usuarios")
    def usuarios(self, request, empresa_pk=None, pk=None):
        sucursal = self.get_object()
        usuarios = sucursal.usuarios.all()
        serializer = UsuarioEmpresaSerializer(usuarios, many=True)
        return Response(serializer.data)


class UsuarioEmpresaViewSet(viewsets.ModelViewSet):
    queryset = UsuarioEmpresa.objects.all()
    serializer_class = UsuarioEmpresaSerializer
    permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff", "rrhh")]

    def get_queryset(self):
        usuario = self.request.user
        try:
            # Obtener la sucursal principal del usuario desde la personalización
            personalizacion = PersonalizacionUsuario.objects.get(usuario=usuario)
            sucursal_principal = personalizacion.sucursal_principal
        except PersonalizacionUsuario.DoesNotExist:
            # Si no hay personalización, devolver un queryset vacío
            return UsuarioEmpresa.objects.none()

        # Filtrar el queryset por la sucursal principal
        if sucursal_principal:
            return UsuarioEmpresa.objects.filter(sucursal=sucursal_principal)
        else:
            return UsuarioEmpresa.objects.none()

    @action(detail=False, methods=["get"], url_path="detalle-usuario")
    def detalle_usuario(self, request):
        usuario_id = request.query_params.get("usuario_id")
        if not usuario_id:
            return Response(
                {"error": "El parametro 'usuario_id' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            usuario_empresa = UsuarioEmpresa.objects.get(usuario__id=usuario_id)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"error": "No se encontró un UsuarioEmpresa con el id proporcionado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(usuario_empresa)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="ultimas-actividades")
    def ultimas_actividades(self, request, pk=None):
        try:
            usuario_empresa = UsuarioEmpresa.objects.get(pk=pk)
        except UsuarioEmpresa.DoesNotExist:
            return Response(
                {"error": "No se encontró un UsuarioEmpresa para el usuario actual."},
                status=status.HTTP_404_NOT_FOUND,
            )

        def get_actividades_from_model(queryset, date_field, descripcion_func, tipo):
            actividades = []
            for obj in queryset:
                fecha = getattr(obj, date_field)
                if not fecha:
                    continue  # Saltar si el campo de fecha es None
                actividad = {
                    "tipo": tipo,
                    "fecha": fecha,
                    "descripcion": descripcion_func(obj),
                }
                actividades.append(actividad)
            return actividades

        actividades = []

        # Recolectar actividades de SolicitudVacaciones
        solicitudes_vacaciones = SolicitudVacaciones.objects.filter(
            usuario_empresa=usuario_empresa
        )

        actividades += get_actividades_from_model(
            solicitudes_vacaciones,
            "fecha_solicitud",
            lambda obj: f'Solicitud de vacaciones del {obj.fecha_inicio.strftime("%d-%m-%Y")} al {obj.fecha_fin.strftime("%d-%m-%Y")}, estado: {obj.get_estado_display()}',
            "Solicitud de Vacaciones",
        )

        # Aquí puedes agregar más modelos en el futuro
        # Por ejemplo:
        # actividades += get_actividades_from_model(
        #     otro_modelo_queryset,
        #     'fecha',
        #     lambda obj: f'Descripción de la actividad en OtroModelo',
        #     'OtroModelo'
        # )

        # Ordenar las actividades por fecha descendente
        actividades.sort(key=lambda x: x["fecha"], reverse=True)

        # Retornar las últimas 10 actividades
        actividades = actividades[:10]

        return Response(actividades, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def usuarios_por_empresas(self, request):
        """
        Retorna los usuarios de todas las sucursales de las empresas enviadas en el cuerpo de la solicitud.
        """
        empresa_ids = request.data.get("empresa_ids", [])

        if not isinstance(empresa_ids, list) or not all(
            isinstance(i, int) for i in empresa_ids
        ):
            return Response(
                {"error": "Se debe enviar una lista de IDs de empresas válida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener todas las sucursales que pertenecen a las empresas enviadas
        sucursales = SucursalEmpresa.objects.filter(empresa__id__in=empresa_ids)

        # Filtrar los usuarios que pertenecen a esas sucursales
        usuarios = UsuarioEmpresa.objects.filter(sucursal__in=sucursales)
        serializer = self.get_serializer(usuarios, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
        url_path=r"empresa/(?P<empresa_id>\d+)/tecnicos",
        url_name="tecnicos-por-empresa",
    )
    def tecnicos_por_empresa(self, request, empresa_id=None):
        """
        Lista de usuarios de una empresa dada que pertenezcan
        al grupo 'tecnico'.
        """
        # Filtro: sucursal.empresa = empresa_id  AND  grupos__name = 'tecnico'
        qs = (
            UsuarioEmpresa.objects.filter(
                sucursal__empresa_id=empresa_id, grupos__name="tecnico"
            )
            .select_related("usuario", "sucursal")
            .prefetch_related("grupos")
            .distinct()
        )

        # # Paginación DRF (respeta PageNumberPagination, LimitOffset, etc.)
        # page = self.paginate_queryset(qs)
        # if page is not None:
        #     serializer = self.get_serializer(page, many=True)
        #     return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _get_ue_cliente_con_permisos(self, request, usuario_empresa_pk):
        """Helper: obtiene UsuarioEmpresa de cliente con validación multi-tenancy."""
        try:
            ue = UsuarioEmpresa.objects.select_related(
                'usuario', 'sucursal', 'sucursal__empresa'
            ).get(pk=usuario_empresa_pk)
        except UsuarioEmpresa.DoesNotExist:
            return None, Response({"error": "No encontrado."}, status=status.HTTP_404_NOT_FOUND)

        personalizacion = PersonalizacionUsuario.objects.filter(usuario=request.user).first()
        if not personalizacion or not personalizacion.sucursal_principal:
            return None, Response({"error": "Sin permisos."}, status=status.HTTP_403_FORBIDDEN)

        empresa_autenticada = personalizacion.sucursal_principal.empresa
        empresa_usuario = ue.sucursal.empresa

        es_cliente = RelacionEmpresa.objects.filter(
            prestador_servicios=empresa_autenticada, cliente=empresa_usuario
        ).exists()
        es_misma_empresa = empresa_autenticada == empresa_usuario

        if not es_cliente and not es_misma_empresa:
            return None, Response({"error": "Sin permisos."}, status=status.HTTP_403_FORBIDDEN)

        return ue, None

    @action(detail=False, methods=["patch"], url_path=r"actualizar-ficha-trabajador/(?P<usuario_empresa_pk>\d+)")
    def actualizar_ficha_trabajador(self, request, usuario_empresa_pk=None):
        """
        PATCH /api/usuarios-empresa/actualizar-ficha-trabajador/{id}/
        Actualiza campos del User (datos personales) y/o del UsuarioEmpresa (previsión, banco).
        """
        ue, err = self._get_ue_cliente_con_permisos(request, usuario_empresa_pk)
        if err:
            return err

        data = request.data
        user = ue.usuario

        USER_FIELDS = [
            'first_name', 'second_name', 'last_name', 'second_last_name',
            'celular', 'genero', 'fecha_nacimiento', 'estado_civil',
            'nacionalidad', 'direccion', 'region', 'provincia', 'comuna',
            'nivel_estudios', 'titulo_especialidad', 'institucion_educacional',
        ]
        UE_FIELDS = [
            'sistema_salud', 'nombre_isapre',
            'banco', 'tipo_cuenta_bancaria', 'numero_cuenta_bancaria',
            'rut',
        ]

        user_dirty = False
        for field in USER_FIELDS:
            if field in data:
                setattr(user, field, data[field] or None)
                user_dirty = True
        if user_dirty:
            user.save()

        ue_dirty = False
        for field in UE_FIELDS:
            if field in data:
                setattr(ue, field, data[field] or None)
                ue_dirty = True

        if 'afp' in data:
            from rrhh.models import AfpCatalogo
            afp_id = data.get('afp')
            if afp_id:
                try:
                    ue.afp = AfpCatalogo.objects.get(pk=int(afp_id))
                except (AfpCatalogo.DoesNotExist, ValueError):
                    pass
            else:
                ue.afp = None
            ue_dirty = True

        if ue_dirty:
            ue.save()

        serializer = self.get_serializer(ue, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"detalle-usuario-cliente/(?P<usuario_empresa_pk>\d+)")
    def detalle_usuario_cliente(self, request, usuario_empresa_pk=None):
        """
        GET /api/usuarios-empresa/detalle-usuario-cliente/{usuario_empresa_pk}/
        Retorna el detalle de un UsuarioEmpresa que pertenece a una empresa cliente.
        """
        ue, err = self._get_ue_cliente_con_permisos(request, usuario_empresa_pk)
        if err:
            return err
        serializer = self.get_serializer(ue, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path=r"certificado-antiguedad/(?P<usuario_empresa_pk>\d+)")
    def certificado_antiguedad(self, request, usuario_empresa_pk=None):
        """
        GET /api/usuarios-empresa/certificado-antiguedad/{usuario_empresa_pk}/
        Genera y devuelve el PDF de Certificado de Antigüedad Laboral.
        """
        ue, err = self._get_ue_cliente_con_permisos(request, usuario_empresa_pk)
        if err:
            return err

        buffer = BytesIO()
        try:
            generar_certificado_antiguedad_pdf(ue, buffer)
        except Exception as e:
            return Response(
                {"detail": f"No se pudo generar el certificado: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rut_slug = (ue.rut or str(ue.pk)).replace(".", "").replace("-", "")
        nombre_archivo = f"certificado_antiguedad_{rut_slug}.pdf"

        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{nombre_archivo}"'
        return response

    @action(detail=False, methods=["get"], url_path=r"historial-ficha/(?P<usuario_empresa_pk>\d+)")
    def historial_ficha(self, request, usuario_empresa_pk=None):
        """
        GET /api/usuarios-empresa/historial-ficha/{usuario_empresa_pk}/
        Timeline agregado de todos los contratos laborales del trabajador.
        """
        from rrhh.views import ContratoTrabajadorViewSet as _CTVS

        ue, err = self._get_ue_cliente_con_permisos(request, usuario_empresa_pk)
        if err:
            return err

        vs = _CTVS()
        eventos = []

        for contrato in ue.contratos_laborales.all().order_by("-fecha_inicio"):
            etiqueta = contrato.get_tipo_contrato_display()

            for r in contrato.historia.all().order_by("-history_date")[:50]:
                e = vs._build_contrato_trab_history_event(r)
                if e:
                    e["contrato_id"] = contrato.id
                    e["contrato_tipo_label"] = etiqueta
                    eventos.append(e)

            for anexo in contrato.anexos.all():
                for r in anexo.historia.all().order_by("-history_date")[:10]:
                    e = vs._build_anexo_history_event(r)
                    e["contrato_id"] = contrato.id
                    e["contrato_tipo_label"] = etiqueta
                    eventos.append(e)

            for envio in contrato.envios_aprobacion_empleador.all().order_by("fecha_envio"):
                for e in _CTVS._build_envio_aprobacion_events(envio):
                    e["contrato_id"] = contrato.id
                    e["contrato_tipo_label"] = etiqueta
                    eventos.append(e)

        eventos.sort(key=lambda e: e["fecha"] or "", reverse=True)
        return Response(eventos)


class RelacionEmpresaViewSet(viewsets.ModelViewSet):
    queryset = RelacionEmpresa.objects.all()
    serializer_class = RelacionEmpresaSerializer
    permission_classes = [IsAuthenticated, requiere_roles("superadmin", "staff", "rrhh")]

    def get_permissions(self):
        # finanzas necesita ver el detalle del cliente (via DetalleCliente.tsx) para
        # facturar, no administrar la relacion prestador-cliente.
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), requiere_roles("superadmin", "staff", "rrhh", "finanzas")()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="promover-a-cliente")
    def promover_a_cliente(self, request, pk=None):
        relacion = self.get_object()
        if relacion.tipo_relacion != "prospecto":
            return Response(
                {"detail": "Solo se pueden promover relaciones de tipo 'prospecto'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        relacion.tipo_relacion = "prestador-cliente"
        relacion.save()
        return Response(RelacionEmpresaSerializer(relacion).data)
