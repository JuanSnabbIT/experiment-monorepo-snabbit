import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, {
    SubheaderLeft,
    SubheaderRight,
} from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import {
    useAprobarContratoTrabajadorMutation,
    useCambiarEstadoContratoTrabajadorMutation,
    useCrearCopiaContratoMutation,
    useEnviarAprobacionEmpleadorMutation,
    useGenerarPdfContratoTrabajadorMutation,
    useGetContratoTrabajadorDetalleQuery,
    useGetEstadoAprobacionEmpleadorQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { TMotivoTerminoContrato } from '@/interface/rrhh.interface';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import CicloVidaContratoLaboral from './components/trabajador/CicloVidaContratoLaboral';
import ModalCambiarEstadoContrato from './components/trabajador/ModalCambiarEstadoContrato';
import TabAnexosTrabajador from './components/trabajador/TabAnexosTrabajador';
import TabBancoTrabajador from './components/trabajador/TabBancoTrabajador';
import TabDatosLaboralesTrabajador from './components/trabajador/TabDatosLaboralesTrabajador';
import TabDocumentoTrabajador from './components/trabajador/TabDocumentoTrabajador';
import TabFiniquitoTrabajador from './components/trabajador/TabFiniquitoTrabajador';
import TabHistorialTrabajador from './components/trabajador/TabHistorialTrabajador';
import TabPrevisionTrabajador from './components/trabajador/TabPrevisionTrabajador';
import TabRemuneracionesTrabajador from './components/trabajador/TabRemuneracionesTrabajador';
import TabTrabajadorTrabajador from './components/trabajador/TabTrabajadorTrabajador';

type TTabId =
    | 'datos'
    | 'trabajador'
    | 'sueldo'
    | 'prevision'
    | 'banco'
    | 'documento'
    | 'anexos'
    | 'historial'
    | 'finiquito';

const TABS: { id: TTabId; label: string }[] = [
    { id: 'datos', label: 'Datos contrato' },
    { id: 'trabajador', label: 'Trabajador' },
    { id: 'sueldo', label: 'Sueldo' },
    { id: 'prevision', label: 'Previsión y salud' },
    { id: 'banco', label: 'Datos bancarios' },
    { id: 'documento', label: 'Documento' },
    { id: 'anexos', label: 'Anexos' },
    { id: 'historial', label: 'Historial' },
    { id: 'finiquito', label: 'Finiquito' },
];

const BADGE_COLOR: Record<string, 'amber' | 'blue' | 'emerald' | 'red' | 'zinc'> = {
    borrador: 'zinc',
    pendiente_aprobacion: 'amber',
    vigente: 'emerald',
    terminado: 'zinc',
    anulado: 'red',
    descartado: 'zinc',
};

const DetalleContratoTrabajador = () => {
    const navigate = useNavigate();
    const { contratoId } = useParams<{ contratoId: string }>();
    const [searchParams] = useSearchParams();
    const fromParam = searchParams.get('from');
    const fromCliente = fromParam === 'cliente';
    const fromFicha = fromParam === 'ficha';
    const clienteId = searchParams.get('clienteId');
    const [activeTab, setActiveTab] = useState<TTabId>('datos');
    const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
    const [estadoDestino, setEstadoDestino] = useState<'terminado' | 'anulado'>('terminado');
    const [modalEnvioOpen, setModalEnvioOpen] = useState(false);
    const [modalCopiaOpen, setModalCopiaOpen] = useState(false);
    const [nombreCopia, setNombreCopia] = useState('');
    const [emailEmpleador, setEmailEmpleador] = useState('');
    const [emailMode, setEmailMode] = useState<'empresa' | 'custom'>('empresa');

    const {
        data: contrato,
        isLoading,
        isError,
    } = useGetContratoTrabajadorDetalleQuery(contratoId!, { skip: !contratoId });

    const [generarPdf, { isLoading: generandoPdf }] = useGenerarPdfContratoTrabajadorMutation();
    const [crearCopia, { isLoading: creandoCopia }] = useCrearCopiaContratoMutation();
    const [enviarAprobacion, { isLoading: enviandoAprobacion }] =
        useEnviarAprobacionEmpleadorMutation();
    const [aprobarContrato, { isLoading: aprobando }] = useAprobarContratoTrabajadorMutation();
    const [cambiarEstado, { isLoading: cambiandoEstado }] =
        useCambiarEstadoContratoTrabajadorMutation();

    const { data: estadoAprobacion } = useGetEstadoAprobacionEmpleadorQuery(Number(contratoId), {
        skip:
            !contratoId ||
            !['pendiente_aprobacion', 'anulado'].includes(contrato?.estado ?? ''),
    });

    if (!contratoId) {
        return (
            <PageWrapper>
                <Container>
                    <p>ID de contrato no valido.</p>
                </Container>
            </PageWrapper>
        );
    }

    if (isLoading) {
        return (
            <PageWrapper>
                <Container>
                    <div className='py-12 text-center text-zinc-500'>Cargando contrato...</div>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !contrato) {
        return (
            <PageWrapper>
                <Container>
                    <Card>
                        <CardBody>
                            <p className='text-red-500'>No se pudo cargar el contrato.</p>
                            <Button className='mt-4' icon='HeroArrowSmallLeft' onClick={() => navigate(-1)}>
                                Volver
                            </Button>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    const badgeColor = BADGE_COLOR[contrato.estado] ?? 'zinc';
    const envio = estadoAprobacion?.envio ?? null;
    const rechazadoPorEmpleador = contrato.estado === 'anulado' && envio?.decision === 'rechazado';

    const contratoTitulo = contrato.referencia_interna
        ? `${contrato.referencia_interna} #${contrato.id}`
        : `Contrato #${contrato.id}`;

    const nombreTrabajador =
        contrato.nombre_trabajador ??
        (contrato.datos_trabajador_nuevo
            ? `${contrato.datos_trabajador_nuevo.first_name ?? ''} ${contrato.datos_trabajador_nuevo.last_name ?? ''}`.trim() ||
              contrato.datos_trabajador_nuevo.email
            : `Trabajador #${contrato.usuario_empresa}`);

    const handleGenerarPdf = async () => {
        try {
            await generarPdf(contrato.id).unwrap();
            toast.success('PDF generado correctamente.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleEnviarAprobacion = async () => {
        const emailDestino =
            emailMode === 'empresa' ? (contrato.email_empresa ?? '').trim() : emailEmpleador.trim();
        if (!emailDestino) {
            toast.error(
                emailMode === 'empresa'
                    ? 'La empresa no tiene correo registrado.'
                    : 'Ingresa el correo del empleador.',
            );
            return;
        }
        try {
            await enviarAprobacion({ id: contrato.id, email_empleador: emailDestino }).unwrap();
            toast.success(
                contrato.estado === 'pendiente_aprobacion'
                    ? 'Correo corregido y reenviado. El envío anterior quedó obsoleto.'
                    : 'Correo de aprobacion enviado al empleador.',
            );
            setModalEnvioOpen(false);
            setEmailEmpleador('');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleActivarContrato = async () => {
        try {
            const resultado = await aprobarContrato(contrato.id).unwrap();
            toast.success('Contrato activado correctamente.');
            if (fromFicha && clienteId && resultado.usuario_empresa) {
                navigate(
                    `/empresa/detalle-cliente/${clienteId}/trabajador/${resultado.usuario_empresa}?tipo=confirmado`,
                );
            }
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleConfirmarCambioEstado = async (data: Record<string, string | undefined>) => {
        try {
            await cambiarEstado({
                id: contrato.id,
                estado: estadoDestino,
                motivo_termino: data.motivo_termino as TMotivoTerminoContrato | undefined,
                fecha_termino_real: data.fecha_termino_real,
                observaciones_termino: data.observaciones_termino,
            }).unwrap();
            toast.success(estadoDestino === 'terminado' ? 'Contrato terminado.' : 'Contrato anulado.');
            setModalEstadoOpen(false);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleVolverABorrador = async () => {
        try {
            await cambiarEstado({ id: contrato.id, estado: 'borrador' }).unwrap();
            toast.success('Contrato devuelto a Borrador.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const handleAbrirModalCopia = () => {
        setNombreCopia(`Copia de ${contrato.referencia_interna || `contrato #${contratoId}`}`);
        setModalCopiaOpen(true);
    };

    const handleCrearCopia = async () => {
        if (!contratoId || !nombreCopia.trim()) return;
        try {
            const nuevo = await crearCopia({ id: Number(contratoId), nombre: nombreCopia.trim() }).unwrap();
            toast.success('Copia creada en borrador');
            setModalCopiaOpen(false);
            navigate(`/rrhh/contratos/${nuevo.id}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const mostrarBannerVencimiento =
        contrato.estado === 'vigente' &&
        contrato.tipo_contrato === 'plazo_fijo' &&
        !!contrato.fecha_termino;

    const diasRestantes = mostrarBannerVencimiento
        ? dayjs(contrato.fecha_termino!).diff(dayjs(), 'day')
        : null;

    const bannerVencimientoTipo =
        diasRestantes !== null
            ? diasRestantes < 0
                ? 'vencido'
                : diasRestantes <= 30
                  ? 'critico'
                  : diasRestantes <= 60
                    ? 'proximo'
                    : null
            : null;

    return (
        <PageWrapper isProtectedRoute title={contratoTitulo}>
            <Subheader>
                <SubheaderLeft>
                    {fromCliente && clienteId ? (
                        <Button
                            icon='HeroArrowSmallLeft'
                            onClick={() =>
                                navigate(`/empresa/detalle-cliente/${clienteId}?tab=contratosLaborales`)
                            }>
                            Volver al cliente
                        </Button>
                    ) : fromFicha && clienteId ? (
                        <Button
                            icon='HeroArrowSmallLeft'
                            onClick={() => {
                                if (contrato.usuario_empresa) {
                                    navigate(
                                        `/empresa/detalle-cliente/${clienteId}/trabajador/${contrato.usuario_empresa}?tipo=confirmado`,
                                    );
                                } else {
                                    navigate(
                                        `/empresa/detalle-cliente/${clienteId}/trabajador/${contratoId}?tipo=pendiente`,
                                    );
                                }
                            }}>
                            Volver a la ficha
                        </Button>
                    ) : (
                        <Button icon='HeroArrowSmallLeft' onClick={() => navigate(-1)} />
                    )}
                    <span className='font-bold text-zinc-900 dark:text-zinc-100'>{contratoTitulo}</span>
                    <Badge variant='solid' color={badgeColor}>
                        {contrato.estado_label ?? contrato.estado}
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <CicloVidaContratoLaboral estado={contrato.estado} rechazado={rechazadoPorEmpleador} />
                </SubheaderRight>
            </Subheader>

            <Container className='pb-0 pt-2'>
                <Card>
                    <CardBody className='py-3'>
                        <div className='flex flex-wrap items-center justify-between gap-4'>
                            <div className='min-w-0'>
                                <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                    Trabajadores / {nombreTrabajador}
                                </p>
                                <div className='mt-1.5 flex flex-wrap items-center gap-2'>
                                    <span className='rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'>
                                        Tipo: <strong>{contrato.tipo_contrato_label ?? contrato.tipo_contrato}</strong>
                                    </span>
                                    {contrato.fecha_inicio && (
                                        <span className='rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'>
                                            Inicio: {contrato.fecha_inicio}
                                            {!contrato.fecha_termino && ' · Sin termino'}
                                        </span>
                                    )}
                                    {contrato.fecha_termino && (
                                        <span className='rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'>
                                            Termino: {contrato.fecha_termino}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className='flex shrink-0 flex-wrap items-center gap-2'>
                                {contrato.estado === 'borrador' && (
                                    <>
                                        <Button icon='HeroDocumentArrowDown' isDisable={generandoPdf} onClick={handleGenerarPdf}>
                                            {generandoPdf ? 'Generando...' : 'Vista previa'}
                                        </Button>
                                        <Button
                                            icon='HeroEnvelope'
                                            variant='solid'
                                            color='blue'
                                            onClick={() => setModalEnvioOpen(true)}>
                                            Enviar aprob. empleador
                                        </Button>
                                    </>
                                )}

                                {contrato.estado === 'pendiente_aprobacion' &&
                                    (envio?.decision === 'cambios_solicitados' || envio?.expirado === true) && (
                                        <Button
                                            variant='solid'
                                            color='amber'
                                            icon='HeroArrowUturnLeft'
                                            isDisable={cambiandoEstado}
                                            onClick={handleVolverABorrador}>
                                            Volver a borrador
                                        </Button>
                                    )}
                                {contrato.estado === 'vigente' && (
                                    <>
                                        <Button
                                            icon='HeroArrowsRightLeft'
                                            onClick={() => {
                                                setEstadoDestino('terminado');
                                                setModalEstadoOpen(true);
                                            }}>
                                            Terminar / Anular
                                        </Button>
                                        <Button icon='HeroDocumentArrowDown' isDisable={generandoPdf} onClick={handleGenerarPdf}>
                                            PDF
                                        </Button>
                                    </>
                                )}
                                {contrato.estado === 'terminado' && (
                                    <Button icon='HeroDocumentArrowDown' isDisable={generandoPdf} onClick={handleGenerarPdf}>
                                        {generandoPdf ? 'Generando...' : 'Generar PDF'}
                                    </Button>
                                )}
                                {contrato.estado === 'anulado' && (
                                    <Button
                                        icon='HeroDocumentDuplicate'
                                        variant='solid'
                                        color='blue'
                                        onClick={handleAbrirModalCopia}>
                                        Crear copia
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>

            {mostrarBannerVencimiento && bannerVencimientoTipo && (
                <Container className='pb-0 pt-2'>
                    {bannerVencimientoTipo === 'vencido' && (
                        <Alert variant='outline' color='red' icon='HeroExclamationTriangle'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <strong>Contrato vencido</strong>
                                    <p className='mt-1 text-sm'>
                                        Vencio hace {Math.abs(diasRestantes!)} dias ({contrato.fecha_termino}).
                                    </p>
                                </div>
                                <Button
                                    icon='HeroArrowsRightLeft'
                                    color='red'
                                    size='sm'
                                    onClick={() => {
                                        setEstadoDestino('terminado');
                                        setModalEstadoOpen(true);
                                    }}>
                                    Terminar contrato
                                </Button>
                            </div>
                        </Alert>
                    )}
                    {bannerVencimientoTipo === 'critico' && (
                        <Alert variant='outline' color='red' icon='HeroExclamationTriangle'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <strong>Vence en {diasRestantes} dias</strong>
                                    <p className='mt-1 text-sm'>
                                        Fecha termino: {contrato.fecha_termino}. Atencion inmediata requerida.
                                    </p>
                                </div>
                                <Button
                                    icon='HeroArrowsRightLeft'
                                    color='red'
                                    size='sm'
                                    onClick={() => {
                                        setEstadoDestino('terminado');
                                        setModalEstadoOpen(true);
                                    }}>
                                    Terminar contrato
                                </Button>
                            </div>
                        </Alert>
                    )}
                    {bannerVencimientoTipo === 'proximo' && (
                        <Alert variant='outline' color='amber' icon='HeroClock'>
                            <strong>Proximo vencimiento</strong>
                            <p className='mt-1 text-sm'>
                                El contrato vence el {contrato.fecha_termino} ({diasRestantes} dias).
                            </p>
                        </Alert>
                    )}
                </Container>
            )}

            {rechazadoPorEmpleador && (
                <Container className='pb-0 pt-2'>
                    <Alert variant='outline' color='red' icon='HeroXCircle'>
                        <strong>El empleador rechazo el contrato</strong>
                        {envio?.motivo_rechazo && <p className='mt-1 text-sm'>Motivo: {envio.motivo_rechazo}</p>}
                    </Alert>
                </Container>
            )}

            {contrato.estado === 'pendiente_aprobacion' && envio && (
                <Container className='pb-0 pt-2'>
                    {envio.decision === 'pendiente' && (
                        <Alert variant='outline' color='amber' icon='HeroClock'>
                            <div className='flex items-center justify-between gap-3'>
                                <div>
                                    <strong>Esperando respuesta del empleador</strong>
                                    <p className='mt-1 text-sm'>Correo enviado a: {envio.enviado_a}</p>
                                    <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                        Si el correo está mal, puedes reenviar a otro. El enlace anterior quedará obsoleto automáticamente.
                                    </p>
                                </div>
                                <Button
                                    icon='HeroEnvelope'
                                    size='sm'
                                    variant='solid'
                                    color='blue'
                                    onClick={() => {
                                        setEmailMode('custom');
                                        setEmailEmpleador(envio.enviado_a ?? '');
                                        setModalEnvioOpen(true);
                                    }}>
                                    Corregir correo
                                </Button>
                            </div>
                        </Alert>
                    )}
                    {envio.decision === 'aprobado' && (
                        <Alert variant='outline' color='emerald' icon='HeroCheckCircle'>
                            <div className='flex items-center justify-between'>
                                <strong>El empleador aprobo el contrato</strong>
                                <Button
                                    icon='HeroCheckCircle'
                                    variant='solid'
                                    color='emerald'
                                    isDisable={aprobando}
                                    onClick={handleActivarContrato}>
                                    {aprobando ? 'Activando...' : 'Activar contrato'}
                                </Button>
                            </div>
                        </Alert>
                    )}
                    {envio.decision === 'rechazado' && (
                        <Alert variant='outline' color='red' icon='HeroXCircle'>
                            <strong>El empleador rechazo el contrato</strong>
                            {envio.motivo_rechazo && <p className='mt-1 text-sm'>Motivo: {envio.motivo_rechazo}</p>}
                        </Alert>
                    )}
                    {envio.decision === 'cambios_solicitados' && (
                        <Alert variant='outline' color='amber' icon='HeroExclamationCircle'>
                            <strong>El empleador solicito cambios</strong>
                            {envio.cambios_solicitados && envio.cambios_solicitados.length > 0 && (
                                <ul className='mt-2 list-inside list-disc text-sm'>
                                    {envio.cambios_solicitados.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            )}
                        </Alert>
                    )}
                </Container>
            )}

            {contrato.usuario_empresa === null && contrato.datos_trabajador_nuevo && (
                <Container className='pb-0 pt-2'>
                    <Alert variant='outline' color='amber' icon='HeroUserCircle'>
                        <strong>Trabajador pendiente de aprobacion</strong>
                        <p className='mt-1 text-sm'>
                            El usuario en el sistema se creara cuando el empleador apruebe este contrato.
                            {contrato.datos_trabajador_nuevo.email && (
                                <> Email registrado: <strong>{contrato.datos_trabajador_nuevo.email}</strong>.</>
                            )}
                        </p>
                    </Alert>
                </Container>
            )}

            <Container className='pb-0'>
                <div className='flex gap-1 border-b border-zinc-200 dark:border-zinc-700'>
                    {TABS.filter((tab) => {
                        if (tab.id === 'finiquito') {
                            return contrato.estado === 'terminado' || contrato.estado === 'anulado';
                        }
                        return true;
                    }).map((tab) => (
                        <button
                            key={tab.id}
                            type='button'
                            onClick={() => setActiveTab(tab.id)}
                            className={[
                                'px-4 py-2 text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'border-b-2 border-blue-500 text-blue-500'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                            ].join(' ')}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Container>

            <ModalCambiarEstadoContrato
                isOpen={modalEstadoOpen}
                estado={estadoDestino}
                onConfirm={handleConfirmarCambioEstado}
                onCancel={() => setModalEstadoOpen(false)}
            />

            <Modal isOpen={modalEnvioOpen} setIsOpen={setModalEnvioOpen}>
                <ModalHeader>
                    {contrato.estado === 'pendiente_aprobacion'
                        ? 'Corregir correo y reenviar aprobación'
                        : 'Enviar contrato para aprobacion'}
                </ModalHeader>
                <ModalBody>
                    <p className='mb-4 text-sm text-zinc-500 dark:text-zinc-400'>
                        {contrato.estado === 'pendiente_aprobacion' ? (
                            'Se generará un nuevo envío de aprobación. El correo anterior quedará obsoleto y solo el nuevo enlace será válido.'
                        ) : (
                            <>
                                Se generara el PDF y se enviara para aprobacion. El contrato pasara a{' '}
                                <strong>Pendiente de aceptacion</strong>.
                            </>
                        )}
                    </p>

                    <button
                        type='button'
                        onClick={() => setEmailMode('empresa')}
                        className={`mb-2 flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                            emailMode === 'empresa'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}>
                        <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                emailMode === 'empresa'
                                    ? 'border-blue-500'
                                    : 'border-zinc-400 dark:border-zinc-600'
                            }`}>
                            {emailMode === 'empresa' && <span className='h-2 w-2 rounded-full bg-blue-500' />}
                        </span>
                        <div className='min-w-0'>
                            <p className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                                Correo de la empresa empleadora
                            </p>
                            {contrato.email_empresa ? (
                                <p className='mt-0.5 truncate text-xs text-blue-600 dark:text-blue-400'>
                                    {contrato.email_empresa}
                                </p>
                            ) : (
                                <p className='mt-0.5 text-xs text-zinc-400'>
                                    No hay correo registrado para esta empresa
                                </p>
                            )}
                        </div>
                    </button>

                    <button
                        type='button'
                        onClick={() => setEmailMode('custom')}
                        className={`flex w-full items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                            emailMode === 'custom'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}>
                        <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                emailMode === 'custom'
                                    ? 'border-blue-500'
                                    : 'border-zinc-400 dark:border-zinc-600'
                            }`}>
                            {emailMode === 'custom' && <span className='h-2 w-2 rounded-full bg-blue-500' />}
                        </span>
                        <p className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
                            Ingresar correo manualmente
                        </p>
                    </button>

                    {emailMode === 'custom' && (
                        <div className='mt-3'>
                            <Label htmlFor='email-empleador'>Correo del empleador</Label>
                            <Input
                                id='email-empleador'
                                name='email-empleador'
                                type='email'
                                placeholder='empleador@empresa.com'
                                value={emailEmpleador}
                                onChange={(e) => setEmailEmpleador(e.target.value)}
                            />
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => setModalEnvioOpen(false)}>Cancelar</Button>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroEnvelope'
                        isDisable={enviandoAprobacion}
                        onClick={handleEnviarAprobacion}>
                        {enviandoAprobacion
                            ? 'Enviando...'
                            : contrato.estado === 'pendiente_aprobacion'
                              ? 'Reenviar'
                              : 'Enviar'}
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={modalCopiaOpen} setIsOpen={setModalCopiaOpen}>
                <ModalHeader>Crear copia del contrato</ModalHeader>
                <ModalBody>
                    <div className='mb-4'>
                        <Label htmlFor='nombre-copia'>Nombre del nuevo contrato</Label>
                        <Input
                            id='nombre-copia'
                            name='nombre-copia'
                            type='text'
                            placeholder='Ej: Contrato renovado 2025'
                            value={nombreCopia}
                            onChange={(e) => setNombreCopia(e.target.value)}
                        />
                    </div>
                    <Alert variant='outline' color='amber' icon='HeroExclamationTriangle'>
                        <ul className='space-y-1 text-sm'>
                            <li>
                                El nuevo contrato se creará en estado <strong>Borrador</strong> y deberá revisarse antes de enviarlo al empleador.
                            </li>
                            <li>
                                Los documentos PDF y firmas previas <strong>no se copian</strong>.
                            </li>
                            <li>
                                El sueldo líquido calculado <strong>no se copia</strong> (deberá recalcularse).
                            </li>
                            <li>
                                Los anexos del contrato original <strong>no se copian</strong>.
                            </li>
                        </ul>
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={() => setModalCopiaOpen(false)}>Cancelar</Button>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroDocumentDuplicate'
                        isDisable={creandoCopia || !nombreCopia.trim()}
                        onClick={handleCrearCopia}>
                        {creandoCopia ? 'Creando...' : 'Crear copia'}
                    </Button>
                </ModalFooter>
            </Modal>

            <Container>
                {activeTab === 'datos' && <TabDatosLaboralesTrabajador contrato={contrato} />}
                {activeTab === 'trabajador' && <TabTrabajadorTrabajador contrato={contrato} />}
                {activeTab === 'sueldo' && <TabRemuneracionesTrabajador contrato={contrato} />}
                {activeTab === 'prevision' && <TabPrevisionTrabajador contrato={contrato} />}
                {activeTab === 'banco' && <TabBancoTrabajador contrato={contrato} />}
                {activeTab === 'documento' && <TabDocumentoTrabajador contrato={contrato} />}
                {activeTab === 'anexos' && <TabAnexosTrabajador contrato={contrato} />}
                {activeTab === 'historial' && <TabHistorialTrabajador contratoId={contrato.id} />}
                {activeTab === 'finiquito' && <TabFiniquitoTrabajador contrato={contrato} />}
            </Container>
        </PageWrapper>
    );
};

export default DetalleContratoTrabajador;
