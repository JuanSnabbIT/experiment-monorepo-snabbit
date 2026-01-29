import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import ApiService from "@/services/ApiService";
import { confirmAlert } from "@/utils/sweetAlert";
import { toast } from "react-toastify";

function RechazarCotizacion({ 
    cotizacionId, 
    onRechazarChange 
}: { 
    cotizacionId: number | undefined, 
    onRechazarChange?: () => void 
}) {
    const handleRechazar = async () => {
        const confirmed = await confirmAlert({
            title: "Rechazar Cotización",
            text: "¿Seguro que desea rechazar la cotización?",
            confirmText: "Rechazar Cotización",
            cancelText: "Cancelar",
            icon: "warning",
            confirmColor: "#ef4444",
        });

        if (confirmed) {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/cotizaciones/${cotizacionId}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ estado: "rechazada" })
                });
                if (response.data) {
                    toast.success("Cotización Rechazada", { autoClose: 1000 });
                    if (onRechazarChange) onRechazarChange();
                }
            } catch (error: any) {
                const errorMsg = error.response?.data?.detail || error.message || error;
                toast.error(`Error al rechazar la cotización: ${errorMsg}`);
            }
        }
    };

    return (
        <Tooltip text="Rechazar Cotización">
            <Button 
                variant="solid" 
                color="red" 
                icon="HeroHandThumbDown" 
                onClick={handleRechazar} 
            />
        </Tooltip>
    );
}

export default RechazarCotizacion;