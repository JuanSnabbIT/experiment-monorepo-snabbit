import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { detalleFirmaContratoThunk, useAppDispatch, useAppSelector } from '@/store';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import 'dayjs/locale/es';

function FirmarContratoYAcuerdoConfidencialidad() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { detalleFirmaContrato } = useAppSelector((state) => state.contrato);
    const sigCanvas = useRef<SignatureCanvas | null>(null);
    const { uuid } = useParams();

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    useEffect(() => {
        if (uuid) {
            dispatch(detalleFirmaContratoThunk({ uuid_envio: uuid }));
        }
    }, [uuid]);

    return (
        <PageWrapper isProtectedRoute={false} name='Firma' title='Firma'>
            <Subheader>
                <SubheaderLeft>
                    <Tooltip text='Ir al Inicio de Sesión'>
                        <Button
                            icon='HeroArrowLeft'
                            onClick={() => {
                                navigate('/login');
                            }}></Button>
                    </Tooltip>
                    <Badge className='text-xl'>Firma</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Firma</Badge>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='flex flex-col items-center justify-center gap-4'>
                                {detalleFirmaContrato &&
                                    detalleFirmaContrato.acuerdos_confidencialidad.length > 0 &&
                                    detalleFirmaContrato.acuerdos_confidencialidad.map(
                                        (acuerdo, index) => (
                                            <div
                                                key={index}
                                                className='flex w-full flex-col items-center justify-center'>
                                                <Badge className='text-xl'>
                                                    {acuerdo.acuerdo_base_titulo}
                                                </Badge>
                                                <div className='ml-4 w-full'>
                                                    {acuerdo.acuerdo_base_contenido}
                                                </div>
                                            </div>
                                        ),
                                    )}
                                <div>
                                    <Badge>Firma</Badge>
                                    <div
                                        className='dark:bg-white'
                                        style={{
                                            width: '100%',
                                            maxWidth: '600px',
                                            margin: '0 auto',
                                        }}>
                                        <SignatureCanvas
                                            ref={(ref) => {
                                                sigCanvas.current = ref;
                                            }}
                                            penColor='black'
                                            canvasProps={{
                                                height: 200,
                                                className: 'sigCanvas',
                                                style: { width: '100%', border: '1px solid #000' },
                                            }}
                                        />
                                    </div>
                                    <Button className='mt-2' variant='solid' onClick={clear}>
                                        Limpiar
                                    </Button>
                                </div>
                                <div className='flex w-full justify-end'>
                                    <Button
                                        variant='solid'
                                        onClick={async () => {
                                            try {
                                                const response = await ApiService.fetchData({
                                                    url: `/api/envio-firma/${uuid}/firmar/`,
                                                    method: 'patch',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    isLoginRequest: true,
                                                    data: JSON.stringify({
                                                        firma: sigCanvas.current?.toDataURL(
                                                            'image/png',
                                                        ),
                                                        fecha_firma: dayjs().locale('es'),
                                                        firmado: true,
                                                    }),
                                                });
                                                if (response.data) {
                                                    toast.success('Contrato firmado', {
                                                        autoClose: 1000,
                                                    });
                                                    navigate('/login');
                                                }
                                            } catch (error: any) {
                                                const mensajesError = Object.values(
                                                    error.response.data,
                                                )
                                                    .flat()
                                                    .join(' ');
                                                toast.error(
                                                    mensajesError || 'Error al enviar la firma',
                                                    { toastId: 'Error al enviar la firma' },
                                                );
                                            }
                                        }}>
                                        Aceptar
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default FirmarContratoYAcuerdoConfidencialidad;
