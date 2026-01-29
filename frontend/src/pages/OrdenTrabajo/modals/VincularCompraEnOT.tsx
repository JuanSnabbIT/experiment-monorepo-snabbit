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
import { ICompra } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { listaComprasEnOTThunk, useAppDispatch, useAppSelector } from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function VincularCompraEnOT() {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [listaComprasDisponibles, setListaComprasDisponibles] = useState<ICompra[]>([]);
    const [loadingCompras, setLoadingCompras] = useState(false);

    useEffect(() => {
        if (isOpen && detalleOrdenTrabajo) {
            cargarComprasDisponibles();
        }
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen, detalleOrdenTrabajo]);

    const cargarComprasDisponibles = async () => {
        try {
            setLoadingCompras(true);
            const response = await ApiService.fetchData<ICompra[]>({
                url: `/api/compras/`,
                method: 'get',
            });
            const compras = (response.data || []).filter((compra) => !compra.orden_trabajo);
            setListaComprasDisponibles(compras);
        } catch (error: any) {
            toast.error(error.response?.data || 'Error al cargar las compras', {
                toastId: 'Error cargando compras',
            });
        } finally {
            setLoadingCompras(false);
        }
    };

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            compra_id: '',
        },
        validationSchema: Yup.object().shape({
            compra_id: Yup.string().nonNullable('Requerido').required('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                await ApiService.fetchData({
                    url: `/api/compras/${values.compra_id}/`,
                    method: 'patch',
                    data: {
                        orden_trabajo: detalleOrdenTrabajo?.id,
                    },
                });

                toast.success('Compra vinculada correctamente', { autoClose: 1000 });
                dispatch(listaComprasEnOTThunk({ id_orden: detalleOrdenTrabajo?.id }));
                setIsOpen(false);
            } catch (error: any) {
                toast.error(error.response?.data || 'Error al vincular la compra', {
                    toastId: 'Error vinculando compra',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Vincular Compra Existente'>
                <Button
                    variant='solid'
                    color='violet'
                    icon='HeroLink'
                    onClick={() => {
                        setIsOpen(true);
                    }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg'>
                <ModalHeader>
                    <Badge className='text-xl'>Vincular Compra a Orden de Trabajo</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <Badge>Compra</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.compra_id}
                                invalidFeedback={formik.errors.compra_id}>
                                <SelectReact
                                    name='compra_id'
                                    isLoading={loadingCompras}
                                    options={listaComprasDisponibles.map((compra) => ({
                                        value: compra.id.toString(),
                                        label: `${compra.codigo} - ${compra.observaciones || 'Sin descripcion'}`,
                                    }))}
                                    value={
                                        formik.values.compra_id
                                            ? {
                                                  value: formik.values.compra_id,
                                                  label: listaComprasDisponibles.find(
                                                      (c) =>
                                                          c.id.toString() ===
                                                          formik.values.compra_id,
                                                  )
                                                      ? `${
                                                            listaComprasDisponibles.find(
                                                                (c) =>
                                                                    c.id.toString() ===
                                                                    formik.values.compra_id,
                                                            )?.codigo
                                                        } - ${
                                                            listaComprasDisponibles.find(
                                                                (c) =>
                                                                    c.id.toString() ===
                                                                    formik.values.compra_id,
                                                            )?.observaciones || 'Sin descripcion'
                                                        }`
                                                      : '',
                                              }
                                            : undefined
                                    }
                                    onChange={(e) => {
                                        formik.setFieldValue(
                                            'compra_id',
                                            (e as TSelectOption).value,
                                        );
                                    }}
                                    onBlur={formik.handleBlur}
                                    noOptionsMessage={() => 'No hay compras disponibles'}
                                />
                            </Validation>
                        </div>

                        <div className='rounded border border-blue-200 bg-blue-50 p-3'>
                            <p className='text-sm text-blue-700'>
                                <strong>Nota:</strong> La compra quedarÇ­ asociada a la Orden de
                                Trabajo seleccionada.
                            </p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsOpen(false);
                            }}>
                            Cancelar
                        </Button>
                        <Button variant='solid' onClick={() => formik.handleSubmit()}>
                            Vincular
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default VincularCompraEnOT;
