import Button from '@/components/ui/Button';
import ApiService from '@/services/ApiService';
import { useAppDispatch } from '@/store';
import { ordenCompraApi } from '@/store/slices/bodega/ordenCompraApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

function EliminarItemOrdenCompra({
    id_item,
    id_orden,
}: {
    id_item: number;
    id_orden: string | number | undefined;
}) {
    const dispatch = useAppDispatch();

    const handleEliminarItem = async () => {
        const result = await Swal.fire({
            title: '¿Está seguro de eliminar este item?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // red-500
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/items-en-orden-compra/${id_item}/`,
                    method: 'delete',
                });
                if (response.status === 204) {
                    toast.success('Item Eliminado', { autoClose: 1000 });
                    dispatch(
                        ordenCompraApi.util.invalidateTags([
                            { type: 'OrdenCompra', id: id_orden },
                            { type: 'OrdenCompraItems', id: id_orden },
                        ]),
                    );
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error) || 'Error al eliminar el item';
                toast.error(
                    typeof errorMessage === 'string' ? errorMessage : 'Error al eliminar el item',
                    {
                        toastId: 'error-eliminar-item-oc',
                    },
                );
            }
        }
    };

    return (
        <Button className='m-2' variant='solid' color='red' onClick={handleEliminarItem}>
            Eliminar
        </Button>
    );
}

export default EliminarItemOrdenCompra;
