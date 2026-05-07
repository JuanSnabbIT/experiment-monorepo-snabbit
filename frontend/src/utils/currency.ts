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

const normalizeCurrency = (currency?: string | null): 'CLP' | 'USD' | 'UF' => {
    if (currency === '1' || currency === 'USD') return 'USD';
    if (currency === '3' || currency === 'UF') return 'UF';
    return 'CLP';
};

export const formatCurrency = (
    value: number | string | undefined | null,
    currency?: string | null,
): string => {
    if (currency === '1' || currency === 'USD') {
        return `${formatPrice(value, 1, 1)} USD`;
    }
    if (currency === '3' || currency === 'UF') {
        return `${formatPrice(value, 2, 2)} UF`;
    }
    return `$ ${formatPrice(value, 0, 0)}`;
};

export const convertCurrency = (
    value: number,
    fromCurrency: string | null | undefined,
    toCurrency: string | null | undefined,
    tipoCambio?: { dolar?: number | null; uf?: number | null },
): number => {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);
    if (from === to || !value) return value;
    if (!tipoCambio) return value;

    const dolar = tipoCambio.dolar ?? 0;
    const uf = tipoCambio.uf ?? 0;

    if (from === 'CLP' && to === 'USD') return dolar > 0 ? value / dolar : value;
    if (from === 'CLP' && to === 'UF') return uf > 0 ? value / uf : value;
    if (from === 'USD' && to === 'CLP') return value * dolar;
    if (from === 'USD' && to === 'UF') return dolar > 0 && uf > 0 ? (value * dolar) / uf : value;
    if (from === 'UF' && to === 'CLP') return value * uf;
    if (from === 'UF' && to === 'USD') return dolar > 0 && uf > 0 ? (value * uf) / dolar : value;
    return value;
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
