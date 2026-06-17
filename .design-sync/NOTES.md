# Design Sync — Notas de re-sincronización

## Configuración del repo

- El paquete es una **app privada** (`private: true`), no una librería publicada. El build de librería es `vite.lib.config.ts` en `frontend/`.
- El converter requiere `componentSrcMap` explícito — la auto-detección falla porque el paquete no tiene un barrel `.d.ts` en la raíz de `dist-lib/`. El mapa en `config.json` enumera los 26 componentes con rutas relativas a `.design-sync/`.
- Rutas en `config.json` son relativas al directorio `.design-sync/` (no al CWD del repo). Por eso usan `../frontend/...`.
- `cssEntry`: Tailwind compilado manualmente con `npx tailwindcss -i src/styles/index.css -o dist-lib/ds-styles.css --config tailwind.config.cjs --minify` desde `frontend/`.
- `runtimeFontPrefixes: ["Poppins"]` — fuente servida por Google Fonts vía `@import` en `index.css`. No hay archivos locales.
- El render check se omitió (`--no-render-check`) — el usuario eligió revisar los previews manualmente en el browser.

## Pasos de re-sincronización

1. `cd frontend && npx vite build --config vite.lib.config.ts` — rebuild del bundle
2. `cd frontend && npx tailwindcss -i src/styles/index.css -o dist-lib/ds-styles.css --config tailwind.config.cjs --minify` — rebuild del CSS
3. Desde la raíz del repo: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./frontend/node_modules --entry ./frontend/dist-lib/snabbit-ds.js --out ./ds-bundle`
4. `node .ds-sync/package-validate.mjs ./ds-bundle --no-render-check`
5. Upload atómico vía DesignSync

## Riesgos de re-sincronización

- Si se agrega un componente nuevo a `frontend/src/components/`, hay que agregarlo también a `componentSrcMap` en `config.json` y al barrel export `src/components/index.ts`.
- Si cambia `tailwind.config.cjs` (nueva paleta, nuevas clases), hay que re-correr el build de Tailwind además del build de librería.
- Los previews son floor cards (sin autoría). Son funcionales pero muestran "preview not yet authored". Se pueden mejorar en cualquier re-sync creando `.design-sync/previews/<Name>.tsx`.
- `typescript` no está en `.ds-sync/node_modules` — el parse check de `.d.ts` está saltado. No es bloqueante pero los tipos en los prompts pueden ser menos precisos.

## Known render warns

_(ninguno — render check no ejecutado en esta sesión)_
