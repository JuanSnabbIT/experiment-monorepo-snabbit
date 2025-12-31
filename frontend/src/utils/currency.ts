export const formatPrice = (value: number | string | undefined | null): string => {
	if (value === undefined || value === null || value === '') return '0';
	const num = typeof value === 'string' ? parseFloat(value) : value;
	if (isNaN(num)) return '0';

	return new Intl.NumberFormat('es-CL', {
		style: 'decimal',
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(num);
};

type CurrencyCode = 'CLP' | 'USD' | 'UF';

export const formatCurrency = (
	value: number | string | undefined | null,
	currency: CurrencyCode,
): string => {
	const formatted = formatPrice(value);

	if (currency === 'USD') return `${formatted} USD`;
	if (currency === 'UF') return `${formatted} UF`;
	// Default CLP: prepend $
	return `$${formatted}`;
};
