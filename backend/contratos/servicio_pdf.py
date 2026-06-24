"""Servicio centralizado de generacion de PDF para contratos.

Punto de entrada unico para cualquier tipo de contrato soportado por el sistema.
Encapsula el pipeline completo:

  1. Resolucion de plantilla (para contratos laborales).
  2. Creacion del adaptador correcto segun tipo de contrato.
  3. Generacion/actualizacion de secciones renderizadas.
  4. Generacion de bytes PDF via motor v2.
  5. Persistencia opcional en ``modelo.archivo_pdf``.

Uso basico desde una vista::

    from contratos.servicio_pdf import PlantillaNoDisponibleError, generar_pdf

    try:
        pdf_bytes = generar_pdf(contrato, persistir=True)
    except PlantillaNoDisponibleError as exc:
        return Response({"detail": str(exc)}, status=400)

Agregar soporte para un nuevo tipo de contrato:
  1. Crear un adaptador en ``contratos/adaptadores.py`` que implemente ``IContratoBase``.
  2. Registrar el tipo en ``_dispatch`` de este modulo.
"""

from __future__ import annotations

from typing import Optional


class PlantillaNoDisponibleError(Exception):
    """Se lanza cuando no existe ninguna plantilla aplicable al contrato."""


# ---------------------------------------------------------------------------
# Helpers privados
# ---------------------------------------------------------------------------

def _empresa_desde_contrato_trabajador(contrato):
    """Extrae la empresa empleadora desde un ContratoTrabajador."""
    ue = getattr(contrato, "usuario_empresa", None)
    if ue and getattr(ue, "sucursal_id", None):
        return ue.sucursal.empresa
    return None


def _resolver_plantilla_trabajador(contrato, empresa):
    """
    Resolucion en cascada para ContratoTrabajador:
      1. FK explicita ya asignada al contrato.
      2. Plantilla con subtipo coincidente para la empresa empleadora.
      3. Plantilla universal (subtipo nulo) para la empresa empleadora.
      4. Plantilla global con subtipo coincidente.
      5. Plantilla global universal.

    Retorna la plantilla encontrada o None.
    """
    from contratos.models import PlantillaContrato

    plantilla = getattr(contrato, "plantilla_contrato", None)
    if plantilla:
        return plantilla

    subtipo = getattr(contrato, "tipo_contrato", None)

    if empresa and subtipo:
        plantilla = PlantillaContrato.objects.filter(
            empresa_prestadora=empresa,
            tipo_contrato="trabajador",
            subtipo_trabajador=subtipo,
            es_default=True,
            activa=True,
        ).first()
        if plantilla:
            return plantilla

    if empresa:
        plantilla = PlantillaContrato.objects.filter(
            empresa_prestadora=empresa,
            tipo_contrato="trabajador",
            subtipo_trabajador__isnull=True,
            es_default=True,
            activa=True,
        ).first()
        if plantilla:
            return plantilla

    if subtipo:
        plantilla = PlantillaContrato.objects.filter(
            empresa_prestadora__isnull=True,
            tipo_contrato="trabajador",
            subtipo_trabajador=subtipo,
            es_default=True,
            activa=True,
        ).first()
        if plantilla:
            return plantilla

    return PlantillaContrato.objects.filter(
        empresa_prestadora__isnull=True,
        tipo_contrato="trabajador",
        subtipo_trabajador__isnull=True,
        es_default=True,
        activa=True,
    ).first()


# ---------------------------------------------------------------------------
# Dispatchers privados por tipo
# ---------------------------------------------------------------------------

def _generar_pdf_b2b(modelo, *, firma_b64=None, firmante="") -> bytes:
    """Pipeline para ContratoEmpresaCliente — delega integro al motor v1."""
    from contratos.adaptadores import AdaptadorContratoB2B
    from contratos.funciones_v2 import generar_contrato_pdf_v2

    adaptador = AdaptadorContratoB2B(modelo)
    return generar_contrato_pdf_v2(adaptador, firma_b64=firma_b64, firmante=firmante)


def _generar_pdf_trabajador(
    contrato,
    *,
    firma_b64: Optional[str] = None,
    firmante: str = "",
    forzar_borrador: bool = False,
    persistir: bool = False,
) -> bytes:
    """
    Pipeline completo para ContratoTrabajador:
      resolucion de plantilla → adaptador → secciones → PDF → [persistir].
    """
    from django.core.files.base import ContentFile

    from contratos.adaptadores import AdaptadorContratoTrabajador
    from contratos.funciones_v2 import generar_contrato_pdf_v2
    from contratos.motor_plantillas_v2 import generar_secciones_v2

    empresa = _empresa_desde_contrato_trabajador(contrato)
    plantilla = _resolver_plantilla_trabajador(contrato, empresa)

    if not plantilla:
        raise PlantillaNoDisponibleError(
            "No hay plantilla de contrato laboral disponible. "
            "Asigna una plantilla al contrato o configura una "
            "plantilla default tipo 'trabajador'."
        )

    # Vincular plantilla al contrato si aun no tiene una asignada.
    if not getattr(contrato, "plantilla_contrato_id", None):
        contrato.plantilla_contrato = plantilla
        contrato.save(update_fields=["plantilla_contrato", "fecha_modificacion"])

    # Congelar snapshot del grupo de turnos en el primer PDF generado
    # (no solo al activar), para que el borrador use datos inmutables.
    if contrato.grupo_turno_id and not contrato.grupo_turno_snapshot:
        grupo = contrato.grupo_turno
        contrato.grupo_turno_snapshot = {
            "id": grupo.id,
            "nombre": grupo.nombre,
            "ciclo": grupo.ciclo,
            "slots": [
                {
                    "orden": s.orden,
                    "nombre": s.turno.nombre,
                    "hora_inicio": str(s.turno.hora_inicio),
                    "hora_fin": str(s.turno.hora_fin),
                }
                for s in grupo.slots.select_related("turno").order_by("orden")
            ],
        }
        contrato.save(update_fields=["grupo_turno_snapshot", "fecha_modificacion"])

    adaptador = AdaptadorContratoTrabajador(contrato)

    # Generar/refrescar secciones renderizadas segun plantilla.
    generar_secciones_v2(adaptador)

    # Generar PDF.
    pdf_bytes = generar_contrato_pdf_v2(
        adaptador,
        firma_b64=firma_b64,
        firmante=firmante,
        forzar_borrador=forzar_borrador,
    )

    if persistir:
        nombre_archivo = f"contrato_trabajador_{contrato.id}.pdf"
        contrato.archivo_pdf.save(nombre_archivo, ContentFile(pdf_bytes), save=True)

    return pdf_bytes


# ---------------------------------------------------------------------------
# API publica
# ---------------------------------------------------------------------------

def generar_pdf(
    modelo,
    *,
    firma_b64: Optional[str] = None,
    firmante: str = "",
    forzar_borrador: bool = False,
    persistir: bool = False,
) -> bytes:
    """
    Genera el PDF para cualquier tipo de contrato soportado.

    Tipos soportados:
    - ``ContratoTrabajador`` (rrhh): resuelve plantilla, genera secciones y PDF.
    - ``ContratoEmpresaCliente`` (contratos): delega al motor v1 (B2B).

    Args:
        modelo:          Instancia del contrato.
        firma_b64:       Imagen de firma en base64 (data:image/...). Solo trabajador.
        firmante:        Nombre del firmante. Solo trabajador.
        forzar_borrador: Si True, imprime marca de agua BORRADOR.
        persistir:       Si True, guarda el PDF en ``modelo.archivo_pdf``.

    Returns:
        bytes del PDF generado.

    Raises:
        PlantillaNoDisponibleError: Si no hay plantilla disponible (solo trabajador).
        TypeError: Si el tipo de modelo no esta registrado.
    """
    from contratos.models import ContratoEmpresaCliente

    try:
        from rrhh.models import ContratoTrabajador
    except ImportError:
        ContratoTrabajador = None

    if isinstance(modelo, ContratoEmpresaCliente):
        return _generar_pdf_b2b(modelo, firma_b64=firma_b64, firmante=firmante)

    if ContratoTrabajador and isinstance(modelo, ContratoTrabajador):
        return _generar_pdf_trabajador(
            modelo,
            firma_b64=firma_b64,
            firmante=firmante,
            forzar_borrador=forzar_borrador,
            persistir=persistir,
        )

    raise TypeError(
        f"Tipo de contrato no registrado en servicio_pdf: {type(modelo).__name__}"
    )


# ---------------------------------------------------------------------------
# PDF de Finiquito
# ---------------------------------------------------------------------------

def _resolver_plantilla_finiquito(empresa):
    """
    Resolución en cascada para plantilla de finiquito:
      1. Plantilla default de la empresa empleadora (tipo='finiquito', es_default=True).
      2. Plantilla global (empresa__isnull=True, tipo='finiquito', es_default=True).
    """
    from contratos.models import PlantillaContrato

    if empresa:
        plantilla = PlantillaContrato.objects.filter(
            empresa_prestadora=empresa,
            tipo_contrato="finiquito",
            es_default=True,
            activa=True,
        ).first()
        if plantilla:
            return plantilla

    return PlantillaContrato.objects.filter(
        empresa_prestadora__isnull=True,
        tipo_contrato="finiquito",
        es_default=True,
        activa=True,
    ).first()


def generar_pdf_finiquito(finiquito, *, persistir: bool = False) -> bytes:
    """
    Genera el PDF del finiquito usando el motor V2 con plantilla tipo 'finiquito'.

    Usa ``AdaptadorContratoTrabajador`` extendido con etiquetas finiquito.
    Las secciones se persisten en ``SeccionContratoGenerada`` vinculadas al
    contrato, aisladas de las secciones del contrato base por el filtro de
    plantilla en ``_generar_pdf_trabajador``.

    Args:
        finiquito: Instancia de ``FiniquitoContrato``.
        persistir: Si True, guarda el PDF en ``finiquito.archivo_pdf``.

    Returns:
        bytes del PDF generado.

    Raises:
        PlantillaNoDisponibleError: Si no hay plantilla de finiquito configurada.
    """
    from django.core.files.base import ContentFile

    from contratos.adaptadores import AdaptadorFiniquito
    from contratos.funciones_v2 import generar_contrato_pdf_v2
    from contratos.motor_plantillas_v2 import generar_secciones_v2

    contrato = finiquito.contrato
    empresa = _empresa_desde_contrato_trabajador(contrato)
    plantilla = _resolver_plantilla_finiquito(empresa)

    if not plantilla:
        raise PlantillaNoDisponibleError(
            "No hay plantilla de finiquito disponible. "
            "Configura una plantilla tipo 'finiquito' en el panel de administración."
        )

    adaptador = AdaptadorFiniquito(contrato, plantilla, finiquito)
    generar_secciones_v2(adaptador)
    pdf_bytes = generar_contrato_pdf_v2(adaptador)

    if persistir:
        nombre_archivo = f"finiquito_{contrato.id}.pdf"
        finiquito.archivo_pdf.save(nombre_archivo, ContentFile(pdf_bytes), save=True)

    return pdf_bytes
