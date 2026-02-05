import Checkbox from '@/components/form/Checkbox';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import { TIcons } from '@/types/icons.type';
import classNames from 'classnames';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

// Configuración de widgets disponibles
interface WidgetOption {
    key: string;
    label: string;
    description: string;
    icon: TIcons;
    color: string;
}

const widgetOptions: WidgetOption[] = [
    {
        key: 'indicadores_economicos',
        label: 'Indicadores Económicos',
        description: 'Muestra el valor del dólar y UF',
        icon: 'HeroCurrencyDollar',
        color: 'sky',
    },
    {
        key: 'ot',
        label: 'Órdenes de Trabajo',
        description: 'Métricas y estado de OTs',
        icon: 'HeroWrenchScrewdriver',
        color: 'blue',
    },
    {
        key: 'cotizaciones',
        label: 'Cotizaciones',
        description: 'Resumen de cotizaciones',
        icon: 'HeroDocumentText',
        color: 'emerald',
    },
    {
        key: 'rendiciones',
        label: 'Rendiciones',
        description: 'Gastos pendientes y aprobados',
        icon: 'HeroReceiptPercent',
        color: 'purple',
    },
    {
        key: 'actualizaciones_oc',
        label: 'Bodegas e Inventario',
        description: 'Órdenes de compra y stock',
        icon: 'HeroCube',
        color: 'amber',
    },
    {
        key: 'contratos',
        label: 'Contratos',
        description: 'Estado de contratos activos',
        icon: 'HeroDocumentCheck',
        color: 'sky',
    },
    {
        key: 'vacaciones',
        label: 'Vacaciones',
        description: 'Solicitudes y ausencias',
        icon: 'HeroCalendarDays',
        color: 'rose',
    },
    {
        key: 'ultimos_eventos',
        label: 'Actividad Reciente',
        description: 'Timeline de últimos eventos',
        icon: 'HeroClock',
        color: 'zinc',
    },
];

const colorClasses: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-500' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-500' },
    rose: { bg: 'bg-rose-500/10', icon: 'text-rose-500' },
    sky: { bg: 'bg-sky-500/10', icon: 'text-sky-500' },
    zinc: { bg: 'bg-zinc-500/10', icon: 'text-zinc-500' },
};

function EditarDashboardPreferences() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario, access } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            indicadores_economicos: true,
            ot: true,
            cotizaciones: true,
            rendiciones: true,
            actualizaciones_oc: true,
            contratos: true,
            vacaciones: true,
            ultimos_eventos: true,
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        dashboard_preferences: values,
                    }),
                });
                if (response.data) {
                    toast.success('Preferencias guardadas', { autoClose: 1000 });
                    dispatch(obtenerPersonalizacionThunk());
                    setIsOpen(false);
                }
            } catch (error: any) {
                toast.error(error.response?.data || 'Error al guardar');
            }
        },
    });

    useEffect(() => {
        if (isOpen) {
            dispatch(obtenerPersonalizacionThunk());
        }
    }, [isOpen]);

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.dashboard_preferences) {
            Object.entries(personalizacionUsuario.dashboard_preferences).forEach(([key, value]) => {
                formik.setFieldValue(key, value);
            });
        }
    }, [personalizacionUsuario]);

    return (
        <>
            <Tooltip text='Configurar Dashboard'>
                <Button
                    variant='outline'
                    color='zinc'
                    onClick={() => setIsOpen(true)}
                    icon='HeroCog6Tooth'
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
                <ModalHeader>
                    <div className='flex items-center gap-2'>
                        <Icon icon='HeroAdjustmentsHorizontal' className='text-xl text-blue-500' />
                        <Badge className='text-xl'>Configurar Dashboard</Badge>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <p className='mb-4 text-sm text-zinc-500'>
                        Selecciona los widgets que deseas ver en tu dashboard
                    </p>
                    <div className='grid gap-3 sm:grid-cols-2'>
                        {widgetOptions.map((widget) => {
                            const isChecked =
                                formik.values[widget.key as keyof typeof formik.values];
                            const colors = colorClasses[widget.color] || colorClasses.zinc;

                            return (
                                <Card
                                    key={widget.key}
                                    className={classNames(
                                        'cursor-pointer transition-all',
                                        isChecked
                                            ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-900'
                                            : 'opacity-60 hover:opacity-100',
                                    )}
                                    onClick={() =>
                                        formik.setFieldValue(widget.key, !isChecked)
                                    }>
                                    <CardBody className='flex items-center gap-3 p-3'>
                                        <div
                                            className={classNames(
                                                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                                                colors.bg,
                                            )}>
                                            <Icon
                                                icon={widget.icon}
                                                className={classNames('text-xl', colors.icon)}
                                            />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <p className='font-medium text-zinc-900 dark:text-white'>
                                                {widget.label}
                                            </p>
                                            <p className='text-xs text-zinc-500 truncate'>
                                                {widget.description}
                                            </p>
                                        </div>
                                        <Checkbox
                                            variant='switch'
                                            checked={isChecked}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                formik.setFieldValue(widget.key, e.target.checked);
                                            }}
                                        />
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button
                            variant='outline'
                            color='zinc'
                            onClick={() => {
                                // Seleccionar todos
                                widgetOptions.forEach((w) => formik.setFieldValue(w.key, true));
                            }}>
                            Seleccionar todos
                        </Button>
                    </ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' variant='outline' onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant='solid' onClick={() => formik.handleSubmit()}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default EditarDashboardPreferences;
