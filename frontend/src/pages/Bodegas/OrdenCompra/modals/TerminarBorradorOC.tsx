import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { useAppDispatch } from '@/store';
import { ordenCompraApi } from '@/store/slices/bodega/ordenCompraApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

function TerminarBorradorOC({
    id_orden,
    onSuccess,
}: {
    id_orden: string | number | undefined;
    onSuccess?: () => void;
}) {
    const dispatch = useAppDispatch();

    const handleTerminarBorrador = async () => {
        const result = await Swal.fire({
            title: '¿Terminar Borrador?',
            text: 'No podrá modificar los datos de la orden más adelante.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b', // amber-500
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, terminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ estado: '0' }),
                });
                if (response.data) {
                    toast.success('Orden de compra terminada.', { autoClose: 1000 });
                    dispatch(
                        ordenCompraApi.util.invalidateTags([
                            'OrdenCompraList',
                            'MisOrdenesCompraList',
                            { type: 'OrdenCompra', id: id_orden },
                        ]),
                    );
                    if (onSuccess) {
                        onSuccess();
                    }
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error) || 'Error al terminar borrador';
                toast.error(
                    typeof errorMessage === 'string' ? errorMessage : 'Error al terminar borrador',
                    {
                        toastId: 'error-terminar-borrador',
                    },
                );
            }
        }
    };

    return (
        <Tooltip text='Terminar Borrador'>
            <Button variant='solid' color='amber' onClick={handleTerminarBorrador}>
                Terminar Borrador
            </Button>
        </Tooltip>
    );
}

export default TerminarBorradorOC;
