﻿import Checkbox from '@/components/form/Checkbox';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { ICotizacion, IItemCotizacion } from '@/interface/cotizaciones.interface';
import {
    listaMisClientesThunk,
    listaMisProspectosThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useCrearOCAgrupadaMutation,
    useGetCotizacionesAprobadasParaOCQuery,
} from '@/store/slices/bodega/ordenCompraApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

type TipoContraparte = 'cliente' | 'prospecto';

interface Props {
    cotizacion?: ICotizacion;
    items?: IItemCotizacion[];
}

function CrearOCDeCotizacion({ cotizacion }: Props) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { listaMisClientes, listaMisProspectos } = useAppSelector((state) => state.empresa);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    const [isOpen, setIsOpen] = useState(false);
    const [tipoContraparte, setTipoContraparte] = useState<TipoContraparte>('cliente');
    const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);
    const [cotizacionesSeleccionadas, setCotizacionesSeleccionadas] = useState<number[]>([]);

    const empresaId = personalizacionUsuario?.empresa ?? null;

    // Cargar listas al abrir
    useEffect(() => {
        if (isOpen && empresaId) {
            dispatch(listaMisClientesThunk({ id_empresa: empresaId }));
            dispatch(listaMisProspectosThunk({ id_empresa: empresaId }));
        }
    }, [isOpen, empresaId, dispatch]);

    // Preseleccionar datos si viene de una cotizacion
    useEffect(() => {
        if (isOpen && cotizacion) {
            setClienteSeleccionadoId(cotizacion.cliente ?? null);
            setCotizacionesSeleccionadas([cotizacion.id]);
        }
    }, [isOpen, cotizacion]);

    // Resetear seleccion de cotizaciones al cambiar cliente
    // (el reset se hace directamente en los handlers para evitar borrar la preselección)

    // Cotizaciones aprobadas para el cliente seleccionado
    const { data: cotizacionesElegibles = [], isFetching: cargandoCots } =
        useGetCotizacionesAprobadasParaOCQuery(
            { cliente_id: clienteSeleccionadoId! },
            { skip: !clienteSeleccionadoId },
        );

    const [crearOCAgrupada, { isLoading: creando }] = useCrearOCAgrupadaMutation();

    const listaContraparte =
        tipoContraparte === 'cliente' ? listaMisClientes : listaMisProspectos;

    const esProspecto = tipoContraparte === 'prospecto';

    const handleToggleCotizacion = (id: number) => {
        setCotizacionesSeleccionadas((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
        );
    };

    const handleConfirmar = async () => {
        if (!empresaId || !clienteSeleccionadoId || cotizacionesSeleccionadas.length === 0) return;
        try {
            const resultado = await crearOCAgrupada({
                oc_empresa: typeof empresaId === 'number' ? empresaId : Number(empresaId),
                oc_cliente: clienteSeleccionadoId,
                cotizaciones_ids: cotizacionesSeleccionadas,
            }).unwrap();
            toast.success(`OC Agrupada ${resultado.codigo} creada correctamente`);
            setIsOpen(false);
            navigate(`/compras/oc-agrupada/${resultado.id}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleCerrar = () => {
        setIsOpen(false);
        setClienteSeleccionadoId(null);
        setCotizacionesSeleccionadas([]);
        setTipoContraparte('cliente');
    };

    const puedeConfirmar =
        !!clienteSeleccionadoId &&
        cotizacionesSeleccionadas.length > 0 &&
        cotizacionesElegibles
            .filter((c) => cotizacionesSeleccionadas.includes(c.id))
            .some((c) => c.tiene_items_elegibles);

    return (
        <>
            <Tooltip text='Crear OC Agrupada'>
                <Button
                    variant='solid'
                    color='amber'
                    icon='HeroShoppingCart'
                    onClick={() => setIsOpen(true)}
                />
            </Tooltip>

            <Modal isOpen={isOpen} setIsOpen={handleCerrar}>
                <ModalHeader>
                    <span className='text-lg font-semibold'>Crear OC Agrupada</span>
                    {cotizacion && (
                        <Badge color='sky' className='ml-2'>
                            Cotizacion #{cotizacion.numero_cotizacion}
                        </Badge>
                    )}
                </ModalHeader>

                <ModalBody>
                    <div className='flex flex-col gap-5'>
                        {/* Bloque 1: tipo de contraparte */}
                        <div className='flex flex-col gap-2'>
                            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                Tipo de contraparte
                            </span>
                            <div className='flex gap-2'>
                                <Button
                                    size='sm'
                                    variant={tipoContraparte === 'cliente' ? 'solid' : 'outline'}
                                    color='blue'
                                    onClick={() => {
                                        setTipoContraparte('cliente');
                                        setClienteSeleccionadoId(null);
                                        setCotizacionesSeleccionadas([]);
                                    }}>
                                    Cliente
                                </Button>
                                <Button
                                    size='sm'
                                    variant={tipoContraparte === 'prospecto' ? 'solid' : 'outline'}
                                    color='amber'
                                    onClick={() => {
                                        setTipoContraparte('prospecto');
                                        setClienteSeleccionadoId(null);
                                        setCotizacionesSeleccionadas([]);
                                    }}>
                                    Prospecto
                                </Button>
                            </div>
                        </div>

                        {/* Bloque 2: selector de contraparte */}
                        <div className='flex flex-col gap-2'>
                            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                {tipoContraparte === 'cliente'
                                    ? 'Seleccionar cliente'
                                    : 'Seleccionar prospecto'}
                            </span>
                            {listaContraparte.length === 0 ? (
                                <span className='text-sm text-gray-500 dark:text-gray-400'>
                                    {tipoContraparte === 'cliente'
                                        ? 'No hay clientes disponibles.'
                                        : 'No hay prospectos disponibles.'}
                                </span>
                            ) : (
                                <div className='flex flex-wrap gap-2'>
                                    {listaContraparte.map((rel) => {
                                        const clienteId = rel.cliente;
                                        const nombre = rel.info_cliente?.nombre ?? String(clienteId);
                                        const seleccionado = clienteSeleccionadoId === clienteId;
                                        return (
                                            <button
                                                key={clienteId}
                                                type='button'
                                                onClick={() => {
                                                    setClienteSeleccionadoId(clienteId);
                                                    setCotizacionesSeleccionadas([]);
                                                }}
                                                className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                                                    seleccionado
                                                        ? 'border-blue-500 bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700'
                                                }`}>
                                                {nombre}
                                                {esProspecto && (
                                                    <Badge
                                                        color='amber'
                                                        className='ml-1 text-xs'>
                                                        Prospecto
                                                    </Badge>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Bloque 3: cotizaciones elegibles */}
                        {clienteSeleccionadoId && (
                            <div className='flex flex-col gap-2'>
                                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                    Cotizaciones aprobadas disponibles
                                </span>
                                {cargandoCots ? (
                                    <span className='text-sm text-gray-500'>Cargando...</span>
                                ) : cotizacionesElegibles.length === 0 ? (
                                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                                        No hay cotizaciones aprobadas con items elegibles para este{' '}
                                        {tipoContraparte}.
                                    </span>
                                ) : (
                                    <div className='flex flex-col gap-2'>
                                        {cotizacionesElegibles.map((cot) => {
                                            const seleccionada = cotizacionesSeleccionadas.includes(
                                                cot.id,
                                            );
                                            return (
                                                <label
                                                    key={cot.id}
                                                    className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition-colors ${
                                                        seleccionada
                                                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'border-gray-200 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                                                    } ${
                                                        !cot.tiene_items_elegibles
                                                            ? 'cursor-not-allowed opacity-50'
                                                            : ''
                                                    }`}>
                                                    <Checkbox
                                                        checked={seleccionada}
                                                        onChange={() =>
                                                            cot.tiene_items_elegibles &&
                                                            handleToggleCotizacion(cot.id)
                                                        }
                                                        disabled={!cot.tiene_items_elegibles}
                                                    />
                                                    <div className='flex flex-col gap-1'>
                                                        <div className='flex flex-wrap items-center gap-2'>
                                                            <span className='font-medium'>
                                                                #{cot.numero_cotizacion}
                                                            </span>
                                                            <span className='text-sm text-gray-600 dark:text-gray-400'>
                                                                {cot.nombre}
                                                            </span>
                                                            <Badge color='emerald'>
                                                                {cot.tipo_moneda === '1'
                                                                    ? 'USD'
                                                                    : cot.tipo_moneda === '3'
                                                                      ? 'UF'
                                                                      : 'CLP'}{' '}
                                                                {Number(
                                                                    cot.total_estimado,
                                                                ).toLocaleString('es-CL')}
                                                            </Badge>
                                                            {cot.estado_oc_derivado === 'pendiente_oc' && (
                                                                <Badge color='amber' variant='outline'>
                                                                    Sin OC
                                                                </Badge>
                                                            )}
                                                            {cot.estado_oc_derivado === 'en_oc' && (
                                                                <Badge color='blue' variant='outline'>
                                                                    En OC
                                                                </Badge>
                                                            )}
                                                            {cot.estado_oc_derivado === 'cerrada_comercialmente' && (
                                                                <Badge color='zinc' variant='outline'>
                                                                    Cerrada comercialmente
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {cot.proveedores_involucrados.length > 0 && (
                                                            <div className='flex flex-wrap gap-1'>
                                                                {cot.proveedores_involucrados.map(
                                                                    (prov, i) => (
                                                                        <Badge
                                                                            key={i}
                                                                            color='sky'
                                                                            variant='outline'
                                                                            className='text-xs'>
                                                                            {prov}
                                                                        </Badge>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                        {!cot.tiene_items_elegibles && (
                                                            <span className='text-xs text-amber-600 dark:text-amber-400'>
                                                                Sin items elegibles para OC
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button color='zinc' onClick={handleCerrar}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='amber'
                        icon='HeroShoppingCart'
                        isLoading={creando}
                        isDisable={!puedeConfirmar}
                        onClick={handleConfirmar}>
                        Crear OC Agrupada ({cotizacionesSeleccionadas.length}{' '}
                        cotizacion
                        {cotizacionesSeleccionadas.length !== 1 ? 'es' : ''})
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearOCDeCotizacion;