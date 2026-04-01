import Input from '@/components/form/Input';
import SelectReact from '@/components/form/SelectReact';
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
import Tooltip from '@/components/ui/Tooltip';
import { TIPO_MONEDA } from '@/constants/cotizacion.constant';
import ApiService from '@/services/ApiService';
import {
    listaCotizacionesSucursalThunk,
    listaCotizacionesThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { listaMisClientesThunk, listaMisProspectosThunk } from '@/store/slices/empresa/empresaSlice';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

type TipoContraparte = 'cliente' | 'prospecto';

interface IProspectoInlineForm {
    nombre: string;
    rut_empresa: string;
    email: string;
    telefono: string;
}

const PROSPECTO_INLINE_INICIAL: IProspectoInlineForm = {
    nombre: '',
    rut_empresa: '',
    email: '',
    telefono: '',
};

function CrearCotizacion({
    empresa,
    onSuccess,
}: {
    empresa: boolean;
    onSuccess?: (cotizacion: any) => void;
}) {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaMisClientes, listaMisProspectos } = useAppSelector((state) => state.empresa);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [tipoContraparte, setTipoContraparte] = useState<TipoContraparte>('cliente');
    const [showCrearProspecto, setShowCrearProspecto] = useState(false);
    const [prospectoInline, setProspectoInline] = useState<IProspectoInlineForm>(PROSPECTO_INLINE_INICIAL);
    const [creandoProspecto, setCreandoProspecto] = useState(false);

    useEffect(() => {
        if (personalizacionUsuario?.empresa && isOpen) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(listaMisProspectosThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario, isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
            cliente: '',
            tipo_moneda: '2',
            porcentaje_recargo: 0,
            descripcion: '',
            observaciones: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido').nonNullable('Requerido'),
            cliente: Yup.string().required('Requerido').nonNullable('Requerido'),
            tipo_moneda: Yup.string().when('cliente', {
                is: (cliente: string) => !!cliente,
                then: (schema) => schema.required('Requerido').nonNullable('Requerido'),
                otherwise: (schema) => schema.notRequired(),
            }),
            porcentaje_recargo: Yup.number()
                .when('cliente', {
                    is: (cliente: string) => !!cliente,
                    then: (schema) =>
                        schema.required('Requerido').min(0, 'Debe ser mayor o igual a 0'),
                    otherwise: (schema) => schema.notRequired(),
                })
                .nonNullable('Requerido'),
            descripcion: Yup.string().notRequired().nullable(),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData<{ id: number }>({
                    url: '/api/cotizaciones/',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    data: { ...values, empresa: personalizacionUsuario?.empresa },
                });
                if (response.data) {
                    toast.success('Cotización creada', { autoClose: 1000 });
                    if (empresa) {
                        dispatch(listaCotizacionesSucursalThunk(undefined));
                    } else {
                        dispatch(listaCotizacionesThunk());
                    }
                    if (onSuccess) {
                        onSuccess(response.data);
                    }
                    formik.resetForm();
                    setIsOpen(false);
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error), { toastId: 'Error al crear la cotización' });
            } finally {
                formik.setSubmitting(false);
            }
        },
    });

    const handleTipoContraparteChange = (tipo: TipoContraparte) => {
        setTipoContraparte(tipo);
        formik.setFieldValue('cliente', '');
        formik.setFieldValue('porcentaje_recargo', 0);
        setShowCrearProspecto(false);
        setProspectoInline(PROSPECTO_INLINE_INICIAL);
    };

    const handleCrearProspecto = async () => {
        if (!prospectoInline.nombre.trim()) {
            toast.error('El nombre del prospecto es requerido');
            return;
        }
        setCreandoProspecto(true);
        try {
            const response = await ApiService.fetchData<{ id: number; cliente: number; info_cliente: { id: number; nombre: string; recargo: number } }>({
                url: `/api/empresas/${personalizacionUsuario?.empresa}/crear-prospecto/`,
                method: 'POST',
                data: {
                    nombre: prospectoInline.nombre,
                    rut_empresa: prospectoInline.rut_empresa || null,
                    email: prospectoInline.email || null,
                    telefono: prospectoInline.telefono || null,
                },
            });
            if (response.data) {
                await dispatch(listaMisProspectosThunk({ id_empresa: personalizacionUsuario?.empresa }));
                formik.setFieldValue('cliente', response.data.info_cliente.id.toString());
                formik.setFieldValue('porcentaje_recargo', response.data.info_cliente.recargo ?? 0);
                toast.success(`Prospecto "${prospectoInline.nombre}" creado y seleccionado`, { autoClose: 2000 });
                setShowCrearProspecto(false);
                setProspectoInline(PROSPECTO_INLINE_INICIAL);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setCreandoProspecto(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            setTipoContraparte('cliente');
            setShowCrearProspecto(false);
            setProspectoInline(PROSPECTO_INLINE_INICIAL);
        }
    }, [isOpen]);

    const opcionesCliente = listaMisClientes.map((rel) => ({
        value: rel.info_cliente.id.toString(),
        label: rel.info_cliente.nombre,
    }));

    const opcionesProspecto = listaMisProspectos.map((rel) => ({
        value: rel.info_cliente.id.toString(),
        label: rel.info_cliente.nombre,
    }));

    return (
        <>
            <Tooltip text='Añadir cotización'>
                <Button
                    variant='solid'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                    icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Cotización</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>

                        {/* Bloque 1: Tipo de contraparte */}
                        <div className='w-full'>
                            <Badge>Tipo de contraparte</Badge>
                            <div className='mt-2 flex gap-2'>
                                <Button
                                    variant={tipoContraparte === 'cliente' ? 'solid' : 'outline'}
                                    color='blue'
                                    size='sm'
                                    onClick={() => handleTipoContraparteChange('cliente')}>
                                    Cliente
                                </Button>
                                <Button
                                    variant={tipoContraparte === 'prospecto' ? 'solid' : 'outline'}
                                    color='amber'
                                    size='sm'
                                    onClick={() => handleTipoContraparteChange('prospecto')}>
                                    Prospecto
                                </Button>
                            </div>
                        </div>

                        {/* Bloque 2: Selección de contraparte */}
                        <div className='w-full'>
                            <div className='flex items-center gap-2'>
                                <Badge>{tipoContraparte === 'cliente' ? 'Cliente' : 'Prospecto'}</Badge>
                                {tipoContraparte === 'prospecto' && (
                                    <Badge color='amber' className='text-xs'>Prospecto</Badge>
                                )}
                            </div>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}>
                                <SelectReact
                                    name='cliente'
                                    id='crear-cotizacion-contraparte'
                                    placeholder={
                                        tipoContraparte === 'cliente'
                                            ? 'Seleccione un cliente'
                                            : 'Seleccione un prospecto'
                                    }
                                    noOptionsMessage={(e) =>
                                        tipoContraparte === 'prospecto' && opcionesProspecto.length === 0
                                            ? 'Sin prospectos " crea uno abajo'
                                            : `No existe "${e.inputValue}"`
                                    }
                                    options={tipoContraparte === 'cliente' ? opcionesCliente : opcionesProspecto}
                                    onBlur={formik.handleBlur}
                                    value={
                                        (tipoContraparte === 'cliente' ? opcionesCliente : opcionesProspecto).find(
                                            (o) => o.value === formik.values.cliente,
                                        ) ?? null
                                    }
                                    onChange={(option: any) => {
                                        const lista = tipoContraparte === 'cliente' ? listaMisClientes : listaMisProspectos;
                                        const seleccionado = lista.find(
                                            (r) => r.info_cliente.id.toString() === option?.value,
                                        )?.info_cliente;
                                        formik.setFieldValue('cliente', option?.value ?? '');
                                        formik.setFieldValue('porcentaje_recargo', seleccionado?.recargo ?? 0);
                                    }}
                                />
                            </Validation>

                            {/* Sub-sección: crear prospecto inline */}
                            {tipoContraparte === 'prospecto' && (
                                <div className='mt-2'>
                                    {!showCrearProspecto ? (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            color='amber'
                                            icon='HeroPlus'
                                            onClick={() => setShowCrearProspecto(true)}>
                                            Crear prospecto
                                        </Button>
                                    ) : (
                                        <div className='mt-2 flex flex-col gap-3 rounded-lg border border-amber-400/40 bg-amber-50/10 p-4 dark:bg-amber-900/10'>
                                            <div className='flex items-center justify-between'>
                                                <span className='text-sm font-semibold text-amber-600 dark:text-amber-400'>
                                                    Nuevo prospecto
                                                </span>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    color='red'
                                                    icon='HeroXMark'
                                                    onClick={() => {
                                                        setShowCrearProspecto(false);
                                                        setProspectoInline(PROSPECTO_INLINE_INICIAL);
                                                    }}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                                <div>
                                                    <Badge>Nombre o razón social *</Badge>
                                                    <Input
                                                        value={prospectoInline.nombre}
                                                        onChange={(e) =>
                                                            setProspectoInline((prev) => ({
                                                                ...prev,
                                                                nombre: e.target.value,
                                                            }))
                                                        }
                                                        placeholder='Ej: Empresa ABC'
                                                    />
                                                </div>
                                                <div>
                                                    <Badge>RUT / Identificador tributario</Badge>
                                                    <Input
                                                        value={prospectoInline.rut_empresa}
                                                        onChange={(e) =>
                                                            setProspectoInline((prev) => ({
                                                                ...prev,
                                                                rut_empresa: e.target.value,
                                                            }))
                                                        }
                                                        placeholder='Opcional'
                                                    />
                                                </div>
                                                <div>
                                                    <Badge>Email comercial</Badge>
                                                    <Input
                                                        type='email'
                                                        value={prospectoInline.email}
                                                        onChange={(e) =>
                                                            setProspectoInline((prev) => ({
                                                                ...prev,
                                                                email: e.target.value,
                                                            }))
                                                        }
                                                        placeholder='Opcional'
                                                    />
                                                </div>
                                                <div>
                                                    <Badge>Teléfono</Badge>
                                                    <Input
                                                        value={prospectoInline.telefono}
                                                        onChange={(e) =>
                                                            setProspectoInline((prev) => ({
                                                                ...prev,
                                                                telefono: e.target.value,
                                                            }))
                                                        }
                                                        placeholder='Opcional'
                                                    />
                                                </div>
                                            </div>
                                            <div className='flex justify-end'>
                                                <Button
                                                    variant='solid'
                                                    color='amber'
                                                    icon='HeroCheck'
                                                    isLoading={creandoProspecto}
                                                    isDisable={creandoProspecto}
                                                    onClick={handleCrearProspecto}>
                                                    Crear y seleccionar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bloque 3: Datos de la cotización (solo cuando hay contraparte seleccionada) */}
                        {formik.values.cliente && (
                            <>
                                <div className='w-full'>
                                    <Badge>Nombre</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.nombre}
                                        invalidFeedback={formik.errors.nombre}>
                                        <Input
                                            name='nombre'
                                            value={formik.values.nombre}
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                        />
                                    </Validation>
                                </div>
                                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                    <div className='w-full'>
                                        <Badge>Tipo de Moneda</Badge>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.tipo_moneda}
                                            invalidFeedback={formik.errors.tipo_moneda}>
                                            <SelectReact
                                                name='tipo_moneda'
                                                id='tipo_moneda'
                                                placeholder='Seleccione un tipo de moneda'
                                                noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                                options={TIPO_MONEDA}
                                                onBlur={formik.handleBlur}
                                                value={TIPO_MONEDA.find(
                                                    (option) => option.value === formik.values.tipo_moneda,
                                                )}
                                                onChange={(option: any) =>
                                                    formik.setFieldValue('tipo_moneda', option?.value)
                                                }
                                            />
                                        </Validation>
                                    </div>
                                    <div className='w-full'>
                                        <Badge>Porcentaje de Recargo</Badge>
                                        <Validation
                                            isValid={formik.isValid}
                                            isTouched={formik.touched.porcentaje_recargo}
                                            invalidFeedback={formik.errors.porcentaje_recargo}>
                                            <Input
                                                name='porcentaje_recargo'
                                                type='number'
                                                onBlur={formik.handleBlur}
                                                onChange={formik.handleChange}
                                                value={formik.values.porcentaje_recargo}
                                            />
                                        </Validation>
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Descripción</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.descripcion}
                                        invalidFeedback={formik.errors.descripcion}>
                                        <Textarea
                                            name='descripcion'
                                            value={formik.values.descripcion}
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                        />
                                    </Validation>
                                </div>
                                <div className='w-full'>
                                    <Badge>Observaciones</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.observaciones}
                                        invalidFeedback={formik.errors.observaciones}>
                                        <Textarea
                                            name='observaciones'
                                            value={formik.values.observaciones}
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                        />
                                    </Validation>
                                </div>
                            </>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                                formik.resetForm();
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}
                            isDisable={formik.isSubmitting}
                            isLoading={formik.isSubmitting}>
                            Crear
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearCotizacion;
