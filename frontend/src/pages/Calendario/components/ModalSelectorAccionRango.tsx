import { Dispatch, SetStateAction } from 'react';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export type TAccionRango = 'vacaciones' | 'ot';

interface IModalSelectorAccionRangoProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    fechaInicio: string;
    fechaFin: string;
    onSeleccion: (accion: TAccionRango) => void;
}

const ACCIONES: {
    key: TAccionRango;
    label: string;
    descripcion: string;
    colorClass: string;
}[] = [
    {
        key: 'vacaciones',
        label: 'Solicitud de Vacaciones',
        descripcion: 'Crea una solicitud de vacaciones para un empleado en este rango de fechas.',
        colorClass:
            'border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900',
    },
    {
        key: 'ot',
        label: 'Nueva Orden de Trabajo',
        descripcion: 'Programa una OT en este período. Abre el módulo de OTs con las fechas como referencia.',
        colorClass:
            'border-lime-200 bg-lime-50 hover:bg-lime-100 dark:border-lime-800 dark:bg-lime-950 dark:hover:bg-lime-900',
    },
];

function ModalSelectorAccionRango({
    isOpen,
    setIsOpen,
    fechaInicio,
    fechaFin,
    onSeleccion,
}: IModalSelectorAccionRangoProps) {
    const navigate = useNavigate();

    const finDisplay = dayjs(fechaFin).subtract(1, 'day');
    const mismodia = dayjs(fechaInicio).isSame(finDisplay, 'day');

    const rangoLabel = mismodia
        ? dayjs(fechaInicio).format('DD/MM/YYYY')
        : `${dayjs(fechaInicio).format('DD/MM/YYYY')} → ${finDisplay.format('DD/MM/YYYY')}`;

    const handleAccion = (accion: TAccionRango) => {
        setIsOpen(false);
        if (accion === 'ot') {
            navigate(
                `/orden-trabajo-v3/lista?fecha_inicio=${fechaInicio}&fecha_fin=${dayjs(fechaFin).subtract(1, 'day').format('YYYY-MM-DD')}`,
            );
            return;
        }
        onSeleccion(accion);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='sm'>
            <ModalHeader>
                <div className='flex flex-col gap-1'>
                    <span className='text-base font-semibold'>¿Qué quieres crear?</span>
                    <Badge color='zinc' className='w-fit text-xs font-normal'>
                        {rangoLabel}
                    </Badge>
                </div>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-3'>
                    {ACCIONES.map((accion) => (
                        <button
                            key={accion.key}
                            type='button'
                            onClick={() => handleAccion(accion.key)}
                            className={`flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${accion.colorClass}`}>
                            <span className='text-sm font-semibold'>{accion.label}</span>
                            <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                                {accion.descripcion}
                            </span>
                        </button>
                    ))}
                </div>
            </ModalBody>
        </Modal>
    );
}

export default ModalSelectorAccionRango;
