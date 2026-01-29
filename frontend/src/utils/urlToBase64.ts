/**
 * Convierte la URL de un recurso (imagen, PDF, etc.)
 * a una cadena Base64 (Data URL).
 */
export const urlToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url, { mode: 'cors' }); // 1️⃣ descarga
    if (!res.ok) throw new Error(`HTTP ${res.status} al leer ${url}`);

    const blob = await res.blob(); // 2️⃣ blob
    return new Promise<string>((resolve, reject) => {
        // 3️⃣ FileReader
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
