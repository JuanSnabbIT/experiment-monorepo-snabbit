import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import type { IRelacionEmpresa } from '@/interface/empresas.interface';
import type {
  IComparativaV3Params,
  IComparativaV3Result,
  IOrdenDeTrabajoV3,
} from '@/interface/ordenTrabajoV3.interface';
import { useAppSelector } from '@/store/hook';
import { useGetMisClientesQuery } from '@/store/slices/empresa/empresaApi';
import {
  useCreatePrefacturaOTV3Mutation,
  useGetComparativaV3Mutation,
  useGetOtsElegiblesV3Query,
} from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const CrearPrefacturaOTV3 = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const empresaId = personalizacionUsuario?.empresa ?? undefined;

    // -- estado del wizard --
    const [clienteId, setClienteId] = useState<number | null>(
        searchParams.get('cliente_id') ? Number(searchParams.get('cliente_id')) : null,
    );
    const [otIdsSeleccionadas, setOtIdsSeleccionadas] = useState<number[]>(() => {
        const presel = searchParams.get('ot_preseleccionada');
        return presel ? [Number(presel)] : [];
    });
    const [contratoIds, setContratoIds] = useState<number[]>([]);
    const [comentario, setComentario] = useState('');
    const [comparativa, setComparativa] = useState<IComparativaV3Result | null>(null);
    const [comparativaCargada, setComparativaCargada] = useState(false);

    // -- queries --
    const { data: clientes = [], isLoading: cargandoClientes } = useGetMisClientesQuery(empresaId, {
        skip: !empresaId,
    });

    const { data: otsElegibles = [], isFetching: cargandoOts } = useGetOtsElegiblesV3Query(
        { cliente_id: clienteId! },
        { skip: !clienteId },
    );

    const [getComparativa, { isLoading: cargandoComparativa }] = useGetComparativaV3Mutation();
    const [crearPrefactura, { isLoading: creando }] = useCreatePrefacturaOTV3Mutation();

    // Resetear OTs al cambiar cliente
    useEffect(() => {
        if (!searchParams.get('ot_preseleccionada')) {
            setOtIdsSeleccionadas([]);
        }
        setContratoIds([]);
        setComparativa(null);
        setComparativaCargada(false);
    }, [clienteId]);

    // Resetear comparativa al cambiar seleccion
    useEffect(() => {
        setComparativa(null);
        setComparativaCargada(false);
    }, [otIdsSeleccionadas, contratoIds]);

    const clienteOptions = useMemo<TSelectOption[]>(
        () =>
            clientes.map((rel: IRelacionEmpresa) => ({
                value: String(rel.cliente),
                label: rel.info_cliente?.nombre ?? `Cliente #${rel.cliente}`,
            })),
        [clientes],
    );

    const otOptions = useMemo<TSelectOption[]>(
        () =>
            otsElegibles.map((ot: IOrdenDeTrabajoV3) => ({
                value: String(ot.id),
                label: `#${ot.id} - ${ot.titulo}`,
            })),
        [otsElegibles],
    );

    const otSeleccionadasData = useMemo(
        () => otsElegibles.filter((ot: IOrdenDeTrabajoV3) => otIdsSeleccionadas.includes(ot.id)),
        [otsElegibles, otIdsSeleccionadas],
    );

    // Contratos disponibles: union de contratos de las OTs seleccionadas
    const contratoOptions = useMemo<TSelectOption[]>(() => {
        const vistos = new Set<number>();
        const opciones: TSelectOption[] = [];
        otSeleccionadasData.forEach((ot: IOrdenDeTrabajoV3) => {
            if (ot.contrato && !vistos.has(ot.contrato)) {
                vistos.add(ot.contrato);
                opciones.push({
                    value: String(ot.contrato),
                    label: `Contrato #${ot.contrato}`,
                });
            }
        });
        return opciones;
    }, [otSeleccionadasData]);

    const handleCargarComparativa = async () => {
        if (otIdsSeleccionadas.length === 0) {
            toast.warn('Selecciona al menos una OT');
            return;
        }
        try {
            const params: IComparativaV3Params = {
                ot_ids: otIdsSeleccionadas,
                contrato_ids: contratoIds.length > 0 ? contratoIds : undefined,
            };
            const resultado = await getComparativa(params).unwrap();
            setComparativa(resultado);
            setComparativaCargada(true);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleCrear = async () => {
        if (otIdsSeleccionadas.length === 0) {
            toast.warn('Selecciona al menos una OT');
            return;
        }
        try {
            const pref = await crearPrefactura({
                ot_ids: otIdsSeleccionadas,
                contrato_ids: contratoIds.length > 0 ? contratoIds : undefined,
                comentario: comentario || undefined,
            }).unwrap();
            toast.success('Prefactura creada');
            navigate(`/facturacion/otv3/prefacturas/${pref.id}`);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    const puedeCrear = otIdsSeleccionadas.length > 0;

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <h1 className='ml-2 text-lg font-bold text-gray-800 dark:text-gray-100'>
                        Nueva Prefactura OT V3
                    </h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        variant='solid'
                        color='blue'
                        icon='HeroDocumentText'
                        isLoading={creando}
                        isDisable={!puedeCrear}
                        onClick={handleCrear}>
                        Crear prefactura
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                    {/* Sección 1: Cliente */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>1. Seleccionar cliente</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <Label htmlFor='cliente'>Cliente</Label>
                            <SelectReact
                                id='cliente'
                                name='cliente'
                                options={clienteOptions}
                                isLoading={cargandoClientes}
                                placeholder='Selecciona un cliente...'
                                value={
                                    clienteId
                                        ? clienteOptions.find((o) => o.value === String(clienteId))
                                        : null
                                }
                                onChange={(opt) =>
                                    setClienteId(opt ? Number((opt as TSelectOption).value) : null)
                                }
                            />
                        </CardBody>
                    </Card>

                    {/* Sección 2: OTs elegibles */}
                    <Card>
                        <CardHeader>
                            <CardHeaderChild>2. Seleccionar OTs</CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            {!clienteId ? (
                                <p className='text-sm text-gray-400'>
                                    Selecciona primero un cliente.
                                </p>
                            ) : (
                                <>
                                    <Label htmlFor='ots'>OTs por facturar</Label>
                                    <SelectReact
                                        id='ots'
                                        name='ots'
                                        options={otOptions}
                                        isMulti
                                        isLoading={cargandoOts}
                                        placeholder='Selecciona OTs...'
                                        value={otOptions.filter((o) =>
                                            otIdsSeleccionadas.includes(Number(o.value)),
                                        )}
                                        onChange={(opts) =>
                                            setOtIdsSeleccionadas(
                                                (opts as TSelectOption[]).map((o) => Number(o.value)),
                                            )
                                        }
                                    />
                                    {otOptions.length === 0 && !cargandoOts && (
                                        <p className='mt-2 text-xs text-gray-400'>
                                            No hay OTs elegibles para este cliente.
                                        </p>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>

                    {/* Sección 3: Contratos (opcional) */}
                    {contratoOptions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>3. Contratos (opcional)</CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <Label htmlFor='contratos'>
                                    Contratos vinculados a las OTs seleccionadas
                                </Label>
                                <SelectReact
                                    id='contratos'
                                    name='contratos'
                                    options={contratoOptions}
                                    isMulti
                                    placeholder='Selecciona contratos...'
                                    value={contratoOptions.filter((o) =>
                                        contratoIds.includes(Number(o.value)),
                                    )}
                                    onChange={(opts) =>
                                        setContratoIds(
                                            (opts as TSelectOption[]).map((o) => Number(o.value)),
                                        )
                                    }
                                />
                            </CardBody>
                        </Card>
                    )}

                    {/* Sección 4: Comparativa */}
                    {otIdsSeleccionadas.length > 0 && (
                        <Card className='lg:col-span-2'>
                            <CardHeader>
                                <CardHeaderChild>4. Comparativa pactado vs ejecutado</CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                {!comparativaCargada ? (
                                    <Button
                                        variant='outline'
                                        color='blue'
                                        icon='HeroCalculator'
                                        isLoading={cargandoComparativa}
                                        onClick={handleCargarComparativa}>
                                        Calcular comparativa
                                    </Button>
                                ) : comparativa ? (
                                    <div className='grid grid-cols-1 gap-4 text-sm md:grid-cols-3'>
                                        <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                            <p className='mb-1 font-semibold text-gray-500'>
                                                Pactado
                                            </p>
                                            <p className='text-lg font-bold'>
                                                {comparativa.pactado.moneda}{' '}
                                                {Number(
                                                    comparativa.pactado.total,
                                                ).toLocaleString('es-CL')}
                                            </p>
                                        </div>
                                        <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                            <p className='mb-1 font-semibold text-gray-500'>
                                                Ejecutado
                                            </p>
                                            <p className='text-lg font-bold'>
                                                {comparativa.ejecutado.moneda}{' '}
                                                {Number(
                                                    comparativa.ejecutado.total,
                                                ).toLocaleString('es-CL')}
                                            </p>
                                        </div>
                                        <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                                            <p className='mb-1 font-semibold text-gray-500'>
                                                Diferencia
                                            </p>
                                            <p
                                                className={`text-lg font-bold ${
                                                    comparativa.diferencia >= 0
                                                        ? 'text-emerald-600'
                                                        : 'text-red-500'
                                                }`}>
                                                {Number(comparativa.diferencia).toLocaleString(
                                                    'es-CL',
                                                )}
                                            </p>
                                        </div>

                                        {comparativa.ots_marcadas_visitas.length > 0 && (
                                            <div className='md:col-span-3'>
                                                <p className='mb-1 text-xs font-semibold text-gray-500'>
                                                    OTs con visitas de soporte presencial
                                                </p>
                                                <div className='flex flex-wrap gap-1'>
                                                    {comparativa.ots_marcadas_visitas.map((id) => (
                                                        <Badge key={id} color='blue'>
                                                            OT #{id}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </CardBody>
                        </Card>
                    )}

                    {/* Sección 5: OTs seleccionadas + comentario */}
                    {otSeleccionadasData.length > 0 && (
                        <Card className='lg:col-span-2'>
                            <CardHeader>
                                <CardHeaderChild>5. Resumen y comentario</CardHeaderChild>
                            </CardHeader>
                            <CardBody className='space-y-4'>
                                <Table>
                                    <THead>
                                        <Tr>
                                            <Th>ID</Th>
                                            <Th>Titulo</Th>
                                            <Th>Contrato</Th>
                                            <Th>Estado</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {otSeleccionadasData.map((ot: IOrdenDeTrabajoV3) => (
                                            <Tr key={ot.id}>
                                                <Td>#{ot.id}</Td>
                                                <Td>{ot.titulo}</Td>
                                                <Td>
                                                    {ot.contrato
                                                        ? `Contrato #${ot.contrato}`
                                                        : 'Sin contrato'}
                                                </Td>
                                                <Td>
                                                    <Badge color='amber'>{ot.estado}</Badge>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>

                                <div>
                                    <Label htmlFor='comentario'>
                                        Comentario (opcional)
                                    </Label>
                                    <Textarea
                                        id='comentario'
                                        name='comentario'
                                        value={comentario}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                            setComentario(e.target.value)
                                        }
                                        placeholder='Notas internas sobre esta prefactura...'
                                        rows={3}
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </Container>
        </PageWrapper>
    );
};

export default CrearPrefacturaOTV3;
