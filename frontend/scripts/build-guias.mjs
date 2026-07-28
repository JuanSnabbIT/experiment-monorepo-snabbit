import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_DIR = join(__dirname, '..', 'guias-vault');
const VISTAS_DIR = join(VAULT_DIR, 'vistas');
const OUT_DIR = join(__dirname, '..', 'public', 'guias');

let hadWarnings = false;

function stripFrontmatter(content) {
    if (!content.startsWith('---')) return content;
    const end = content.indexOf('\n---', 3);
    if (end === -1) return content;
    const afterSecondDelimiter = content.indexOf('\n', end + 1);
    return afterSecondDelimiter === -1 ? '' : content.slice(afterSecondDelimiter + 1);
}

function resolveTransclusions(content, enResolucion) {
    return content.replace(/!\[\[([^\]]+)\]\]/g, (match, ref) => {
        const nombre = ref.trim();
        if (enResolucion.has(nombre)) {
            console.warn(`[build-guias] Ciclo de transclusión detectado: ${nombre}`);
            hadWarnings = true;
            return `<!-- ciclo detectado: ${nombre} -->`;
        }

        const rutaFragmento = join(VAULT_DIR, `${nombre}.md`);
        let raw;
        try {
            raw = readFileSync(rutaFragmento, 'utf-8');
        } catch {
            console.warn(`[build-guias] Fragmento no encontrado: ${nombre}`);
            hadWarnings = true;
            return `<!-- fragmento no encontrado: ${nombre} -->`;
        }

        const siguienteSet = new Set(enResolucion);
        siguienteSet.add(nombre);
        return resolveTransclusions(raw, siguienteSet);
    });
}

function build() {
    mkdirSync(OUT_DIR, { recursive: true });

    const archivos = readdirSync(VISTAS_DIR).filter((f) => f.endsWith('.md'));
    for (const archivo of archivos) {
        const raw = readFileSync(join(VISTAS_DIR, archivo), 'utf-8');
        const sinFrontmatter = stripFrontmatter(raw);
        const resuelto = resolveTransclusions(sinFrontmatter, new Set());
        writeFileSync(join(OUT_DIR, archivo), resuelto);
        console.log(`[build-guias] Generado: guias/${archivo}`);
    }

    if (hadWarnings) {
        console.error('[build-guias] Terminó con advertencias — revisar fragmentos/ciclos arriba.');
        process.exit(1);
    }
}

build();
