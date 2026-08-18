import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import { useAppSelector } from '@/store';
import { useGetDetallePlantillaV2Query } from '@/store/slices/contratos/plantillaContratoV2Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface ITabDocumentoProps {
    contrato: IContratoEmpresaCliente;
    puedeEditar: boolean;
}

// El documento del contrato usa siempre el motor v2.9 (documento único Slate).
// El contenido se edita desde "Ver plantilla"; esta pestaña solo ofrece
// ver/descargar el PDF final, generado bajo demanda con los datos actuales
// del contrato (ver flow_helpers._resolver_pdf_contrato).
const TabDocumento = ({ contrato }: ITabDocumentoProps) => {
    const navigate = useNavigate();
    const { data: plantillaDetalle } = useGetDetallePlantillaV2Query(contrato.plantilla ?? 0, {
        skip: !contrato.plantilla,
    });
    const token = useAppSelector((state) => state.auth.access);
    const [descargandoPdfV29, setDescargandoPdfV29] = useState(false);

    const handleVerPdfV29 = async () => {
        setDescargandoPdfV29(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL ?? '';
            const response = await fetch(`${baseUrl}/api/contratos/${contrato.id}/pdf/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setDescargandoPdfV29(false);
        }
    };

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div>
                        <div className='text-lg font-semibold text-blue-500'>Documento del contrato</div>
                        <div className='text-sm text-zinc-500'>
                            {plantillaDetalle
                                ? `Basado en plantilla: ${plantillaDetalle.titulo}`
                                : 'Sin plantilla asignada'}
                        </div>
                    </div>
                </CardHeaderChild>
                <CardHeaderChild>
                    <Badge color='blue' variant='outline'>Editor v2.9</Badge>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='space-y-4 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                    <Button
                        size='sm'
                        variant='solid'
                        color='blue'
                        icon='HeroDocumentArrowDown'
                        isLoading={descargandoPdfV29}
                        onClick={handleVerPdfV29}>
                        Ver / descargar PDF
                    </Button>
                    {contrato.plantilla && (
                        <Button
                            size='sm'
                            icon='HeroArrowTopRightOnSquare'
                            onClick={() =>
                                navigate(`/registros/plantillas-contrato/${contrato.plantilla}`)
                            }>
                            Ver plantilla
                        </Button>
                    )}
                </div>
                <p className='text-sm text-zinc-500'>
                    El contenido se edita desde "Ver plantilla". El PDF se genera bajo demanda
                    con los datos actuales del contrato.
                </p>
            </CardBody>
        </Card>
    );
};

export default TabDocumento;
