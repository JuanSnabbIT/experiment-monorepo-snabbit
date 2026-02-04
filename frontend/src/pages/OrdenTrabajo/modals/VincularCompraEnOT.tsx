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
import {
    useGetComprasQuery,
    useVincularCompraOTMutation,
} from '@/store/slices/ordenTrabajo/ordenTrabajoApi';
import { useFormik } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import { getErrorMessage } from '@/utils/errorHandlers';

function VincularCompraEnOT() {
    const { id } = useParams<{ id: string }>();
    const ordenId = id ? Number(id) : undefined;
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { data: comprasData = [], isFetching: loadingCompras } = useGetComprasQuery(undefined, {
        skip: !isOpen,
    });
    const [vincularCompraOT] = useVincularCompraOTMutation();

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm();
        }
    }, [isOpen]);
    const listaComprasDisponibles = useMemo(
        () => (comprasData || []).filter((compra) => !compra.orden_trabajo),
        [comprasData],
    );

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
                if (!ordenId) return;
                await vincularCompraOT({
                    compraId: values.compra_id,
                    ordenId,
                }).unwrap();

                toast.success('Compra vinculada correctamente', { autoClose: 1000 });
                setIsOpen(false);
            } catch (error: unknown) {
                toast.error(getErrorMessage(error) || 'Error al vincular la compra', {
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

                        <div className='rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20'>
                            <p className='text-sm text-blue-700 dark:text-blue-200'>
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
