import Button from '@/components/ui/Button';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { confirmAlert } from '@/utils/sweetAlert';
import { toast } from 'react-toastify';
import { useState } from 'react';
import FirmarCompletarTrabajo from '../modals/FirmarCompletarTrabajo';

type EstadoFinal = 'completado' | 'medianamente_completado' | 'no_realizado';

interface DropdownEstadoTrabajoProps {
    onSelectEstado: (estado: EstadoFinal) => void;
    disabled?: boolean;
    tooltipText?: string;
    ordenId?: number;
    servicioId?: number;
    soporteId?: number;
    clienteId?: number;
    tecnicoNombre?: string;
    usuariosAsignadosTotal?: number;
    usuariosAsignadosResueltos?: number;
    // Callback para abrir el modal desde el padre
    onOpenModal?: (
        trabajoId: number,
        tipo: 'servicio' | 'soporte',
        estado: 'completado' | 'medianamente_completado',
        tecnicoNombre: string,
        comentarios: any[],
    ) => void;
}

const DropdownEstadoTrabajo = ({
    onSelectEstado,
    disabled = false,
    tooltipText = 'Cambiar estado del trabajo',
    ordenId,
    servicioId,
    soporteId,
    clienteId,
    tecnicoNombre = 'Tecnico',
    usuariosAsignadosTotal,
    usuariosAsignadosResueltos,
    onOpenModal,
}: DropdownEstadoTrabajoProps) => {
    const [isOpenFirmaModal, setIsOpenFirmaModal] = useState(false);
    const [comentariosTecnicos, setComentariosTecnicos] = useState<any[]>([]);
    const [estadoSeleccionado, setEstadoSeleccionado] = useState<
        'completado' | 'medianamente_completado'
    >('completado');

    const opciones: Array<{ value: EstadoFinal; label: string; color: string; icon: string }> = [
        {
            value: 'completado',
            label: 'Completado',
            color: 'emerald',
            icon: 'HeroCheck',
        },
        {
            value: 'medianamente_completado',
            label: 'Medianamente Completado',
            color: 'blue',
            icon: 'HeroCheckCircle',
        },
        {
            value: 'no_realizado',
            label: 'No Realizado',
            color: 'red',
            icon: 'HeroXMark',
        },
    ];

    const buildRestriccion = (estado: EstadoFinal) => {
        if (usuariosAsignadosTotal === undefined || usuariosAsignadosResueltos === undefined) {
            return null;
        }
        if (usuariosAsignadosTotal <= 0) return null;
        const resueltos = usuariosAsignadosResueltos;
        const total = usuariosAsignadosTotal;
        if (estado === 'completado' && resueltos < total) {
            return 'Se requiere de todos los usuarios resueltos';
        }
        if (estado === 'medianamente_completado' && resueltos < 1) {
            return 'Se requiere de al menos 1 usuario resuelto';
        }
        if (estado === 'no_realizado' && resueltos > 0) {
            return 'Solo disponible cuando ningun usuario esta resuelto';
        }
        return null;
    };

    /**
     * Valida que el trabajo tenga al menos un seguimiento de tipo 'comentario_tecnico'
     * antes de permitir el cambio a estado final
     */
    const validarSeguimientos = async (): Promise<boolean> => {
        if (!ordenId || (!servicioId && !soporteId)) {
            // Si no hay IDs, no podemos validar - permitir cambio
            return true;
        }

        try {
            const origen = servicioId ? 'servicio' : 'soporte';
            const url = `/api/ordenes-de-trabajo/${ordenId}/seguimientos/?tipo=comentario_tecnico&origen=${origen}`;

            const response = await ApiService.fetchData<any[]>({
                url,
                method: 'get',
            });

            const seguimientos = response?.data || response || [];
            const itemId = servicioId || soporteId;

            // Filtrar seguimientos del trabajo específico
            const seguimientosDelTrabajo = seguimientos.filter(
                (seg: any) => seg.servicio === itemId || seg.soporte === itemId,
            );

            return seguimientosDelTrabajo.length > 0;
        } catch (error) {
            // En caso de error, permitir el cambio para no bloquear el flujo
            return true;
        }
    };

    const handleSelectEstado = async (estado: EstadoFinal) => {
        // Validar seguimientos antes de continuar
        const tieneSeguimientos = await validarSeguimientos();

        if (!tieneSeguimientos) {
            toast.warning(
                'Debes agregar al menos un comentario técnico sobre el trabajo realizado antes de finalizar',
                { autoClose: 4000 },
            );
            return;
        }

        // Si el estado es "completado" o "medianamente_completado", abrir modal de firma
        if (estado === 'completado' || estado === 'medianamente_completado') {
            // Validar que tengamos todos los datos necesarios
            if (!ordenId || (!servicioId && !soporteId) || !clienteId) {
                console.error('Faltan datos para abrir el modal de firma', {
                    ordenId,
                    servicioId,
                    soporteId,
                    clienteId,
                });
                toast.error('No se pudo abrir el modal de firma. Faltan datos necesarios.');
                return;
            }

            // Cargar comentarios técnicos para mostrar en el modal
            try {
                const origen = servicioId ? 'servicio' : 'soporte';
                const url = `/api/ordenes-de-trabajo/${ordenId}/seguimientos/?tipo=comentario_tecnico&origen=${origen}`;

                const response = await ApiService.fetchData<any[]>({
                    url,
                    method: 'get',
                });

                const seguimientos = response?.data || response || [];
                const itemId = servicioId || soporteId;

                // Filtrar comentarios del trabajo específico
                const comentariosDelTrabajo = seguimientos.filter(
                    (seg: any) => seg.servicio === itemId || seg.soporte === itemId,
                );

                setComentariosTecnicos(comentariosDelTrabajo);
                setEstadoSeleccionado(estado); // Guardar el estado seleccionado

                // Si hay callback para abrir modal desde el padre, usarlo
                if (onOpenModal) {
                    const trabajoId = servicioId || soporteId || 0;
                    const tipo = servicioId ? 'servicio' : 'soporte';
                    onOpenModal(trabajoId, tipo, estado, tecnicoNombre, comentariosDelTrabajo);
                } else {
                    // Fallback: usar estado local
                    setIsOpenFirmaModal(true);
                }
            } catch (error) {
                toast.error('Error al cargar comentarios técnicos');
            }
            return;
        }

        // Para "no_realizado", mostrar confirmación normal
        const confirmar = await confirmAlert({
            title: '¿Estás seguro?',
            text: `Cambiarás el estado del trabajo a "${
                opciones.find((o) => o.value === estado)?.label
            }"`,
            icon: 'warning',
        });

        if (confirmar) {
            onSelectEstado(estado);
        }
    };

    if (disabled) {
        return (
            <Tooltip text={tooltipText}>
                <Button
                    size='sm'
                    variant='outline'
                    rounded='rounded-full'
                    color='gray'
                    isDisable={true}
                    icon='DuoLoading'
                    className='opacity-75'>
                    En Proceso
                </Button>
            </Tooltip>
        );
    }

    return (
        <>
            {/* Modal de firma para estado completado - siempre renderizado */}
            <FirmarCompletarTrabajo
                ordenId={ordenId || 0}
                trabajoId={servicioId || soporteId || 0}
                trabajoTipo={servicioId ? 'servicio' : 'soporte'}
                estadoFinal={estadoSeleccionado}
                clienteId={clienteId || 0}
                tecnicoNombre={tecnicoNombre}
                comentariosTecnicos={comentariosTecnicos}
                isOpen={isOpenFirmaModal}
                setIsOpen={setIsOpenFirmaModal}
                onSuccess={() => {
                    // El endpoint /completar-trabajo/ ya actualizó el estado en backend
                    // Solo necesitamos refrescar los datos llamando a onSelectEstado con el estado
                    // que el componente padre puede usar para refrescar
                    onSelectEstado(estadoSeleccionado);
                }}
            />

            <Dropdown>
                <DropdownToggle>
                    <Button
                        size='sm'
                        variant='solid'
                        rounded='rounded-full'
                        color='sky'
                        icon='DuoLoading'
                        aria-label='Cambiar estado'>
                        En Proceso
                    </Button>
                </DropdownToggle>
                <DropdownMenu placement='bottom-end'>
                    {opciones.map((opcion) => {
                        const restriccion = buildRestriccion(opcion.value);
                        const item = (
                            <DropdownItem
                                key={opcion.value}
                                onClick={() => {
                                    if (restriccion) return;
                                    handleSelectEstado(opcion.value);
                                }}
                                icon={opcion.icon}
                                className={
                                    restriccion ? 'cursor-not-allowed opacity-60' : undefined
                                }>
                                <span className={`font-medium text-${opcion.color}-600`}>
                                    {opcion.label}
                                </span>
                            </DropdownItem>
                        );
                        return restriccion ? (
                            <Tooltip key={opcion.value} text={restriccion}>
                                {item}
                            </Tooltip>
                        ) : (
                            item
                        );
                    })}
                </DropdownMenu>
            </Dropdown>
        </>
    );
};

export default DropdownEstadoTrabajo;
