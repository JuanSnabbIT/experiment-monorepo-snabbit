import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IPrefacturaOTV3 } from '@/interface/ordenTrabajoV3.interface';
import { useGetPrefacturasOTV3Query } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const estadoColor = (estado: string) => {
    if (estado === 'borrador') return 'zinc';
    if (estado === 'por_facturar') return 'amber';
    if (estado === 'facturado') return 'emerald';
    return 'zinc';
};

const ListaPrefacturasOTV3 = () => {
    const navigate = useNavigate();
    const { data = [], isLoading } = useGetPrefacturasOTV3Query();

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <h1 className='text-lg font-bold text-zinc-800 dark:text-zinc-100'>
                        Prefacturas OT V3
                    </h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroDocumentPlus'
                        onClick={() => navigate('/facturacion/otv3/prefacturas/crear-matching')}>
                        Nueva prefactura
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                <Card>
                    <CardHeader>
                        <CardHeaderChild>Listado</CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {isLoading ? (
                            <div className='py-10 text-center text-sm text-zinc-400'>
                                Cargando...
                            </div>
                        ) : data.length === 0 ? (
                            <div className='py-10 text-center text-sm text-zinc-400'>
                                No hay prefacturas OT V3 para mostrar.
                            </div>
                        ) : (
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>ID</Th>
                                        <Th>OTs</Th>
                                        <Th>Cliente</Th>
                                        <Th>Estado</Th>
                                        <Th>Creación</Th>
                                        <Th>Acciones</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {data.map((p: IPrefacturaOTV3) => (
                                        <Tr key={p.id}>
                                            <Td>#{p.id}</Td>
                                            <Td>
                                                {p.ots && p.ots.length > 0 ? (
                                                    <div className='flex flex-wrap gap-1'>
                                                        {p.ots.map((otId, idx) => (
                                                            <Badge key={otId} color='blue'>
                                                                {p.ots_titulos?.[idx]
                                                                    ? `#${otId}`
                                                                    : `#${otId}`}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    p.ot_titulo ?? `OT #${p.ot}`
                                                )}
                                            </Td>
                                            <Td>{p.cliente_nombre ?? p.cliente}</Td>
                                            <Td>
                                                <Badge color={estadoColor(p.estado_cierre) as any}>
                                                    {p.estado_cierre}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                {p.fecha_creacion
                                                    ? dayjs(p.fecha_creacion).format('DD/MM/YYYY')
                                                    : '-'}
                                            </Td>
                                            <Td className='text-right'>
                                                <Button
                                                    variant='outline'
                                                    color='blue'
                                                    onClick={() =>
                                                        navigate(
                                                            `/facturacion/otv3/prefacturas/${p.id}`,
                                                        )
                                                    }>
                                                    Ver
                                                </Button>
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ListaPrefacturasOTV3;
