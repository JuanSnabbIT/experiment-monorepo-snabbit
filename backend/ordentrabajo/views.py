from rest_framework import viewsets, status
from rest_framework.response import Response
from core.models import PersonalizacionUsuario
from cotizaciones.models import Cotizacion
from cotizaciones.serializers import CotizacionSerializer
from retroalimentacion.models import Retroalimentacion
from .models import DetalleGastoRendicionOT, OrdenDeTrabajo, DetalleTrabajo, HistorialCambiosOrden, AdjuntoDeOrden, SeguimientoDetalleTrabajo, UsuarioAsignadoOT, CierreAdministrativoOT
from .serializers import (
    DetalleTrabajoCompraSerializer,
    OrdenDeTrabajoSerializer,
    DetalleTrabajoSerializer,
    HistorialCambiosOrdenSerializer,
    AdjuntoDeOrdenSerializer,
    RetroalimentacionSerializer,
    SeguimientoDetalleTrabajoSerializer,
    DetalleGuiaSerializer,
    DetalleGastoRendicionOTSerializer,
    UsuarioAsignadoOTSerializer
)
from rest_framework.decorators import action
from django.utils.timezone import localtime
from itertools import chain
from empresas.models import UsuarioEmpresa
from .utils import FIELDS_MAPPING, get_accion_modelo, validar_cierre_ot, cerrar_ot
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from bodegas.models import GuiaSalida, Compra, ItemsGuiaSalida, StockItemEnBodega, ItemEnCompra, ItemOrdenCompraEnStock
from bodegas.serializers import CompraCreateSerializer, GuiaSalidaSerializer
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q, Exists, OuterRef
from visitas.serializers import VisitaSoporteSerializer, VisitaSoporteEnDetalleOTSerializer
from visitas.models import VisitaSoporte, AsistenciaUsuario, EntregaDeEquipo
from django.db import transaction
from cuentas.functions import obtener_usuario_empresa
from bodegas.movimientos import registrar_entrada, registrar_salida
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
import base64, uuid, re, json, os
from django.core.files.base import ContentFile
from dotenv import load_dotenv
load_dotenv()


class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenDeTrabajo.objects.all()
    serializer_class = OrdenDeTrabajoSerializer

    def get_queryset(self):
        user = self.request.user
        personalizacion = PersonalizacionUsuario.objects.filter(usuario=user).first()
        if personalizacion and personalizacion.sucursal_principal:
            return OrdenDeTrabajo.objects.filter(empresa=personalizacion.sucursal_principal.empresa)
        return OrdenDeTrabajo.objects.none()

    @action(detail=True, methods=["get"], url_path="validar-cierre")
    def validar_cierre(self, request, pk=None):
        """
        GET /api/ordenes-trabajo/{id}/validar-cierre/
        Devuelve el resumen de validaciones para decidir cierre administrativo.
        """
        orden = self.get_object()
        resultado = validar_cierre_ot(orden.id)
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cerrar")
    def cerrar(self, request, pk=None):
        """
        POST /api/ordenes-trabajo/{id}/cerrar/
        Body: { comentario?: string, forzar?: boolean }
        Crea/actualiza el CierreAdministrativoOT.
        """
        orden = self.get_object()

        comentario = request.data.get("comentario")
        forzar_raw = request.data.get("forzar", False)
        # Normalizar booleanos provenientes de JSON o strings
        if isinstance(forzar_raw, str):
            forzar = forzar_raw.strip().lower() in ("true", "1", "t", "yes", "si", "sí")
        else:
            forzar = bool(forzar_raw)

        # Reglas para cierre forzado: requiere autenticación, permiso y comentario
        if forzar:
            user = request.user
            if not user or not user.is_authenticated:
                return Response({"detail": "Autenticación requerida para cierre forzado."}, status=status.HTTP_401_UNAUTHORIZED)
            if not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False) or user.has_perm("ordentrabajo.force_close_ot")):
                return Response({"detail": "No tiene permisos para forzar el cierre de una OT."}, status=status.HTTP_403_FORBIDDEN)
            if not comentario or not str(comentario).strip():
                return Response({"detail": "El campo 'comentario' es obligatorio al forzar el cierre."}, status=status.HTTP_400_BAD_REQUEST)

        # Si ya existe cierre y no es forzado, devolver 409 con el cierre existente
        try:
            cierre_existente = orden.cierre_administrativo
        except CierreAdministrativoOT.DoesNotExist:
            cierre_existente = None

        if cierre_existente and not forzar:
            data_existente = {
                "id": cierre_existente.id,
                "valido": cierre_existente.valido,
                "resultado": cierre_existente.resultado,
                "comentario": cierre_existente.comentario,
                "fecha_cierre": localtime(cierre_existente.fecha_cierre).isoformat() if cierre_existente.fecha_cierre else None,
                "usuario": (
                    {
                        "id": cierre_existente.usuario.id,
                        "nombre": str(cierre_existente.usuario.usuario.get_nombre() if cierre_existente.usuario and cierre_existente.usuario.usuario else cierre_existente.usuario)
                    }
                    if cierre_existente.usuario else None
                ),
            }
            return Response(data_existente, status=status.HTTP_409_CONFLICT)

        # Obtener UsuarioEmpresa si es posible
        usuario_empresa = None
        try:
            usuario_empresa = obtener_usuario_empresa(request.user)
        except Exception:
            usuario_empresa = None

        cierre = cerrar_ot(orden.id, usuario_empresa=usuario_empresa, comentario=comentario, forzar=forzar)

        data = {
            "id": cierre.id,
            "valido": cierre.valido,
            "resultado": cierre.resultado,
            "comentario": cierre.comentario,
            "fecha_cierre": localtime(cierre.fecha_cierre).isoformat() if cierre.fecha_cierre else None,
            "usuario": (
                {
                    "id": cierre.usuario.id,
                    "nombre": str(cierre.usuario.usuario.get_nombre() if cierre.usuario and cierre.usuario.usuario else cierre.usuario)
                }
                if cierre.usuario else None
            ),
        }
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="cierre")
    def obtener_cierre(self, request, pk=None):
        """
        GET /api/ordenes-trabajo/{id}/cierre/
        Obtiene el CierreAdministrativoOT si existe.
        """
        orden = self.get_object()
        try:
            cierre = orden.cierre_administrativo
        except CierreAdministrativoOT.DoesNotExist:
            return Response({"detail": "La OT no tiene cierre administrativo."}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "id": cierre.id,
            "valido": cierre.valido,
            "resultado": cierre.resultado,
            "comentario": cierre.comentario,
            "fecha_cierre": localtime(cierre.fecha_cierre).isoformat() if cierre.fecha_cierre else None,
            "usuario": (
                {
                    "id": cierre.usuario.id,
                    "nombre": str(cierre.usuario.usuario.get_nombre() if cierre.usuario and cierre.usuario.usuario else cierre.usuario)
                }
                if cierre.usuario else None
            ),
        }
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        orden = self.get_object()
        history_type_mapping = {'+': 'Creado', '~': 'Modificado', '-': 'Eliminado'}

        # 2) Reúno todos los historiales de cada modelo vinculado a esta orden
        models_with_history = {
            'OrdenDeTrabajo': orden.historia.all(),
            'AdjuntoDeOrden': AdjuntoDeOrden.historia.filter(orden=orden),
            'DetalleTrabajo': DetalleTrabajo.historia.filter(orden=orden),
            'UsuarioAsignadoOT': UsuarioAsignadoOT.historia.filter(orden=orden),
            'SeguimientoDetalleTrabajo': SeguimientoDetalleTrabajo.historia.filter(
                detalle_trabajo__orden=orden
            ),
            'HistorialCambiosOrden': HistorialCambiosOrden.historia.filter(orden=orden),
            'DetalleGastoRendicionOT': DetalleGastoRendicionOT.historia.filter(orden=orden),
        }

        # 3) Aplane todo en una lista [(history_instance, model_name), ...]
        todos = list(chain(*[
            [(h, model_name) for h in historial_qs]
            for model_name, historial_qs in models_with_history.items()
        ]))

        # 4) Ordena por history_date (más reciente → más antiguo)
        todos_ordenados = sorted(
            todos,
            key=lambda pair: localtime(pair[0].history_date),
            reverse=True
        )

        historial_data = []

        for idx, (h, model_name) in enumerate(todos_ordenados):
            simbolo = h.history_type           # '+', '~' o '-'
            accion = history_type_mapping.get(simbolo, 'Desconocido')

            base_registro = {
                'id': h.id,
                'history_date': localtime(h.history_date).isoformat() if h.history_date else None,
                'history_user': (
                    f"{h.history_user.first_name} {h.history_user.last_name}"
                    if getattr(h, 'history_user', None)
                    else (
                        f"{request.user.first_name} {request.user.last_name}"
                        if request.user and request.user.is_authenticated
                        else "Desconocido"
                    )
                ),
                'model': model_name,
                'detalle_cambio': '',
                'valor_anterior': None,
                'valor_nuevo': None,
                'accion': f"{get_accion_modelo(model_name)} {accion}",
                'accion_tipo': accion,
                'accion_modelo': get_accion_modelo(model_name),
            }

            # -------------------------------
            #  Caso 1: CREACIÓN (“+”)
            # -------------------------------
            if simbolo == '+':
                primera_etiqueta = next(iter(FIELDS_MAPPING.get(model_name, {}).values()), None)
                if primera_etiqueta:
                    primer_campo = next(iter(FIELDS_MAPPING[model_name].keys()))
                    nuevo_valor = getattr(h, primer_campo, None)
                    # Si es un campo "_id" de FK, tratamos luego en la presentación
                    base_registro['valor_nuevo'] = str(nuevo_valor or 'N/A')
                    base_registro['detalle_cambio'] = (
                        f"Se ha creado un nuevo registro de {get_accion_modelo(model_name)}: "
                        f"“{primera_etiqueta}” = {nuevo_valor or 'N/A'}"
                    )
                else:
                    base_registro['detalle_cambio'] = (
                        f"Se ha creado un nuevo registro de {get_accion_modelo(model_name)}"
                    )
                historial_data.append(base_registro)
                continue

            # -------------------------------
            #  Caso 2: ELIMINACIÓN (“-”)
            # -------------------------------
            if simbolo == '-':
                primera_etiqueta = next(iter(FIELDS_MAPPING.get(model_name, {}).values()), None)
                if primera_etiqueta:
                    primer_campo = next(iter(FIELDS_MAPPING[model_name].keys()))
                    antiguo_valor = getattr(h, primer_campo, None)
                    base_registro['valor_anterior'] = str(antiguo_valor or 'N/A')
                    base_registro['detalle_cambio'] = (
                        f"Se ha eliminado un registro de {get_accion_modelo(model_name)}: "
                        f"“{primera_etiqueta}” = {antiguo_valor or 'N/A'}"
                    )
                else:
                    base_registro['detalle_cambio'] = (
                        f"Se ha eliminado un registro de {get_accion_modelo(model_name)}"
                    )
                historial_data.append(base_registro)
                continue

            # -------------------------------
            #  Caso 3: MODIFICACIÓN (“~”)
            # -------------------------------
            # Buscamos la versión “anterior” de este mismo modelo
            previous_record = None
            for ph, pm in todos_ordenados[idx + 1:]:
                if pm == model_name:
                    previous_record = ph
                    break

            # Si no hay anterior, metemos un mensaje genérico
            if not previous_record:
                base_registro['detalle_cambio'] = (
                    f"Se ha modificado un registro de {get_accion_modelo(model_name)}"
                )
                historial_data.append(base_registro)
                continue

            # Recorremos cada campo definido en FIELDS_MAPPING para este modelo
            campos_map = FIELDS_MAPPING.get(model_name, {})
            cambios_detectados = False

            for campo_interno, etiqueta in campos_map.items():
                old_val = getattr(previous_record, campo_interno, None)
                new_val = getattr(h, campo_interno, None)

                # Comparamos como strings para evitar None != '' 
                if (old_val or '') != (new_val or ''):
                    cambios_detectados = True

                    # -----------------------------------
                    # 1) Si es OrdenDeTrabajo.solictante/responsable → obtener nombre
                    # -----------------------------------
                    if model_name == 'OrdenDeTrabajo' and campo_interno in (
                        'solicitante_empresa_id', 'responsable_empresa_id'
                    ):
                        # Intento resolver a UsuarioEmpresa; si falla, uso el ID crudo
                        try:
                            antiguo_obj = UsuarioEmpresa.objects.get(pk=old_val) if old_val else None
                            antiguo_display = str(antiguo_obj) if antiguo_obj else 'N/A'
                        except UsuarioEmpresa.DoesNotExist:
                            antiguo_display = str(old_val or 'N/A')

                        try:
                            nuevo_obj = UsuarioEmpresa.objects.get(pk=new_val) if new_val else None
                            nuevo_display = str(nuevo_obj) if nuevo_obj else 'N/A'
                        except UsuarioEmpresa.DoesNotExist:
                            nuevo_display = str(new_val or 'N/A')

                        detalle = (
                            f"Se ha modificado “{etiqueta}”\n"
                            f"- Anterior: {antiguo_display}\n"
                            f"+ Actual:  {nuevo_display}"
                        )

                        registro = {
                            **base_registro,
                            'id': f"{h.id}-{campo_interno}",
                            'detalle_cambio': detalle,
                            'valor_anterior': antiguo_display,
                            'valor_nuevo': nuevo_display,
                        }
                        historial_data.append(registro)
                        continue

                    # -----------------------------------
                    # 2) Si es DetalleTrabajo.content_type_id → mostrar app_label.model
                    # -----------------------------------
                    if model_name == 'DetalleTrabajo' and campo_interno == 'content_type_id':
                        # Resuelvo el ContentType anterior y el nuevo (si existen)
                        try:
                            ct_old = ContentType.objects.get(pk=old_val) if old_val else None
                            old_ct_label = f"{ct_old.app_label}.{ct_old.model}" if ct_old else 'N/A'
                        except ContentType.DoesNotExist:
                            old_ct_label = str(old_val or 'N/A')

                        try:
                            ct_new = ContentType.objects.get(pk=new_val) if new_val else None
                            new_ct_label = f"{ct_new.app_label}.{ct_new.model}" if ct_new else 'N/A'
                        except ContentType.DoesNotExist:
                            new_ct_label = str(new_val or 'N/A')

                        detalle = (
                            f"Se ha modificado “{etiqueta}”\n"
                            f"- Anterior: {old_ct_label}\n"
                            f"+ Actual:  {new_ct_label}"
                        )
                        registro = {
                            **base_registro,
                            'id': f"{h.id}-{campo_interno}",
                            'detalle_cambio': detalle,
                            'valor_anterior': old_ct_label,
                            'valor_nuevo': new_ct_label,
                        }
                        historial_data.append(registro)
                        continue

                    # -----------------------------------
                    # 3) Si es DetalleTrabajo.trabajo_id → mostrar “<app_label.model> #<id>”
                    # -----------------------------------
                    if model_name == 'DetalleTrabajo' and campo_interno == 'trabajo_id':
                        # Para identificar la “clase” usamos el ContentType que corresponda a cada valor:
                        #   - previous_record.content_type_id  → para old_val
                        #   - h.content_type_id                → para new_val
                        # (puede darse el caso de que content_type haya cambiado también)
                        try:
                            ct_old = ContentType.objects.get(pk=previous_record.content_type_id)
                            old_label = f"{ct_old.app_label}.{ct_old.model} #{old_val or 'N/A'}"
                        except (ContentType.DoesNotExist, AttributeError):
                            old_label = str(old_val or 'N/A')

                        try:
                            ct_new = ContentType.objects.get(pk=h.content_type_id)
                            new_label = f"{ct_new.app_label}.{ct_new.model} #{new_val or 'N/A'}"
                        except (ContentType.DoesNotExist, AttributeError):
                            new_label = str(new_val or 'N/A')

                        detalle = (
                            f"Se ha modificado “{etiqueta}”\n"
                            f"- Anterior: {old_label}\n"
                            f"+ Actual:  {new_label}"
                        )
                        registro = {
                            **base_registro,
                            'id': f"{h.id}-{campo_interno}",
                            'detalle_cambio': detalle,
                            'valor_anterior': old_label,
                            'valor_nuevo': new_label,
                        }
                        historial_data.append(registro)
                        continue

                    # -----------------------------------
                    # 4) Para cualquier otro campo mapeado, mostramos el valor crudo
                    # -----------------------------------
                    registro = {
                        **base_registro,
                        'id': f"{h.id}-{campo_interno}",
                        'detalle_cambio': (
                            f"Se ha modificado “{etiqueta}”\n"
                            f"- Anterior: {old_val or 'N/A'}\n"
                            f"+ Actual:  {new_val or 'N/A'}"
                        ),
                        'valor_anterior': str(old_val or 'N/A'),
                        'valor_nuevo': str(new_val or 'N/A'),
                    }
                    historial_data.append(registro)

            # Si no hubo cambio en ninguno de los campos mapeados,
            # metemos un mensaje genérico de “modificado”
            if not cambios_detectados:
                base_registro['detalle_cambio'] = (
                    f"Se ha modificado un registro de {get_accion_modelo(model_name)}, "
                    f"pero no se detectaron diferencias en los campos mapeados."
                )
                historial_data.append(base_registro)

        return Response(historial_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='detalles-seguimientos-visitas')
    def detalles_seguimientos_visitas(self, request, pk=None):
        # Obtenemos la orden de trabajo
        orden = self.get_object()
        detalles_data = []

        # Iteramos sobre cada detalle asociado a la orden
        for detalle in orden.detalletrabajo_set.all():
            # Obtenemos los seguimientos asociados al detalle
            seguimientos = SeguimientoDetalleTrabajo.objects.filter(detalle_trabajo=detalle)
            seguimiento_list = []
            for seg in seguimientos:
                seguimiento_list.append({
                    'id': seg.id,
                    'tipo': seg.tipo,
                    'fecha': seg.fecha,
                    'comentario': seg.comentario,
                    'usuario': seg.usuario.id if seg.usuario else None,
                })

            # Inicializamos la variable para los datos de visita
            visita_data = None
            # Si el detalle tiene un trabajo asociado y es de tipo "visitasoporte"
            if detalle.trabajo and detalle.content_type.model.lower() == 'visitasoporte':
                visita = detalle.trabajo

                # Consultamos las asistencias asociadas a la visita
                asistencias = AsistenciaUsuario.objects.filter(visita=visita)
                asistencias_list = []
                for asis in asistencias:
                    asistencias_list.append({
                        'id': asis.id,
                        'estado_revision': asis.estado_revision,
                        'observaciones': asis.observaciones,
                        'observaciones_revision': asis.observaciones_revision
                    })

                # Consultamos las entregas asociadas a la visita
                entregas = EntregaDeEquipo.objects.filter(visita=visita)
                entregas_list = []
                for ent in entregas:
                    entregas_list.append({
                        'id': ent.id,
                        'estado_entrega': ent.estado_entrega,
                        'observaciones': ent.observaciones,
                        'observaciones_entrega': ent.observaciones_entrega
                    })

                visita_data = {
                    'id': visita.id,
                    'asistencias': asistencias_list,
                    'entregas': entregas_list,
                    'descripcion_servicio': visita.descripcion_servicio
                }

            detalles_data.append({
                'detalle_id': detalle.id,
                'seguimientos': seguimiento_list,
                'visita': visita_data,
            })

        # Retornamos la respuesta con la información recopilada
        return Response({
            'orden_id': orden.id,
            'detalles': detalles_data,
        })

    @action(detail=True, methods=["get"], url_path="insumos")
    def insumos_en_ot(self, request, pk=None):
        """
        Devuelve los Detalles de Trabajo de tipo Visita que tienen
        una GuiaSalida asociada, mostrando los campos requeridos.
        """
        ot = self.get_object()

        detalles = (
            DetalleTrabajo.objects
            .filter(
                orden=ot,
                insumo__isnull=False,
            )
            .select_related("insumo")
        )

        serializer = DetalleGuiaSerializer(detalles, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='check-completabilidad')
    def check_completabilidad(self, request, pk=None):
        """
        Devuelve un booleano `se_puede_completar` y una lista de `razones`
        explicando por qué la orden no puede completarse.
        """
        orden = self.get_object()
        razones = []

        detalles = DetalleTrabajo.objects.filter(orden=orden)\
            .select_related('insumo', 'content_type')

        if not detalles.exists():
            razones.append('La orden no tiene detalles de trabajo.')
        else:
            for det in detalles:
                # 1) Estado válido en detalle
                if det.estado not in ['medianamente_completado', 'completado', 'no_realizado']:
                    razones.append(
                        f"Detalle {det.pk}: estado '{det.get_estado_display()}' no permite completar"
                    )

                # 2) Estado de insumo si existe
                if det.insumo and det.insumo.estado not in ['T', 'R', 'PR', 'E']:
                    razones.append(
                        f"Detalle {det.pk}: insumo en estado '{det.insumo.get_estado_display()}'"
                    )

                # 3) Estado de VisitaSoporte si aplica
                ct = det.content_type
                if ct and ct.app_label == 'visitas' and ct.model == 'visitasoporte':
                    visita = det.trabajo
                    if visita and visita.estado not in ['completada', 'cerrada']:
                        razones.append(
                            f"Detalle {det.pk}: visita soporte en estado '{visita.get_estado_display()}'"
                        )

        se_puede_completar = len(razones) == 0
        return Response({
            'se_puede_completar': se_puede_completar,
            'razones': razones
        })

class DetalleTrabajoViewSet(viewsets.ModelViewSet):
    queryset = DetalleTrabajo.objects.none()
    serializer_class = DetalleTrabajoSerializer

    def get_queryset(self):
        orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_id:
            return DetalleTrabajo.objects.filter(orden_id=orden_trabajo_id)
        return DetalleTrabajo.objects.none()

    def destroy(self, request, *args, **kwargs):
        detalle: DetalleTrabajo = self.get_object()

        # 1) Solo si está «pendiente»
        if detalle.estado != "pendiente":
            raise ValidationError("Solo se pueden eliminar detalles con estado «pendiente».")

        # 2) Si apunta a una compra («bodegas.compra»), elimínala
        if (detalle.content_type and detalle.content_type.app_label == "bodegas" and detalle.content_type.model == "compra" and detalle.trabajo):
            detalle.trabajo.delete()

        # 3) Finalmente, elimina el detalle
        detalle.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='trabajos-disponibles')
    def trabajos_disponibles(self, request, orden_trabajo_pk=None):
        orden_trabajo_pk = self.kwargs.get('orden_trabajo_pk')

        try:
            orden = OrdenDeTrabajo.objects.only('empresa', 'cliente').get(pk=orden_trabajo_pk)
        except OrdenDeTrabajo.DoesNotExist:
            return Response(
                {'detail': 'Orden de Trabajo no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )
        cotizacion_ct = ContentType.objects.get(app_label='cotizaciones', model='cotizacion')
        visita_ct = ContentType.objects.get(app_label='visitas', model='visitasoporte')

        # detalles_qs = DetalleTrabajo.objects.filter(
        #     content_type=OuterRef('content_type'),
        #     trabajo_id=OuterRef('id')
        # )

        cotizaciones = Cotizacion.objects.filter(
            empresa=orden.empresa,
            cliente=orden.cliente,
            estado="aceptada"
        ).annotate(
            ya_usado=Exists(
                DetalleTrabajo.objects.filter(
                    content_type=cotizacion_ct,
                    trabajo_id=OuterRef('id')
                )
            )
        ).filter(ya_usado=False).only('id', 'empresa', 'cliente')

        visitas = VisitaSoporte.objects.filter(
            empresa=orden.empresa,
            cliente=orden.cliente
        ).annotate(
            ya_usado=Exists(
                DetalleTrabajo.objects.filter(
                    content_type=visita_ct,
                    trabajo_id=OuterRef('id')
                )
            )
        ).filter(ya_usado=False).only('id', 'empresa', 'cliente')

        # Serializar los resultados
        cotizaciones_serializadas = CotizacionSerializer(cotizaciones, many=True).data
        visitas_serializadas = VisitaSoporteSerializer(visitas, many=True).data

        # Retornar la respuesta combinada
        return Response({
            'cotizaciones': cotizaciones_serializadas,
            'visitas_soporte': visitas_serializadas
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="iniciar-proceso")
    def iniciar_proceso(self, request, *args, **kwargs):
        """
        1. Cambia el detalle a 'en_proceso' (y asigna técnico si falta).
        2. **Aprueba** la guía ligada al detalle:
           - Valida que la cantidad rebajada ≤ cantidad_no_disponible.
           - Rebaja la reserva (cantidad_no_disponible) y registra la salida.
           - Guarda la firma y pasa la guía a estado 'ET'.
        Body esperado:
        {
          "firma_recibido_por": "<base64/svg/…>"
        }
        """
        firma_recibido_por = request.data.get("firma_recibido_por", "").strip()
        if not firma_recibido_por:
            return Response(
                {"detail": "El campo 'firma_recibido_por' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detalle = self.get_object()
        guia = detalle.insumo
        if guia is None:
            return Response(
                {"detail": "El detalle no tiene una guía de salida asociada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if detalle.estado == "en_proceso":
            return Response(
                {"detail": "El detalle ya está en proceso."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # usuario_empresa = obtener_usuario_empresa(request.user)

        try:
            with transaction.atomic():
                # ───────────────────────── DetalleTrabajo ───────────────────────── #
                detalle.estado = "en_proceso"
                detalle.save()

                # ─────────────────── Validaciones de la guía (antiguo aprobar_guia) ─────────────────── #
                for item in (ItemsGuiaSalida.objects.filter(guia=guia).select_related("stock_item")):
                    if item.cantidad_rebajada > item.stock_item.cantidad_no_disponible:
                        raise ValueError(
                            f"La cantidad a rebajar ({item.cantidad_rebajada}) "
                            f"excede el stock reservado "
                            f"({item.stock_item.cantidad_no_disponible}) "
                            f"para el ítem {item.stock_item.item}."
                        )

                # Rebajar reserva y registrar salida
                for item in ItemsGuiaSalida.objects.filter(guia=guia):
                    stock_item = item.stock_item
                    item.cantidad_original = stock_item.cantidad

                    stock_item.cantidad_no_disponible = max(
                        0, stock_item.cantidad_no_disponible - item.cantidad_rebajada
                    )
                    stock_item.save()
                    item.save()

                    registrar_salida(
                        stock_item=stock_item,
                        cantidad=stock_item.cantidad,
                        usuario=detalle.tecnico_asignado,
                        origen=item,
                        descripcion="Items rebajados desde una guía de salida en una OT",
                    )

                # ──────────────────────────── Guía de salida ──────────────────────────── #
                guia.estado = "ET"
                guia.firma_recibido_por = firma_recibido_por
                guia.recibido_por = detalle.tecnico_asignado
                guia.save()

            # Respondemos el DetalleTrabajo (incluye los cambios en guía vía serializer nested)
            serializer = self.get_serializer(detalle)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ItemsGuiaSalida.DoesNotExist:
            return Response(
                {"detail": "Uno o más ítems no existen en esta guía de salida."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # @action(detail=False, methods=['get'], url_path='insumos-cotizacion')
    # def insumos_cotizacion(self, request, orden_trabajo_pk=None):
    #     if not orden_trabajo_pk:
    #         return Response(
    #             {'detail': 'No se encontró la identificación de la Orden de Trabajo en la URL.'},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )

    #     try:
    #         orden = OrdenDeTrabajo.objects.get(pk=orden_trabajo_pk)
    #     except OrdenDeTrabajo.DoesNotExist:
    #         return Response(
    #             {'detail': 'Orden de Trabajo no encontrada.'},
    #             status=status.HTTP_404_NOT_FOUND
    #         )

    #     cotizacion_ct = ContentType.objects.get(app_label='cotizaciones', model='cotizacion')
    #     detalles = DetalleTrabajo.objects.filter(
    #         orden=orden,
    #         content_type=cotizacion_ct
    #     ).select_related('insumo')

    #     # 🔥 Incluye detalle_trabajo_id en la respuesta
    #     data = [
    #         {
    #             "detalle_trabajo_id": detalle.id,
    #             "detalle_trabajo_nombre": detalle.nombre,
    #             "insumo": GuiaSalidaSerializer(detalle.insumo).data if detalle.insumo else None
    #         }
    #         for detalle in detalles if detalle.insumo is not None
    #     ]

    #     return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='guias-disponibles')
    def guias_disponibles(self, request, orden_trabajo_pk=None):
        if not orden_trabajo_pk:
            return Response(
                {'detail': 'No se encontró la identificación de la Orden de Trabajo en la URL.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            orden = OrdenDeTrabajo.objects.get(pk=orden_trabajo_pk)
        except OrdenDeTrabajo.DoesNotExist:
            return Response(
                {'detail': 'Orden de Trabajo no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Obtenemos los IDs de las guías ya usadas
        guias_usadas = DetalleTrabajo.objects.exclude(insumo__isnull=True).values_list('insumo_id', flat=True)

        # Verificar todas las guías en estado "EF" (antes ET)
        guias_estado_et = GuiaSalida.objects.filter(estado="EF")

        # Filtramos las guías disponibles
        guias_disponibles = guias_estado_et.exclude(pk__in=guias_usadas)

        # Verificar si hay algún problema con el filtro por detalle de trabajo
        guias_con_detalle = GuiaSalida.objects.filter(detalletrabajo__orden=orden)

        guias_disponibles = guias_disponibles.exclude(pk__in=guias_con_detalle.values_list('pk', flat=True))

        serializer = GuiaSalidaSerializer(guias_disponibles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='detalles-sin-insumo')
    def detalles_sin_insumo(self, request, orden_trabajo_pk=None):
        """
        Devuelve los DetalleTrabajo que:
        • Pertenecen a la orden indicada.
        • NO tienen insumo asociado.
        • Están vinculados a una Cotización o no tienen content_type asignado.
        """
        if not orden_trabajo_pk:
            return Response(
                {'detail': 'No se encontró la identificación de la Orden de Trabajo en la URL.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            orden = OrdenDeTrabajo.objects.get(pk=orden_trabajo_pk)
        except OrdenDeTrabajo.DoesNotExist:
            return Response(
                {'detail': 'Orden de Trabajo no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

        cotizacion_ct = ContentType.objects.get(app_label='cotizaciones', model='cotizacion')

        detalles = (
            DetalleTrabajo.objects
            .filter(
                orden=orden,
                insumo__isnull=True
            )
            .filter(
                Q(content_type=cotizacion_ct) | Q(content_type__isnull=True)
            )
        )

        serializer = DetalleTrabajoSerializer(detalles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='detalles-con-visitas')
    def detalles_con_visitas(self, request, orden_trabajo_pk=None, pk=None):
        """
        Devuelve todas las visitas relacionadas al detalle de trabajo,
        incluyendo asistencias de usuarios y entregas de equipo.
        """
        detalle = self.get_object()

        if not detalle.content_type or detalle.content_type.model != "visitasoporte":
            return Response(
                {"error": "Este detalle de trabajo no está relacionado con visitas"},
                status=status.HTTP_400_BAD_REQUEST
            )

        visita = VisitaSoporte.objects.get(id=detalle.trabajo_id)
        serializer = VisitaSoporteEnDetalleOTSerializer(visita).data

        return Response(serializer, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='actualizar-estado')
    def actualizar_estado(self, request, orden_trabajo_pk=None, pk=None):
        """
        Permite actualizar el estado de una asistencia de usuario o una entrega de equipo.
        """
        tipo = request.data.get("tipo")  # Puede ser 'asistencia' o 'entrega'
        objeto_id = request.data.get("id")  # ID de la asistencia o entrega
        nuevo_estado = request.data.get("estado")  # Nuevo estado

        if tipo == "asistencia":
            try:
                asistencia = AsistenciaUsuario.objects.get(id=objeto_id)
                asistencia.estado_revision = nuevo_estado
                asistencia.save()
                return Response({"mensaje": "Estado de asistencia actualizado correctamente"}, status=status.HTTP_200_OK)
            except AsistenciaUsuario.DoesNotExist:
                return Response({"error": "Asistencia no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        elif tipo == "entrega":
            try:
                entrega = EntregaDeEquipo.objects.get(id=objeto_id)
                entrega.estado_entrega = nuevo_estado
                entrega.save()
                return Response({"mensaje": "Estado de entrega actualizado correctamente"}, status=status.HTTP_200_OK)
            except EntregaDeEquipo.DoesNotExist:
                return Response({"error": "Entrega no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"error": "Tipo no válido"}, status=status.HTTP_400_BAD_REQUEST)

    # @action(detail=True, methods=["post"], url_path="crear-compra", url_name="crear_compra")
    # def crear_compra(self, request, orden_trabajo_pk=None, pk=None):
    #     """
    #     POST /ordenes/{orden_trabajo_pk}/detalles/{pk}/crear-compra/

    #     Body JSON con los campos exigidos por CompraSerializer.
    #     """
    #     detalle: DetalleTrabajo = self.get_object()

    #     # ¿Ya tiene compra asociada? – evita duplicados
    #     if (
    #         detalle.content_type_id
    #         and detalle.content_type == ContentType.objects.get_for_model(Compra)
    #     ):
    #         return Response(
    #             {"detail": "El detalle ya tiene una Compra asociada."},
    #             status=status.HTTP_400_BAD_REQUEST,
    #         )

    #     # Validar/crear la compra
    #     compra_serializer = CompraSerializer(data=request.data, context={"request": request})
    #     compra_serializer.is_valid(raise_exception=True)
    #     compra: Compra = compra_serializer.save(creado_por=request.user)

    #     # Asociar la compra al detalle por medio de GenericForeignKey
    #     detalle.content_type = ContentType.objects.get_for_model(Compra)
    #     detalle.trabajo_id = compra.id
    #     detalle.save(update_fields=["content_type", "trabajo_id", "updated_at"])

    #     # Respuesta combinada
    #     return Response(
    #         {
    #             "detalle_trabajo": DetalleTrabajoSerializer(detalle, context={"request": request}).data,
    #             "compra": CompraSerializer(compra, context={"request": request}).data,
    #         },
    #         status=status.HTTP_201_CREATED,
    #     )

    @action(detail=True, methods=['post'], url_path='crear-compra')
    def crear_compra(self, request, orden_trabajo_pk=None, pk=None):
        """
        Crea una Compra y la asocia al DetalleTrabajo (vía GenericForeignKey).
        """
        detalle = self.get_object()

        if (detalle.content_type_id and detalle.content_type == ContentType.objects.get_for_model(Compra)):
            return Response(
                {"detail": "El detalle ya tiene una Compra asociada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 1. Serializar y crear la Compra
            serializer_compra = CompraCreateSerializer(data=request.data, context={'request': request})
            serializer_compra.is_valid(raise_exception=True)
            compra = serializer_compra.save()

            # 2. Asociar la Compra al DetalleTrabajo
            detalle.content_type = ContentType.objects.get_for_model(compra)
            detalle.trabajo_id = compra.pk
            # detalle.estado = "en_proceso"
            detalle.save()

            # 3. Devolver tanto el Detalle actualizado como la Compra recién creada
            detalle_data = DetalleTrabajoSerializer(detalle, context={'request': request}).data
            compra_data = CompraCreateSerializer(compra, context={'request': request}).data

            return Response(
                {
                    'detalle_trabajo': detalle_data,
                    'compra': compra_data
                },
                status=status.HTTP_201_CREATED
            )

    @action(detail=False, methods=['get'], url_path='lista-compras')
    def lista_compras(self, request, orden_trabajo_pk=None):
        ct = ContentType.objects.get_for_model(Compra)
        ordenes = self.get_queryset().filter(content_type=ct)
        return Response(DetalleTrabajoCompraSerializer(ordenes, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='completar-compra')
    def completar_compra(self, request, orden_trabajo_pk=None, pk=None):
        detalle = self.get_object()

        with transaction.atomic():
            # 1) Verificar que el trabajo sea una Compra
            compra_ct = ContentType.objects.get(app_label='bodegas', model='compra')
            if detalle.content_type_id != compra_ct.id:
                return Response({'detail': 'El trabajo asociado no es una Compra.'},
                                status=status.HTTP_400_BAD_REQUEST)
            compra = detalle.trabajo  # instancia de Compra

            # 2) Cambiar estado de la Compra
            compra.estado = '1'
            compra.save(update_fields=["estado"])

            # 3) Marcar el detalle como completado (sin generar guia ni movimientos de stock)
            detalle.estado = 'completado'
            detalle.save(update_fields=["estado"])

            serializer = self.get_serializer(detalle)
            return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="asociar-trabajo")
    def asociar_trabajo(self, request, orden_trabajo_pk=None, pk=None):
        """
        Asocia un trabajo (de cualquier app/model) a este DetalleTrabajo.

        Si el trabajo es una ``visitasoporte``:
          • Si visitasoporte tiene una guia_salida, la asocia como
            insumo al DetalleTrabajo.
        """
        detalle = self.get_object()

        # -------- 1. Validar parámetros de entrada --------------------- #
        content_type_id = request.data.get("content_type")
        trabajo_id      = request.data.get("trabajo_id")

        if not all([content_type_id, trabajo_id]):
            return Response(
                {"detail": "content_type y trabajo_id son obligatorios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ct = ContentType.objects.get(pk=content_type_id)
        except ContentType.DoesNotExist:
            return Response(
                {"detail": f"No existe ContentType {content_type_id}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------- 2. Operar dentro de una transacción atómica ---------- #
        with transaction.atomic():

            # 2.a  Actualizar el DetalleTrabajo -------------------------- #
            detalle.content_type = ct
            detalle.trabajo_id   = trabajo_id
            detalle.save(update_fields=["content_type", "trabajo_id"])

            # 2.b  Lógica especial para visitas de soporte ----------------------- #
            if ct.model == "visitasoporte":
                visita = get_object_or_404(VisitaSoporte, pk=trabajo_id)

                guia = visita.guia_salida
                if guia is not None:
                    # ¿Ya hay otro detalle usando la misma guía?
                    otro = DetalleTrabajo.objects.filter(insumo=guia).exclude(pk=detalle.pk).first()
                    if otro:
                        return Response(
                            {"detail": (
                                f"La Guía de Salida {guia.pk} ya está asociada "
                                f"al DetalleTrabajo #{otro.pk}"
                            )},
                            status=status.HTTP_409_CONFLICT,
                        )

                    # No hay conflicto ➜ asignar
                    detalle.insumo = guia
                    detalle.save(update_fields=["insumo"])

        # -------- 3. Respuesta OK con el DetalleTrabajo ---------------- #
        serializer = self.serializer_class(detalle, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="asignar-insumo")
    def asignar_insumo(self, request, pk=None, orden_trabajo_pk=None):
        detalle = self.get_object()

        insumo = get_object_or_404(GuiaSalida, pk=request.data.get("insumo"))
        detalle.insumo = insumo
        detalle.save(update_fields=["insumo"])

        if detalle.tecnico_asignado:
            insumo.recibido_por = detalle.tecnico_asignado
            insumo.save(update_fields=["recibido_por"])
        
        if detalle.content_type.model.lower() == "visitasoporte":
            detalle.trabajo.guia_salida = insumo
            detalle.trabajo.save()

        return Response("Insumo asignado", status=status.HTTP_200_OK)

class SeguimientoDetalleTrabajoViewSet(viewsets.ModelViewSet):
    queryset = SeguimientoDetalleTrabajo.objects.select_related('detalle_trabajo', 'usuario')
    serializer_class = SeguimientoDetalleTrabajoSerializer

    def get_queryset(self):
        detalle_trabajo_id = self.kwargs.get('detalle_trabajo_pk')
        if detalle_trabajo_id:
            return SeguimientoDetalleTrabajo.objects.filter(detalle_trabajo_id=detalle_trabajo_id)
        return SeguimientoDetalleTrabajo.objects.none()

class HistorialCambiosOrdenViewSet(viewsets.ModelViewSet):
    queryset = HistorialCambiosOrden.objects.select_related('orden', 'usuario')
    serializer_class = HistorialCambiosOrdenSerializer

    def get_queryset(self):
        orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_id:
            return HistorialCambiosOrden.objects.filter(orden_id=orden_trabajo_id)
        return HistorialCambiosOrden.objects.none()

class AdjuntoDeOrdenViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = AdjuntoDeOrdenSerializer

    def get_queryset(self):
        orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_id:
            return AdjuntoDeOrden.objects.filter(orden_id=orden_trabajo_id).select_related('orden')
        return AdjuntoDeOrden.objects.none()

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_upload(self, request, orden_trabajo_pk=None):
        """
        Sube varias imágenes (multipart o Base64) usando UNA MISMA descripción.
        Cuerpo esperado:
        {
          "descripcion": "Fotos de equipo terminada",
          "imagenes": [
              <file>,         # multipart
              "data:image/png;base64,iVBORw0K..."  # o Base64
          ]
        }
        """
        # 1. Buscar la orden
        orden = get_object_or_404(OrdenDeTrabajo, pk=orden_trabajo_pk)

        # 2. Descripción global (obligatoria)
        descripcion = request.data.get('descripcion')
        if not descripcion:
            return Response(
                {"descripcion": ["Este campo es obligatorio."]},
                status=400
            )

        # 3. Recuperar lista de “imagenes”
        imagenes = request.data.get('imagenes', [])
        # Cuando se envía multipart, 'imagenes' puede ser un JSON en texto
        if isinstance(imagenes, str):
            try:
                imagenes = json.loads(imagenes)
            except json.JSONDecodeError:
                # Tal vez venía como un solo string Base64
                imagenes = [imagenes]

        # 4. Regex para detectar el prefijo data:...;base64,
        b64_regex = re.compile(
            r'^data:(?P<mime>[\w\-/]+);base64,(?P<data>.+)$'
        )

        nuevos = []

        # 4a. Primero: los archivos que llegaron por multipart
        for f in request.FILES.getlist('imagenes'):
            nuevos.append(
                AdjuntoDeOrden(
                    orden=orden,
                    tipo='imagen',
                    archivo=f,
                    descripcion=descripcion
                )
            )

        # 4b. Segundo: strings Base64 en la lista ‘imagenes’
        for item in imagenes:
            if isinstance(item, str):
                m = b64_regex.match(item)
                if not m:
                    return Response(
                        {"detail": "Cadena Base64 inválida."},
                        status=400
                    )
                binary = base64.b64decode(m.group('data'))
                ext = m.group('mime').split('/')[-1]
                name = f"{uuid.uuid4()}.{ext}"
                cf = ContentFile(binary, name=name)
                nuevos.append(
                    AdjuntoDeOrden(
                        orden=orden,
                        tipo='imagen',
                        archivo=cf,
                        descripcion=descripcion
                    )
                )

        if not nuevos:
            return Response(
                {"detail": "Debes adjuntar al menos una imagen."},
                status=400
            )

        AdjuntoDeOrden.objects.bulk_create(nuevos)
        return Response(
            self.get_serializer(nuevos, many=True).data,
            status=201
        )

# class RetroalimentacionOTViewSet(viewsets.ModelViewSet):
#     queryset = RetroalimentacionOT.objects.all()
#     serializer_class = RetroalimentacionOTSerializer

#     def get_queryset(self):
#         orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
#         if orden_trabajo_id:
#             return RetroalimentacionOT.objects.filter(orden_id=orden_trabajo_id)
#         return RetroalimentacionOT.objects.none()

#     @action(detail=False, methods=['post'], url_path='enviar')
#     def enviar(self, request, orden_trabajo_pk=None):
#         # 1. Validar orden de trabajo en la URL
#         if not orden_trabajo_pk:
#             return Response(
#                 {'detail': 'Debe especificar la orden de trabajo en la URL.'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         data = request.data.copy()
#         data['orden'] = orden_trabajo_pk

#         # 2. Validar que venga 'usuario' o ('nombre' y 'correo')
#         usuario_pk = data.get('usuario')
#         nombre = data.get('nombre')
#         correo = data.get('correo')

#         if usuario_pk:
#             # Comprobar que exista ese UsuarioEmpresa
#             try:
#                 UsuarioEmpresa.objects.get(pk=usuario_pk)
#             except UsuarioEmpresa.DoesNotExist:
#                 return Response(
#                     {'detail': 'El usuario especificado no existe.'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
#         else:
#             # Si no viene usuario, necesitamos ambos nombre y correo
#             if not nombre or not correo:
#                 return Response(
#                     {'detail': 'Debe enviar "usuario" o, en su defecto, ambos "nombre" y "correo".'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#         # 3. ¿Ya existe retroalimentación para este usuario + orden?
#         instancia = None
#         if usuario_pk:
#             instancia = RetroalimentacionOT.objects.filter(
#                 orden_id=orden_trabajo_pk,
#                 usuario_id=usuario_pk
#             ).first()

#         if instancia:
#             # 4a. Reenvío: usamos la misma instancia
#             serializer = self.get_serializer(instancia)
#             status_code = status.HTTP_200_OK
#         else:
#             # 4b. Primera vez: creamos registro nuevo
#             serializer = self.get_serializer(data=data)
#             serializer.is_valid(raise_exception=True)
#             instancia = serializer.save()
#             status_code = status.HTTP_201_CREATED

#         # 5. Preparar destinatarios y saludo
#         if instancia.usuario_id:
#             destinatarios = [instancia.usuario.usuario.email]
#             saludo = instancia.usuario.usuario.get_nombre_completo() or instancia.usuario.usuario.get_nombre()
#         else:
#             destinatarios = [instancia.correo]
#             saludo = instancia.nombre

#         # 6. Construir y despachar el correo con Celery
#         subject = f"Por favor, retroalimenta la OT #{instancia.orden.id}"
#         html_body = (
#             f"<p>Hola {saludo},</p>"
#             "<p>Te invitamos a dejarnos tu opinión sobre la Orden de Trabajo "
#             f"<strong>#{instancia.orden.id}</strong>.</p>"
#         )
#         url_boton = f"{os.getenv('FRONTEND_URL')}/feedback/{instancia.uuid}"
#         titulo = "Retroalimentación de Orden de Trabajo"
#         text_boton = "Dejar mi opinión"

#         send_email_task.delay(
#             subject=subject,
#             recipient_list=destinatarios,
#             html_body=html_body,
#             titulo=titulo,
#             url_boton=url_boton,
#             text_boton=text_boton,
#             cc=[]
#         )

#         return Response(serializer.data, status=status_code)

#     @action(detail=True, methods=['get'], url_path='reenviar')
#     def reenviar(self, request, orden_trabajo_pk=None):
#         instancia = self.get_object()

#         if instancia.usuario_id:
#             destinatarios = [instancia.usuario.usuario.email]
#             saludo = instancia.usuario.usuario.get_nombre_completo() or instancia.usuario.usuario.get_nombre()
#         else:
#             destinatarios = [instancia.correo]
#             saludo = instancia.nombre

#         subject = f"Por favor, retroalimenta la OT #{instancia.orden.id}"
#         html_body = (
#             f"<p>Hola {saludo},</p>"
#             "<p>Te invitamos a dejarnos tu opinión sobre la Orden de Trabajo "
#             f"<strong>#{instancia.orden.id}</strong>.</p>"
#         )
#         url_boton = f"{os.getenv('FRONTEND_URL')}/feedback/{instancia.uuid}"
#         titulo = "Retroalimentación de Orden de Trabajo"
#         text_boton = "Dejar mi opinión"

#         send_email_task.delay(
#             subject=subject,
#             recipient_list=destinatarios,
#             html_body=html_body,
#             titulo=titulo,
#             url_boton=url_boton,
#             text_boton=text_boton,
#             cc=[]
#         )

#         return Response(serializer.data, status=status_code)

# class RetroalimentacionOTDetailAPIView(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request, uuid, *args, **kwargs):
#         """
#         Retorna los datos de la retroalimentación (incluyendo detalles de la OT),
#         agrega 1 a cantidad_visitas y vuelve a serializar.
#         """
#         feedback = get_object_or_404(RetroalimentacionOT, uuid=uuid)
#         # Incrementar visitas de forma atómica
#         RetroalimentacionOT.objects.filter(pk=feedback.pk).update(cantidad_visitas=F('cantidad_visitas') + 1)
#         feedback.refresh_from_db()
#         serializer = RetroalimentacionDetailSerializer(feedback)
#         return Response(serializer.data)

# class RetroalimentacionOTPatchAPIView(APIView):
#     permission_classes = [AllowAny]

#     def patch(self, request, uuid, *args, **kwargs):
#         """
#         Permite editar solo cantidad_estrellas, observacion_retroalimentacion
#         y fecha_retroalimentacion via PATCH.
#         """
#         feedback = get_object_or_404(RetroalimentacionOT, uuid=uuid)
#         serializer = RetroalimentacionPatchSerializer(feedback, data=request.data, partial=True)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
#         return Response(serializer.data)

class DetalleGastoRendicionOTViewSet(viewsets.ModelViewSet):
    queryset = DetalleGastoRendicionOT.objects.all()
    serializer_class = DetalleGastoRendicionOTSerializer

    def get_queryset(self):
        orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_id:
            return DetalleGastoRendicionOT.objects.filter(orden_id=orden_trabajo_id)
        return DetalleGastoRendicionOT.objects.all()

class UsuarioAsignadoOTViewSet(viewsets.ModelViewSet):
    queryset = UsuarioAsignadoOT.objects.all()
    serializer_class = UsuarioAsignadoOTSerializer

    def get_queryset(self):
        orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_id:
            return UsuarioAsignadoOT.objects.filter(orden_id=orden_trabajo_id)
        return UsuarioAsignadoOT.objects.all()

class RetroalimentacionViewset(viewsets.ModelViewSet):
    queryset = Retroalimentacion.objects.all()
    serializer_class = RetroalimentacionSerializer

    def get_queryset(self):
        orden_trabajo_id = self.kwargs.get('orden_trabajo_pk')
        if orden_trabajo_id:
            return Retroalimentacion.objects.filter(orden_trabajo_id=orden_trabajo_id)
        return Retroalimentacion.objects.all()
