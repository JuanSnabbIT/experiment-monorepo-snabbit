import Validation from '@/components/form/Validation'
import * as yup from 'yup'
import { useEffect, useState } from 'react'
import { listaCategoriasThunk } from '@/store/slices/item/itemSlice'
import ApiService from '@/services/ApiService'
import { toast } from 'react-toastify'
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Input from '@/components/form/Input';
import { useAppDispatch } from '@/store';
import Tooltip from '@/components/ui/Tooltip'
import { useFormik } from 'formik'
import Badge from '@/components/ui/Badge'


const validationSchemaCategoria = yup.object().shape({
    nombre: yup.string().min(4, 'El nombre debe tener al menos 4 caracteres').max(250, "Maximo 250 Caracteres").required('El nombre es requerido').nonNullable("Requerido"),
});

const CrearCategoria = () => {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: ""
        },
        validationSchema: validationSchemaCategoria,
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({ url: `/api/categorias/`, method: 'post', data: values });
                if (response.data) {
                    dispatch(listaCategoriasThunk());
                    toast.success('Categoría creada correctamente', {autoClose: 1000});
                    setIsOpen(false)
                }
            } catch (error: any) {
                toast.error(error.response.data || "Error creando categoria", {toastId: "Error creando categoria"})
            }
        }
    })

    useEffect(() => {
        if (!isOpen) {
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text='Crear Categoria'>
                <Button variant='solid' onClick={() => {setIsOpen(true)}} icon='HeroPlus'></Button>
            </Tooltip>
            <Modal
                isStaticBackdrop={true}
                isStaticBackdropAnimation={false}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            >
                <ModalHeader>
                    <Badge className="text-xl">Crear Categoria</Badge>
                </ModalHeader>
                <ModalBody>
                    <div>
                        <Badge>Nombre</Badge>
                        <Validation
                            isValid={formik.isValid}
                            isTouched={formik.touched.nombre}
                            invalidFeedback={formik.errors.nombre}
                        >
                            <Input
                                onBlur={formik.handleBlur}
                                onChange={formik.handleChange}
                                value={formik.values.nombre}
                                name="nombre"
                                placeholder="Nombre de la Categoría"
                            />
                        </Validation>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant='solid' onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default CrearCategoria;