import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetAfpCatalogoQuery } from '@/store/slices/rrhh/catalogosRrhhApi';
import { useActualizarDatosRelacionadosContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { SISTEMA_SALUD_OPTIONS } from './types';

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
                        <div>
                            <Label htmlFor='m_sistema_salud'>Sistema de salud</Label>
                            <SelectReact
                                id='m_sistema_salud'
                                name='sistema_salud'
                                isClearable
                                options={SISTEMA_SALUD_OPTIONS}
                                value={
                                    SISTEMA_SALUD_OPTIONS.find(
                                        (o) => o.value === formik.values.sistema_salud,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'sistema_salud',
                                        (opt as TSelectOption)?.value ?? '',
                                    )
                                }
                                placeholder='Fonasa / Isapre...'
                            />
                        </div>
                        {formik.values.sistema_salud === 'isapre' && (
                            <div>
                                <Label htmlFor='m_nombre_isapre'>Nombre Isapre</Label>
                                <Input
                                    id='m_nombre_isapre'
                                    name='nombre_isapre'
                                    value={formik.values.nombre_isapre}
                                    onChange={formik.handleChange}
                                    placeholder='Banmédica, Cruz Blanca...'
                                />
                            </div>
                        )}
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
        </>
    );
};

export default TabPrevisionTrabajador;
