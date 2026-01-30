import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import {
    IItemEnOrdenCompra,
    IItemOrdenCompraEnStock,
    IOrdenCompra,
} from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

type ResultadoConfirmacion = {
    itemsConCantidadesDesiguales: {
        item_orden: IItemEnOrdenCompra;
        item_stock: IItemOrdenCompraEnStock | undefined;
    }[];
    itemsSinBodegaYConCantidad: {
        item_orden: IItemEnOrdenCompra;
        item_stock: IItemOrdenCompraEnStock;
    }[];
    tiene_fecha: boolean;
    tiene_cotizacion: boolean;
    tiene_bodega_unica: boolean;
    tiene_items_recibir: boolean;
    bodega_unica_id: number | null;
};

function ConfirmarRecibirOrden({
    itemsARecibir,
    detalleOrdenCompra,
}: {
    itemsARecibir: {
        item_orden: IItemEnOrdenCompra;
        item_stock: IItemOrdenCompraEnStock | undefined;
    }[];
    detalleOrdenCompra: IOrdenCompra | undefined;
}) {
    const navigate = useNavigate();

    function verificarCondiciones() {
        const itemsConCantidadesDesiguales: {
            item_orden: IItemEnOrdenCompra;
            item_stock: IItemOrdenCompraEnStock | undefined;
        }[] = [];

        const itemsSinBodegaYConCantidad: {
            item_orden: IItemEnOrdenCompra;
            item_stock: IItemOrdenCompraEnStock;
        }[] = [];

        const tiene_fecha: boolean =
            detalleOrdenCompra && detalleOrdenCompra.fecha_compra ? true : false;
        const tiene_cotizacion = Boolean(detalleOrdenCompra?.relacion_cotizacion);
        const bodegasRecibo = new Set<number>();
        let tiene_items_recibir = false;

        for (const { item_orden, item_stock } of itemsARecibir) {
            if (item_stock && item_orden.cantidad !== item_stock.cantidad) {
                itemsConCantidadesDesiguales.push({ item_orden, item_stock });
            }

            if (item_stock && item_stock.bodega_temporal === null && item_stock.cantidad > 0) {
                itemsSinBodegaYConCantidad.push({ item_orden, item_stock });
            }

            if (item_stock && item_stock.cantidad > 0) {
                tiene_items_recibir = true;
                if (item_stock.bodega_temporal !== null) {
                    bodegasRecibo.add(item_stock.bodega_temporal);
                }
            }
        }

        const tiene_bodega_unica = bodegasRecibo.size <= 1;
        const bodega_unica_id = bodegasRecibo.size === 1 ? Array.from(bodegasRecibo)[0] : null;

        return {
            itemsConCantidadesDesiguales,
            itemsSinBodegaYConCantidad,
            tiene_fecha,
            tiene_cotizacion,
            tiene_bodega_unica,
            tiene_items_recibir,
            bodega_unica_id,
        };
    }

    const buildPayload = (resul: ResultadoConfirmacion) => {
        if (resul && resul.itemsConCantidadesDesiguales.length === 0) {
            return { estado: '5' };
        }
        return {
            estado: '4',
            items: itemsARecibir.map((value) => ({
                item_oc_id: value.item_orden.id,
                cantidad: value.item_stock?.cantidad ?? 0,
            })),
        };
    };

    const handleConfirmShow = async () => {
        const resul = verificarCondiciones();

        let guiaPendienteData: { existe: boolean; guia_id: number | null } = {
            existe: false,
            guia_id: null,
        };

        // Fetch guia pendiente if conditions allow
        if (
            detalleOrdenCompra?.id &&
            resul.tiene_cotizacion &&
            resul.tiene_bodega_unica &&
            resul.tiene_items_recibir &&
            resul.bodega_unica_id
        ) {
            try {
                const response = await ApiService.fetchData<{
                    existe: boolean;
                    guia_id: number | null;
                }>({
                    url: `/api/ordenes-compra/${detalleOrdenCompra.id}/guia-pendiente/`,
                    method: 'get',
                    params: { bodega_id: resul.bodega_unica_id },
                });
                guiaPendienteData = response.data;
            } catch (error) {
                console.error('Error fetching guia pendiente', error);
            }
        }

        const puedeConfirmar = resul.itemsSinBodegaYConCantidad.length === 0 && resul.tiene_fecha;
        const puedeCrearGuia =
            puedeConfirmar &&
            resul.tiene_cotizacion &&
            resul.tiene_bodega_unica &&
            resul.tiene_items_recibir;

        // Construct Warnings HTML
        let htmlContent = '<div class="text-left text-sm space-y-2">';

        if (resul.itemsConCantidadesDesiguales.length > 0) {
            htmlContent +=
                '<p class="font-bold text-amber-600 mb-1">Items que se recibirán de manera parcial:</p>';
            htmlContent += '<ul class="list-disc ml-5 mb-3">';
            resul.itemsConCantidadesDesiguales.forEach((it) => {
                htmlContent += `<li>${it.item_orden.item_empresa.nombre} (Esperado: ${it.item_orden.cantidad}, Recibido: ${it.item_stock?.cantidad})</li>`;
            });
            htmlContent += '</ul>';
        }

        if (resul.itemsSinBodegaYConCantidad.length > 0) {
            htmlContent += '<p class="font-bold text-red-600 mb-1">Items sin bodega asignada:</p>';
            htmlContent += '<ul class="list-disc ml-5 mb-3">';
            resul.itemsSinBodegaYConCantidad.forEach((it) => {
                htmlContent += `<li>${it.item_orden.item_empresa.nombre}</li>`;
            });
            htmlContent += '</ul>';
        }

        if (!resul.tiene_fecha) {
            htmlContent +=
                '<p class="text-red-500">• Falta ingresar la <b>Fecha de Compra</b> en el panel lateral.</p>';
        }

        if (!resul.tiene_items_recibir) {
            htmlContent +=
                '<p class="text-amber-500">• No hay ítems con cantidad mayor a 0 para recibir.</p>';
        }

        if (puedeConfirmar && !puedeCrearGuia) {
            htmlContent +=
                '<p class="font-bold mt-4 text-zinc-700">Restricciones para generar Guía de Despacho:</p>';
            if (!resul.tiene_cotizacion)
                htmlContent +=
                    '<p class="text-xs text-zinc-500">• La orden no tiene una cotización asociada.</p>';
            if (!resul.tiene_bodega_unica)
                htmlContent +=
                    '<p class="text-xs text-zinc-500">• Se requiere una sola bodega de recepción para la guía.</p>';
        }

        if (puedeConfirmar && resul.itemsConCantidadesDesiguales.length === 0) {
            htmlContent +=
                '<p class="mt-4 text-zinc-600 italic">Al confirmar la recepción total, la orden pasará a estado finalizado.</p>';
        }

        htmlContent += '</div>';

        const labelCrearGuia = guiaPendienteData.existe
            ? 'Agregar a Guía Existente'
            : 'Guardar y Crear Guía';

        if (!puedeConfirmar) {
            await Swal.fire({
                title: 'No se puede confirmar',
                html: htmlContent,
                icon: 'error',
                confirmButtonText: 'Entendido',
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Confirmar Recepción de Items',
            html: htmlContent,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: puedeCrearGuia,
            confirmButtonText: 'Solo Guardar Recepción',
            denyButtonText: puedeCrearGuia ? labelCrearGuia : undefined,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            denyButtonColor: '#10b981', // emerald-500
        });

        if (result.isConfirmed) {
            // Guardar sin guía
            try {
                const data = buildPayload(resul);
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/completar_orden_compra/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                });
                if (response.data) {
                    toast.success('Orden actualizada', { autoClose: 1000 });
                    navigate('/compras/lista-ordenes-compra/');
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        } else if (result.isDenied) {
            // Guardar y crear guía
            try {
                const data = buildPayload(resul);
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${detalleOrdenCompra?.id}/completar-y-crear-guia/`,
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                });
                if (response.data) {
                    const mensajeExito = guiaPendienteData.existe
                        ? 'Orden actualizada y guía existente'
                        : 'Orden actualizada y guía creada';
                    toast.success(mensajeExito, { autoClose: 1000 });
                    navigate('/compras/lista-ordenes-compra/');
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        }
    };

    return (
        <Tooltip text='Confirmar Recepción'>
            <Button variant='solid' onClick={handleConfirmShow}>
                Confirmar Recibir Items
            </Button>
        </Tooltip>
    );
}

export default ConfirmarRecibirOrden;
