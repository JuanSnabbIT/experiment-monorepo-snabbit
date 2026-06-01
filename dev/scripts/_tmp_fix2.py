path = r'c:\proyectos\experiment-monorepo-snabbit\frontend\src\pages\Registros\PlantillasContratoV2\components\PanelDocumento.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """                            {/* \u2500\u2500 Titulo del documento \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
                            <div className='mb-8 text-center'>
                                <p className='text-[15px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                    {tituloTexto}
                                </p>
                            </div>"""

new = """                            {/* \u2500\u2500 Titulo del documento \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
                            {tituloSeccion ? (
                                <div
                                    className={[
                                        'mb-8 rounded-[3px] text-center transition-all duration-150',
                                        tituloSeccion.id === seccionActivaId
                                            ? 'outline outline-2 outline-blue-400 outline-offset-2 py-1'
                                            : 'cursor-pointer hover:bg-blue-50/50',
                                    ].join(' ')}
                                    role='button'
                                    tabIndex={0}
                                    title='Haz clic para editar el t\\u00edtulo del documento'
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tituloSeccion.id !== seccionActivaId)
                                            onSelectSeccion(tituloSeccion);
                                    }}
                                    onClick={() =>
                                        tituloSeccion.id !== seccionActivaId &&
                                        onSelectSeccion(tituloSeccion)
                                    }>
                                    <p className='text-[15px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                        {tituloTexto}
                                    </p>
                                </div>
                            ) : (
                                <div className='mb-8 text-center'>
                                    <p className='text-[15px] font-bold uppercase leading-snug tracking-wide text-zinc-900'>
                                        {tituloTexto}
                                    </p>
                                </div>
                            )}"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: titulo section updated')
else:
    print('ERROR: old string not found')
    idx = content.find('Titulo del documento')
    print(repr(content[idx-10:idx+300]))