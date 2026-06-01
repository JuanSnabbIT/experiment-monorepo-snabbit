path = r'c:\proyectos\experiment-monorepo-snabbit\frontend\src\pages\Registros\PlantillasContratoV2\components\PanelDocumento.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """                                // \u2500\u2500 Salto de p\\u00e1gina: render especial sin editor \u2500\u2500\u2500\u2500\u2500\u2500\u2500
                                if (seccion.tipo === 'salto_pagina') {
                                    return (
                                        <div
                                            key={seccion.id}
                                            style={{ pageBreakAfter: 'always' }}
                                            className='my-6 flex items-center gap-3 select-none'>
                                            <div className='h-px flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-600' />
                                            <span className='shrink-0 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500'>
                                                Salto de p\\u00e1gina
                                            </span>
                                            <div className='h-px flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-600' />
                                        </div>
                                    );
                                }"""

new = """                                // \u2500\u2500 Salto de p\\u00e1gina: render especial sin editor \u2500\u2500\u2500\u2500\u2500\u2500\u2500
                                if (seccion.tipo === 'salto_pagina') {
                                    return (
                                        <div
                                            key={seccion.id}
                                            ref={(el) => {
                                                seccionRefs.current[seccion.id] = el;
                                            }}
                                            role='button'
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !isActive)
                                                    onSelectSeccion(seccion);
                                            }}
                                            onClick={() => !isActive && onSelectSeccion(seccion)}
                                            style={{ pageBreakAfter: 'always' }}
                                            className={[
                                                'my-6 flex items-center gap-3 select-none rounded-[3px] transition-all duration-150',
                                                isActive
                                                    ? 'outline outline-2 outline-blue-400 outline-offset-1'
                                                    : 'cursor-pointer hover:bg-blue-50/50',
                                            ].join(' ')}>
                                            <div className='h-px flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-600' />
                                            <span className='shrink-0 text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500'>
                                                Salto de p\\u00e1gina
                                            </span>
                                            <div className='h-px flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-600' />
                                        </div>
                                    );
                                }"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: salto_pagina block updated')
else:
    print('ERROR: old string not found')
    # Show a snippet for debugging
    idx = content.find("salto_pagina')")
    print(repr(content[idx-200:idx+100]))