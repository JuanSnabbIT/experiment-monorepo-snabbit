import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_CONTRATO } from '@/constants/contrato.constant';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import ApiService from '@/services/ApiService';
import { useAppSelector } from '@/store';
import {
    useCreateContratoLicenciaMutation,
    useGetLicenciasCatalogoQuery,
} from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { IContratoEdicion } from '../components/contrato.types';
import ModalLicenciaContrato from './ModalLicenciaContrato';

interface ICrearContratoDelClienteProps {
    detalleCliente?: IRelacionEmpresa;
    /** Control externo: si se define, el modal se abre/cierra desde afuera */
    externalIsOpen?: boolean;
    /** Callback cuando el modal externo debe cerrarse */
    onExternalClose?: () => void;
    /** Si se define, el tipo queda fijo y no es editable en el paso 1 */
    tipoFijo?: string;
    /** Licencias preseleccionadas que se cargan en el paso 2 (no se pueden eliminar) */
    licenciasIniciales?: IContratoEdicion['licencias'];
}

function CrearContratoDelCliente({
    detalleCliente: detalleClienteProp,
    externalIsOpen,
    onExternalClose,
    tipoFijo,
    licenciasIniciales,
}: ICrearContratoDelClienteProps = {}) {
    const navigate = useNavigate();
    const { detalleCliente: detalleClienteStore } = useAppSelector((state) => state.empresa);
    const detalleCliente = detalleClienteProp ?? detalleClienteStore;

    // Si externalIsOpen esta definido, el modal es controlado externamente
    const isControlledExternally = externalIsOpen !== undefined;
    const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
    const isOpen = isControlledExternally ? externalIsOpen : internalIsOpen;

    const [step, setStep] = useState<1 | 2>(1);
    const [modalAddLicencia, setModalAddLicencia] = useState(false);

    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();
    const [createContratoLicencia] = useCreateContratoLicenciaMutation();

    // Formik auxiliar para gestionar licencias pendientes (Paso 2)
    const licFormik = useFormik<IContratoEdicion>({
        initialValues: {
            fecha_inicio: '',
            fecha_fin: null,
            observaciones: null,
            nombre: '',
            eliminar_visitas: [],
            visitas: [],
            eliminar_licencias: [],
            licencias: [],
            eliminar_condiciones: [],
            condiciones_especiales: [],
            eliminar_usuarios: [],
            usuarios_vinculados: [],
        },
        onSubmit: () => {},
    });

    // Cuando el modal se abre y hay licencias iniciales, cargarlas en licFormik
    useEffect(() => {
        if (isOpen && licenciasIniciales && licenciasIniciales.length > 0) {
            licFormik.setFieldValue('licencias', licenciasIniciales);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Cuando el modal se abre y hay tipo fijo, inicializarlo en el formik
    useEffect(() => {
        if (isOpen && tipoFijo) {
            formik.setFieldValue('tipo', tipoFijo);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, tipoFijo]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            fecha_inicio: '',
            fecha_fin: '',
            observaciones: '',
            tipo: tipoFijo ?? '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string()
                .required('Requerido')
                .nonNullable('Requerido')
                .max(100, 'Maximo 100 Caracteres'),
            fecha_inicio: Yup.string().required('Requerido').nonNullable('Requerido'),
            fecha_fin: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
            tipo: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<IContratoEmpresaCliente, string>({
                    url: `/api/contratos/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        ...values,
                        fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                        fecha_fin: values.fecha_fin
                            ? dayjs(values.fecha_fin).format('YYYY-MM-DD')
                            : undefined,
                        empresa_prestadora: detalleCliente?.prestador_servicios,
                        empresa_cliente: detalleCliente?.info_cliente.id,
                    }),
                });
                if (response.data) {
                    const contratoCreado = response.data as { id: number };
                    const totalLicencias = licFormik.values.licencias.length;

                    // Si es tipo licencia, crear las licencias pendientes
                    if (values.tipo === 'licencia' && totalLicencias > 0) {
                        try {
                            const promesas = licFormik.values.licencias.map((lic) =>
                                createContratoLicencia({
                                    contratoId: contratoCreado.id,
                                    data: {
                                        licencia: lic.licencia_id,
                                        tipo_modalidad: lic.tipo_modalidad,
                                        otro_tipo: lic.otro_tipo ?? null,
                                        cantidad: lic.cantidad,
                                        precio_unitario: lic.precio_unitario,
                                        fecha_inicio: lic.fecha_inicio ?? null,
                                        fecha_fin: lic.fecha_fin ?? null,
                                        tipo_moneda: lic.tipo_moneda,
                                    },
                                }).unwrap(),
                            );
                            await Promise.all(promesas);
                            toast.success(
                                `Contrato y ${totalLicencias} licencia${totalLicencias > 1 ? 's' : ''} creadas`,
                                { autoClose: 1500 },
                            );
                        } catch {
                            toast.warning(
                                'Contrato creado, pero hubo errores al guardar algunas licencias',
                            );
                        }
                    } else {
                        toast.success('Contrato creado', { autoClose: 1000 });
                    }

                    handleClose();
                    navigate(
                        `/empresa/detalle-cliente/${detalleCliente?.id}/contrato/${contratoCreado.id}`,
                    );
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    const handleClose = () => {
        if (isControlledExternally) {
            onExternalClose?.();
        } else {
            setInternalIsOpen(false);
        }
        setStep(1);
        formik.resetForm();
        licFormik.resetForm();
    };

    const handleSiguiente = async () => {
        const errors = await formik.validateForm();
        formik.setTouched(
            Object.keys(formik.values).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
        );
        if (Object.keys(errors).length === 0) {
            setStep(2);
        }
    };

    const getLicenciaNombre = (licId?: number) =>
        listaLicencias.find((l) => l.id === licId)?.nombre ?? '';

    /** Verifica si una licencia es de las iniciales (no se puede eliminar) */
    const esLicenciaInicial = (index: number): boolean => {
        if (!licenciasIniciales || licenciasIniciales.length === 0) return false;
        const lic = licFormik.values.licencias[index];
        return licenciasIniciales.some(
            (ini) => ini.licencia_id === lic.licencia_id,
        );
    };

    return (
        <>
            {/* Boton trigger: solo se muestra si no hay control externo */}
            {!isControlledExternally && (
                <Tooltip text='Crear Contrato'>
                    <Button
                        variant='solid'
                        onClick={() => {
                            setInternalIsOpen(true);
                        }}>
                        Crear
                    </Button>
                </Tooltip>
            )}

            <Modal
                isOpen={isOpen}
                setIsOpen={(val) => {
                    if (!val) handleClose();
                }}
                size='md'>
                <ModalHeader>
                    <Badge className='text-xl'>
                        {step === 1 ? 'Crear Contrato' : 'Licencias del contrato'}
                    </Badge>
                </ModalHeader>
                <ModalBody>
                    {step === 1 ? (
                        // Paso 1: datos del contrato
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Badge>Nombre</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.nombre}
                                    invalidFeedback={formik.errors.nombre}>
                                    <Input
                                        name='nombre'
                                        onChange={formik.handleChange}
                                        value={formik.values.nombre}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Tipo</Badge>
                                {tipoFijo ? (
                                    // Tipo fijo: mostrar como badge, no editable
                                    <div className='mt-1'>
                                        <Badge variant='solid' color='blue'>
                                            {TIPO_CONTRATO.find((t) => t.value === tipoFijo)
                                                ?.label ?? tipoFijo}
                                        </Badge>
                                    </div>
                                ) : (
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.tipo}
                                        invalidFeedback={formik.errors.tipo}>
                                        <SelectReact
                                            name='tipo'
                                            options={TIPO_CONTRATO}
                                            value={TIPO_CONTRATO.find(
                                                (con) => con.value === formik.values.tipo,
                                            )}
                                            onChange={(e) => {
                                                formik.setFieldValue(
                                                    'tipo',
                                                    (e as TSelectOption).value,
                                                );
                                            }}
                                            placeholder={'Seleccione un Tipo'}
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        />
                                    </Validation>
                                )}
                            </div>
                            <div>
                                <Badge>Fecha de Inicio</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_inicio}
                                    invalidFeedback={formik.errors.fecha_inicio}>
                                    <Input
                                        name='fecha_inicio'
                                        type='date'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_inicio}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div>
                                <Badge>Fecha de Fin</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.fecha_fin}
                                    invalidFeedback={formik.errors.fecha_fin}>
                                    <Input
                                        name='fecha_fin'
                                        type='date'
                                        onChange={formik.handleChange}
                                        value={formik.values.fecha_fin}
                                        onBlur={formik.handleBlur}
                                    />
                                </Validation>
                            </div>
                            <div className='col-span-full'>
                                <Badge>Observaciones</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.observaciones}
                                    invalidFeedback={formik.errors.observaciones}>
                                    <Textarea
                                        name='observaciones'
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.observaciones}
                                    />
                                </Validation>
                            </div>
                        </div>
                    ) : (
                        // Paso 2: licencias a agregar
                        <div className='flex flex-col gap-3'>
                            <p className='text-sm text-zinc-500'>
                                Agrega las licencias que incluira este contrato. Puedes omitir
                                este paso y agregarlas mas tarde.
                            </p>
                            {licFormik.values.licencias.length > 0 && (
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>Licencia</Th>
                                            <Th>Cupos</Th>
                                            <Th>Vigencia</Th>
                                            <Th>{'  '}</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {licFormik.values.licencias.map((lic, i) => (
                                            <Tr key={i}>
                                                <Td>
                                                    {getLicenciaNombre(lic.licencia_id)}
                                                </Td>
                                                <Td>{lic.cantidad}</Td>
                                                <Td>
                                                    <span className='text-sm'>
                                                        {lic.fecha_inicio
                                                            ? dayjs(lic.fecha_inicio).format(
                                                                  'DD/MM/YY',
                                                              )
                                                            : ''}{' '}
                                                        {'->'}{' '}
                                                        {lic.fecha_fin
                                                            ? dayjs(lic.fecha_fin).format(
                                                                  'DD/MM/YY',
                                                              )
                                                            : ''}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    {/* No mostrar boton eliminar para licencias iniciales preseleccionadas */}
                                                    {!esLicenciaInicial(i) && (
                                                        <Button
                                                            icon='HeroTrash'
                                                            size='sm'
                                                            color='red'
                                                            onClick={() => {
                                                                licFormik.setFieldValue(
                                                                    'licencias',
                                                                    licFormik.values.licencias.filter(
                                                                        (_, idx) => idx !== i,
                                                                    ),
                                                                );
                                                            }}
                                                        />
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            )}
                            <Button
                                icon='HeroPlus'
                                onClick={() => setModalAddLicencia(true)}>
                                Agregar licencia
                            </Button>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={handleClose}>
                            Cancelar
                        </Button>
                        {step === 1 && (formik.values.tipo === 'licencia' || tipoFijo === 'licencia') ? (
                            <Button variant='solid' onClick={handleSiguiente}>
                                Siguiente
                            </Button>
                        ) : step === 2 ? (
                            <>
                                <Button onClick={() => setStep(1)}>Atras</Button>
                                <Button
                                    variant='solid'
                                    isLoading={formik.isSubmitting}
                                    onClick={() => formik.handleSubmit()}>
                                    Crear
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant='solid'
                                isLoading={formik.isSubmitting}
                                onClick={() => formik.handleSubmit()}>
                                Crear
                            </Button>
                        )}
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>

            {/* Modal para agregar licencia en paso 2 */}
            <ModalLicenciaContrato
                isOpen={modalAddLicencia}
                onClose={() => setModalAddLicencia(false)}
                formik={licFormik}
                listaLicencias={listaLicencias}
            />
        </>
    );
}

export default CrearContratoDelCliente;