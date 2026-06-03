const RUT_SEQ = [2, 3, 4, 5, 6, 7];

const cleanRut = (rut: string): string => rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();

export const calcDV = (rutBody: string): string => {
    if (!/^\d+$/.test(rutBody)) return '';
    let suma = 0;
    const reversed = rutBody.split('').reverse();
    for (let i = 0; i < reversed.length; i += 1) {
        suma += Number(reversed[i]) * RUT_SEQ[i % RUT_SEQ.length];
    }
    const resto = 11 - (suma % 11);
    if (resto === 11) return '0';
    if (resto === 10) return 'K';
    return String(resto);
};

export const formatRut = (rut: string | null | undefined): string => {
    if (!rut) return '';
    const clean = cleanRut(rut);
    if (clean.length < 2) return rut.trim();
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
};

export const validarRut = (rut: string | null | undefined): boolean => {
    if (!rut) return false;
    const clean = cleanRut(rut);
    if (clean.length < 2) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    if (!/^\d+$/.test(body)) return false;
    return calcDV(body) === dv;
};

