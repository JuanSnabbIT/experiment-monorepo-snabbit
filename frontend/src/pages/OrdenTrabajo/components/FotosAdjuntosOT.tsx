import Icon from "@/components/icon/Icon";
import Badge from "@/components/ui/Badge";
import Card, { CardBody, CardHeader, CardHeaderChild } from "@/components/ui/Card";
import ApiService from "@/services/ApiService";
import { listaAdjuntosThunk, useAppDispatch, useAppSelector } from "@/store";
import { getImageDimensions } from "@/utils/getImageDimensions";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useEffect, useState } from "react";
import { Gallery } from "react-grid-gallery";
import { toast } from "react-toastify";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import AgregarAdjuntosFotosOT from "../modals/AgregarAdjuntosFotosOT";


interface ImagenOT {
    id: number;
    src: string;
    width: number;
    height: number;
    alt: string;
    fechaCreacion: string;
    descripcion: string;
}

function FotosAdjuntosOT() {
    const dispatch = useAppDispatch();
    const { detalleOrdenTrabajo, listaAdjuntos } = useAppSelector((state) => state.ordenTrabajo);
    const [index, setIndex] = useState(-1);
    const [imagenes, setImagenes] = useState<ImagenOT[]>([]);

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            dispatch(listaAdjuntosThunk({ ordenId: detalleOrdenTrabajo.id }));
        }
    }, [detalleOrdenTrabajo]);

    useEffect(() => {
        const adjuntosImg = listaAdjuntos.filter((a) => a.tipo === "imagen" && a.archivo);
        if (!adjuntosImg.length) {
            setImagenes([]);
            return;
        }

        (async () => {
            try {
                const imgs: ImagenOT[] = await Promise.all(
                    adjuntosImg.map(async (a) => {
                        const { width, height } = await getImageDimensions(a.archivo!);
                        return {
                            id: a.id,
                            src: a.archivo!,
                            width,
                            height,
                            alt: a.descripcion ?? "",
                            fechaCreacion: a.fecha_creacion,
                            descripcion: a.descripcion ?? "",
                        };
                    })
                );
                setImagenes(imgs);
            } catch (e) {
                console.error("Error midiendo imágenes:", e);
            }
        })();
    }, [listaAdjuntos]);

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className="text-xl">Fotos</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    {detalleOrdenTrabajo && ["pendiente", "en_proceso", "completada"].includes(detalleOrdenTrabajo.estado) && (
                        <AgregarAdjuntosFotosOT />
                    )}
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                {imagenes.length > 0 ? (
                    <>
                        <Gallery
                            images={imagenes.map((img) => ({
                                src: img.src,
                                thumbnail: img.src,
                                width: img.width,
                                height: img.height,
                                thumbnailWidth: img.width,
                                thumbnailHeight: img.height,
                            }))}
                            thumbnailImageComponent={(image) => {
                                const img = imagenes[image.index];
                                return (
                                    <div
                                        className="relative h-full w-full bg-cover bg-center"
                                        style={{ backgroundImage: `url(${img.src})` }}
                                    >
                                        <div className="absolute inset-0 bg-black opacity-30" />
                                        <div className="absolute top-0 left-0 m-4 p-4 bg-black bg-opacity-60 text-white rounded">
                                            <p className="font-bold text-lg">
                                                {dayjs(img.fechaCreacion)
                                                    .locale("es")
                                                    .format("DD/MM/YYYY HH:mm [Hrs]")}
                                            </p>
                                            <p className="mt-1">{img.descripcion}</p>
                                        </div>
                                    </div>
                                );
                            }}
                            onClick={(i) => setIndex(i)}
                            enableImageSelection={false}
                        />
                        <Lightbox
                            slides={imagenes.map((img) => ({ src: img.src }))}
                            open={index >= 0}
                            index={index}
                            close={() => setIndex(-1)}
                            toolbar={{
                                buttons: [
                                    detalleOrdenTrabajo && ["pendiente", "en_proceso", "completada"].includes(detalleOrdenTrabajo.estado) && (
                                        <div
                                            key="eliminar"
                                            className="flex items-center hover:text-red-600 text-zinc-50 transition-colors delay-75"
                                        >
                                            <Icon
                                                icon="HeroTrash"
                                                size="text-3xl"
                                                onClick={async () => {
                                                    try {
                                                        const response = await ApiService.fetchData({
                                                            url: `/api/ordenes-trabajo/${detalleOrdenTrabajo.id}/adjuntos/${imagenes[index].id}/`,
                                                            method: 'delete',
                                                        });
                                                        if (response.status === 204) {
                                                            dispatch(listaAdjuntosThunk({ ordenId: detalleOrdenTrabajo.id }));
                                                            setIndex(-1);
                                                        }
                                                    } catch (error: any) {
                                                        const mensajesError = Object.values(error.response.data).flat().join(' ');
                                                        toast.error(mensajesError || "Error al eliminar la imagen", { toastId: "ErrorEliminarImagen" });
                                                    }
                                                }}
                                            />
                                        </div>
                                    ),
                                    "close",
                                ],
                            }}
                        />
                    </>
                ) : (
                    <div>Sin imágenes</div>
                )}
            </CardBody>
        </Card>
    );
}

export default FotosAdjuntosOT