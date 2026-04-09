import type { TSelectOption } from '@/components/form/SelectReact';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import type { IUsuarioEmpresa } from '@/interface/empresas.interface';
import type { TEstadoOTV3, TEtapaUIOTV3 } from '@/interface/ordenTrabajoV3.interface';
import { useAppSelector } from '@/store';
import { useGetUsuariosTodaLaEmpresaQuery, useGetUsuariosTodoElClienteQuery } from '@/store/slices/empresa/empresaApi';
import { useGetBodegasQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import {
    useCambiarEstadoV3Mutation,
    useGetCheckAvanceV3Query,
    useGetDetalleOrdenV3Query,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PanelCierre from './components/PanelCierre';
import PanelEjecucion from './components/PanelEjecucion';
import PanelPreparacion from './components/PanelPreparacion';
import CheckBloqueadoresOTV3 from './modals/CheckBloqueadoresOTV3';

// ---- ESTADO CONFIG ----
const COLOR_ESTADO: Record<TEstadoOTV3, string> = {
    borrador: 'zinc',
    preparacion: 'blue',
    en_ejecucion: 'amber',
    completada: 'emerald',
    facturada: 'violet',
    cerrada: 'zinc',
    cancelada: 'red',
};

const CTA_LABEL: Record<TEstadoOTV3, string | null> = {
    borrador: 'Confirmar OT',
    preparacion: 'Iniciar Ejecucion',
    en_ejecucion: 'Completar OT',
    completada: 'Cerrar OT',
    facturada: 'Confirmar Cierre',
    cerrada: null,
    cancelada: null,
};

// ---- STEPPER CONFIG ----
type TStepDef = { id: TEtapaUIOTV3 | 'cerrada' | 'cancelada'; label: string; desc: string };
const STEPS: TStepDef[] = [
    { id: 'preparacion', label: 'Preparacion', desc: 'Equipo y tareas' },
    { id: 'ejecucion', label: 'Ejecucion', desc: 'Realizar el trabajo' },
    { id: 'cierre', label: 'Cierre', desc: 'Documentar y cerrar' },
];

const ETAPA_STEP_INDEX: Record<TEtapaUIOTV3, number> = {
    preparacion: 0,
    ejecucion: 1,
    cierre: 2,
    cerrada: 2,
    cancelada: -1,
};

// ---- COMPONENT ----
const DetalleOTV3 = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    const empresaId = personalizacionUsuario?.empresa ?? undefined;

    const { data: orden, isLoading } = useGetDetalleOrdenV3Query(id!, {
        skip: !id,
    });
    const { data: avance, refetch: refetchAvance } = useGetCheckAvanceV3Query(id!, {
        skip: !id,
    });
    const { data: usuariosEmpresa } = useGetUsuariosTodaLaEmpresaQuery(empresaId!, {
        skip: !empresaId,
    });
    const { data: usuariosCliente } = useGetUsuariosTodoElClienteQuery(orden?.cliente ?? 0, {
        skip: !orden?.cliente,
    });
    const [cambiarEstado, { isLoading: loadingEstado }] = useCambiarEstadoV3Mutation();

    const [showCheckModal, setShowCheckModal] = useState(false);

    const etapaActual = orden?.etapa_ui ?? 'preparacion';
    const currentStepIndex = ETAPA_STEP_INDEX[etapaActual] ?? 0;

    const tecnicosOptions: TSelectOption[] = (usuariosEmpresa ?? []).map((u: IUsuarioEmpresa) => ({
        value: String(u.usuario),
        label: u.nombre_usuario || u.email_usuario,
    }));

    const receptoresOptions: TSelectOption[] = (usuariosCliente ?? []).map((u: IUsuarioEmpresa) => ({
        value: String(u.id),
        label: u.nombre_usuario || u.email_usuario,
    }));

    const handleCTA = async () => {
        if (!orden || !avance) return;
        await refetchAvance();
        setShowCheckModal(true);
    };

    const handleConfirmarCambioEstado = async () => {
        if (!orden || !avance?.proximo_estado) return;
        try {
            await cambiarEstado({ id: orden.id, estado: avance.proximo_estado as TEstadoOTV3 }).unwrap();
            toast.success('Estado actualizado correctamente');
            setShowCheckModal(false);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const { data: bodegas = [] } = useGetBodegasQuery();
    const bodegasOptions: TSelectOption[] = bodegas.map((b: { id: number; nombre: string }) => ({
        value: String(b.id),
        label: b.nombre,
    }));

    const ctaLabel = orden ? CTA_LABEL[orden.estado] : null;

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <div className='flex items-center justify-center py-20 text-gray-400'>
                        Cargando detalle...
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    if (!orden) {
        return (
            <PageWrapper>
                <Container>
                    <div className='flex items-center justify-center py-20 text-gray-400'>
                        Orden no encontrada.
                    </div>
                </Container>
            </PageWrapper>
        );
    }

    // Porcentaje de avance para la linea de progreso del stepper
    const progressPct =
        currentStepIndex <= 0
            ? 0
            : currentStepIndex >= STEPS.length - 1
              ? 100
              : (currentStepIndex / (STEPS.length - 1)) * 100;

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button
                        icon='HeroArrowLeft'
                        onClick={() => navigate('/orden-trabajo-v3/lista')}>
                        Volver
                    </Button>
                    <h1 className='ml-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
                        {orden.titulo}
                    </h1>
                    <Badge color={COLOR_ESTADO[orden.estado] as any} className='ml-2'>
                        {orden.estado_display}
                    </Badge>
                    <Badge color='zinc' className='ml-1'>
                        {orden.tipo_servicio_display}
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {ctaLabel && (
                        <Button
                            variant='solid'
                            color='blue'
                            isLoading={loadingEstado}
                            onClick={handleCTA}>
                            {ctaLabel}
                        </Button>
                    )}
                </SubheaderRight>
            </Subheader>

            <Container>
                {/* Stepper */}
                {!['cerrada', 'cancelada'].includes(orden.estado) && (
                    <Card className='mb-6'>
                        <CardHeader>
                            <CardHeaderChild>
                                <span className='font-semibold text-gray-700 dark:text-gray-200'>
                                    Progreso
                                </span>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <Badge color={COLOR_ESTADO[orden.estado] as any}>
                                    {STEPS[currentStepIndex]?.label ?? orden.estado_display}
                                </Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='w-full px-4 py-2'>
                                {/* Fila de circulos + linea de progreso */}
                                <div className='relative isolate flex items-center justify-between'>
                                    {/* Linea base (gris) */}
                                    <div className='absolute left-0 right-0 top-5 h-0.5 bg-gray-200 dark:bg-gray-700' />
                                    {/* Linea de progreso (animada) */}
                                    <div
                                        className='absolute left-0 top-5 h-0.5 bg-emerald-400 transition-all duration-500 dark:bg-emerald-500'
                                        style={{ width: `${progressPct}%` }}
                                    />
                                    {/* Nodos */}
                                    {STEPS.map((step, idx) => {
                                        const isDone = idx < currentStepIndex;
                                        const isActive = idx === currentStepIndex;
                                        return (
                                            <div
                                                key={step.id}
                                                className='relative z-[1] flex flex-col items-center'>
                                                <div
                                                    className={[
                                                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ring-2 transition-all duration-300',
                                                        isDone
                                                            ? 'bg-emerald-500 text-white ring-emerald-300 dark:ring-emerald-700'
                                                            : isActive
                                                              ? 'bg-blue-600 text-white ring-blue-300 dark:ring-blue-800'
                                                              : 'bg-white text-gray-400 ring-gray-200 dark:bg-gray-900 dark:text-gray-500 dark:ring-gray-700',
                                                    ].join(' ')}>
                                                    {isDone ? (
                                                        <svg
                                                            className='h-5 w-5'
                                                            fill='none'
                                                            stroke='currentColor'
                                                            viewBox='0 0 24 24'>
                                                            <path
                                                                strokeLinecap='round'
                                                                strokeLinejoin='round'
                                                                strokeWidth={2.5}
                                                                d='M5 13l4 4L19 7'
                                                            />
                                                        </svg>
                                                    ) : (
                                                        <span>{idx + 1}</span>
                                                    )}
                                                </div>
                                                <span
                                                    className={[
                                                        'mt-2 text-xs font-semibold',
                                                        isActive
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : isDone
                                                              ? 'text-emerald-600 dark:text-emerald-400'
                                                              : 'text-gray-400 dark:text-gray-500',
                                                    ].join(' ')}>
                                                    {step.label}
                                                </span>
                                                <span className='mt-0.5 text-xs text-gray-400 dark:text-gray-500'>
                                                    {step.desc}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Alerta estados especiales */}
                {orden.estado === 'cerrada' && (
                    <Alert color='zinc' className='mb-4'>
                        Esta orden de trabajo esta cerrada.
                    </Alert>
                )}
                {orden.estado === 'cancelada' && (
                    <Alert color='red' className='mb-4'>
                        Esta orden de trabajo fue cancelada.
                    </Alert>
                )}

                {/* Panel dinamico segun etapa */}
                {etapaActual === 'preparacion' && (
                    <PanelPreparacion
                        orden={orden}
                        tecnicosOptions={tecnicosOptions}
                        receptoresOptions={receptoresOptions}
                        bodegasOptions={bodegasOptions}
                    />
                )}
                {etapaActual === 'ejecucion' && (
                    <PanelEjecucion orden={orden} tecnicosOptions={tecnicosOptions} receptoresOptions={receptoresOptions} />
                )}
                {(etapaActual === 'cierre' || etapaActual === 'cerrada') && (
                    <PanelCierre orden={orden} />
                )}
                {etapaActual === 'cancelada' && <PanelCierre orden={orden} />}
            </Container>

            {/* Modal de verificacion de bloqueadores */}
            <CheckBloqueadoresOTV3
                isOpen={showCheckModal}
                setIsOpen={setShowCheckModal}
                avance={avance ?? null}
                onConfirmar={handleConfirmarCambioEstado}
                isLoading={loadingEstado}
            />
        </PageWrapper>
    );
};

export default DetalleOTV3;
