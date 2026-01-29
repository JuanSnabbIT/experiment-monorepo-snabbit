import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody } from '@/components/ui/Card';
import {
    detalleTomaInventarioThunk,
    listaItemsEnTomaInventarioThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { IDetectedBarcode, Scanner } from '@yudiel/react-qr-scanner';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModalConfirmarEscaneoItem from '../modals/ModalConfirmarEscaneoItem';
import ModalConfirmarItem from '../modals/ModalConfirmarItem';
import IniciarInventariado from '../modals/IniciarInventariado';
import PausarInventariado from '../modals/PausarInventariado';
import TerminarTomaInventario from '../modals/TerminarTomaInventario';
import CerrarTomaInventario from '../modals/CerrarTomaInventario';

function InventariarTomaInventario() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { detalleTomaInventario, listaItemsEnTomaInventario } = useAppSelector(
        (state) => state.bodega,
    );
    const [paused, setPaused] = useState<boolean>(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
    const [permissionChecked, setPermissionChecked] = useState<boolean>(false);
    const [codigos, setCodigos] = useState<IDetectedBarcode[]>([]);
    const [escaneado, setEscaneado] = useState<boolean>(false);
    const [abrirCamara, setAbrirCamara] = useState<boolean>(false);

    useEffect(() => {
        if (id) {
            dispatch(detalleTomaInventarioThunk({ id_toma: id }));
        }
    }, [id]);

    useEffect(() => {
        if (detalleTomaInventario) {
            dispatch(listaItemsEnTomaInventarioThunk({ id_toma: detalleTomaInventario.id }));
        }
    }, [detalleTomaInventario]);

    useEffect(() => {
        async function checkCameraPermission() {
            try {
                // Intentamos solicitar acceso a la cámara
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Si se concede, detenemos las pistas (para evitar que la cámara quede encendida)
                stream.getTracks().forEach((track) => track.stop());
                setHasCameraPermission(true);
            } catch (error) {
                // Si ocurre algún error (por ejemplo, si se niega el acceso), actualizamos el estado
                console.error('Error al obtener permisos de la cámara:', error);
                setHasCameraPermission(false);
                toast.error('No se pudo acceder a la cámara', {
                    toastId: 'No se pudo acceder a la cámara',
                });
            } finally {
                setPermissionChecked(true);
            }
        }
        if (abrirCamara) {
            checkCameraPermission();
        }
    }, [abrirCamara]);

    return (
        <PageWrapper isProtectedRoute={true} name='Inventariar' title='Inventariar'>
            <Subheader>
                <SubheaderLeft>
                    <Button
                        icon='HeroArrowLeft'
                        onClick={() => {
                            navigate(-1);
                        }}></Button>
                    <Badge className='text-xl'>
                        Inventariar Toma N°{detalleTomaInventario?.id}
                    </Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    {detalleTomaInventario && (
                        <>
                            {(detalleTomaInventario.ultimo_estado?.estado === 'pendiente' ||
                                detalleTomaInventario.ultimo_estado?.estado === 'pausado') && (
                                <IniciarInventariado toma={detalleTomaInventario} />
                            )}
                            {detalleTomaInventario.ultimo_estado?.estado === 'en_proceso' && (
                                <PausarInventariado toma={detalleTomaInventario} />
                            )}
                            {detalleTomaInventario.ultimo_estado?.estado === 'en_proceso' && (
                                <TerminarTomaInventario toma={detalleTomaInventario} />
                            )}
                            {detalleTomaInventario.ultimo_estado?.estado === 'terminado' && (
                                <CerrarTomaInventario toma={detalleTomaInventario} />
                            )}
                        </>
                    )}
                </SubheaderRight>
            </Subheader>
            <Container className='h-[calc(100dvh-theme(spacing.20))] w-full'>
                {/* 32 = h-32 ≈ altura de tu PageWrapper + Subheader; 
                ajústalo si tus cabeceras miden distinto */}
                <div className='grid h-full grid-rows-2 gap-4 lg:grid-cols-3 lg:grid-rows-none'>
                    <Card className='flex h-full flex-col'>
                        <CardBody className='min-h-0 flex-1'>
                            {detalleTomaInventario &&
                                detalleTomaInventario.ultimo_estado?.estado === 'en_proceso' && (
                                    <>
                                        {permissionChecked &&
                                            hasCameraPermission &&
                                            abrirCamara && (
                                                <Scanner
                                                    onScan={async (
                                                        detectedCodes: IDetectedBarcode[],
                                                    ) => {
                                                        if (!escaneado) {
                                                            if (detectedCodes.length > 0) {
                                                                for (const code of detectedCodes) {
                                                                    if (
                                                                        [
                                                                            'ean_13',
                                                                            'code_128',
                                                                            'code_93',
                                                                            'code_39',
                                                                            'upc_a',
                                                                            'upc_e',
                                                                        ].includes(code.format)
                                                                    ) {
                                                                        setPaused(true);
                                                                        console.log(detectedCodes);
                                                                        setEscaneado(true);
                                                                    } else {
                                                                        toast.error(
                                                                            'Formato de código de barras no soportado',
                                                                        );
                                                                        setPaused(false);
                                                                    }
                                                                }
                                                                setCodigos(detectedCodes);
                                                            } else {
                                                                setPaused(false);
                                                                toast.error(
                                                                    'No se detectaron códigos de barras',
                                                                );
                                                            }
                                                        }
                                                    }}
                                                    onError={(error) => {
                                                        console.error(
                                                            'Error en el escáner:',
                                                            error,
                                                        );
                                                        toast.error(
                                                            'Error al acceder a la cámara.',
                                                        );
                                                    }}
                                                    constraints={{
                                                        facingMode: 'environment',
                                                        width: { ideal: 1280 },
                                                        height: { ideal: 720 },
                                                    }}
                                                    formats={[
                                                        'ean_13',
                                                        'code_128',
                                                        'code_39',
                                                        'upc_a',
                                                        'upc_e',
                                                    ]}
                                                    paused={paused}
                                                    allowMultiple={false}
                                                    scanDelay={300}
                                                    styles={{
                                                        container: {
                                                            width: '100%',
                                                            aspectRatio: '1 / 1',
                                                        },
                                                        video: {
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        },
                                                    }}
                                                    components={{ finder: false }} // ⬅️ apaga la mira original
                                                    classNames={{ container: 'relative' }} // necesario para overlay absoluto
                                                >
                                                    {/* Overlay rojo centrado (pointer-events-none para no interceptar toques) */}
                                                    <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                                                        {/*  ↳  ancho = alto = 90 %, borde 4 px */}
                                                        <div className='h-[90%] w-[90%] border-4 border-red-500' />
                                                    </div>
                                                </Scanner>
                                            )}
                                        {!abrirCamara && (
                                            <div>
                                                <Button
                                                    size='lg'
                                                    variant='solid'
                                                    onClick={() => {
                                                        setAbrirCamara(true);
                                                    }}>
                                                    Abrir Camara
                                                </Button>
                                            </div>
                                        )}
                                        {permissionChecked && !hasCameraPermission && (
                                            <div>Sin Permisos de Camara</div>
                                        )}
                                    </>
                                )}
                        </CardBody>
                    </Card>

                    <Card className='flex h-full flex-col overflow-hidden lg:col-span-2'>
                        <CardBody className='flex-1 space-y-4 overflow-y-auto'>
                            {listaItemsEnTomaInventario.length > 0 && (
                                <>
                                    <div className='grid min-w-[700px] grid-cols-12'>
                                        <div className='col-span-4'>
                                            <Badge>Nombre</Badge>
                                        </div>
                                        <div className='col-span-2'>
                                            <Badge>Cantidad Original</Badge>
                                        </div>
                                        <div className='col-span-2'>
                                            <Badge>Cantidad Encontrada</Badge>
                                        </div>
                                        <div className='col-span-2'>
                                            <Badge>Estado</Badge>
                                        </div>
                                        <div className='col-span-2'>
                                            <Badge>Acciones</Badge>
                                        </div>
                                    </div>
                                    {listaItemsEnTomaInventario.map((item, index) => (
                                        <div
                                            className='grid min-w-[700px] grid-cols-12 rounded-xl border border-blue-500'
                                            key={index}>
                                            <div className='col-span-4 flex flex-col border-r border-r-blue-500 p-2'>
                                                <div>{item.nombre_item}</div>
                                                <div className='text-sm'>
                                                    Bodega: {item.nombre_bodega}
                                                </div>
                                            </div>
                                            <div className='col-span-2 border-r border-r-blue-500 p-2'>
                                                {item.cantidad_original}
                                            </div>
                                            <div className='col-span-2 border-r border-r-blue-500 p-2'>
                                                {item.cantidad_encontrada}
                                            </div>
                                            <div className='col-span-2 border-r border-r-blue-500 p-2'>
                                                {item.estado_label}
                                            </div>
                                            <div className='col-span-2 flex items-center p-2'>
                                                {detalleTomaInventario?.ultimo_estado?.estado ===
                                                    'en_proceso' &&
                                                    item.estado === 'por_inventariar' && (
                                                        <ModalConfirmarItem item={item} />
                                                    )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <ModalConfirmarEscaneoItem
                        isOpen={escaneado}
                        setIsOpen={setEscaneado}
                        codigos={codigos}
                        setCodigos={setCodigos}
                        paused={paused}
                        setPaused={setPaused}
                    />
                </div>
            </Container>
        </PageWrapper>
    );
}

export default InventariarTomaInventario;
