import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para smoke tests E2E del monorepo.
 * Asume que backend (Django :8000) y frontend (Vite :5173) ya están corriendo.
 * Arrancar antes: `python manage.py runserver` y `npm run dev`.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        ignoreHTTPSErrors: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
