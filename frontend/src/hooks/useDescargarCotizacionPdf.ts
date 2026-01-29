import { ICotizacion } from '@/interface/cotizaciones.interface';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

const useDescargarCotizacionPdf = () => {
	const [loadingPdf, setLoadingPdf] = useState<number | null>(null);

	const descargarPdf = useCallback(async (cotizacion: ICotizacion) => {
		setLoadingPdf(cotizacion.id);
		try {
			const response = await ApiService.fetchData<Blob>({
				url: `/api/cotizaciones/${cotizacion.id}/descargar-pdf`,
				method: 'get',
				responseType: 'blob',
			});

			// Asegurarse de que sea un blob
			const blob =
				response.data instanceof Blob ? response.data : new Blob([response.data]);
			
			// Crear URL y descargar
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute(
				'download',
				`Coti_${cotizacion.numero_cotizacion}_${cotizacion.cliente_nombre.replace(/\s+/g, '_')}.pdf`
			);
			document.body.appendChild(link);
			link.click();
			
			// Limpieza
			link.remove();
			window.URL.revokeObjectURL(url);
			
			toast.success(`PDF de cotización #${cotizacion.numero_cotizacion} descargado`);
		} catch (error: unknown) {
			console.error('Error descargando PDF:', error);
			toast.error(getErrorMessage(error) || 'No se pudo obtener el PDF', {
				toastId: 'cotizacion-pdf-error',
			});
		} finally {
			setLoadingPdf(null);
		}
	}, []);

	return {
		descargarPdf,
		loadingPdf,
	};
};

export default useDescargarCotizacionPdf;
