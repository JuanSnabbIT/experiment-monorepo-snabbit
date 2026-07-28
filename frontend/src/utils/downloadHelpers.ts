import axios from 'axios';
import ApiService from '@/services/ApiService';

/**
 * Descarga un archivo PDF desde una URL y lo guarda con el nombre especificado.
 *
 * Los archivos servidos desde /media/ (Access-Control-Allow-Origin: * pero
 * sin soporte de preflight OPTIONS) se piden con axios plano para no
 * adjuntar el header Authorization — ApiService lo agrega siempre vía
 * BaseService y eso fuerza un preflight que el storage de medios no sabe
 * responder, rompiendo la descarga por CORS. Esto aplica sin importar si
 * el backend serializó la ruta como absoluta o relativa (relativa ocurre
 * cuando el serializer se instancia sin context={'request': request}).
 * Los demás endpoints (que generan el PDF vía API) sí requieren el JWT y
 * siguen usando ApiService.
 */
export async function downloadPdfFromUrl(
    url: string,
    filename: string,
): Promise<{ success: boolean }> {
    const esArchivoMedia = /\/media\//.test(url);
    const urlAbsoluta = /^https?:\/\//i.test(url)
        ? url
        : `${import.meta.env.VITE_API_URL}${url}`;
    const response = esArchivoMedia
        ? await axios.get<Blob>(urlAbsoluta, { responseType: 'blob' })
        : await ApiService.fetchData<Blob>({
              url,
              method: 'get',
              responseType: 'blob',
          });

    const blob = response.data;
    const blobUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(anchor);

    return { success: true };
}

/**
 * Descarga el PDF de un voucher de devolución.
 * Helper específico para mantener la lógica centralizada.
 */
export async function downloadVoucherDevolucionPdf(
    voucherId: number,
): Promise<{ success: boolean }> {
    return downloadPdfFromUrl(
        `/api/vouchers-devolucion/${voucherId}/pdf/`,
        `voucher_devolucion_${voucherId}.pdf`,
    );
}
