import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import { useEffect, useState } from 'react';
import { ISAPRE_INSTITUCION_OPTIONS, SISTEMA_SALUD_OPTIONS } from './types';

interface Props {
    idPrefix: string;
    sistemaSalud: string;
    nombreIsapre: string;
    onChangeSistemaSalud: (value: string) => void;
    onChangeNombreIsapre: (value: string) => void;
    labelSistemaSalud?: string;
    errorNombreIsapre?: string;
    touchedNombreIsapre?: boolean;
}

// Selector compartido de sistema de salud (Fonasa/Isapre obligatorio) + institución
// Isapre desde lista fija, con "Otra" habilitando texto libre. Usado por el wizard de
// creación de contrato, la edición de datos previsionales del contrato y la ficha de
// usuario, para evitar 3 implementaciones divergentes del mismo campo.
const SelectorSistemaSalud = ({
    idPrefix,
    sistemaSalud,
    nombreIsapre,
    onChangeSistemaSalud,
    onChangeNombreIsapre,
    labelSistemaSalud = 'Sistema de salud',
    errorNombreIsapre,
    touchedNombreIsapre,
}: Props) => {
    // Detecta si el nombre_isapre guardado (dato legado, potencialmente texto
    // libre) no matchea la lista fija, para mostrar el campo de texto "Otra".
    const [modoOtra, setModoOtra] = useState(
        () => !!nombreIsapre && !ISAPRE_INSTITUCION_OPTIONS.some((o) => o.value === nombreIsapre),
    );

    useEffect(() => {
        if (!nombreIsapre) {
            setModoOtra(false);
            return;
        }
        if (!ISAPRE_INSTITUCION_OPTIONS.some((o) => o.value === nombreIsapre)) {
            setModoOtra(true);
        }
    }, [nombreIsapre]);

    const institucionValue = modoOtra
        ? (ISAPRE_INSTITUCION_OPTIONS.find((o) => o.value === 'otra') ?? null)
        : (ISAPRE_INSTITUCION_OPTIONS.find((o) => o.value === nombreIsapre) ?? null);

    return (
        <>
            <div>
                <Label htmlFor={`${idPrefix}_sistema_salud`}>{labelSistemaSalud}</Label>
                <SelectReact
                    id={`${idPrefix}_sistema_salud`}
                    name='sistema_salud'
                    options={SISTEMA_SALUD_OPTIONS}
                    value={SISTEMA_SALUD_OPTIONS.find((o) => o.value === sistemaSalud) ?? null}
                    onChange={(opt) => {
                        const val = (opt as TSelectOption)?.value ?? '';
                        onChangeSistemaSalud(val);
                        if (val !== 'isapre') {
                            setModoOtra(false);
                            onChangeNombreIsapre('');
                        }
                    }}
                    placeholder='Selecciona Fonasa o Isapre...'
                />
            </div>
            {sistemaSalud === 'isapre' && (
                <div>
                    <Label htmlFor={`${idPrefix}_institucion_isapre`}>
                        Institución Isapre <span className='text-red-500'>*</span>
                    </Label>
                    <SelectReact
                        id={`${idPrefix}_institucion_isapre`}
                        name='institucion_isapre'
                        options={ISAPRE_INSTITUCION_OPTIONS}
                        value={institucionValue}
                        onChange={(opt) => {
                            const val = (opt as TSelectOption)?.value ?? '';
                            if (val === 'otra') {
                                setModoOtra(true);
                                onChangeNombreIsapre('');
                            } else {
                                setModoOtra(false);
                                onChangeNombreIsapre(val);
                            }
                        }}
                        placeholder='Selecciona una institución...'
                    />
                    {modoOtra && (
                        <div className='mt-2'>
                            <Label htmlFor={`${idPrefix}_nombre_isapre_otra`}>
                                Nombre de la institución <span className='text-red-500'>*</span>
                            </Label>
                            <Input
                                id={`${idPrefix}_nombre_isapre_otra`}
                                name='nombre_isapre'
                                value={nombreIsapre}
                                onChange={(e) => onChangeNombreIsapre(e.target.value)}
                                placeholder='Ej: Isapre no listada'
                            />
                            {touchedNombreIsapre && errorNombreIsapre && (
                                <p className='mt-1 text-xs text-red-500'>{errorNombreIsapre}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default SelectorSistemaSalud;
