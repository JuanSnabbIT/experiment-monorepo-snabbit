import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { listaFotosDelEquipoThunk, useAppDispatch, useAppSelector } from '@/store';
import { useEffect, useState } from 'react';
import { Gallery, Image } from 'react-grid-gallery';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

function FotosDelEquipoEnDetalleEquipo() {
    const dispatch = useAppDispatch();
    const { detalleEquipoEmpresa, listaFotosDelEquipo } = useAppSelector((state) => state.recursos);
    const [index, setIndex] = useState(-1);
    const [images, setImages] = useState<Image[]>([]);
    const [slides, setSlides] = useState<{ src: string }[]>();

    const handleClick = (index: number, _item: Image) => setIndex(index);

    useEffect(() => {
        if (detalleEquipoEmpresa) {
            dispatch(listaFotosDelEquipoThunk({ id_equipo: detalleEquipoEmpresa.id }));
        }
    }, [detalleEquipoEmpresa]);

    useEffect(() => {
        if (listaFotosDelEquipo.length > 0) {
            setImages(
                listaFotosDelEquipo.map((imagen) => ({
                    src: imagen.imagen,
                    height: 240,
                    width: 320,
                })),
            );
            setSlides(listaFotosDelEquipo.map((imagen) => ({ src: imagen.imagen })));
        }
    }, [listaFotosDelEquipo]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>Fotos</Badge>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody>
                    {listaFotosDelEquipo.length > 0 ? (
                        <div>
                            <Gallery
                                images={images}
                                onClick={handleClick}
                                enableImageSelection={false}
                                rowHeight={240}
                                thumbnailImageComponent={(image) => (
                                    <div
                                        className='relative h-full w-full bg-cover bg-center'
                                        style={{
                                            backgroundImage: `url(${listaFotosDelEquipo[image.index].imagen})`,
                                        }}>
                                        <div className='absolute inset-0 bg-black opacity-30'></div>
                                        <div className='absolute left-0 top-0 m-4 rounded bg-black bg-opacity-60 p-4 text-white'>
                                            <p className='text-lg font-bold'>
                                                {listaFotosDelEquipo[image.index].nombre_usuario},{' '}
                                                {listaFotosDelEquipo[image.index].fecha_tomada}
                                            </p>
                                            <p className='mt-1'>
                                                {listaFotosDelEquipo[image.index].descripcion}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            />
                            <Lightbox
                                slides={slides}
                                open={index >= 0}
                                index={index}
                                close={() => setIndex(-1)}
                            />
                        </div>
                    ) : (
                        <div>Sin Fotos</div>
                    )}
                </CardBody>
            </Card>
        </>
    );
}

export default FotosDelEquipoEnDetalleEquipo;

// <div className="w-full h-full">
//     <Swiper
//         spaceBetween={50}
//         pagination={true}
//         modules={[Pagination]}
//     >
//         {listaFotosDelEquipo.map((foto, index) => (
//             <SwiperSlide key={index}>
//                 <div className="relative h-[400px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${foto.imagen})`}}>
//                     <div className="absolute inset-0 bg-black opacity-30"></div>
//                     <div className="absolute top-0 left-0 m-4 p-4 bg-black bg-opacity-60 text-white rounded">
//                         <p className="font-bold text-lg">{foto.nombre_usuario}, {foto.fecha_tomada} <Button size="sm" variant="solid">Ver Más</Button></p>
//                         <p className="mt-1">{foto.descripcion}</p>
//                     </div>
//                 </div>
//             </SwiperSlide>
//         ))}
//     </Swiper>
// </div>
