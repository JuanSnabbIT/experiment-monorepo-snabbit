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
        return `${formatPrice(value, 1, 1)} USD`;
    }
    if (currency === '3' || currency === 'UF') {
        return `${formatPrice(value, 4, 4)} UF`;
    }
    return `$ ${formatPrice(value, 0, 0)}`;
};

export const parseLocaleNumber = (
    value: number | string | undefined | null,
): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const raw = value.toString().trim();
    if (!raw) return 0;
    const cleaned = raw.replace(/[^\d,.-]/g, '');
    if (!cleaned) return 0;
    if (cleaned.includes(',')) {
        const normalized = cleaned.replace(/\./g, '').replace(',', '.');
        const parsed = Number.parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    const normalized = cleaned.replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
};
