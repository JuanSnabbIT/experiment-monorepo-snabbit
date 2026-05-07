import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { useDeletePlanServicioMutation, useGetPlanServicioQuery } from '@/store/slices/contratos/contratoApi';
import { formatCurrency } from '@/utils/currency';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModalPlanServicio from './modals/ModalPlanServicio';

const formatPriceLabel = (
    currency: 'CLP' | 'UF' | 'USD',
    value?: string | number | null,
) => {
    const numeric = Number(value || 0);

    if (numeric <= 0) {
        return '-';
    }

    return formatCurrency(numeric, currency);
};

const DetallePlanServicio = () => {
    const navigate = useNavigate();
    const { planId } = useParams<{ planId: string }>();
    const [editOpen, setEditOpen] = useState(false);
    const [disabledCaracteristicas, setDisabledCaracteristicas] = useState<string[]>([]);
    const [expandedServicios, setExpandedServicios] = useState<number[]>([]);

    const { data: plan, isLoading, isError } = useGetPlanServicioQuery(planId ?? '', {
        skip: !planId,
    });
    const [deletePlan] = useDeletePlanServicioMutation();

    const handleDelete = async () => {
        if (!plan) return;
        const confirmado = await confirmAlert({
            title: 'Eliminar plan',
            text: `Eliminarás el plan "${plan.nombre}". Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
        });
        if (!confirmado) return;

        try {
            await deletePlan(plan.id).unwrap();
            toast.success('Plan eliminado');
            navigate('/registros/planes-y-servicios?tab=planes');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const toggleCaracteristicaDisabled = (serviceId: number, itemId: number) => {
        const key = `${serviceId}-${itemId}`;
        setDisabledCaracteristicas((current) =>
            current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
        );
    };

    const toggleServicioExpanded = (serviceId: number) => {
        setExpandedServicios((current) =>
            current.includes(serviceId) ? current.filter((item) => item !== serviceId) : [...current, serviceId],
        );
    };

    const isCaracteristicaDisabled = (serviceId: number, itemId: number) =>
        disabledCaracteristicas.includes(`${serviceId}-${itemId}`);

    const isServicioExpanded = (serviceId: number) => expandedServicios.includes(serviceId);

    if (isLoading) {
        return (
            <PageWrapper>
                <Container className='h-full w-full'>
                    <Card className='border border-zinc-200 dark:border-zinc-800'>
                        <CardBody>
                            <div className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
                                <div className='h-12 w-12 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500' />
                                <div>
                                    <p className='font-medium text-zinc-700 dark:text-zinc-300'>
                                        Cargando detalle del plan...
                                    </p>
                                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                                        Un momento mientras obtenemos la información del plan.
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    if (isError || !plan) {
        return (
            <PageWrapper>
                <Container className='h-full w-full'>
                    <Alert color='red'>No se pudo cargar el detalle del plan.</Alert>
                </Container>
            </PageWrapper>
        );
    }

    const primaryPrice = plan.tipo_moneda
        ? formatPriceLabel(plan.tipo_moneda as 'CLP' | 'UF' | 'USD', plan.precio)
        : 'Sin precio';
    const scopeCount = (plan.alcance_heredado?.length || 0) + (plan.alcance_conflictos?.length || 0);

    return (
        <PageWrapper isProtectedRoute name='Detalle Plan de Servicio' title='Detalle Plan de Servicio'>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate('/registros/planes-y-servicios?tab=planes')}>
                        Volver
                    </Button>
                    <div>
                        <h1 className='text-xl font-bold'>{plan.nombre}</h1>
                        <p className='text-sm text-zinc-500'>Plan de Servicio</p>
                    </div>
                </SubheaderLeft>
                <SubheaderRight>
                    <Badge color={plan.activo ? 'emerald' : 'zinc'}>
                        {plan.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button icon='HeroPencil' variant='solid' onClick={() => setEditOpen(true)}>
                        Editar
                    </Button>
                    <Button icon='HeroTrash' color='red' onClick={handleDelete}>
                        Eliminar
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='grid gap-4 xl:grid-cols-[2fr_1fr]'>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div>
                                    <div className='text-base font-semibold'>Resumen del plan</div>
                                    <div className='text-sm text-zinc-500'>Información principal para este plan de servicio.</div>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='grid gap-4'>
                                <div className='grid gap-4 sm:grid-cols-3'>
                                    <div>
                                        <p className='text-sm text-zinc-500'>Precio</p>
                                        <p className='mt-1 text-lg font-semibold'>{primaryPrice}</p>
                                    </div>
                                    <div>
                                        <p className='text-sm text-zinc-500'>Visitas mensuales</p>
                                        <p className='mt-1 text-lg font-semibold'>
                                            {plan.num_visitas_mensuales != null
                                                ? `${plan.num_visitas_mensuales} / mes`
                                                : 'No aplica'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className='text-sm text-zinc-500'>Versión</p>
                                        <p className='mt-1 text-lg font-semibold'>{plan.version ?? '—'}</p>
                                    </div>
                                </div>

                                {plan.formas_pago_permitidas && plan.formas_pago_permitidas.length > 0 && (
                                    <div>
                                        <p className='text-sm text-zinc-500'>Formas de pago</p>
                                        <div className='mt-1 flex flex-wrap gap-1'>
                                            {plan.formas_pago_permitidas.map((fp) => (
                                                <Badge key={fp} color='blue' variant='outline'>{fp}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(plan.bloqueado_por_uso || plan.requiere_nueva_version) && (
                                    <div className='flex flex-wrap gap-2'>
                                        {plan.bloqueado_por_uso && (
                                            <Badge color='red'>Bloqueado por uso</Badge>
                                        )}
                                        {plan.requiere_nueva_version && (
                                            <Badge color='amber'>Requiere nueva versión</Badge>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <p className='text-sm text-zinc-500'>Descripción</p>
                                    <p className='mt-2 whitespace-pre-line text-sm leading-6'>
                                        {plan.descripcion || 'Sin descripción'}
                                    </p>
                                </div>

                                {plan.clausulas_especiales && (
                                    <div>
                                        <p className='text-sm text-zinc-500'>Cláusulas especiales</p>
                                        <p className='mt-2 whitespace-pre-line text-sm leading-6'>
                                            {plan.clausulas_especiales}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div>
                                    <div className='text-base font-semibold'>Servicios y alcance</div>
                                    <div className='text-sm text-zinc-500'>
                                        Ver los servicios del plan con sus características de incluye / no incluye.
                                    </div>
                                </div>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            {plan.servicios.length > 0 ? (
                                <div className='space-y-4'>
                                    {plan.servicios.map((service) => {
                                        const alcanceItems = service.alcance_caracteristicas || [];
                                        const incluyeItems = alcanceItems.filter((item) => item.modo === 'incluye');
                                        const noIncluyeItems = alcanceItems.filter((item) => item.modo === 'no_incluye');

                                        return (
                                            <div
                                                key={service.id}
                                                className='rounded-xl border border-zinc-200 p-4 dark:border-zinc-800'>
                                                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                                    <div className='min-w-0'>
                                                        <div className='text-base font-semibold'>
                                                            {service.nombre}
                                                        </div>
                                                        {service.categoria_label && (
                                                            <div className='text-sm text-zinc-500'>
                                                                {service.categoria_label}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <div className='text-sm text-zinc-500'>
                                                            {incluyeItems.length} incluye · {noIncluyeItems.length} no incluye
                                                        </div>
                                                        <Badge color={service.activo ? 'emerald' : 'zinc'}>
                                                            {service.activo ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            icon={isServicioExpanded(service.id) ? 'HeroChevronUp' : 'HeroChevronDown'}
                                                            onClick={() => toggleServicioExpanded(service.id)}>
                                                            {isServicioExpanded(service.id) ? 'Ocultar' : 'Ver detalles'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {isServicioExpanded(service.id) && (
                                                    <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                                                    <div>
                                                        <div className='mb-3 flex items-center gap-2'>
                                                            <Badge color='blue' variant='outline'>Incluye</Badge>
                                                            <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                                                                {incluyeItems.length} característica{incluyeItems.length === 1 ? '' : 's'}
                                                            </span>
                                                        </div>
                                                        {incluyeItems.length > 0 ? (
                                                            <div className='space-y-3'>
                                                                {incluyeItems.map((item) => {
                                                                    const disabled = isCaracteristicaDisabled(service.id, item.id);
                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            className={`rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition ${
                                                                                disabled
                                                                                    ? 'opacity-70 dark:border-zinc-700 dark:bg-zinc-900'
                                                                                    : 'dark:border-zinc-800 dark:bg-zinc-950'
                                                                            }`}>
                                                                            <div className='flex items-start justify-between gap-3'>
                                                                                <div className='min-w-0'>
                                                                                    <div className={`text-sm font-medium ${
                                                                                        disabled
                                                                                            ? 'text-zinc-500 dark:text-zinc-500'
                                                                                            : 'text-zinc-900 dark:text-zinc-100'
                                                                                    }`}>
                                                                                        {item.caracteristica.nombre}
                                                                                    </div>
                                                                                    {item.caracteristica.descripcion && (
                                                                                        <div className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                                            {item.caracteristica.descripcion}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <Button
                                                                                    size='sm'
                                                                                    variant='outline'
                                                                                    color={disabled ? 'blue' : 'zinc'}
                                                                                    icon={disabled ? 'HeroEye' : 'HeroEyeSlash'}
                                                                                    onClick={() => toggleCaracteristicaDisabled(service.id, item.id)}>
                                                                                    {disabled ? 'Restaurar' : 'Quitar'}
                                                                                </Button>
                                                                            </div>
                                                                            {disabled && (
                                                                                <div className='mt-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400'>Deshabilitada para este plan</div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className='rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400'>
                                                                No hay características de alcance definidas para este servicio.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className='mb-3 flex items-center gap-2'>
                                                            <Badge color='amber' variant='outline'>No incluye</Badge>
                                                            <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                                                                {noIncluyeItems.length} característica{noIncluyeItems.length === 1 ? '' : 's'}
                                                            </span>
                                                        </div>
                                                        {noIncluyeItems.length > 0 ? (
                                                            <div className='space-y-3'>
                                                                {noIncluyeItems.map((item) => {
                                                                    const disabled = isCaracteristicaDisabled(service.id, item.id);
                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            className={`rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition ${
                                                                                disabled
                                                                                    ? 'opacity-70 dark:border-zinc-700 dark:bg-zinc-900'
                                                                                    : 'dark:border-zinc-800 dark:bg-zinc-950'
                                                                            }`}>
                                                                            <div className='flex items-start justify-between gap-3'>
                                                                                <div className='min-w-0'>
                                                                                    <div className={`text-sm font-medium ${
                                                                                        disabled
                                                                                            ? 'text-zinc-500 dark:text-zinc-500'
                                                                                            : 'text-zinc-900 dark:text-zinc-100'
                                                                                    }`}>
                                                                                        {item.caracteristica.nombre}
                                                                                    </div>
                                                                                    {item.caracteristica.descripcion && (
                                                                                        <div className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                                                                            {item.caracteristica.descripcion}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <Button
                                                                                    size='sm'
                                                                                    variant='outline'
                                                                                    color={disabled ? 'blue' : 'zinc'}
                                                                                    icon={disabled ? 'HeroEye' : 'HeroEyeSlash'}
                                                                                    onClick={() => toggleCaracteristicaDisabled(service.id, item.id)}>
                                                                                    {disabled ? 'Restaurar' : 'Quitar'}
                                                                                </Button>
                                                                            </div>
                                                                            {disabled && (
                                                                                <div className='mt-2 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400'>Deshabilitada para este plan</div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className='rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400'>
                                                                No hay exclusiones definidas para este servicio.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Alert color='zinc'>Este plan no tiene servicios asignados.</Alert>
                            )}
                        </CardBody>
                    </Card>
                </div>

                <div className='space-y-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <div className='text-base font-semibold'>Información</div>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='space-y-3'>
                                <div>
                                    <p className='text-sm text-zinc-500'>Servicios</p>
                                    <p className='mt-1 font-semibold'>{plan.servicios.length}</p>
                                </div>
                                <div>
                                    <p className='text-sm text-zinc-500'>Alcance (características)</p>
                                    <p className='mt-1 font-semibold'>{scopeCount}</p>
                                </div>
                                <div>
                                    <p className='text-sm text-zinc-500'>Creado</p>
                                    <p className='mt-1 text-sm'>
                                        {plan.fecha_creacion
                                            ? new Date(plan.fecha_creacion).toLocaleDateString('es-CL')
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className='text-sm text-zinc-500'>Última modificación</p>
                                    <p className='mt-1 text-sm'>
                                        {plan.fecha_modificacion
                                            ? new Date(plan.fecha_modificacion).toLocaleDateString('es-CL')
                                            : '—'}
                                    </p>
                                </div>
                                {plan.es_vigente != null && (
                                    <div>
                                        <p className='text-sm text-zinc-500'>Vigencia</p>
                                        <Badge color={plan.es_vigente ? 'emerald' : 'zinc'} className='mt-1'>
                                            {plan.es_vigente ? 'Vigente' : 'No vigente'}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>

            <ModalPlanServicio isOpen={editOpen} setIsOpen={setEditOpen} plan={plan} />
        </PageWrapper>
    );
};

export default DetallePlanServicio;
