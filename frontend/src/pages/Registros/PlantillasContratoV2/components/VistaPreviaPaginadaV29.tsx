import { useEffect, useRef, useState } from 'react';

// Bundle local del polyfill (MIT, pagedjs.org) — nunca CDN, para no depender de
// terceros en producción. `pagedjs/package.json` restringe sus subpaths vía
// "exports" (solo expone el punto de entrada raíz), así que un import directo
// `pagedjs/dist/paged.polyfill.js` falla en el build de producción (Rolldown/Vite
// respeta ese mapa) aunque funcione en dev — `import.meta.glob` lee el archivo
// por filesystem, sin pasar por la resolución de "exports" del paquete.
//
// Perezoso a propósito (sin `eager: true`): el polyfill pesa ~900KB sin
// comprimir — bundlearlo eager metería ese peso en el chunk del editor
// completo, afectando a cualquiera que abra una plantilla aunque nunca entre
// a Vista previa. Se resuelve recién cuando este componente se monta.
const cargarPagedjsPolyfill = Object.values(
    import.meta.glob('/node_modules/pagedjs/dist/paged.polyfill.js', {
        query: '?raw',
        import: 'default',
    }),
)[0] as () => Promise<string>;

interface IVistaPreviaPaginadaV29Props {
    /** Documento HTML completo (con <style>/@page) devuelto por el backend
     *  (`preview-html`, campo `html_completo`) — el MISMO CSS que usará
     *  WeasyPrint para el PDF real. */
    htmlCompleto: string | null;
    onPaginacion?: (totalPaginas: number) => void;
}

/**
 * Vista previa paginada real del documento v2.9: pagina el HTML+CSS del
 * backend con Paged.js (MIT, pagedjs.org) en vez de un algoritmo propio de
 * medición de alturas — así el corte de página coincide con el que decide
 * WeasyPrint para el PDF, porque ambos parten del mismo `@page`.
 *
 * Corre dentro de un <iframe> aislado a propósito: Paged.js fragmenta el
 * documento reemplazando el <body> por su propia estructura (`.pagedjs_page`
 * por página) — mezclarlo con el DOM que React/Tailwind controlan en el panel
 * principal generaría conflictos de estilos y de reconciliación.
 */
export default function VistaPreviaPaginadaV29({ htmlCompleto, onPaginacion }: IVistaPreviaPaginadaV29Props) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !htmlCompleto) return undefined;

        setCargando(true);
        let cancelado = false;

        const handleMessage = (event: MessageEvent) => {
            if (event.source !== iframe.contentWindow) return;
            if (event.data?.type === 'pagedjs-listo') {
                setCargando(false);
                onPaginacion?.(event.data.total ?? 0);
            }
        };
        window.addEventListener('message', handleMessage);

        cargarPagedjsPolyfill().then((pagedjsPolyfillSrc) => {
            if (cancelado) return;
            const doc = iframe.contentDocument;
            if (!doc) return;

            // Solo el documento del backend pasa por `document.write` (HTML
            // normal, sin riesgo). El polyfill de Paged.js NO se concatena como
            // texto dentro de ese HTML: su fuente contiene `<!--`/`-->` (código
            // real, no un caso raro) que el parser HTML de `document.write`
            // interpreta como comentario HTML dentro del <script>, corrompiendo
            // el JS resultante ("Invalid or unexpected token", script nunca
            // corre). `createElement('script').textContent` inyecta el string
            // directo como JS, sin pasar por el tokenizer de HTML.
            doc.open();
            doc.write(htmlCompleto);
            doc.close();

            // `PagedConfig.after` se lee ANTES de correr el polyfill (mismo
            // documento, scripts en orden) — así capturamos el `flow` (con
            // `.total` páginas) sin tocar la API interna de Paged.js.
            const configScript = doc.createElement('script');
            configScript.textContent =
                'window.PagedConfig={after:function(flow){' +
                "window.parent.postMessage({type:'pagedjs-listo',total:flow.total},'*');" +
                '}};';
            doc.head.appendChild(configScript);

            // Paged.js solo resuelve el tamaño real de cada `.pagedjs_page` (vía
            // variables CSS derivadas de `@page`) — el look de "hoja blanca con
            // sombra separada de la siguiente" para pantalla NO viene incluido
            // en el polyfill, hay que aportarlo. Sin esto el documento pagina
            // correctamente por dentro pero se ve como texto continuo.
            const interfaceStyle = doc.createElement('style');
            interfaceStyle.textContent = `
                html, body { background: transparent; margin: 0; }
                .pagedjs_pages {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    padding: 20px 0;
                }
                .pagedjs_page {
                    background: #fff;
                    box-shadow: 0 1px 4px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.12);
                }
            `;
            doc.head.appendChild(interfaceStyle);

            const polyfillScript = doc.createElement('script');
            polyfillScript.textContent = pagedjsPolyfillSrc;
            doc.head.appendChild(polyfillScript);
        });

        return () => {
            cancelado = true;
            window.removeEventListener('message', handleMessage);
        };
    }, [htmlCompleto, onPaginacion]);

    if (!htmlCompleto) {
        return (
            <div className='flex h-full w-full items-center justify-center bg-zinc-200 text-sm text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500'>
                Generando vista previa…
            </div>
        );
    }

    return (
        <div className='relative h-full w-full overflow-auto bg-zinc-200 dark:bg-zinc-700'>
            {cargando && (
                <div className='absolute inset-0 z-10 flex items-center justify-center bg-zinc-200/70 text-sm text-zinc-500 dark:bg-zinc-700/70 dark:text-zinc-400'>
                    Paginando documento…
                </div>
            )}
            <iframe
                ref={iframeRef}
                title='Vista previa paginada del contrato'
                sandbox='allow-same-origin allow-scripts'
                className='h-full w-full border-0'
            />
        </div>
    );
}
