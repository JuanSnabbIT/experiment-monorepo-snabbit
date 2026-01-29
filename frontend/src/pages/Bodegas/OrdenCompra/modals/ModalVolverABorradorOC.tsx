import Button from "@/components/ui/Button"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { ordenCompraApi } from "@/store/slices/bodega/ordenCompraApi"
import { getErrorMessage } from "@/utils/errorHandlers"
import { toast } from "react-toastify"
import Swal from "sweetalert2"

function ModalVolverABorradorOC({id_orden, onSuccess, disabled} : {id_orden: string | number, onSuccess?: () => void, disabled?: boolean}) {
    const dispatch = useAppDispatch()

    const handleVolverABorrador = async () => {
        const result = await Swal.fire({
            title: '¿Volver a estado borrador?',
            text: 'Tendrá que aprobar nuevamente la orden y podrá volver a editarla.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, volver a borrador',
            cancelButtonText: 'Cancelar'
        })

        if (result.isConfirmed) {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/`, 
                    method: 'patch', 
                    headers: {'Content-Type': 'application/json'}, 
                    data: JSON.stringify({estado: "-"})
                })
                if (response.data) {
                    toast.success('Orden devuelta al estado "Borrador"', {autoClose: 1000})
                    dispatch(ordenCompraApi.util.invalidateTags(['OrdenCompraList', 'MisOrdenesCompraList', { type: 'OrdenCompra', id: id_orden }]))
                    if (onSuccess) onSuccess()
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error) || "Error al volver a borrador"
                toast.error(typeof errorMessage === 'string' ? errorMessage : "Error al volver a borrador", {
                    toastId: "error-volver-borrador"
                })
            }
        }
    }

    return (
        <Tooltip text="Volver a estado borrador">
            <Button 
                variant="solid" 
                icon="HeroArrowUturnLeft" 
                color="zinc" 
                isDisable={!!disabled} 
                onClick={handleVolverABorrador}
            />
        </Tooltip>
    )
}

export default ModalVolverABorradorOC
