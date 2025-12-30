import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { ICompra } from "@/interface/bodega.interface";
import ApiService from "@/services/ApiService";
import { confirmAlert } from "@/utils/sweetAlert";
import { listaComprasThunk, useAppDispatch } from "@/store";
import { toast } from "react-toastify";

function EliminarCompra({ compra }: { compra: ICompra }) {
    const dispatch = useAppDispatch();

    const handleDelete = async () => {
        const ok = await confirmAlert({
            title: "Eliminar compra",
            text: "Seguro que quieres eliminar la compra?",
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            icon: "warning",
            confirmColor: "#dc2626",
        });
        if (!ok) return;

        try {
            const response = await ApiService.fetchData({
                url: `/api/compras/${compra.id}/`,
                method: "delete",
            });
            if (response.status === 204) {
                toast.success("Compra eliminada", { autoClose: 1000 });
                dispatch(listaComprasThunk());
            }
        } catch (error: any) {
            toast.error(error.response.data || "Error al eliminar la compra", {
                toastId: "Error al eliminar la compra",
            });
        }
    };

    return (
        <>
            <Tooltip text="Eliminar Compra">
                <Button
                    variant="solid"
                    color="red"
                    icon="HeroTrash"
                    onClick={() => {
                        void handleDelete();
                    }}
                />
            </Tooltip>
        </>
    );
}

export default EliminarCompra;
