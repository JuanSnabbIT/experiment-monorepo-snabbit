import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import {
    useCrearBancoInlineMutation,
    useGetBancoCatalogoQuery,
} from '@/store/slices/rrhh/catalogosRrhhApi';
import { useActualizarDatosRelacionadosContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { TIPO_CUENTA_OPTIONS } from './types';

interface Props {
    contrato: IContratoTrabajador;
}

const CUENTA_LABEL: Record<string, string> = {
    corriente: 'Cuenta corriente',
    vista: 'Cuenta vista',
    ahorro: 'Cuenta de ahorro',
    rut: 'Cuenta RUT',
};

const Campo = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

const TabBancoTrabajador = ({ contrato }: Props) => {
    const prev = contrato.datos_previsionales_trabajador;
    const dtn = contrato.datos_trabajador_nuevo;
    const esBorrador = contrato.estado === 'borrador';
    const [modalOpen, setModalOpen] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const { data: bancoList = [] } = useGetBancoCatalogoQuery(undefined, { skip: !modalOpen });
    const [crearBanco] = useCrearBancoInlineMutation();
    const [actualizarDatos] = useActualizarDatosRelacionadosContratoMutation();

    const banco = prev?.banco ?? dtn?.banco ?? null;
    const tipoCuenta = prev?.tipo_cuenta_bancaria ?? dtn?.tipo_cuenta_bancaria ?? null;
    const numeroCuenta = prev?.numero_cuenta_bancaria ?? dtn?.numero_cuenta_bancaria ?? null;

    const bancoOptions: TSelectOption[] = bancoList.map((b) => ({
        value: b.nombre,
        label: b.nombre,
    }));

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            banco: banco ?? '',
            tipo_cuenta_bancaria: tipoCuenta ?? '',
            numero_cuenta_bancaria: numeroCuenta ?? '',
        },
        onSubmit: async (values) => {
            setGuardando(true);
            try {
                const payload: Record<string, unknown> = {};
                if (values.banco) payload.banco = values.banco;
                if (values.tipo_cuenta_bancaria)
                    payload.tipo_cuenta_bancaria = values.tipo_cuenta_bancaria;
                if (values.numero_cuenta_bancaria)
                    payload.numero_cuenta_bancaria = values.numero_cuenta_bancaria;
                await actualizarDatos({ id: contrato.id, data: payload }).unwrap();
                toast.success('Datos bancarios actualizados');
                setModalOpen(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            } finally {
                setGuardando(false);
            }
        },
    });

    const handleCrearBanco = async (nombre: string) => {
        try {
            await crearBanco({ nombre }).unwrap();
        } catch {
            // igual asignamos el valor
        }
        formik.setFieldValue('banco', nombre);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <span>Datos Bancarios</span>
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
                    {banco || tipoCuenta || numeroCuenta ? (
                        <div className='space-y-3'>
                            {banco && (
                                <div className='flex items-center gap-3'>
                                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700'>
                                        <Icon
                                            icon='HeroBuildingOffice'
                                            className='text-sm text-zinc-500 dark:text-zinc-400'
                                        />
                                    </div>
                                    <Campo label='Banco' value={banco} />
                                </div>
                            )}
                            {tipoCuenta && (
                                <div className='flex items-center gap-3'>
                                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700'>
                                        <Icon
                                            icon='HeroCreditCard'
                                            className='text-sm text-zinc-500 dark:text-zinc-400'
                                        />
                                    </div>
                                    <Campo
                                        label='Tipo de cuenta'
                                        value={CUENTA_LABEL[tipoCuenta] ?? tipoCuenta}
                                    />
                                </div>
                            )}
                            {numeroCuenta && (
                                <div className='flex items-center gap-3'>
                                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700'>
                                        <Icon
                                            icon='HeroHashtag'
                                            className='text-sm text-zinc-500 dark:text-zinc-400'
                                        />
                                    </div>
                                    <div>
                                        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                            N° de cuenta
                                        </p>
                                        <p className='mt-1 font-mono text-sm font-medium tracking-wider text-zinc-800 dark:text-zinc-100'>
                                            {numeroCuenta}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className='text-sm text-zinc-400 dark:text-zinc-500'>
                            Sin datos bancarios registrados.
                        </p>
                    )}
                </CardBody>
            </Card>

            <Modal isOpen={modalOpen} setIsOpen={setModalOpen}>
                <ModalHeader>Editar datos bancarios</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                            <Label htmlFor='m_banco'>Banco</Label>
                            <SelectReact
                                id='m_banco'
                                name='banco'
                                isCreatable
                                isClearable
                                options={bancoOptions}
                                value={
                                    formik.values.banco
                                        ? {
                                              value: formik.values.banco,
                                              label: formik.values.banco,
                                          }
                                        : null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue('banco', (opt as TSelectOption)?.value ?? '')
                                }
                                onCreateOption={handleCrearBanco}
                                formatCreateLabel={(v) => `Agregar banco: "${v}"`}
                                placeholder='Selecciona o escribe banco...'
                            />
                        </div>
                        <div>
                            <Label htmlFor='m_tipo_cuenta'>Tipo de cuenta</Label>
                            <SelectReact
                                id='m_tipo_cuenta'
                                name='tipo_cuenta_bancaria'
                                isClearable
                                options={TIPO_CUENTA_OPTIONS}
                                value={
                                    TIPO_CUENTA_OPTIONS.find(
                                        (o) => o.value === formik.values.tipo_cuenta_bancaria,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'tipo_cuenta_bancaria',
                                        (opt as TSelectOption)?.value ?? '',
                                    )
                                }
                                placeholder='Tipo...'
                            />
                        </div>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='m_numero_cuenta'>Número de cuenta</Label>
                            <Input
                                id='m_numero_cuenta'
                                name='numero_cuenta_bancaria'
                                value={formik.values.numero_cuenta_bancaria}
                                onChange={formik.handleChange}
                                placeholder='00000000'
                            />
                        </div>
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

export default TabBancoTrabajador;
