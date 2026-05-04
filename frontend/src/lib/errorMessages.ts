/**
 * Mapea códigos HTTP a mensajes amigables en español.
 * Centraliza el copy para evitar mensajes técnicos en inglés llegando al usuario.
 */
const HTTP_MESSAGES: Record<number, string> = {
    400: 'Datos inválidos. Revisa el formulario.',
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'No tienes permiso para realizar esta acción.',
    404: 'No se encontró el recurso solicitado.',
    409: 'Conflicto: el recurso ya existe o está en uso.',
    422: 'Los datos enviados no son válidos.',
    429: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    500: 'Error del servidor. Intenta de nuevo en unos segundos.',
    502: 'Servidor no disponible temporalmente.',
    503: 'Servicio no disponible. Intenta más tarde.',
    504: 'El servidor tardó demasiado en responder.',
};

/**
 * Devuelve un mensaje amigable en español para un status HTTP.
 * Si el backend envió un mensaje específico (errorData.error), prefiere ese
 * a menos que sea un genérico en inglés.
 */
export function friendlyError(status: number, fallback = 'Ocurrió un error inesperado.'): string {
    return HTTP_MESSAGES[status] || fallback;
}

/**
 * Extrae mensaje de error de una respuesta fetch fallida, prefiriendo:
 * 1. Mensaje del backend (errorData.error o errorData.message) si está en español
 * 2. Mensaje friendly por status code
 * 3. Fallback genérico
 */
export async function extractErrorMessage(response: Response, fallback = 'No se pudo completar la operación.'): Promise<string> {
    try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            const backendMsg = data?.error || data?.message;
            // Si el backend devolvió un mensaje, prefiriéndolo cuando es claramente español/útil
            if (typeof backendMsg === 'string' && backendMsg.length > 0 && !/^(failed|internal|error)/i.test(backendMsg)) {
                return backendMsg;
            }
        }
    } catch {
        // Si no se puede parsear, caer al mensaje por status
    }
    return friendlyError(response.status, fallback);
}
