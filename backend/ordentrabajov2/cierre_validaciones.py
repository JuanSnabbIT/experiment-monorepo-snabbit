"""
Módulo con funciones de validación para el cierre de OT.
Contiene la lógica de validación de requisitos previos al cerrar una OT.
"""

from typing import List, Optional
from rendiciones.models import Rendicion
from ordentrabajov2.models import CierreAdministrativoOT, OrdenDeTrabajo


def validar_requisitos_cierre_ot(orden: OrdenDeTrabajo) -> List[str]:
    """
    Valida que una OT cumpla los requisitos para pasar a estado 'cerrada'.
    
    Requisitos:
    1. Existe una prefactura (CierreAdministrativoOT) con estado 'aprobado' que incluya esta OT
    2. Existe una rendición asociada a la OT con estado '2' (Aprobada)
    
    Args:
        orden: Instancia de OrdenDeTrabajo
        
    Returns:
        Lista de mensajes de error. Si está vacía, la OT puede cerrarse.
    """
    errores = []
    
    # Validar 1: Prefactura aprobada que incluya esta OT
    prefactura_aprobada = _validar_prefactura_aprobada(orden)
    if prefactura_aprobada:
        errores.append(prefactura_aprobada)
    
    # Validar 2: Rendición aprobada
    rendicion_error = _validar_rendicion_aprobada(orden)
    if rendicion_error:
        errores.append(rendicion_error)
    
    return errores


def _validar_prefactura_aprobada(orden: OrdenDeTrabajo) -> Optional[str]:
    """
    Valida que exista una prefactura con estado 'aprobado' para esta OT.
    
    Returns:
        Mensaje de error si no existe, None si es válido.
    """
    try:
        qs = CierreAdministrativoOT.objects.filter(
            cliente=orden.cliente,
            estado_cierre="aprobado",
        )

        if not qs.exists():
            return "No existe una prefactura aprobada para este cliente."

        # Normalizador flexible de entradas en `ots_incluidas`
        def _extract_ids(items):
            ids = set()
            for it in items or []:
                if isinstance(it, int):
                    ids.add(it)
                elif isinstance(it, str):
                    if it.isdigit():
                        ids.add(int(it))
                    else:
                        # intentar extraer dígitos dentro del string
                        try:
                            ids.add(int(''.join(ch for ch in it if ch.isdigit())))
                        except Exception:
                            continue
                elif isinstance(it, dict):
                    for key in ("id", "ot_id", "orden_id", "orden"):
                        val = it.get(key)
                        if isinstance(val, int):
                            ids.add(val)
                        elif isinstance(val, str) and val.isdigit():
                            ids.add(int(val))
            return ids

        # Buscar en cualquier prefactura aprobada si alguna contiene la OT
        for prefactura in qs:
            resultado = (prefactura.resultado or {})
            ots_incluidas = resultado.get("ots_incluidas", [])
            ids = _extract_ids(ots_incluidas)
            if orden.id in ids:
                return None  # Válido

        return "La OT no está incluida en la prefactura aprobada."

    except Exception as e:
        return f"Error al validar prefactura: {str(e)}"


def _validar_rendicion_aprobada(orden: OrdenDeTrabajo) -> Optional[str]:
    """
    Valida que exista una rendición asociada a la OT y esté en estado 'aprobada' (2).
    
    Returns:
        Mensaje de error si no existe o no está aprobada, None si es válido.
    """
    try:
        # Verificar que exista rendición asociada
        if not hasattr(orden, "rendicion_asociada") or not orden.rendicion_asociada:
            return "No existe una rendición asociada a esta OT. Por favor, genérela completando la OT."
        
        rendicion = orden.rendicion_asociada
        
        # Estados: 0=Borrador, 1=En Espera, 2=Aprobada, 3=Rechazada, 4=Pagada
        if rendicion.estado != "2":
            estado_nombre = {
                "0": "Borrador",
                "1": "En Espera de Aprobación",
                "2": "Aprobada",
                "3": "Rechazada",
                "4": "Pagada"
            }.get(rendicion.estado, f"Desconocido ({rendicion.estado})")
            
            return f"La rendición debe estar aprobada. Estado actual: {estado_nombre}."
        
        return None  # Válido
        
    except Exception as e:
        return f"Error al validar rendición: {str(e)}"
