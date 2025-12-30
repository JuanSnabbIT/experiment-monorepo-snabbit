import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import Tooltip from "@/components/ui/Tooltip";
import ApiService from "@/services/ApiService";
import { listaItemsCompraThunk, useAppDispatch, useAppSelector } from "@/store";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import SignatureCanvas from "react-signature-canvas";
import { useNavigate } from "react-router-dom";

function CompletarCompraDT({}) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { detalleOrdenTrabajo, detalleDelDetalleTrabajo } = useAppSelector((state) => state.ordenTrabajo);
    const { listaItemsCompra, detalleCompra } = useAppSelector((state) => state.bodega);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    useEffect(() => {
        if (isOpen && detalleCompra) {
            dispatch(listaItemsCompraThunk({ id_compra: detalleCompra.id }));
        }
    }, [detalleCompra, isOpen, dispatch]);

    return (
        <>
            <Tooltip text="Completar Compra">
                <Button variant="solid" color="emerald" icon="HeroCheck" onClick={() => { setIsOpen(true); }}></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className="text-xl">Completar Compra</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="ml-4">Estas seguro(a) de querer completar la compra?</div>
                        <div className="">
                            <Badge>Firma</Badge>
                            <div className="dark:bg-white" style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
                                <SignatureCanvas
                                    ref={(ref) => { sigCanvas.current = ref; }}
                                    penColor="black"
                                    canvasProps={{
                                        height: 200,
                                        className: "sigCanvas",
                                        style: { width: "100%", border: "1px solid #000" },
                                    }}
                                />
                            </div>
                            <Button className="mt-2" variant="solid" onClick={clear}>Limpiar</Button>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => { setIsOpen(false); }}>Cancelar</Button>
                        <Button
                            variant="solid"
                            color="emerald"
                            isDisable={listaItemsCompra.some(item => (item.cantidad <= 0 || item.precio <= 0))}
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/ordenes-trabajo/${detalleOrdenTrabajo?.id}/detalles-trabajo/${detalleDelDetalleTrabajo?.id}/completar-compra/`,
                                        method: "post",
                                        headers: { "Content-Type": "application/json" },
                                        data: JSON.stringify({
                                            firma: sigCanvas.current?.toDataURL("image/png"),
                                        }),
                                    });
                                    if (response.data) {
                                        setIsOpen(false);
                                        navigate(`/orden-trabajo/detalle-orden-trabajo/${detalleDelDetalleTrabajo?.id}`);
                                        toast.success("Compra completada", { autoClose: 1000 });
                                    }
                                } catch (error: any) {
                                    toast.error(error.response.data || "Error al completar la compra", { toastId: "Error al completar la compra" });
                                }
                            }}>
                            Completar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CompletarCompraDT;
