/**
 * Smoke tests — Motor de plantillas V2, alias map en AdaptadorContratoTrabajador
 *
 * Prerrequisitos:
 *   - Django backend corriendo en http://127.0.0.1:8000
 *   - Vite frontend corriendo en http://localhost:5173
 *   - BD de demo poblada: `python manage.py seed_demo_rrhh`
 *
 * Suite A: API pura — verifica que el motor resuelve alias sin etiquetas sin resolver.
 * Suite B: UI — login + navegación al módulo RRHH.
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const API = 'http://127.0.0.1:8000';
const DEMO_EMAIL = 'admin@demo.cl';
const DEMO_PASSWORD = 'Demo1234!';

// Patrón de etiqueta sin resolver: [clave_con_guiones_bajos]
const PATRON_ETIQUETA_SIN_RESOLVER = /\[[a-z][a-z0-9_]+\]/;

// Alias que DEBEN resolverse a algo distinto de la literal tras el fix
const ALIAS_QUE_DEBEN_RESOLVERSE = [
    'nombre_afp',
    'rut_trabajador',
    'nombre_trabajador',
    'sueldo_base',
    'fecha_inicio',
    'jornada_label',
    'bono_colacion',
    'bono_movilizacion',
    'gratificacion_legal',
    'nombre_banco',
    'tipo_cuenta_bancaria',
    'numero_cuenta_bancaria',
];

async function loginApi(request: APIRequestContext): Promise<string> {
    const res = await request.post(`${API}/auth/jwt/create/`, {
        data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(res.status(), `Login falló (${res.status()})`).toBe(200);
    const body = await res.json();
    expect(body.access, 'JWT access ausente en respuesta de login').toBeTruthy();
    return body.access as string;
}

async function obtenerPrimerContratoId(
    request: APIRequestContext,
    token: string,
): Promise<number | null> {
    const res = await request.get(`${API}/api/rrhh/contratos-trabajador/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return null;
    const body = await res.json();
    const results = body.results ?? body;
    if (!Array.isArray(results) || results.length === 0) return null;
    return results[0].id as number;
}

// ─── Suite A: API ──────────────────────────────────────────────────────────────

test.describe('A — API: motor plantillas V2 (alias map)', () => {
    test('A1: login como usuario RRHH obtiene JWT válido', async ({ request }) => {
        await loginApi(request);
    });

    test('A2: listado de contratos retorna 200 con resultados', async ({ request }) => {
        const token = await loginApi(request);
        const res = await request.get(`${API}/api/rrhh/contratos-trabajador/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        const results = body.results ?? body;
        expect(Array.isArray(results)).toBeTruthy();
    });

    test('A3: generar-pdf retorna 200 y secciones_generadas están presentes', async ({ request }) => {
        const token = await loginApi(request);
        const contratoId = await obtenerPrimerContratoId(request, token);
        expect(contratoId, 'No hay contratos en la BD — ejecutar seed_demo_rrhh').not.toBeNull();

        const res = await request.post(
            `${API}/api/rrhh/contratos-trabajador/${contratoId}/generar-pdf/`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(
            res.status(),
            `generar-pdf falló con status ${res.status()} para contrato ${contratoId}`,
        ).toBe(200);

        const body = await res.json();
        expect(
            Array.isArray(body.secciones_generadas),
            'secciones_generadas no es array en la respuesta',
        ).toBeTruthy();
    });

    test('A4: alias del motor se resuelven — ninguna sección contiene [etiqueta] literal', async ({
        request,
    }) => {
        const token = await loginApi(request);
        const contratoId = await obtenerPrimerContratoId(request, token);
        expect(contratoId, 'No hay contratos en la BD — ejecutar seed_demo_rrhh').not.toBeNull();

        const res = await request.post(
            `${API}/api/rrhh/contratos-trabajador/${contratoId}/generar-pdf/`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(res.status()).toBe(200);
        const body = await res.json();
        const secciones: Array<{ titulo: string; contenido_renderizado: string }> =
            body.secciones_generadas ?? [];

        // Para cada alias conocido, verificar que no aparece como literal [alias]
        for (const alias of ALIAS_QUE_DEBEN_RESOLVERSE) {
            const literal = `[${alias}]`;
            for (const seccion of secciones) {
                const contenido = seccion.contenido_renderizado ?? '';
                expect(
                    contenido,
                    `Alias "[${alias}]" no resolvió en sección "${seccion.titulo}"`,
                ).not.toContain(literal);
            }
        }
    });

    test('A5: contrato 68 (QA) resuelve alias clave correctamente', async ({ request }) => {
        const token = await loginApi(request);

        // Contract 68 fue creado en la sesión E2E anterior; puede no existir si la BD fue reseteada
        const res = await request.post(
            `${API}/api/rrhh/contratos-trabajador/68/generar-pdf/`,
            { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.status() === 404) {
            test.skip(true, 'Contrato 68 no existe en esta BD — omitir');
            return;
        }

        expect(res.status()).toBe(200);
        const body = await res.json();
        const secciones: Array<{ titulo: string; contenido_renderizado: string }> =
            body.secciones_generadas ?? [];

        const todoElContenido = secciones.map((s) => s.contenido_renderizado ?? '').join('\n');

        // AFP — alias resolvió: no literal, muestra el nombre real
        expect(todoElContenido).not.toContain('[nombre_afp]');
        expect(todoElContenido).toContain('Habitat');

        // Banco — alias resolvió
        expect(todoElContenido).not.toContain('[nombre_banco]');
        expect(todoElContenido).toContain('BancoEstado');

        // RUT del trabajador — alias resolvió (puede ser vacío si User.rut está vacío,
        // pero NO debe aparecer como literal [rut_trabajador])
        expect(todoElContenido).not.toContain('[rut_trabajador]');

        // Cargo y funciones — alias resolvió
        expect(todoElContenido).not.toContain('[nombre_cargo]');
        expect(todoElContenido).not.toContain('[funciones_cargo]');

        // Sueldo base
        expect(todoElContenido).not.toContain('[sueldo_base]');
    });
});

// ─── Suite B: UI ──────────────────────────────────────────────────────────────

test.describe('B — UI: módulo RRHH accesible tras login', () => {
    test('B1: login via formulario y navegación a /rrhh', async ({ page }) => {
        await page.goto('/login');

        // Esperar que el formulario esté listo
        await expect(page.locator('input#email')).toBeVisible({ timeout: 10_000 });

        await page.fill('input#email', DEMO_EMAIL);
        await page.fill('input#password', DEMO_PASSWORD);
        await page.click('button:has-text("Iniciar")');

        // Tras login exitoso redirige a '/'
        await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/, { timeout: 15_000 });

        // Navegar al módulo RRHH
        await page.goto('/rrhh');

        // La página debe cargarse sin redirigir al login
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

        // Verificar que no hay error genérico de "Sin permisos" visible
        const body = page.locator('body');
        await expect(body).not.toContainText('Sin Permisos', { timeout: 5_000 });
        await expect(body).not.toContainText('403', { timeout: 5_000 });
    });

    test('B2: página RRHH no tiene errores de JS en consola', async ({ page }) => {
        const errores: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errores.push(msg.text());
        });
        page.on('pageerror', (err) => errores.push(err.message));

        await page.goto('/login');
        await expect(page.locator('input#email')).toBeVisible({ timeout: 10_000 });
        await page.fill('input#email', DEMO_EMAIL);
        await page.fill('input#password', DEMO_PASSWORD);
        await page.click('button:has-text("Iniciar")');
        await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/, { timeout: 15_000 });
        await page.goto('/rrhh');
        await page.waitForTimeout(2_000);

        // Filtrar errores esperados (FCM, Firebase, etc.)
        const erroresFiltrados = errores.filter(
            (e) => !e.includes('firebase') && !e.includes('FCM') && !e.includes('messaging'),
        );
        expect(
            erroresFiltrados,
            `Errores de JS inesperados en /rrhh: ${erroresFiltrados.join(' | ')}`,
        ).toHaveLength(0);
    });
});
