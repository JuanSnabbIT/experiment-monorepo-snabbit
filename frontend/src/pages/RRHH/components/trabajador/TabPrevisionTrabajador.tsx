import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetAfpCatalogoQuery } from '@/store/slices/rrhh/catalogosRrhhApi';
import { useActualizarDatosRelacionadosContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import SelectorSistemaSalud from './SelectorSistemaSalud';
import { confirmarConsultaAfpLegal, useConsultaAfp } from './useConsultaAfp';

interface Props {
    contrato: IContratoTrabajador;
}

const Campo = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

const TabPrevisionTrabajador = ({ contrato }: Props) => {
    const prev = contrato.datos_previsionales_trabajador;
    const dtn = contrato.datos_trabajador_nuevo;
    const esBorrador = contrato.estado === 'borrador';
    const [modalOpen, setModalOpen] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Modal informativo de consulta de afiliación (spensiones.cl).
    const [modalAfpOpen, setModalAfpOpen] = useState(false);
    const rutTrabajador = (contrato.rut_trabajador ?? dtn?.rut ?? '').trim();
    const { consultar, afiliacion, isConsultando, error: errorAfp } = useConsultaAfp();

    // Al abrir el modal, disparar la consulta automáticamente si hay RUT.
    useEffect(() => {
        if (modalAfpOpen && rutTrabajador) {
            consultar(rutTrabajador);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalAfpOpen]);

    const { data: afpList = [] } = useGetAfpCatalogoQuery(undefined, { skip: !modalOpen });
    const [actualizarDatos] = useActualizarDatosRelacionadosContratoMutation();

    const afpNombre = prev?.afp ?? dtn?.afp ?? null;
    const afpId = prev?.afp_id ?? null;
    const sistemaSalud = prev?.sistema_salud ?? dtn?.sistema_salud ?? null;
    const nombreIsapre = prev?.nombre_isapre ?? dtn?.nombre_isapre ?? null;

    const afpOptions: TSelectOption[] = afpList.map((a) => ({
        value: String(a.id),
        label: a.nombre,
    }));

    const saludLabel =
        sistemaSalud === 'fonasa'
            ? 'Fonasa'
            : sistemaSalud === 'isapre'
              ? `Isapre${nombreIsapre ? ` — ${nombreIsapre}` : ''}`
              : sistemaSalud === 'otro'
                ? 'Otro sistema de salud'
                : null;

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            afp: afpId ? String(afpId) : '',
            sistema_salud: sistemaSalud ?? '',
            nombre_isapre: nombreIsapre ?? '',
        },
        onSubmit: async (values) => {
            setGuardando(true);
            try {
                const payload: Record<string, unknown> = {};
                if (values.afp) payload.afp = Number(values.afp);
                payload.sistema_salud = values.sistema_salud || null;
                payload.nombre_isapre =
                    values.sistema_salud === 'isapre' ? values.nombre_isapre || null : null;
                await actualizarDatos({ id: contrato.id, data: payload }).unwrap();
                toast.success('Datos previsionales actualizados');
                setModalOpen(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            } finally {
                setGuardando(false);
            }
        },
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <span>Previsión y Salud</span>
                    {esBorrador && (
                        <Tooltip text='Editar'>
                            <Button
                                variant='solid'
                                icon='HeroPencil'
                                size='sm'
                                onClick={() => setModalOpen(true)}
                            />
                        </Tooltip>
                    )}
                </CardHeader>
                <CardBody>
                    {afpNombre || saludLabel ? (
                        <div className='space-y-3'>
                            {afpNombre && (
                                <div className='flex items-center gap-3'>
                                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700'>
                                        <Icon
                                            icon='HeroBuildingLibrary'
                                            className='text-sm text-zinc-500 dark:text-zinc-400'
                                        />
                                    </div>
                                    <Campo label='AFP' value={afpNombre} />
                                </div>
                            )}
                            {saludLabel && (
                                <div className='flex items-center gap-3'>
                                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20'>
                                        <Icon
                                            icon='HeroHeart'
                                            className='text-sm text-red-400 dark:text-red-500'
                                        />
                                    </div>
                                    <Campo label='Sistema de salud' value={saludLabel} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className='text-sm text-zinc-400 dark:text-zinc-500'>
                            Sin datos previsionales registrados.
                        </p>
                    )}
                    <div className='mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800'>
                        <Button
                            type='button'
                            variant='plain'
                            color='blue'
                            size='sm'
                            icon='HeroMagnifyingGlass'
                            isDisable={!rutTrabajador}
                            onClick={async () => {
                                if (await confirmarConsultaAfpLegal()) setModalAfpOpen(true);
                            }}>
                            Consultar Afiliación
                        </Button>
                        {!rutTrabajador && (
                            <p className='mt-1 text-xs text-zinc-400'>
                                El trabajador no tiene RUT registrado.
                            </p>
                        )}
                    </div>
                </CardBody>
            </Card>

            <Modal isOpen={modalOpen} setIsOpen={setModalOpen}>
                <ModalHeader>Editar previsión y salud</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='m_afp'>AFP</Label>
                            <SelectReact
                                id='m_afp'
                                name='afp'
                                isClearable
                                options={afpOptions}
                                value={
                                    afpOptions.find((o) => o.value === formik.values.afp) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue('afp', (opt as TSelectOption)?.value ?? '')
                                }
                                placeholder='Selecciona AFP...'
                            />
                        </div>
                        <SelectorSistemaSalud
                            idPrefix='m'
                            sistemaSalud={formik.values.sistema_salud}
                            nombreIsapre={formik.values.nombre_isapre}
                            onChangeSistemaSalud={(val) => formik.setFieldValue('sistema_salud', val)}
                            onChangeNombreIsapre={(val) => formik.setFieldValue('nombre_isapre', val)}
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        type='button'
                        onClick={() => setModalOpen(false)}
                        isDisable={guardando}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        type='button'
                        onClick={() => formik.handleSubmit()}
                        isLoading={guardando}>
                        Guardar cambios
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal informativo de consulta de afiliación (spensiones.cl) */}
            <Modal isOpen={modalAfpOpen} setIsOpen={setModalAfpOpen}>
                <ModalHeader>Consulta de afiliación AFP / AFC</ModalHeader>
                <ModalBody>
                    {isConsultando ? (
                        <div className='flex flex-col items-center gap-3 py-8 text-zinc-500'>
                            <Icon icon='HeroArrowPath' className='animate-spin text-2xl' />
                            <p className='text-sm'>Consultando en spensiones.cl...</p>
                        </div>
                    ) : errorAfp ? (
                        <Alert color='red' variant='outline' icon='HeroExclamationTriangle'>
                            {errorAfp}
                        </Alert>
                    ) : afiliacion ? (
                        <div className='space-y-4'>
                            {afiliacion.afc_afiliado && (
                                <Badge color='emerald' variant='outline'>
                                    Afiliado a AFC
                                </Badge>
                            )}
                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                <Campo label='Nombre completo' value={afiliacion.nombre_completo} />
                                <Campo label='RUT' value={afiliacion.rut} />
                                <Campo label='AFP' value={afiliacion.afp_nombre} />
                                <Campo
                                    label='Afiliación AFP'
                                    value={afiliacion.afp_fecha_afiliacion}
                                />
                                <Campo
                                    label='Afiliación AFC'
                                    value={afiliacion.afc_fecha_afiliacion}
                                />
                                <Campo
                                    label='Última consulta'
                                    value={new Date(afiliacion.consultado_en).toLocaleString('es-CL')}
                                />
                            </div>
                            <Alert color='zinc' variant='outline' className='text-xs leading-relaxed'>
                                Datos de afiliación AFP actualizados al último día hábil del mes de{' '}
                                {afiliacion.afp_datos_al_mes ?? '—'}
                                {afiliacion.afc_datos_al_mes
                                    ? ` y AFC a ${afiliacion.afc_datos_al_mes}`
                                    : ''}
                                , de acuerdo con la información proporcionada a esta Superintendencia
                                por las AFP. Fuente: spensiones.cl.
                            </Alert>
                        </div>
                    ) : (
                        <p className='py-6 text-center text-sm text-zinc-400'>
                            Sin datos de afiliación.
                        </p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        type='button'
                        variant='default'
                        onClick={() => setModalAfpOpen(false)}>
                        Cerrar
                    </Button>
                    <Button
                        type='button'
                        variant='solid'
                        color='blue'
                        icon='HeroArrowPath'
                        isLoading={isConsultando}
                        isDisable={isConsultando || !rutTrabajador}
                        onClick={() => consultar(rutTrabajador, true)}>
                        Actualizar Consulta
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default TabPrevisionTrabajador;
