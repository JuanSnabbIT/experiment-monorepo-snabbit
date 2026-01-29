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
    listaItemsEnCotizacionThunk,
    listaOrdenesDeCompraCotizacionThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ICotizacion, IItemCotizacion } from '@/interface/cotizaciones.interface';

function CrearOCDeCotizacion({
    cotizacion,
    items = [],
}: {
    cotizacion: ICotizacion;
    items: IItemCotizacion[];
}) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { listaOrdenesDeCompraCotizacion } = useAppSelector((state) => state.cotizacion);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [proveedores, setProveedores] = useState<
        { id: string; nombre: string; moneda: string }[]
    >([]);
    const [creandoOCProveedor, setCreandoOCProveedor] = useState<string | null>(null);
    const [creandoTodas, setCreandoTodas] = useState<boolean>(false);

    useEffect(() => {
        if (cotizacion?.id) {
            dispatch(listaOrdenesDeCompraCotizacionThunk({ id_cotizacion: cotizacion.id }));
        }
        // Limpiar proveedores al cambiar de cotización
        return () => {
            setProveedores([]);
        };
    }, [cotizacion?.id, dispatch]);

    useEffect(() => {
        if (isOpen && cotizacion) {
            dispatch(listaOrdenesDeCompraCotizacionThunk({ id_cotizacion: cotizacion.id }));
            dispatch(listaItemsEnCotizacionThunk({ id_cotizacion: cotizacion.id }));
        }
    }, [isOpen, cotizacion, dispatch]);

    useEffect(() => {
        if (items.length > 0 && items.filter((item) => item.item_empresa).length > 0 && isOpen) {
            let lista_proveedores: { id: string; nombre: string; moneda: string }[] = [];
            items
                .filter((item) => item.item_empresa && item.aprobado)
                .forEach((item) => {
                    if (item.proveedor_empresa && item.nombre_proveedor) {
                        if (
                            !lista_proveedores.some(
                                (pro) => pro.id === item.proveedor_empresa?.toString(),
                            )
                        ) {
                            lista_proveedores = [
                                ...lista_proveedores,
                                {
                                    id: item.proveedor_empresa?.toString(),
                                    nombre: item.nombre_proveedor,
                                    moneda: item.tipo_moneda_proveedor_label || 'CLP',
                                },
                            ];
                        }
                    }
                });
            setProveedores(lista_proveedores);
        }
    }, [items, isOpen]);

    const handleCrearOCProveedor = async (proveedorId: string) => {
        if (!cotizacion) return;
        try {
            if (creandoTodas) return;
            setCreandoOCProveedor(proveedorId);
            const response = await ApiService.fetchData<{ id: number }>({
                url: `/api/cotizaciones/${cotizacion.id}/crear-orden-compra/`,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                data: { proveedor_id: proveedorId },
            });
            if (response.data?.id) {
                toast.success('Orden creada', { autoClose: 1000 });
                navigate(`/compras/detalle-orden-compra/${response.data.id}`);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Error al crear la orden de compra');
        } finally {
            setCreandoOCProveedor(null);
        }
    };

    const tieneOrdenCompra = listaOrdenesDeCompraCotizacion.length > 0;
    const proveedoresPendientes = proveedores.filter(
        (prov) => !listaOrdenesDeCompraCotizacion.some((oc) => oc.proveedor.toString() === prov.id),
    );
    const mostrarCrearTodas = proveedoresPendientes.length > 1;

    const handleCrearTodasOCs = async () => {
        if (!cotizacion || proveedoresPendientes.length === 0 || creandoTodas) return;
        try {
            setCreandoTodas(true);
            for (const proveedor of proveedoresPendientes) {
                setCreandoOCProveedor(proveedor.id);
                try {
                    const response = await ApiService.fetchData<{ id: number }>({
                        url: `/api/cotizaciones/${cotizacion.id}/crear-orden-compra/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: { proveedor_id: proveedor.id },
                    });
                    if (response.data?.id) {
                        toast.success('Orden creada', { autoClose: 1000 });
                    }
                } catch (error: any) {
                    toast.error(
                        error?.response?.data?.error || 'Error al crear la orden de compra',
                    );
                }
            }
            dispatch(listaOrdenesDeCompraCotizacionThunk({ id_cotizacion: cotizacion.id }));
        } finally {
            setCreandoOCProveedor(null);
            setCreandoTodas(false);
        }
    };

    return (
        <>
            <Tooltip text={tieneOrdenCompra ? 'Gestionar Órdenes de Compra' : 'Crear OC'}>
                <Button
                    variant='solid'
                    color={tieneOrdenCompra ? 'violet' : 'amber'}
                    icon={tieneOrdenCompra ? 'HeroEye' : 'HeroShoppingCart'}
                    onClick={() => setIsOpen(true)}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>
                        Órdenes de Compra - Cotización #{cotizacion?.numero_cotizacion}
                    </Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-3'>
                        {mostrarCrearTodas && (
                            <div className='flex justify-end'>
                                <Button
                                    size='sm'
                                    variant='solid'
                                    color='amber'
                                    icon='HeroShoppingCart'
                                    isLoading={creandoTodas}
                                    onClick={handleCrearTodasOCs}>
                                    Crear OCs
                                </Button>
                            </div>
                        )}
                        {proveedores.length === 0 ? (
                            <div className='text-gray-600'>
                                No hay proveedores con ítems en esta cotización.
                            </div>
                        ) : (
                            proveedores.map((prov, index) => {
                                const oc = listaOrdenesDeCompraCotizacion.find(
                                    (oc) => oc.proveedor.toString() === prov.id,
                                );
                                return (
                                    <div
                                        key={index}
                                        className='flex flex-row items-center justify-between gap-3 rounded border p-3 hover:bg-gray-50'>
                                        <div className='flex flex-col gap-1'>
                                            <div className='flex items-center gap-2'>
                                                <Badge color='sky'>{prov.nombre}</Badge>
                                                <Badge
                                                    variant='outline'
                                                    className='border-gray-300 text-gray-500'>
                                                    {prov.moneda}
                                                </Badge>
                                                {oc && <Badge color='violet'>{oc.codigo}</Badge>}
                                            </div>
                                            {oc ? (
                                                <div className='text-sm text-gray-600'>
                                                    Estado: {oc.estado_label}
                                                </div>
                                            ) : (
                                                <div className='text-sm text-gray-600'>
                                                    Sin orden de compra
                                                </div>
                                            )}
                                            <div className='mt-2 text-xs text-gray-500'>
                                                <strong>Items aprobados:</strong>
                                                <ul className='mt-1 list-disc pl-4'>
                                                    {items
                                                        .filter(
                                                            (item) =>
                                                                item.proveedor_empresa?.toString() ===
                                                                    prov.id && item.aprobado,
                                                        )
                                                        .map((item, idx) => (
                                                            <li key={idx}>
                                                                {item.cantidad}x{' '}
                                                                {item.nombre_item ||
                                                                    item.nombre ||
                                                                    'Item sin nombre'}
                                                            </li>
                                                        ))}
                                                </ul>
                                            </div>
                                        </div>
                                        {oc ? (
                                            <Button
                                                size='sm'
                                                variant='solid'
                                                color='violet'
                                                icon='HeroEye'
                                                onClick={() => {
                                                    navigate(
                                                        `/compras/detalle-orden-compra/${oc.id}`,
                                                    );
                                                    setIsOpen(false);
                                                }}>
                                                Ver OC
                                            </Button>
                                        ) : (
                                            <Button
                                                size='sm'
                                                variant='solid'
                                                color='amber'
                                                icon='HeroShoppingCart'
                                                isLoading={
                                                    creandoOCProveedor === prov.id || creandoTodas
                                                }
                                                onClick={() => handleCrearOCProveedor(prov.id)}>
                                                Crear OC
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>
                            Cerrar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearOCDeCotizacion;
