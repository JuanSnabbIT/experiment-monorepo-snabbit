/**
 * Spike aislado — Fase 3 del plan de repaginación v2.9.
 *
 * Objetivo: confirmar que Paged.js (MIT, pagedjs.org) pagina de verdad un
 * documento con el MISMO CSS que emite `backend/contratos/motor_v29.py`
 * (`@page`, `orphans`, `widows`, `break-inside: avoid`, `page-break-after`
 * del salto de página manual), sin depender del servidor Vite ni del backend
 * — carga el polyfill directo desde node_modules dentro de un contexto
 * Chromium aislado (Playwright), igual que hará `VistaPreviaPaginadaV29.tsx`
 * dentro de su iframe.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pagedjsPolyfill = readFileSync(
    join(__dirname, '..', 'node_modules', 'pagedjs', 'dist', 'paged.polyfill.js'),
    'utf8',
);

// Replica el <style> que arma `_envolver_en_html()` en motor_v29.py, más un
// cuerpo largo a propósito para forzar más de una página, un bloque de firma
// (break-inside: avoid) y un salto de página manual (page-break-after).
function construirHtmlDocumentoV29(): string {
    const parrafoLargo =
        '<p>El trabajador cumplirá una jornada ordinaria distribuida de lunes a viernes ' +
        'según el turno asignado por la empresa. El horario de ingreso y salida será fijado ' +
        'por la jefatura directa, respetando los descansos establecidos en el Código del Trabajo. ' +
        'Las horas extraordinarias, si las hubiere, se pagarán con el recargo legal correspondiente.</p>';

    const cuerpo = Array.from({ length: 25 }, () => parrafoLargo).join('\n');

    const bloqueFirma =
        '<div data-bloque="firma" style="margin:24pt 0;text-align:center;">' +
        '<div style="display:inline-block;text-align:center;margin:0 20pt;">' +
        '<div style="border-top:1px solid #000;width:180px;margin:0 auto;">&nbsp;</div>' +
        '<div style="font-size:9pt;margin-top:4pt;">Empleador</div></div></div>';

    const saltoPagina = '<div style="page-break-after:always;">&nbsp;</div>';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@page { size: letter; margin: 2.5cm 2.5cm 2cm 2.5cm; }
body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; orphans: 3; widows: 3; }
p { margin: 0 0 6pt; }
ul, ol { margin: 0 0 6pt; padding-left: 20pt; }
p, li, tr, div[data-bloque="firma"] { break-inside: avoid; }
</style></head>
<body>
${cuerpo}
${saltoPagina}
${bloqueFirma}
</body></html>`;
}

test('Paged.js pagina un documento v2.9 realista en más de una página', async ({ page }) => {
    const html = construirHtmlDocumentoV29();

    let flowTotal = -1;
    await page.exposeFunction('__reportarFlow', (total: number) => {
        flowTotal = total;
    });

    await page.setContent(html);
    await page.addScriptTag({
        content: "window.PagedConfig = { after: function (flow) { window.__reportarFlow(flow.total); } };",
    });
    await page.addScriptTag({ content: pagedjsPolyfill });

    await page.waitForFunction(() => (window as unknown as { __reportarFlow: unknown }).__reportarFlow !== undefined);
    await expect.poll(() => flowTotal, { timeout: 15_000 }).toBeGreaterThan(0);

    // Documento largo a propósito + salto de página manual → al menos 3 páginas.
    expect(flowTotal).toBeGreaterThanOrEqual(3);

    const paginas = page.locator('.pagedjs_page');
    await expect(paginas).toHaveCount(flowTotal);
});

test('Paged.js respeta break-inside:avoid en el bloque de firma (no lo corta a mitad)', async ({ page }) => {
    const html = construirHtmlDocumentoV29();

    await page.setContent(html);
    await page.addScriptTag({
        content: "window.PagedConfig = { after: function (flow) { window.__pagedjsListo = flow.total; } };",
    });
    await page.addScriptTag({ content: pagedjsPolyfill });
    await page.waitForFunction(() => (window as unknown as { __pagedjsListo?: number }).__pagedjsListo !== undefined, {
        timeout: 15_000,
    });

    // El bloque de firma (data-bloque="firma") debe aparecer completo dentro
    // de una única página — si Paged.js lo hubiera partido a mitad, el div
    // terminaría duplicado/fragmentado entre dos `.pagedjs_page` distintos.
    const bloqueFirma = page.locator('div[data-bloque="firma"]');
    await expect(bloqueFirma).toHaveCount(1);
    const paginasConFirma = page.locator('.pagedjs_page:has(div[data-bloque="firma"])');
    await expect(paginasConFirma).toHaveCount(1);
    await expect(bloqueFirma.getByText('Empleador', { exact: true })).toHaveCount(1);
});

test('Paged.js corre dentro de un iframe vía document.write + createElement("script") (camino real de VistaPreviaPaginadaV29)', async ({ page }) => {
    // Los dos tests de arriba usan page.setContent()/addScriptTag() — corren en
    // el documento principal, sin pasar por el parser HTML de document.write().
    // VistaPreviaPaginadaV29 SÍ usa document.write() sobre un <iframe> (para
    // aislar Paged.js del árbol que React controla), y ese camino tiene una
    // trampa real: si el polyfill se concatena como texto crudo dentro de un
    // <script> escrito con document.write(), el parser HTML interpreta los
    // `<!--`/`-->` que el propio código de Paged.js contiene como comentarios
    // HTML dentro del script, corrompe el JS y el script nunca corre
    // ("Invalid or unexpected token", sin importar el tamaño del archivo).
    // Este test fija el fix: el documento va por document.write(), pero el
    // polyfill se inyecta con `createElement('script').textContent`, que
    // asigna el string directo como JS sin pasar por el tokenizer de HTML.
    const html = construirHtmlDocumentoV29();

    await page.setContent('<iframe id="f" sandbox="allow-same-origin allow-scripts"></iframe>');

    const resultado = await page.evaluate(
        ({ html: htmlDoc, polyfill }) => {
            return new Promise((resolve) => {
                const iframe = document.getElementById('f') as HTMLIFrameElement;
                const timeout = setTimeout(() => resolve({ ok: false, motivo: 'timeout' }), 15_000);

                window.addEventListener('message', (event) => {
                    if (event.data?.type === 'pagedjs-listo') {
                        clearTimeout(timeout);
                        resolve({ ok: true, total: event.data.total });
                    }
                });

                const doc = iframe.contentDocument!;
                doc.open();
                doc.write(htmlDoc);
                doc.close();

                const configScript = doc.createElement('script');
                configScript.textContent =
                    "window.PagedConfig={after:function(flow){window.parent.postMessage({type:'pagedjs-listo',total:flow.total},'*');}};";
                doc.head.appendChild(configScript);

                const polyfillScript = doc.createElement('script');
                polyfillScript.textContent = polyfill;
                doc.head.appendChild(polyfillScript);
            });
        },
        { html, polyfill: pagedjsPolyfill },
    );

    expect((resultado as { ok: boolean }).ok).toBe(true);
    expect((resultado as { total: number }).total).toBeGreaterThanOrEqual(3);
});
