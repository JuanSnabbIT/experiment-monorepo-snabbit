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
import { confirmAlert, showBlockersAlert } from '@/utils/sweetAlert';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PanelBorrador from './components/PanelBorrador';
import PanelCierre from './components/PanelCierre';
import PanelEjecucion from './components/PanelEjecucion';
import PanelPorFacturar from './components/PanelPorFacturar';
import PanelPreparacion from './components/PanelPreparacion';
import PanelRetroalimentacion from './components/PanelRetroalimentacion';

// ---- ESTADO CONFIG ----
const COLOR_ESTADO: Record<TEstadoOTV3, string> = {
    borrador: 'zinc',
    preparacion: 'blue',
    en_ejecucion: 'amber',
    retroalimentacion: 'violet',
    por_facturar: 'emerald',
    completada: 'emerald',
    parcialmente_facturada: 'sky',
    facturada: 'violet',
    cerrada: 'zinc',
    cancelada: 'red',
};

const CTA_LABEL: Record<TEstadoOTV3, string | null> = {
    borrador: 'Confirmar OT',
    preparacion: 'Iniciar Ejecucion',
    en_ejecucion: 'Enviar a Retroalimentacion',
    retroalimentacion: null,
    por_facturar: null,
    completada: null,
    parcialmente_facturada: null,
    facturada: 'Confirmar Cierre',
    cerrada: null,
    cancelada: null,
};

// ---- STEPPER CONFIG ----
type TStepDef = { id: TEtapaUIOTV3 | 'cerrada' | 'cancelada'; label: string; desc: string };
const STEPS: TStepDef[] = [
    { id: 'preparacion', label: 'Preparacion', desc: 'Equipo y tareas' },
    { id: 'ejecucion', label: 'Ejecucion', desc: 'Realizar el trabajo' },
    { id: 'retroalimentacion', label: 'Retroalimentacion', desc: 'Feedback del cliente' },
    { id: 'por_facturar', label: 'Por facturar', desc: 'Preparar facturacion' },
    { id: 'cierre', label: 'Cierre', desc: 'Documentar y cerrar' },
];

const ETAPA_STEP_INDEX: Record<TEtapaUIOTV3, number> = {
    preparacion: 0,
    ejecucion: 1,
    retroalimentacion: 2,
    por_facturar: 3,
    cierre: 4,
    cerrada: 4,
    cancelada: -1,
};

// Config de confirmación por estado destino
const SWAL_CONFIRM: Record<
    string,
    { title: string; text: string; confirmText: string; confirmColor: string; successText: string }
> = {
    preparacion: {
        title: '¿Confirmar Orden de Trabajo?',
        text: 'La OT pasará a Preparación. El equipo podrá comenzar a planificar.',
        confirmText: 'Sí, confirmar',
        confirmColor: '#3085d6',
        successText: 'La orden de trabajo está lista para preparar.',
    },
    en_ejecucion: {
        title: '¿Iniciar Ejecución?',
        text: 'El equipo comenzará a realizar el trabajo registrado.',
        confirmText: 'Sí, iniciar',
        confirmColor: '#f59e0b',
        successText: 'La OT está en ejecución.',
    },
    retroalimentacion: {
        title: '¿Enviar a Retroalimentación?',
        text: 'Se notificará al cliente para que evalúe el servicio recibido.',
        confirmText: 'Sí, enviar',
        confirmColor: '#8b5cf6',
        successText: 'El cliente recibirá un correo para evaluar el servicio.',
    },
    cerrada: {
        title: '¿Confirmar cierre definitivo?',
        text: 'La OT quedará cerrada permanentemente y no podrá modificarse.',
        confirmText: 'Sí, cerrar definitivamente',
        confirmColor: '#6b7280',
        successText: 'La orden de trabajo ha sido cerrada.',
    },
    cancelada: {
        title: '¿Cancelar la Orden de Trabajo?',
        text: 'La OT será cancelada. Esta acción no se puede deshacer.',
        confirmText: 'Sí, cancelar',
        confirmColor: '#ef4444',
        successText: 'La orden de trabajo fue cancelada.',
    },
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

    const ejecutarCambioEstado = async (proximoEstado: string) => {
        if (!orden) return;

        const swalConfig = SWAL_CONFIRM[proximoEstado];
        if (swalConfig) {
            const confirmado = await confirmAlert({
                title: swalConfig.title,
                text: swalConfig.text,
                confirmText: swalConfig.confirmText,
                cancelText: 'Cancelar',
                confirmColor: swalConfig.confirmColor,
                icon: 'question',
            });
            if (!confirmado) return;
        }

        try {
            await cambiarEstado({ id: orden.id, estado: proximoEstado as TEstadoOTV3 }).unwrap();
            if (swalConfig) {
                toast.success(swalConfig.successText);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleCTA = async () => {
        if (!orden) return;
        const result = await refetchAvance();
        const freshAvance = result.data;
        if (!freshAvance) return;

        // Sin bloqueadores: ir directo al SweetAlert sin pasar por el modal
        if (
            freshAvance.puede_avanzar &&
            freshAvance.bloqueadores.length === 0 &&
            freshAvance.proximo_estado
        ) {
            await ejecutarCambioEstado(freshAvance.proximo_estado);
            return;
        }

        // Con bloqueadores o sin permiso: mostrar SweetAlert con detalle
        await showBlockersAlert(freshAvance.bloqueadores);
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
                    <div className='flex items-center justify-center py-20 text-zinc-400'>
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
                    <div className='flex items-center justify-center py-20 text-zinc-400'>
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
                    <h1 className='ml-2 text-lg font-bold text-zinc-800 dark:text-zinc-100'>
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
                                <span className='font-semibold text-zinc-700 dark:text-zinc-200'>
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
                                    <div className='absolute left-0 right-0 top-5 h-0.5 bg-zinc-200 dark:bg-zinc-700' />
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
                                                              : 'bg-white text-zinc-400 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-zinc-700',
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
                                                              : 'text-zinc-400 dark:text-zinc-500',
                                                    ].join(' ')}>
                                                    {step.label}
                                                </span>
                                                <span className='mt-0.5 text-xs text-zinc-400 dark:text-zinc-500'>
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
                {orden.estado === 'borrador' && (
                    <PanelBorrador
                        orden={orden}
                        tecnicosOptions={tecnicosOptions}
                        solicitantesOptions={receptoresOptions}
                    />
                )}
                {orden.estado !== 'borrador' && etapaActual === 'preparacion' && (
                    <PanelPreparacion
                        orden={orden}
                        tecnicosOptions={tecnicosOptions}
                        receptoresOptions={receptoresOptions}
                        bodegasOptions={bodegasOptions}
                    />
                )}
                {orden.estado !== 'borrador' && etapaActual === 'ejecucion' && (
                    <PanelEjecucion orden={orden} firmantesOptions={tecnicosOptions} receptoresOptions={receptoresOptions} />
                )}
                {etapaActual === 'retroalimentacion' && (
                    <PanelRetroalimentacion orden={orden} />
                )}
                {etapaActual === 'por_facturar' && (
                    <PanelPorFacturar orden={orden} />
                )}
                {(etapaActual === 'cierre' || etapaActual === 'cerrada') && (
                    <PanelCierre orden={orden} />
                )}
                {etapaActual === 'cancelada' && <PanelCierre orden={orden} />}
            </Container>

        </PageWrapper>
    );
};

export default DetalleOTV3;
