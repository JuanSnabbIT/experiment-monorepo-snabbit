import Button from "@/components/ui/Button"
import Tooltip from "@/components/ui/Tooltip"
import ApiService from "@/services/ApiService"
import { useAppDispatch } from "@/store"
import { ordenCompraApi } from "@/store/slices/bodega/ordenCompraApi"
import { getErrorMessage } from "@/utils/errorHandlers"
import { toast } from "react-toastify"
import Swal from "sweetalert2"

function AceptarORechazarOrdenCompra({id_orden, onSuccess} : {id_orden: string | number | undefined, onSuccess?: () => void}) {
    const dispatch = useAppDispatch()

    const handleAceptarORechazar = async () => {
        const result = await Swal.fire({
            title: '¿Aceptar o Rechazar Orden?',
            text: 'Si acepta o rechaza la orden no podrá volver a modificar los datos.',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Aceptar Orden',
            denyButtonText: 'Rechazar Orden',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981', // emerald-500
            denyButtonColor: '#f59e0b', // amber-500
        })

        if (result.isConfirmed) {
            // Aceptar (estado 1)
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/`, 
                    method: 'patch', 
                    headers: {'Content-Type': 'application/json'}, 
                    data: JSON.stringify({estado: "1"})
                })
                if (response.data) {
                    dispatch(ordenCompraApi.util.invalidateTags(['OrdenCompraList', 'MisOrdenesCompraList', { type: 'OrdenCompra', id: id_orden }]))
                    toast.success("Orden aceptada", {autoClose: 1000})
                    if (onSuccess) onSuccess()
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error) || "Error al aceptar la orden"
                toast.error(typeof errorMessage === 'string' ? errorMessage : "Error al aceptar la orden", {
                    toastId: "error-aceptar-oc"
                })
            }
        } else if (result.isDenied) {
            // Rechazar (estado 2)
            try {
                const response = await ApiService.fetchData({
                    url: `/api/ordenes-compra/${id_orden}/`, 
                    method: 'patch', 
                    headers: {'Content-Type': 'application/json'}, 
                    data: JSON.stringify({estado: "2"})
                })
                if (response.data) {
                    dispatch(ordenCompraApi.util.invalidateTags(['OrdenCompraList', 'MisOrdenesCompraList', { type: 'OrdenCompra', id: id_orden }]))
                    toast.success("Orden rechazada", {autoClose: 1000})
                    if (onSuccess) onSuccess()
                }
            } catch (error: unknown) {
                const errorMessage = getErrorMessage(error) || "Error al rechazar la orden"
                toast.error(typeof errorMessage === 'string' ? errorMessage : "Error al rechazar la orden", {
                    toastId: "error-rechazar-oc"
                })
            }
        }
    }

    return (
        <Tooltip text="Aceptar o Rechazar Orden">
            <Button 
                variant="solid" 
                onClick={handleAceptarORechazar} 
                color="amber" 
                icon="HeroArrowRightCircle" 
            />
        </Tooltip>
    )
}

export default AceptarORechazarOrdenCompra
