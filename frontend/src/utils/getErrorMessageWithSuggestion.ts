import { getErrorMessage } from './errorHandlers';

export interface ErrorWithSuggestion {
  message: string;
  suggestion?: string;
  code?: string;
}

export const getErrorMessageWithSuggestion = (
  error: any
): ErrorWithSuggestion => {
  const baseMessage = getErrorMessage(error);

  // Mapeo de códigos de error del backend a mensajes + sugerencias
  const errorMap: Record<string, ErrorWithSuggestion> = {
    // Validación de motivos
    motivo_termino_requerido: {
      message: 'Debes indicar el motivo de terminación',
      suggestion: 'Selecciona un motivo en la lista desplegable (renuncia, despido, etc.)',
      code: 'motivo_termino_requerido',
    },
    motivo_anulacion_requerido: {
      message: 'Debes indicar el motivo de anulación',
      suggestion: 'Selecciona un motivo en la lista desplegable (error administrativo, etc.)',
      code: 'motivo_anulacion_requerido',
    },

    // Validación de email
    email_invalido: {
      message: 'Email inválido',
      suggestion: 'Usa formato válido: usuario@empresa.com',
      code: 'email_invalido',
    },

    // Validación de estado
    estado_invalido: {
      message: 'Acción no permitida en este estado',
      suggestion: 'El contrato debe estar en estado vigente para esta acción',
      code: 'estado_invalido',
    },

    // Validación de aprobación
    aprobacion_pendiente: {
      message: 'El empleador no ha aprobado el contrato',
      suggestion: 'Espera a que el empleador responda la solicitud de aprobación',
      code: 'aprobacion_pendiente',
    },

    // Validación de sueldo
    sueldo_base_bajo: {
      message: 'El sueldo base es inferior al mínimo legal',
      suggestion: 'El sueldo mínimo legal en CLP es $500.000. Ajusta el monto.',
      code: 'sueldo_base_bajo',
    },

    // Validación de plantilla
    plantilla_no_disponible: {
      message: 'La plantilla de contrato no está disponible',
      suggestion: 'Selecciona otra plantilla o contacta a administración',
      code: 'plantilla_no_disponible',
    },

    // Errores de conexión
    conexion_error: {
      message: 'Error de conexión con el servidor',
      suggestion: 'Verifica tu conexión a internet e intenta nuevamente',
      code: 'conexion_error',
    },

    // Errores de permiso
    permiso_denegado: {
      message: 'No tienes permisos para esta acción',
      suggestion: 'Contacta al administrador si necesitas acceso',
      code: 'permiso_denegado',
    },
  };

  // Intentar extraer código de error del response
  const errorCode = error?.response?.data?.code ||
                   error?.response?.data?.error_code ||
                   error?.data?.code;

  if (errorCode && errorMap[errorCode]) {
    return errorMap[errorCode];
  }

  // Intentar encontrar coincidencias en el mensaje
  for (const [code, errorInfo] of Object.entries(errorMap)) {
    if (baseMessage.toLowerCase().includes(code.toLowerCase()) ||
        baseMessage.toLowerCase().includes(errorInfo.message.toLowerCase())) {
      return errorInfo;
    }
  }

  // Retornar mensaje genérico con sugerencia general
  return {
    message: baseMessage,
    suggestion: 'Si el problema persiste, recarga la página o contacta al soporte',
    code: 'unknown_error',
  };
};

export default getErrorMessageWithSuggestion;
