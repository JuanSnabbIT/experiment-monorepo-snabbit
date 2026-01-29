export const formatPrice = (
    value: number | string | undefined | null,
    maxDecimals: number = 2,
    minDecimals: number = 0,
): string => {
    if (value === undefined || value === null || value === '') return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';

    return new Intl.NumberFormat('es-CL', {
        style: 'decimal',
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    }).format(num);
};

type CurrencyCode = 'CLP' | 'USD' | 'UF' | string;

export const formatCurrency = (
    value: number | string | undefined | null,
    currency?: string | null,
): string => {
    if (currency === '1' || currency === 'USD') {
        // USD: max 2 decimals, shown only if exists
        return `${formatPrice(value, 2, 0)} USD`;
    }
    if (currency === '3' || currency === 'UF') {
        // UF: fixed 4 decimals
        return `${formatPrice(value, 4, 4)} UF`;
    }
    // Default CLP: max 3 decimals, shown only if exists
    return `$ ${formatPrice(value, 3, 0)}`;
};
