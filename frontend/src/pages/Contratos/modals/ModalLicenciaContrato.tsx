import Checkbox from '@/components/form/Checkbox';
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
import {
    TIPO_MODALIDAD_ANUAL_FORMA_PAGO,
    TIPO_MODALIDAD_BASE_LICENCIA,
} from '@/constants/contrato.constant';
import { ILicencia } from '@/interface/contrato.interface';
import { useCreateLicenciaCatalogoMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { FormikProps, useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { IContratoEdicion } from '../components/contrato.types';

type TMonedaContrato = 'USD' | 'CLP' | 'UF';

interface IModalLicenciaContratoProps {
    isOpen: boolean;
    onClose: () => void;
    /** Formik del padre: los cambios se escriben en su array licencias[] */
    formik: FormikProps<IContratoEdicion>;
    listaLicencias: ILicencia[];
    /** Si se provee, estamos editando el item en ese indice */
    editIndex?: number;
    /** Nombre legible del catalogo para mostrar en modo edicion */
    editNombreLicencia?: string;
    /** Moneda del contrato; si existe, se fuerza como moneda de la licencia contractual */
    contractCurrency?: TMonedaContrato;
}

interface IFormValues {
    licencia_id: string;
    cantidad: number;
    precio_partner: number;
    fecha_inicio: string;
    fecha_fin: string;
}

interface ICreateCatalogFormValues {
    nombre: string;
    numero_parte: string;
    proveedor: string;
    descripcion: string;
    modalidad_base: 'P1M' | 'P1Y' | 'PAGO_UNICO';
    modalidad_anual_forma_pago: 'PAGO_UNICO' | 'PAGO_MENSUAL' | '';
    precio_partner: number;
    precio_venta: number;
    moneda: TMonedaContrato;
    activo: boolean;
}

const describirModalidadCatalogo = (licencia?: ILicencia): string => {
    if (!licencia) return '';
    if (licencia.modalidad_base === 'P1M') return 'Mensual (P1M)';
    if (licencia.modalidad_base === 'P1Y') {
        const sufijo =
            licencia.modalidad_anual_forma_pago === 'PAGO_MENSUAL' ? ' - pago mensual' : '';
        return `Anual (P1Y)${sufijo}`;
    }
    if (licencia.modalidad_base === 'PAGO_UNICO') return 'Pago unico';
    return licencia.modalidad_base ?? '';
};;

type TLicenciaSelectOption = TSelectOption & {
    licencia?: ILicencia;
};

function ModalLicenciaContrato({
    isOpen,
    onClose,
    formik: parentFormik,
    listaLicencias,
    editIndex,
    editNombreLicencia,
    contractCurrency,
}: IModalLicenciaContratoProps) {
    const isEditing = editIndex !== undefined;
    const editItem = isEditing ? parentFormik.values.licencias[editIndex] : undefined;
    const [showCreateCatalogForm, setShowCreateCatalogForm] = useState(false);
    const [createdLicenseOption, setCreatedLicenseOption] = useState<TLicenciaSelectOption | null>(null);

    const [createLicenciaCatalogo, { isLoading: isCreatingCatalogo }] =
        useCreateLicenciaCatalogoMutation();

    const formik = useFormik<IFormValues>({
        enableReinitialize: true,
        initialValues: {
            licencia_id: editItem?.licencia_id?.toString() ?? '',
            cantidad: editItem?.cantidad ?? 1,
            precio_partner: 0,
            fecha_inicio: editItem?.fecha_inicio ?? '',
            fecha_fin: editItem?.fecha_fin ?? '',
        },
        validationSchema: Yup.object({
            licencia_id: isEditing
                ? Yup.string().notRequired()
                : Yup.string().required('Selecciona una licencia del catalogo'),
            cantidad: Yup.number().min(1, 'Minimo 1').required('Requerido'),
        }),
        onSubmit: (values) => {
            const payload = {
                cantidad: values.cantidad,
                fecha_inicio: values.fecha_inicio || null,
                fecha_fin: values.fecha_fin || null,
            };

            if (isEditing) {
                const current = parentFormik.values.licencias[editIndex];
                parentFormik.setFieldValue(`licencias[${editIndex}]`, {
                    ...current,
                    ...payload,
                });
            } else {
                parentFormik.setFieldValue('licencias', [
                    ...parentFormik.values.licencias,
                    {
                        licencia_id: Number(values.licencia_id),
                        ...payload,
                    },
                ]);
            }
            onClose();
        },
    });

    const catalogFormik = useFormik<ICreateCatalogFormValues>({
        initialValues: {
            nombre: '',
            numero_parte: '',
            proveedor: '',
            descripcion: '',
            modalidad_base: 'P1M',
            modalidad_anual_forma_pago: '',
            precio_partner: 0,
            precio_venta: 0,
            moneda: contractCurrency ?? 'USD',
            activo: true,
        },
        validationSchema: Yup.object({
            nombre: Yup.string().required('Nombre es requerido'),
            modalidad_base: Yup.mixed<'P1M' | 'P1Y' | 'PAGO_UNICO'>()
                .oneOf(['P1M', 'P1Y', 'PAGO_UNICO'])
                .required('Modalidad es requerida'),
            modalidad_anual_forma_pago: Yup.string().when('modalidad_base', {
                is: 'P1Y',
                then: (schema) => schema.required('Forma de pago anual es requerida'),
                otherwise: (schema) => schema.notRequired(),
            }),
            precio_partner: Yup.number()
                .moreThan(0, 'Debe ser mayor a 0')
                .required('Precio partner es requerido'),
            precio_venta: Yup.number()
                .moreThan(0, 'Debe ser mayor a 0')
                .required('Precio venta es requerido'),
            moneda: Yup.mixed<TMonedaContrato>()
                .oneOf(['USD', 'CLP', 'UF'])
                .required('Moneda es requerida'),
        }),
        onSubmit: async (values) => {
            try {
                const licenciaCreada = await createLicenciaCatalogo({
                    nombre: values.nombre,
                    numero_parte: values.numero_parte || undefined,
                    proveedor: values.proveedor || undefined,
                    descripcion: values.descripcion || undefined,
                    modalidad_base: values.modalidad_base,
                    modalidad_anual_forma_pago:
                        values.modalidad_base === 'P1Y' &&
                        values.modalidad_anual_forma_pago !== ''
                            ? values.modalidad_anual_forma_pago
                            : null,
                    precio_partner: values.precio_partner,
                    precio_venta: values.precio_venta,
                    moneda: values.moneda,
                    activo: values.activo,
                }).unwrap();

                setCreatedLicenseOption({
                    value: licenciaCreada.id.toString(),
                    label: licenciaCreada.nombre,
                    licencia: licenciaCreada,
                });
                setShowCreateCatalogForm(false);
                catalogFormik.resetForm();

                formik.setFieldValue('licencia_id', licenciaCreada.id.toString());
                formik.setFieldValue('precio_partner', Number(licenciaCreada.precio_partner || 0));

                toast.success(`Licencia "${licenciaCreada.nombre}" creada`, { autoClose: 1500 });
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
            catalogFormik.resetForm();
            setShowCreateCatalogForm(false);
            setCreatedLicenseOption(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (catalogFormik.values.modalidad_base !== 'P1Y') {
            catalogFormik.setFieldValue('modalidad_anual_forma_pago', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [catalogFormik.values.modalidad_base]);

    const selectedLicencia = listaLicencias.find(
        (l) => l.id.toString() === formik.values.licencia_id,
    );

    const getLicenciaOptionModalidad = (licencia?: ILicencia) =>
        licencia ? describirModalidadCatalogo(licencia) : '';

    const licenciaSelectComponents = {
        Input: ({ selectProps, innerRef, innerProps }: any) => {
            if (selectProps.value) {
                return null;
            }
            return <div ref={innerRef} {...innerProps} />;
        },
        Option: ({ innerRef, innerProps, data }: any) => (
            <div
                ref={innerRef}
                {...innerProps}
                className={`${innerProps.className ?? ''} px-1.5 py-1 transition-all duration-200`}
            >
                <div>{data.label}</div>
                {data.licencia && (
                    <div className='text-xs text-zinc-500'>
                        {getLicenciaOptionModalidad(data.licencia)}
                    </div>
                )}
            </div>
        ),
        SingleValue: ({ data, innerProps }: any) => (
            <div
                ref={innerProps?.ref}
                {...innerProps}
                className={`${innerProps?.className ?? ''} flex flex-col`}
            >
                <div>{data.label}</div>
                {data.licencia && (
                    <div className='text-xs text-zinc-500'>
                        {getLicenciaOptionModalidad(data.licencia)}
                    </div>
                )}
            </div>
        ),
    };

    useEffect(() => {
        if (!selectedLicencia) {
            return;
        }
        const precioPartner = Number(selectedLicencia.precio_partner || 0);
        if (formik.values.precio_partner !== precioPartner) {
            formik.setFieldValue('precio_partner', precioPartner);
        }
    }, [formik, selectedLicencia]);

    const currentLicenciaLabel =
        listaLicencias.find((l) => l.id.toString() === formik.values.licencia_id)?.nombre ??
        createdLicenseOption?.label ??
        '';

    const currentLicenciaValue = formik.values.licencia_id
        ? {
              value: formik.values.licencia_id,
              label: currentLicenciaLabel,
              licencia: selectedLicencia ?? createdLicenseOption?.licencia,
          }
        : null;

    // Filtrar opciones: excluir licencias ya agregadas (salvo la que editamos)
    const usedIds = new Set(
        parentFormik.values.licencias
            .filter((_, i) => i !== editIndex)
            .map((l) => l.licencia_id)
            .filter(Boolean),
    );
    const opciones: TLicenciaSelectOption[] = listaLicencias
        .filter((l) => !usedIds.has(l.id))
        .map((l) => ({
            value: l.id.toString(),
            label: l.nombre,
            licencia: l,
        }));

    const precioCatalogo = Number(selectedLicencia?.precio_venta || 0);
    const monedaCatalogo = selectedLicencia?.moneda ?? contractCurrency ?? '';
    const modalidadCatalogo = describirModalidadCatalogo(selectedLicencia);

    return (
        <Modal isOpen={isOpen} setIsOpen={onClose} isCentered isScrollable size='lg'>
            <ModalHeader>{isEditing ? 'Editar licencia' : 'Agregar licencia'}</ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    {!isEditing && (
                        <div className='flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                            <div>
                                <Badge>Licencia del catalogo</Badge>
                                <Validation
                                    isValid={formik.isValid}
                                    isTouched={formik.touched.licencia_id}
                                    invalidFeedback={formik.errors.licencia_id}>
                                    <SelectReact
                                        name='licencia_id'
                                        options={opciones}
                                        components={licenciaSelectComponents}
                                        onChange={(e) => {
                                            setCreatedLicenseOption(null);
                                            formik.setFieldValue(
                                                'licencia_id',
                                                (e as TSelectOption).value,
                                            );
                                        }}
                                        value={currentLicenciaValue}
                                        onBlur={formik.handleBlur}
                                        noOptionsMessage={() =>
                                            'No hay licencias disponibles para seleccionar'
                                        }
                                    />
                                </Validation>
                            </div>

                            <div>
                                <Button
                                    icon={showCreateCatalogForm ? 'HeroChevronUp' : 'HeroPlus'}
                                    variant='outline'
                                    onClick={() =>
                                        setShowCreateCatalogForm((current) => !current)
                                    }>
                                    {showCreateCatalogForm
                                        ? 'Ocultar alta rapida'
                                        : 'Crear licencia de catalogo'}
                                </Button>
                            </div>

                            {showCreateCatalogForm && (
                                <div className='grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700'>
                                    <p className='text-xs text-zinc-500'>
                                        Completa los campos minimos para crear una licencia valida
                                        en el catalogo.
                                    </p>

                                    <div>
                                        <Badge>Nombre</Badge>
                                        <Validation
                                            isValid={catalogFormik.isValid}
                                            isTouched={catalogFormik.touched.nombre}
                                            invalidFeedback={catalogFormik.errors.nombre}>
                                            <Input
                                                name='nombre'
                                                value={catalogFormik.values.nombre}
                                                onChange={catalogFormik.handleChange}
                                                onBlur={catalogFormik.handleBlur}
                                            />
                                        </Validation>
                                    </div>

                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <Badge>Modalidad base</Badge>
                                            <Validation
                                                isValid={catalogFormik.isValid}
                                                isTouched={catalogFormik.touched.modalidad_base}
                                                invalidFeedback={
                                                    catalogFormik.errors.modalidad_base as string
                                                }>
                                                <SelectReact
                                                    name='modalidad_base'
                                                    options={TIPO_MODALIDAD_BASE_LICENCIA.map(
                                                        (option) => ({
                                                            value: option.value,
                                                            label: option.label,
                                                        }),
                                                    )}
                                                    value={TIPO_MODALIDAD_BASE_LICENCIA.map(
                                                        (option) => ({
                                                            value: option.value,
                                                            label: option.label,
                                                        }),
                                                    ).find(
                                                        (option) =>
                                                            option.value ===
                                                            catalogFormik.values.modalidad_base,
                                                    )}
                                                    onChange={(option) =>
                                                        catalogFormik.setFieldValue(
                                                            'modalidad_base',
                                                            (option as TSelectOption).value,
                                                        )
                                                    }
                                                />
                                            </Validation>
                                        </div>

                                        {catalogFormik.values.modalidad_base === 'P1Y' && (
                                            <div>
                                                <Badge>Forma de pago anual</Badge>
                                                <Validation
                                                    isValid={catalogFormik.isValid}
                                                    isTouched={
                                                        catalogFormik.touched
                                                            .modalidad_anual_forma_pago
                                                    }
                                                    invalidFeedback={
                                                        catalogFormik.errors
                                                            .modalidad_anual_forma_pago as string
                                                    }>
                                                    <SelectReact
                                                        name='modalidad_anual_forma_pago'
                                                        options={TIPO_MODALIDAD_ANUAL_FORMA_PAGO.map(
                                                            (option) => ({
                                                                value: option.value,
                                                                label: option.label,
                                                            }),
                                                        )}
                                                        value={TIPO_MODALIDAD_ANUAL_FORMA_PAGO.map(
                                                            (option) => ({
                                                                value: option.value,
                                                                label: option.label,
                                                            }),
                                                        ).find(
                                                            (option) =>
                                                                option.value ===
                                                                catalogFormik.values
                                                                    .modalidad_anual_forma_pago,
                                                        )}
                                                        onChange={(option) =>
                                                            catalogFormik.setFieldValue(
                                                                'modalidad_anual_forma_pago',
                                                                (option as TSelectOption).value,
                                                            )
                                                        }
                                                    />
                                                </Validation>
                                            </div>
                                        )}
                                    </div>

                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <Badge>Precio partner</Badge>
                                            <Validation
                                                isValid={catalogFormik.isValid}
                                                isTouched={catalogFormik.touched.precio_partner}
                                                invalidFeedback={
                                                    catalogFormik.errors.precio_partner as string
                                                }>
                                                <Input
                                                    name='precio_partner'
                                                    type='number'
                                                    value={catalogFormik.values.precio_partner}
                                                    onChange={catalogFormik.handleChange}
                                                    onBlur={catalogFormik.handleBlur}
                                                    step='0.01'
                                                />
                                            </Validation>
                                        </div>
                                        <div>
                                            <Badge>Precio venta</Badge>
                                            <Validation
                                                isValid={catalogFormik.isValid}
                                                isTouched={catalogFormik.touched.precio_venta}
                                                invalidFeedback={
                                                    catalogFormik.errors.precio_venta as string
                                                }>
                                                <Input
                                                    name='precio_venta'
                                                    type='number'
                                                    value={catalogFormik.values.precio_venta}
                                                    onChange={catalogFormik.handleChange}
                                                    onBlur={catalogFormik.handleBlur}
                                                    step='0.01'
                                                />
                                            </Validation>
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <Badge>Moneda</Badge>
                                            <SelectReact
                                                name='moneda'
                                                options={[
                                                    { value: 'USD', label: 'USD' },
                                                    { value: 'CLP', label: 'CLP' },
                                                    { value: 'UF', label: 'UF' },
                                                ]}
                                                value={[
                                                    { value: 'USD', label: 'USD' },
                                                    { value: 'CLP', label: 'CLP' },
                                                    { value: 'UF', label: 'UF' },
                                                ].find(
                                                    (option) =>
                                                        option.value ===
                                                        catalogFormik.values.moneda,
                                                )}
                                                onChange={(option) =>
                                                    catalogFormik.setFieldValue(
                                                        'moneda',
                                                        (option as TSelectOption).value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Badge>Numero de parte</Badge>
                                            <Input
                                                name='numero_parte'
                                                value={catalogFormik.values.numero_parte}
                                                onChange={catalogFormik.handleChange}
                                                onBlur={catalogFormik.handleBlur}
                                            />
                                        </div>
                                    </div>

                                    <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                            <Badge>Proveedor</Badge>
                                            <Input
                                                name='proveedor'
                                                value={catalogFormik.values.proveedor}
                                                onChange={catalogFormik.handleChange}
                                                onBlur={catalogFormik.handleBlur}
                                            />
                                        </div>
                                        <div className='flex items-end pb-1'>
                                            <Checkbox
                                                name='activo'
                                                checked={catalogFormik.values.activo}
                                                onChange={catalogFormik.handleChange}
                                            >
                                                Activa
                                            </Checkbox>
                                        </div>
                                    </div>

                                    <div>
                                        <Badge>Descripcion</Badge>
                                        <Textarea
                                            name='descripcion'
                                            value={catalogFormik.values.descripcion}
                                            onChange={catalogFormik.handleChange}
                                            onBlur={catalogFormik.handleBlur}
                                        />
                                    </div>

                                    <div className='flex justify-end gap-2'>
                                        <Button
                                            color='zinc'
                                            variant='outline'
                                            onClick={() => setShowCreateCatalogForm(false)}>
                                            Cancelar alta
                                        </Button>
                                        <Button
                                            variant='solid'
                                            isDisable={
                                                isCreatingCatalogo ||
                                                catalogFormik.isSubmitting
                                            }
                                            onClick={() => catalogFormik.handleSubmit()}>
                                            Crear licencia de catalogo
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isEditing && (
                        <div>
                            <Badge>Licencia</Badge>
                            <div className='mt-1 font-medium'>{editNombreLicencia ?? 'Sin nombre'}</div>
                        </div>
                    )}

                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Badge>Modalidad (catalogo)</Badge>
                            <Input name='modalidad_catalogo' value={modalidadCatalogo} disabled />
                        </div>
                        <div>
                            <Badge>Precio partner</Badge>
                            <Input
                                name='precio_partner'
                                type='number'
                                value={formik.values.precio_partner}
                                disabled
                            />
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                        <div>
                            <Badge>Cantidad</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cantidad}
                                invalidFeedback={formik.errors.cantidad}>
                                <Input
                                    name='cantidad'
                                    type='number'
                                    value={formik.values.cantidad}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </Validation>
                        </div>
                        <div>
                            <Badge>Precio venta (catalogo)</Badge>
                            <Input
                                name='precio_unitario_catalogo'
                                type='number'
                                value={precioCatalogo}
                                disabled
                                step='0.01'
                            />
                            <div className='mt-1 text-xs text-zinc-500'>
                                Snapshot tomado al crear la linea contractual.
                            </div>
                        </div>
                        <div>
                            <Badge>Fecha inicio</Badge>
                            <Input
                                name='fecha_inicio'
                                type='date'
                                value={formik.values.fecha_inicio}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div>
                            <Badge>Fecha fin</Badge>
                            <Input
                                name='fecha_fin'
                                type='date'
                                value={formik.values.fecha_fin}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <Badge>Moneda contractual</Badge>
                        <Input name='moneda_catalogo' value={monedaCatalogo} disabled />
                        <div className='mt-1 text-xs text-zinc-500'>
                            Tomada del catalogo de la licencia al momento del snapshot.
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild />
                <ModalFooterChild>
                    <Button onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='blue'
                        isDisable={
                            isCreatingCatalogo ||
                            formik.isSubmitting ||
                            catalogFormik.isSubmitting
                        }
                        onClick={() => formik.handleSubmit()}>
                        {isEditing ? 'Guardar cambios' : 'Agregar'}
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default ModalLicenciaContrato;
