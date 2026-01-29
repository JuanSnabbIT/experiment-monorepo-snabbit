import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { ICotizacion } from '@/interface/cotizaciones.interface';
import {
    duplicarCotizacionThunk,
    listaCopiasCotizacionThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const getEstadoColor = (estadoLabel?: string): 'emerald' | 'red' | 'amber' | 'blue' | 'gray' => {
    const estado = estadoLabel?.toLowerCase() || '';
    if (estado.includes('aceptad')) return 'emerald';
    if (estado.includes('rechazad')) return 'red';
    if (estado.includes('pendiente')) return 'amber';
    if (estado.includes('enviada')) return 'blue';
    return 'gray';
};

const CopiasCotizacion = ({
    cotizacion,
    isOpen,
    setIsOpen,
}: {
    cotizacion: ICotizacion | null;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { copiasPorCotizacion } = useAppSelector((state) => state.cotizacion);
    const [isLoading, setIsLoading] = useState(false);

    const copias = cotizacion ? copiasPorCotizacion[String(cotizacion.id)] || [] : [];
    const puedeCrearCopia = cotizacion?.estado?.toLowerCase() === 'rechazada';

    useEffect(() => {
        if (!isOpen || !cotizacion) {
            return;
        }
        const cargarCopias = async () => {
            setIsLoading(true);
            try {
                await dispatch(
                    listaCopiasCotizacionThunk({ id_cotizacion: cotizacion.id }),
                ).unwrap();
            } catch (error) {
                toast.error('No fue posible cargar las copias.');
            } finally {
                setIsLoading(false);
            }
        };

        cargarCopias();
    }, [cotizacion, dispatch, isOpen]);

    const handleCrearCopia = async () => {
        if (!cotizacion) {
            return;
        }
        try {
            const nuevaCotizacion = await dispatch(
                duplicarCotizacionThunk({ id_cotizacion: cotizacion.id }),
            ).unwrap();
            toast.success(`Copia creada N ${nuevaCotizacion.numero_cotizacion}`, {
                autoClose: 1000,
            });
            setIsOpen(false);
            navigate(`/cotizacion/detalle-cotizacion/${nuevaCotizacion.numero_cotizacion}/`);
        } catch (error) {
            toast.error('No fue posible crear la copia.');
        }
    };

    if (!cotizacion) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className='text-xl'>
                    Copias de Cotizacion #{cotizacion.numero_cotizacion}
                </Badge>
            </ModalHeader>
            <ModalBody>
                {isLoading ? (
                    <div className='text-sm text-gray-500'>Cargando copias...</div>
                ) : copias.length === 0 ? (
                    <div className='text-sm text-gray-500'>No hay copias registradas.</div>
                ) : (
                    <div className='overflow-auto'>
                        <Table className='min-w-[500px] table-fixed'>
                            <THead>
                                <Tr>
                                    <Th className='text-left'>N</Th>
                                    <Th className='text-left'>Nombre</Th>
                                    <Th className='text-left'>Estado</Th>
                                    <Th className='text-left'>Fecha</Th>
                                    <Th className='text-left'>Acciones</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {copias.map((copia) => (
                                    <Tr key={copia.id}>
                                        <Td>
                                            <span className='font-semibold'>
                                                #{copia.numero_cotizacion}
                                            </span>
                                        </Td>
                                        <Td>{copia.nombre}</Td>
                                        <Td>
                                            <Badge
                                                variant='solid'
                                                color={getEstadoColor(copia.estado_label)}
                                                className='capitalize'>
                                                {copia.estado_label}
                                            </Badge>
                                        </Td>
                                        <Td>
                                            {new Date(copia.fecha_creacion).toLocaleDateString()}
                                        </Td>
                                        <Td>
                                            <Button
                                                variant='solid'
                                                color='violet'
                                                icon='HeroEye'
                                                onClick={() => {
                                                    navigate(
                                                        `/cotizacion/detalle-cotizacion/${copia.numero_cotizacion}/`,
                                                    );
                                                }}></Button>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button
                        color='red'
                        onClick={() => {
                            setIsOpen(false);
                        }}>
                        Cerrar
                    </Button>
                    {puedeCrearCopia ? (
                        <Button variant='solid' onClick={handleCrearCopia}>
                            Crear copia
                        </Button>
                    ) : null}
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default CopiasCotizacion;
