/**
 * Devuelve las dimensiones de una imagen a partir de su Base64.
 * @param base64 - Cadena Base64 (con o sin el prefijo "data:image/...;base64,")
 */
export function getImageSize(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (err) => reject(new Error('No se pudo cargar la imagen: ' + err));
        // Asegúrate de incluir el prefijo de datos; si ya viene en la cadena, no pasa nada
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });
}
