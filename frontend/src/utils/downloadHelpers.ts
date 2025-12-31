import ApiService from '@/services/ApiService'

/**
 * Descarga un archivo PDF desde una URL y lo guarda con el nombre especificado.
 * Usa ApiService para mantener la consistencia con el patrón del proyecto.
 */
export async function downloadPdfFromUrl(
	url: string,
	filename: string
): Promise<{ success: boolean }> {
	const response = await ApiService.fetchData<Blob>({
		url,
		method: 'get',
		responseType: 'blob',
	})

	const blob = response.data
	const blobUrl = window.URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = blobUrl
	anchor.download = filename
	document.body.appendChild(anchor)
	anchor.click()
	window.URL.revokeObjectURL(blobUrl)
	document.body.removeChild(anchor)

	return { success: true }
}

/**
 * Descarga el PDF de un voucher de devolución.
 * Helper específico para mantener la lógica centralizada.
 */
export async function downloadVoucherDevolucionPdf(
	voucherId: number
): Promise<{ success: boolean }> {
	return downloadPdfFromUrl(
		`/api/vouchers-devolucion/${voucherId}/pdf/`,
		`voucher_devolucion_${voucherId}.pdf`
	)
}
