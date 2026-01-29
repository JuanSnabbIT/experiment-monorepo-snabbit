import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { IGuiaSalida } from '@/interface/bodega.interface';
import { useVolverPendienteMutation } from '@/store/slices/bodega/guiaSalidaApi';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

function VolverAPendienteGuiaSalida({
    guia_salida,
}: {
    guia_salida: IGuiaSalida;
    onSuccess?: () => void;
}) {
    const [volverPendiente] = useVolverPendienteMutation();

    return (
        <Tooltip text='Volver a Pendiente'>
            <Button
                variant='solid'
                icon='HeroArrowUturnLeft'
                color='zinc'
                onClick={async () => {
                    const result = await Swal.fire({
                        title: '¿Regresar a Pendiente?',
                        text: '¿Está seguro(a) de regresar a un estado anterior a la Guía de Salida?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Aceptar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#10b981',
                    });

                    if (result.isConfirmed) {
                        try {
                            await volverPendiente(guia_salida.id).unwrap();
                            toast.success('Guía devuelta a estado pendiente', {
                                autoClose: 1000,
                            });
                        } catch (error: any) {
                            const mensajesError = error.data
                                ? Object.values(error.data).flat().join(' ')
                                : 'Error al regresar a pendiente';
                            toast.error(mensajesError, {
                                toastId: 'Error al regresar a pendiente la guia de salida',
                            });
                        }
                    }
                }}
            />
        </Tooltip>
    );
}

export default VolverAPendienteGuiaSalida;
