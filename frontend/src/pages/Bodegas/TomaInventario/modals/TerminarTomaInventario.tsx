import Input from '@/components/form/Input';
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
import { ITomaInventario } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import {
    detalleTomaInventarioThunk,
    listaItemsEnTomaInventarioThunk,
    useAppDispatch,
    useAppSelector,
    usuarioEmpresaLogeadoThunk,
} from '@/store';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

function TerminarTomaInventario({ toma }: { toma: ITomaInventario }) {
    const dispatch = useAppDispatch();
    const { listaItemsEnTomaInventario } = useAppSelector((state) => state.bodega);
    const { usuarioEmpresaLogeado } = useAppSelector((state) => state.empresa);
    const { userMe } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!usuarioEmpresaLogeado && userMe) {
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe.pk }));
        }
    }, [usuarioEmpresaLogeado, userMe]);

    useEffect(() => {
        if (isOpen) {
            dispatch(listaItemsEnTomaInventarioThunk({ id_toma: toma.id }));
        } else {
            formik.resetForm();
        }
    }, [isOpen]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_cambio: '',
            observaciones: '',
        },
        validationSchema: Yup.object().shape({
            fecha_cambio: Yup.string().required('Requerido').nonNullable('Requerido'),
            observaciones: Yup.string().notRequired().nullable(),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/estados-toma-inventario/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        toma_inventario: toma.id,
                        estado: 'terminado',
                        usuario: usuarioEmpresaLogeado?.id,
                        fecha_cambio: values.fecha_cambio,
                        observaciones: values.observaciones,
                    }),
                });
                if (response.data) {
                    toast.success('Toma de inventario terminada', { autoClose: 1000 });
                    setIsOpen(false);
                    dispatch(detalleTomaInventarioThunk({ id_toma: toma.id }));
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data).flat().join(' ');
                toast.error(mensajesError || 'Error al iniciar el inventariado', {
                    toastId: 'Error al iniciar el inventariado',
                });
            }
        },
    });

    return (
        <>
            <Tooltip text='Terminar Inventariado'>
                <Button
                    variant='solid'
                    color='red'
                    icon='HeroNoSymbol'
                    onClick={() => {
                        setIsOpen(true);
                    }}
                />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Terminar Inventariado</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        {listaItemsEnTomaInventario.filter(
                            (item) => item.estado === 'por_inventariar',
                        ).length > 0 ? (
                            <>
                                <div>
                                    <Badge className='text-xl'>Items Sin Inventariar</Badge>
                                </div>
                                {listaItemsEnTomaInventario
                                    .filter((item) => item.estado === 'por_inventariar')
                                    .map((item, index) => (
                                        <div className='flex flex-row gap-4' key={index}>
                                            <div>
                                                <Badge>Nombre</Badge>
                                                <div className='ml-4'>{item.nombre_item}</div>
                                            </div>
                                            <div>
                                                <Badge>Bodega</Badge>
                                                <div className='ml-4'>{item.nombre_bodega}</div>
                                            </div>
                                        </div>
                                    ))}
                            </>
                        ) : (
                            <>
                                <div>
                                    <Badge>Fecha de Cambio</Badge>
                                    <Validation
                                        isValid={formik.isValid}
                                        isTouched={formik.touched.fecha_cambio}
                                        invalidFeedback={formik.errors.fecha_cambio}>
                                        <Input
                                            type='datetime-local'
                                            name='fecha_cambio'
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            value={formik.values.fecha_cambio}
                                        />
                                    </Validation>
                                </div>
                                <div>
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
                            </>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red'>Cancelar</Button>
                        <Button
                            variant='solid'
                            color='red'
                            isDisable={
                                listaItemsEnTomaInventario.filter(
                                    (item) => item.estado === 'por_inventariar',
                                ).length > 0
                            }
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Terminar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default TerminarTomaInventario;
