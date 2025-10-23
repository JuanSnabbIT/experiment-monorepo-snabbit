import Validation from "@/components/form/Validation"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { detalleItemEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import { useFormik } from "formik"
import { Fragment, useEffect, useState } from "react"
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
import { toast } from "react-toastify"
import { Gallery } from "react-grid-gallery";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Input from "@/components/form/Input"
import Icon from "@/components/icon/Icon"


function CrearImagenEnDetalleItem() {
    const dispatch = useAppDispatch();
    const { detalleItemEmpresa } = useAppSelector((state) => state.item);
    const [hasCameraPermission, setHasCameraPermission] = useState(false);
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [index, setIndex] = useState<number>(-1)

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            imagenes: []
        },
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({url: `/api/imagenes-item/bulk-create/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                    ...values,
                    item: detalleItemEmpresa?.id,
                })})
                if (response.data) {
                    toast.success("Imagen(es) añadida(s)", {autoClose: 1000})
                    dispatch(detalleItemEmpresaThunk({id_empresa: detalleItemEmpresa?.empresa, id_item: detalleItemEmpresa?.id}))
                    setIsOpen(false)
                }
            } catch (error: any) {
                const mensajesError = Object.values(error.response.data)
                    .flat() // Aplana los arrays en caso de que haya más de uno
                    .join(" "); // Une los mensajes en una sola cadena
                toast.error(mensajesError || "Error al añadir la imagen", {toastId: "Error al añadir la imagen"})
            }
        }
    })

    useEffect(() => {
        async function checkCameraPermission() {
            try {
                // Intentamos solicitar acceso a la cámara
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Si se concede, detenemos las pistas (para evitar que la cámara quede encendida)
                stream.getTracks().forEach(track => track.stop());
                setHasCameraPermission(true);
            } catch (error) {
                // Si ocurre algún error (por ejemplo, si se niega el acceso), actualizamos el estado
                console.error('Error al obtener permisos de la cámara:', error);
                setHasCameraPermission(false);
                toast.error("No se pudo acceder a la cámara");
            } finally {
                setPermissionChecked(true);
            }
        }
        if (isOpen) {
            checkCameraPermission();
        } else {
            formik.resetForm()
        }
    }, [isOpen])

    return (
        <>
            <Tooltip text="Añadir Imagen">
                <Button variant="solid" icon="HeroPlus" onClick={() => {setIsOpen(true)}} />
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Añadir Imagenes</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        {(permissionChecked && hasCameraPermission) && (
                            <Camera
                                idealFacingMode="environment"
                                onTakePhoto = {(dataUri) => {
                                    formik.setFieldValue("imagenes", [...formik.values.imagenes, dataUri])
                                }}
                                onCameraError={() => {
                                    setHasCameraPermission(false)
                                    setPermissionChecked(true)
                                }}
                            />
                        )}
                        <div>
                            <Input name="subir_imagen" type="file" onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];

                                    // Instancia del FileReader para leer el archivo
                                    const reader = new FileReader();

                                    // Configuramos el FileReader para leer el archivo como Data URL (base64)
                                    reader.readAsDataURL(file);

                                    // Evento que se dispara cuando la lectura es exitosa
                                    reader.onload = () => {
                                        // Obtiene el resultado en formato base64
                                        const base64String = reader.result as string;
                                        formik.setFieldValue("imagenes", [...formik.values.imagenes, base64String])
                                    };

                                    // Manejo de errores en la lectura del archivo
                                    reader.onerror = (error) => {
                                        console.error("Error al convertir el archivo a base64:", error);
                                    };
                                }
                            }} />
                        </div>
                        <div>
                            <Badge>Imagenes</Badge>
                            {formik.values.imagenes.length > 0 ? (
                                <>
                                    <Gallery
                                        images={formik.values.imagenes.map(imagen => ({src: imagen, height: 240, width: 320}))}
                                        onClick={(index) => {setIndex(index)}}
                                        enableImageSelection={false}
                                        rowHeight={240}
                                    />
                                    <Lightbox
                                        slides={formik.values.imagenes.map(imagen => ({src: imagen}))}
                                        open={index >= 0}
                                        index={index}
                                        close={() => setIndex(-1)}
                                        toolbar={{buttons: [
                                            <div className="items-center flex hover:text-red-600 text-zinc-50 transition-colors delay-75" key={"BotonEliminar"}>
                                                <Icon icon="HeroTrash" size="text-3xl" onClick={() => {
                                                    formik.setFieldValue("imagenes", formik.values.imagenes.splice(index + 1, 1))
                                                    setIndex(-1)
                                                }} />
                                            </div>,
                                            "close"
                                        ]}}
                                    />
                                </>
                            ) : ("Sin Imagenes")}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Guardar</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearImagenEnDetalleItem