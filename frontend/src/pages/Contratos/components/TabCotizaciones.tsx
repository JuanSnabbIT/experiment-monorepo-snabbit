import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { ICotizacionVinculadaResumen } from '@/interface/contrato.interface';
import { useDesvincularCotizacionMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import priceFormat from '@/utils/priceFormat.util';
import { useState } from 'react';
import { toast } from 'react-toastify';
import ModalVincularCotizacion from '../modals/ModalVincularCotizacion';
import { ITabCotizacionesProps } from './contrato.types';

const TabCotizaciones = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
}: ITabCotizacionesProps) => {
    const [modalVincular, setModalVincular] = useState(false);
    const [expandedIds, setExpandedIds] = useState<number[]>([]);
    const [desvincular, { isLoading: desvinculando }] = useDesvincularCotizacionMutation();

    if (detalleContratoEmpresaCliente.tipo !== 'venta') return null;

    const cotizaciones = detalleContratoEmpresaCliente.cotizaciones_vinculadas ?? [];

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleDesvincular = async (cotizacionId: number) => {
        try {
            await desvincular({
                contratoId: detalleContratoEmpresaCliente.id,
                cotizacion_id: cotizacionId,
            }).unwrap();
            toast.success('Cotización desvinculada', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const totalConsolidado = cotizaciones.reduce(
        (acc: number, c: ICotizacionVinculadaResumen) => acc + (c.total_estimado ?? 0),
        0,
    );

    return (
        <>
            <Card>
                <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                    <CardHeaderChild>
                        <div className='text-xl font-bold text-blue-500'>Cotizaciones</div>
                        {cotizaciones.length > 0 && (
                            <Badge variant='outline' color='blue'>
                                {cotizaciones.length}
                            </Badge>
                        )}
                    </CardHeaderChild>
                    <CardHeaderChild>
                        {puedeEditar && (
                            <Button
                                variant='outline'
                                color='blue'
                                icon='HeroPlus'
                                className='text-blue-500'
                                onClick={() => setModalVincular(true)}>
                                Vincular cotizaciones
                            </Button>
                        )}
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='p-0'>
                    <div className='border-b border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700'>
                        Cotizaciones aceptadas asociadas a este contrato de venta.
                    </div>

                    {cotizaciones.length === 0 ? (
                        <div className='p-4 text-sm text-zinc-500'>
                            Sin cotizaciones vinculadas
                        </div>
                    ) : (
                        <div className='divide-y divide-zinc-100 dark:divide-zinc-700'>
                            {cotizaciones.map((cot: ICotizacionVinculadaResumen) => {
                                const isExpanded = expandedIds.includes(cot.id);
                                return (
                                    <div key={cot.id}>
                                        {/* Row principal */}
                                        <div className='flex items-center justify-between px-4 py-3'>
                                            <div
                                                className='flex flex-1 cursor-pointer items-center gap-3'
                                                onClick={() => toggleExpand(cot.id)}
                                                role='button'
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ')
                                                        toggleExpand(cot.id);
                                                }}>
                                                <Button
                                                    icon={
                                                        isExpanded
                                                            ? 'HeroChevronDown'
                                                            : 'HeroChevronRight'
                                                    }
                                                    size='sm'
                                                    className='!p-0'
                                                />
                                                <div>
                                                    <span className='font-medium'>
                                                        {cot.numero_cotizacion
                                                            ? `#${cot.numero_cotizacion} — `
                                                            : ''}
                                                        {cot.nombre}
                                                    </span>
                                                    <div className='flex items-center gap-2 text-xs text-zinc-500'>
                                                        <Badge
                                                            variant='outline'
                                                            color='blue'
                                                            className='text-xs'>
                                                            {cot.tipo_moneda_label}
                                                        </Badge>
                                                        <span>
                                                            Total:{' '}
                                                            {priceFormat(cot.total_estimado)}
                                                        </span>
                                                        <span>
                                                            {cot.items_count} item(s)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {puedeEditar && (
                                                <Tooltip text='Desvincular'>
                                                    <Button
                                                        icon='HeroXMark'
                                                        size='sm'
                                                        color='red'
                                                        isLoading={desvinculando}
                                                        onClick={() =>
                                                            handleDesvincular(cot.id)
                                                        }
                                                    />
                                                </Tooltip>
                                            )}
                                        </div>

                                        {/* Detalle expandido — items */}
                                        {isExpanded && cot.items.length > 0 && (
                                            <div className='bg-zinc-50 px-8 pb-3 dark:bg-zinc-800/50'>
                                                <Table>
                                                    <THead>
                                                        <Tr>
                                                            <Th>Item</Th>
                                                            <Th>Cantidad</Th>
                                                            <Th>P. Unitario</Th>
                                                            <Th>Total</Th>
                                                        </Tr>
                                                    </THead>
                                                    <TBody>
                                                        {cot.items.map((item) => (
                                                            <Tr key={item.id}>
                                                                <Td>{item.nombre}</Td>
                                                                <Td>{item.cantidad}</Td>
                                                                <Td>
                                                                    {priceFormat(
                                                                        item.precio_unitario,
                                                                    )}
                                                                </Td>
                                                                <Td>
                                                                    {priceFormat(item.costo_total)}
                                                                </Td>
                                                            </Tr>
                                                        ))}
                                                    </TBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Total consolidado */}
                            <div className='flex items-center justify-between bg-zinc-100 px-4 py-3 font-semibold dark:bg-zinc-800'>
                                <span>Total consolidado ({cotizaciones.length} cotizaciones)</span>
                                <span>{priceFormat(totalConsolidado)}</span>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            <ModalVincularCotizacion
                isOpen={modalVincular}
                onClose={() => setModalVincular(false)}
                contratoId={detalleContratoEmpresaCliente.id}
                cotizacionesYaVinculadas={cotizaciones.map(
                    (c: ICotizacionVinculadaResumen) => c.id,
                )}
            />
        </>
    );
};

export default TabCotizaciones;
