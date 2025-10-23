/**
 * Devuelve ancho y alto de una imagen remota.
*/
export const getImageDimensions = (url: string) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = url;            // el navegador la descarga y la cachea
    });
  