import { AxiosError, isAxiosError } from 'axios';

/**
 * Interface para respuestas de error de la API del backend.
 * El backend usa 'detail' como key estándar para mensajes de error (DRF convention).
 */
interface ApiErrorResponse {
    detail?: string;
    message?: string;
    error?: string; // Legacy: algunos endpoints aún usan 'error'
    [key: string]: unknown;
}

/**
 * Extrae un mensaje de error legible de cualquier tipo de error.
 * Usar en catch blocks de thunks en lugar de `error: any`.
 *
 * @example
 * ```typescript
 * try {
 *   const response = await ApiService.fetchData<T>({ url, method: 'get' })
 *   return response.data
 * } catch (error: unknown) {
 *   return rejectWithValue(getErrorMessage(error))
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
    // Axios errors con respuesta del servidor
    if (isAxiosError<ApiErrorResponse>(error)) {
        const data = error.response?.data;
        if (data) {
            // Prioridad: detail > message > error (legacy)
            if (typeof data.detail === 'string') return data.detail;
            if (typeof data.message === 'string') return data.message;
            if (typeof data.error === 'string') return data.error;
            // Si detail es un objeto (ej: validación de campos)
            if (typeof data.detail === 'object' && data.detail !== null) {
                return JSON.stringify(data.detail);
            }
        }
        // Fallback al mensaje del error de Axios
        return error.message;
    }

    // Errores estándar de JavaScript
    if (error instanceof Error) {
        return error.message;
    }

    // Fallback para cualquier otro tipo
    return 'Error desconocido';
}

/**
 * Type guard para verificar si un error es un AxiosError con respuesta.
 * Útil para acceder a propiedades específicas del error.
 */
export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
    return isAxiosError(error) && error.response !== undefined;
}

/**
 * Extrae el código de estado HTTP de un error de API.
 * Retorna undefined si no es un error de Axios o no tiene respuesta.
 */
export function getErrorStatusCode(error: unknown): number | undefined {
    if (isAxiosError(error)) {
        return error.response?.status;
    }
    return undefined;
}
