# Mapea el nombre “clásico” del modelo (string) a un dict { campo_interno: “Etiqueta legible” }
# Para cada modelo que incluimos, debemos poner aquí los campos por los que nos interese generar detalle.
FIELDS_MAPPING = {
    'OrdenDeTrabajo': {
        'estado': 'Estado de la orden',
        'descripcion': 'Descripción de la orden',
        'fecha_inicio_ot': 'Fecha de inicio',
        'fecha_finalizacion_ot': 'Fecha de finalización',
        'prioridad': 'Prioridad',
        'notas_internas': 'Notas internas',
        'solicitante_empresa_id': 'Solicitante (empresa)',
        'responsable_empresa_id': 'Responsable (empresa)',
    },
    'AdjuntoDeOrden': {
        'tipo': 'Tipo de adjunto',
        'descripcion': 'Descripción del adjunto',
    },
    'DetalleTrabajo': {
        'nombre': 'Nombre del detalle',
        'descripcion': 'Descripción del detalle',
        'estado': 'Estado del trabajo',
        'tecnico_asignado': 'Técnico asignado',
        'insumo_id': 'ID de Insumo',
        'content_type_id': 'Tipo de trabajo',
        'trabajo_id': 'ID del trabajo',
    },
    'UsuarioAsignadoOT': {
        'usuario_empresa': 'Usuario interno asignado',
        'usuario_externo': 'Usuario externo asignado',
        'correo_usuario_externo': 'Correo usuario externo',
    },
    'SeguimientoDetalleTrabajo': {
        'tipo': 'Tipo de seguimiento',
        'comentario': 'Comentario',
        'usuario': 'Usuario responsable',
    },
    'HistorialCambiosOrden': {
        'estado_anterior': 'Estado anterior',
        'estado_actual': 'Estado actual',
        'comentario': 'Comentario del cambio',
    },
    'DetalleGastoRendicionOT': {
        'categoria': 'Categoría de gasto',
        'detalle': 'Detalle del gasto',
        'cantidad': 'Cantidad',
        'monto_unitario': 'Monto unitario',
        'monto_total': 'Monto total',
        'fecha_gasto': 'Fecha del gasto',
    },
}


# Función auxiliar para obtener un nombre humano (o “acción modelo”) según el string del modelo.
def get_accion_modelo(model_name: str) -> str:
    nombres = {
        'OrdenDeTrabajo': 'Orden de Trabajo',
        'AdjuntoDeOrden': 'Adjunto de Orden',
        'DetalleTrabajo': 'Detalle de Trabajo',
        'UsuarioAsignadoOT': 'Usuario Asignado',
        'SeguimientoDetalleTrabajo': 'Seguimiento Detalle',
        'HistorialCambiosOrden': 'Historial de Cambios',
        'DetalleGastoRendicionOT': 'Detalle Gasto Rendición',
    }
    return nombres.get(model_name, model_name)