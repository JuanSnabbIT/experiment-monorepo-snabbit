import Input from '@/components/form/Input';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IPrefacturaOTV3 } from '@/interface/ordenTrabajoV3.interface';
import {
    useAsociarDocumentoPrefacturaOTV3Mutation,
    useFinalizarPrefacturaOTV3Mutation,
    useGetPrefacturaOTV3Query,
    useUpdatePrefacturaOTV3Mutation,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const estadoColor = (estado: string) => {
    if (estado === 'borrador') return 'zinc';
    if (estado === 'por_facturar') return 'amber';
    if (estado === 'facturado') return 'emerald';
    return 'zinc';
};

const DetallePrefacturaOTV3 = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const prefacturaId = id ? Number(id) : NaN;

    const { data, isLoading } = useGetPrefacturaOTV3Query(prefacturaId, {
        skip: !prefacturaId,
    });
    const [updatePrefactura, { isLoading: saving }] = useUpdatePrefacturaOTV3Mutation();
    const [finalizarPrefactura, { isLoading: finalizando }] = useFinalizarPrefacturaOTV3Mutation();
    const [asociarDocumento, { isLoading: subiendo }] = useAsociarDocumentoPrefacturaOTV3Mutation();

    const [fechaPrefactura, setFechaPrefactura] = useState<string>('');
    const [archivo, setArchivo] = useState<File | null>(null);

    const prefactura = data as IPrefacturaOTV3 | undefined;

    useEffect(() => {
        if (!prefactura) return;
        setFechaPrefactura(
            prefactura.fecha_prefactura ? dayjs(prefactura.fecha_prefactura).format('YYYY-MM-DD') : '',
        );
    }, [prefactura]);

    const handleGuardar = async () => {
        if (!prefactura) return;
        try {
            await updatePrefactura({
                id: prefactura.id,
                data: { fecha_prefactura: fechaPrefactura || null } as any,
            }).unwrap();
            toast.success('Prefactura guardada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleFinalizar = async () => {
        if (!prefactura) return;
        try {
            await finalizarPrefactura(prefactura.id).unwrap();
            toast.success('Prefactura finalizada');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleSubirDocumento = async () => {
        if (!prefactura || !archivo) return;
        try {
            await asociarDocumento({ id: prefactura.id, documento: archivo }).unwrap();
            toast.success('Documento asociado');
            setArchivo(null);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // Ítems facturables desde resultado (si existen)
    const itemsFacturables: any[] = prefactura?.resultado?.items ?? [];

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <h1 className='ml-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
                        Prefactura OT V3 #{prefacturaId}
                    </h1>
                </SubheaderLeft>
                <SubheaderRight>
                    {prefactura && (
                        <Badge color={estadoColor(prefactura.estado_cierre) as any}>
                            {prefactura.estado_cierre}
                        </Badge>
                    )}
                </SubheaderRight>
            </Subheader>

            <Container>
                {isLoading ? (
                    <div className='py-20 text-center text-sm text-gray-400'>Cargando...</div>
                ) : !prefactura ? (
                    <div className='py-20 text-center text-sm text-gray-400'>No encontrada.</div>
                ) : (
                    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                        {/* Card: Datos y acciones */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>Datos generales</CardHeaderChild>
                            </CardHeader>
                            <CardBody className='space-y-3 text-sm text-gray-700 dark:text-gray-200'>
                                <div>
                                    <span className='font-semibold'>Cliente:</span>{' '}
                                    {prefactura.cliente_nombre ?? prefactura.cliente}
                                </div>
                                <div>
                                    <span className='font-semibold'>Creación:</span>{' '}
                                    {prefactura.fecha_creacion
                                        ? dayjs(prefactura.fecha_creacion).format('DD/MM/YYYY HH:mm')
                                        : '-'}
                                </div>
                                {prefactura.comentario && (
                                    <div>
                                        <span className='font-semibold'>Comentario:</span>{' '}
                                        {prefactura.comentario}
                                    </div>
                                )}

                                <div>
                                    <p className='mb-1 text-xs text-gray-500'>Fecha prefactura</p>
                                    <Input
                                        name='fecha_prefactura'
                                        type='date'
                                        value={fechaPrefactura}
                                        onChange={(e: any) => setFechaPrefactura(e.target.value)}
                                        disabled={prefactura.estado_cierre !== 'borrador'}
                                    />
                                </div>

                                <div className='flex gap-2'>
                                    {prefactura.estado_cierre === 'borrador' && (
                                        <>
                                            <Button
                                                variant='solid'
                                                color='blue'
                                                isLoading={saving}
                                                onClick={handleGuardar}>
                                                Guardar
                                            </Button>
                                            <Button
                                                variant='outline'
                                                color='amber'
                                                isLoading={finalizando}
                                                onClick={handleFinalizar}>
                                                Finalizar
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>

                        {/* Card: OTs vinculadas */}
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>OTs vinculadas</CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                {prefactura.ots && prefactura.ots.length > 0 ? (
                                    <div className='flex flex-wrap gap-2'>
                                        {prefactura.ots.map((otId, idx) => (
                                            <Badge key={otId} color='blue'>
                                                {prefactura.ots_titulos?.[idx]
                                                    ? `#${otId} - ${prefactura.ots_titulos[idx]}`
                                                    : `OT #${otId}`}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className='text-sm text-gray-400'>Sin OTs vinculadas.</p>
                                )}

                                {prefactura.contratos && prefactura.contratos.length > 0 && (
                                    <div className='mt-3'>
                                        <p className='mb-1 text-xs font-semibold text-gray-500'>
                                            Contratos
                                        </p>
                                        <div className='flex flex-wrap gap-2'>
                                            {prefactura.contratos.map((cId, idx) => (
                                                <Badge key={cId} color='violet'>
                                                    {prefactura.contratos_nombres?.[idx]
                                                        ? prefactura.contratos_nombres[idx]
                                                        : `Contrato #${cId}`}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* Card: Documento de factura */}
                        <Card className='border-blue-200 dark:border-blue-700'>
                            <CardHeader>
                                <CardHeaderChild>Documento de factura</CardHeaderChild>
                            </CardHeader>
                            <CardBody className='space-y-3'>
                                {prefactura.documento_factura ? (
                                    <div className='text-sm text-emerald-600 dark:text-emerald-400'>
                                        Documento asociado
                                    </div>
                                ) : (
                                    <div className='text-sm text-gray-500'>
                                        Sin documento asociado.
                                    </div>
                                )}

                                <input
                                    type='file'
                                    accept='application/pdf,image/*'
                                    onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                                />
                                <Button
                                    variant='solid'
                                    color='blue'
                                    isLoading={subiendo}
                                    isDisable={!archivo || prefactura.estado_cierre === 'borrador'}
                                    onClick={handleSubirDocumento}>
                                    Asociar documento
                                </Button>
                                <p className='text-xs text-gray-400'>
                                    Debes finalizar la prefactura antes de asociar el documento.
                                </p>
                            </CardBody>
                        </Card>

                        {/* Card: Ítems facturables */}
                        {itemsFacturables.length > 0 && (
                            <Card className='lg:col-span-2'>
                                <CardHeader>
                                    <CardHeaderChild>Ítems facturables</CardHeaderChild>
                                </CardHeader>
                                <CardBody>
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Descripción</Th>
                                                <Th>Cantidad</Th>
                                                <Th>Precio unitario</Th>
                                                <Th>Total</Th>
                                                <Th>Moneda</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {itemsFacturables.map((item: any, idx: number) => (
                                                <Tr key={idx}>
                                                    <Td>{item.descripcion ?? '-'}</Td>
                                                    <Td>{item.cantidad ?? '-'}</Td>
                                                    <Td>
                                                        {item.precio_unitario != null
                                                            ? Number(
                                                                  item.precio_unitario,
                                                              ).toLocaleString('es-CL')
                                                            : '-'}
                                                    </Td>
                                                    <Td>
                                                        {Number(item.total ?? 0).toLocaleString(
                                                            'es-CL',
                                                        )}
                                                    </Td>
                                                    <Td>{item.moneda ?? '-'}</Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </CardBody>
                            </Card>
                        )}
                    </div>
                )}
            </Container>
        </PageWrapper>
    );
};

export default DetallePrefacturaOTV3;
