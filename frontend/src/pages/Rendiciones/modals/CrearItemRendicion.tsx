import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
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
import ApiService from '@/services/ApiService';
import {
    detalleRendicionThunk,
    listaCategoriasGastoThunk,
    listaComprasDisponiblesThunk,
    listaContentTypeThunk,
    listaItemsRendicionThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useGetGastosOperativosDisponiblesQuery } from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useFormik } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

function CrearItemRendicion() {
    const dispatch = useAppDispatch();
    const { listaCategoriasGasto, detalleRendicion, listaComprasDisponibles } = useAppSelector(
        (state) => state.rendicion,
    );
    const { listaContentType } = useAppSelector((state) => state.core);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { data: listaDetalleGastoRendicionOTDisponibles = [] } =
        useGetGastosOperativosDisponiblesQuery(undefined, { skip: !isOpen });
    const [creandoItem, setCreandoItem] = useState<boolean>(false);
    const [optionsItem, setOptionsItem] = useState<
        { label: string; options: { value: string; label: string; ct: string }[] }[]
    >([]);

    useEffect(() => {
        if (isOpen && listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }
    }, [isOpen, listaContentType]);

    useEffect(() => {
        if (isOpen) {
            dispatch(listaCategoriasGastoThunk());
            dispatch(listaComprasDisponiblesThunk());
        } else {
            formik.resetForm();
            setCreandoItem(false);
        }
    }, [isOpen]);

    useEffect(() => {
        let options: { label: string; options: { value: string; label: string; ct: string }[] }[] =
            [];
        if (listaComprasDisponibles.length > 0) {
            let ct = listaContentType.find((ct) => ct.model === 'compra');
            options.push({
                label: 'Compras',
                options: listaComprasDisponibles.map((com) => ({
                    value: com.codigo,
                    label: `Codigo: ${com.codigo}`,
                    ct: ct?.id.toString() || '',
                })),
            });
        }
        if (listaDetalleGastoRendicionOTDisponibles.length > 0) {
            let ct = listaContentType.find((ct) => ct.model === 'detallegastorendicionot');
            options.push({
                label: 'Gastos OT',
                options: listaDetalleGastoRendicionOTDisponibles.map((det) => ({
                    value: det.id.toString(),
                    label: det.detalle || '',
                    ct: ct?.id.toString() || '',
                })),
            });
        }
        setOptionsItem(options);
    }, [listaComprasDisponibles, listaContentType, listaDetalleGastoRendicionOTDisponibles]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            detalle_id: '',
            detalle: '',
            categoria: '',
            content_type: '',
            cantidad: 0,
            monto_unitario: 0,
            fecha_gasto: '',
        },
        onSubmit: async (values) => {
            try {
                let data = {};
                if (creandoItem) {
                    data = {
                        detalle: values.detalle,
                        categoria: values.categoria,
                        cantidad: values.cantidad,
                        monto_unitario: values.monto_unitario,
                        fecha_gasto: values.fecha_gasto,
                    };
                } else {
                    data = { detalle_id: values.detalle_id, content_type: values.content_type };
                }
                const response = await ApiService.fetchData({
                    url: `/api/rendiciones/${detalleRendicion?.id}/items-rendicion/crear-item/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                });
                if (response.data) {
                    toast.success('Item creado', { autoClose: 1000 });
                    dispatch(detalleRendicionThunk({ id_rendicion: detalleRendicion?.id }));
                    dispatch(listaItemsRendicionThunk({ id_rendicion: detalleRendicion?.id }));
                    setIsOpen(false);
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al crear el item de la rendición', {
                    toastId: 'Error al crear el item de la rendición',
                });
            }
        },
    });

    // 1. Aplanamos los grupos de opciones
    const todasLasOpciones = useMemo(() => optionsItem.flatMap((g) => g.options), [optionsItem]);

    // 2. Buscamos la opción seleccionada
    const opcionSeleccionada = useMemo(
        () => todasLasOpciones.find((opt) => opt.value === formik.values.detalle_id) || null,
        [todasLasOpciones, formik.values.detalle_id],
    );

    return (
        <>
            <Tooltip text='Crear Item'>
                <Button
                    variant='solid'
                    icon='HeroPlus'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                isStaticBackdrop
                isStaticBackdropAnimation={false}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Item</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Detalles de OT/Detalle nuevo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.detalle_id}
                                invalidFeedback={formik.errors.detalle_id}>
                                <SelectReact
                                    name='detalle_id'
                                    isCreatable
                                    isClearable
                                    onBlur={formik.handleBlur}
                                    noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                    placeholder='Seleccione un detalle de rendicion de OT o una compra o cree un detalle nuevo'
                                    options={optionsItem}
                                    value={
                                        creandoItem
                                            ? {
                                                  value: formik.values.detalle_id,
                                                  label: formik.values.detalle,
                                              }
                                            : opcionSeleccionada
                                    }
                                    formatCreateLabel={(e) => `Crear detalle "${e}"`}
                                    onChange={(e: any) => {
                                        if (e) {
                                            setCreandoItem(false);
                                            formik.setFieldValue('content_type', e.ct);
                                            formik.setFieldValue(
                                                'detalle_id',
                                                (e as TSelectOption).value,
                                            );
                                            formik.setFieldValue('detalle', '');
                                        } else {
                                            setCreandoItem(false);
                                            formik.setFieldValue('content_type', '');
                                            formik.setFieldValue('detalle_id', '');
                                            formik.setFieldValue('detalle', '');
                                        }
                                    }}
                                    onCreateOption={(e) => {
                                        if (e) {
                                            setCreandoItem(true);
                                            formik.setFieldValue('content_type', '');
                                            formik.setFieldValue('detalle_id', e);
                                            formik.setFieldValue('detalle', e);
                                        } else {
                                            setCreandoItem(false);
                                            formik.setFieldValue('content_type', '');
                                            formik.setFieldValue('detalle', '');
                                            formik.setFieldValue('detalle_id', '');
                                        }
                                    }}
                                />
                            </Validation>
                        </div>
                        {creandoItem && (
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Badge>Categoria</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.categoria}
                                        invalidFeedback={formik.errors.categoria}>
                                        <SelectReact
                                            name='categoria'
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                            placeholder='Seleccione una categoria'
                                            options={listaCategoriasGasto.map((cat) => ({
                                                value: cat.id.toString(),
                                                label: cat.nombre,
                                            }))}
                                            onBlur={formik.handleBlur}
                                            onChange={(e) => {
                                                if (e) {
                                                    formik.setFieldValue(
                                                        'categoria',
                                                        (e as TSelectOption).value,
                                                    );
                                                } else {
                                                    formik.setFieldValue('categoria', '');
                                                }
                                            }}
                                            value={{
                                                value: formik.values.categoria,
                                                label:
                                                    listaCategoriasGasto.find(
                                                        (cat) =>
                                                            cat.id.toString() ===
                                                            formik.values.categoria,
                                                    )?.nombre || '',
                                            }}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>Fecha Gasto</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.fecha_gasto}
                                        invalidFeedback={formik.errors.fecha_gasto}>
                                        <Input
                                            name='fecha_gasto'
                                            type='date'
                                            onBlur={formik.handleBlur}
                                            onChange={formik.handleChange}
                                            value={formik.values.fecha_gasto}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>Cantidad</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.cantidad}
                                        invalidFeedback={formik.errors.cantidad}>
                                        <Input
                                            name='cantidad'
                                            type='number'
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.cantidad}
                                        />
                                    </Validation>
                                </div>
                                <div>
                                    <Badge>Monto Unitario</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.monto_unitario}
                                        invalidFeedback={formik.errors.monto_unitario}>
                                        <Input
                                            name='monto_unitario'
                                            type='number'
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.monto_unitario}
                                        />
                                    </Validation>
                                </div>
                            </div>
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
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearItemRendicion;
