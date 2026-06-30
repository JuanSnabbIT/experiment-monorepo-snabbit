import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { useAppDispatch, useAppSelector } from '@/store';
import { calendarioApi } from '@/store/slices/calendario/calendarioApi';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import { Dispatch, SetStateAction } from 'react';

interface ICrearDiasCalendarioProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const YEAR_ACTUAL = new Date().getFullYear();

type TAnioOption = TSelectOption & { yaExiste: boolean; conteo: number };

function CrearDiasCalendario({ isOpen, setIsOpen }: ICrearDiasCalendarioProps) {
    const dispatch = useAppDispatch();
    const { listaDiasCalendario } = useAppSelector((state) => state.calendario);
    const [anioSelected, setAnioSelected] = useState<TAnioOption | undefined>();
    const [mostrarAnioSiguiente, setMostrarAnioSiguiente] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setAnioSelected(undefined);
            setMostrarAnioSiguiente(false);
        }
    }, [isOpen]);

    const conteosPorAnio = useMemo(() => {
        const map = new Map<number, number>();
        listaDiasCalendario.forEach((d) => {
            const year = new Date(d.fecha).getFullYear();
            map.set(year, (map.get(year) || 0) + 1);
        });
        return map;
    }, [listaDiasCalendario]);

    const añosVisibles = useMemo(() => {
        const base = [YEAR_ACTUAL, YEAR_ACTUAL - 1, YEAR_ACTUAL - 2, YEAR_ACTUAL - 3];
        return mostrarAnioSiguiente ? [YEAR_ACTUAL + 1, ...base] : base;
    }, [mostrarAnioSiguiente]);

    const opcionesAnio: TAnioOption[] = añosVisibles.map((year) => ({
        value: String(year),
        label: String(year),
        yaExiste: conteosPorAnio.has(year),
        conteo: conteosPorAnio.get(year) ?? 0,
    }));

    const handleSubmit = async () => {
        if (!anioSelected) return;
        try {
            await ApiService.fetchData({
                url: `/api/dias-calendario/generar_calendario_anual/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ anio: anioSelected.value }),
            });
            toast.success(`Feriados de ${anioSelected.label} creados`, { autoClose: 1500 });
            dispatch(calendarioApi.util.invalidateTags(['DiasCalendarioList']));
            setIsOpen(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.detail ?? 'Error al generar feriados');
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className='text-xl'>Agregar Feriados</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-3'>
                    <div className='w-full'>
                        <Badge>Año</Badge>
                        <SelectReact
                            name='anio'
                            options={opcionesAnio}
                            value={anioSelected ?? null}
                            onChange={(e) => setAnioSelected(e as TAnioOption)}
                            placeholder='Seleccione un año'
                            noOptionsMessage={() => 'Sin años disponibles'}
                            isOptionDisabled={(opt) => (opt as TAnioOption).yaExiste}
                            formatOptionLabel={(opt) => {
                                const o = opt as TAnioOption;
                                if (!o.yaExiste) return <span>{o.label}</span>;
                                return (
                                    <Tooltip
                                        text={`${o.label} ya tiene ${o.conteo} feriados registrados`}>
                                        <div className='pointer-events-auto flex w-full items-center justify-between'>
                                            <span className='text-zinc-400'>{o.label}</span>
                                            <Badge
                                                color='emerald'
                                                variant='outline'
                                                className='pointer-events-none text-xs'>
                                                {o.conteo} feriados
                                            </Badge>
                                        </div>
                                    </Tooltip>
                                );
                            }}
                        />
                        {!mostrarAnioSiguiente && (
                            <button
                                type='button'
                                onClick={() => setMostrarAnioSiguiente(true)}
                                className='mt-1 text-xs text-blue-500 hover:text-blue-700 hover:underline'>
                                + Incluir {YEAR_ACTUAL + 1}
                            </button>
                        )}
                    </div>
                    {anioSelected && (
                        <Alert color='emerald' icon='HeroCheckCircle'>
                            Se generarán los feriados de {anioSelected.label} desde la API oficial.
                        </Alert>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button color='red' onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='blue'
                        isDisable={!anioSelected}
                        onClick={handleSubmit}>
                        Crear
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default CrearDiasCalendario;
