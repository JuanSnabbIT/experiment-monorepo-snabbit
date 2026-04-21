import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IUsuarioEquipo } from '@/interface/recursos.interface';
import {
    useDesvincularEquipoDesdeDetalleMutation,
    useGetBodegasPorEmpresaClienteQuery,
    useGetContratosPorUsuarioEmpresaQuery,
    useGetEquiposPorUsuarioEmpresaQuery,
    useGetLicenciasPorUsuarioEmpresaQuery,
} from '@/store/slices/contratos/contratoApi';
import { useGetDetalleUsuarioClienteQuery } from '@/store/slices/empresa/empresaApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const DetalleUsuarioCliente = () => {
    const navigate = useNavigate();
    const { clienteId, usuarioId } = useParams<{
        clienteId: string;
        usuarioId: string;
    }>();

    const {
        data: usuario,
        isLoading: loadingUsuario,
        isError: errorUsuario,
    } = useGetDetalleUsuarioClienteQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: equipos = [], isLoading: loadingEquipos } =
        useGetEquiposPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: licencias = [], isLoading: loadingLicencias } =
        useGetLicenciasPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    const { data: contratos = [], isLoading: loadingContratos } =
        useGetContratosPorUsuarioEmpresaQuery(usuarioId ?? '', { skip: !usuarioId });

    const [modalDesvincularOpen, setModalDesvincularOpen] = useState(false);
    const [equipoSeleccionado, setEquipoSeleccionado] = useState<IUsuarioEquipo | null>(null);
    const [bodegaSeleccionadaId, setBodegaSeleccionadaId] = useState<number | null>(null);
    const [motivoDesvinculacion, setMotivoDesvinculacion] = useState('');
    const [errorDesvinculacion, setErrorDesvinculacion] = useState<string | null>(null);

    const [desvincularEquipoDesdeDetalle, { isLoading: isDesvinculando }] =
        useDesvincularEquipoDesdeDetalleMutation();

    const empresaClienteIdSeleccionada = useMemo(
        () => equipoSeleccionado?.datos_equipo?.cliente ?? null,
        [equipoSeleccionado],
    );

    const { data: bodegasCliente = [], isLoading: loadingBodegasCliente } =
        useGetBodegasPorEmpresaClienteQuery(empresaClienteIdSeleccionada ?? '', {
            skip: !modalDesvincularOpen || !empresaClienteIdSeleccionada,
        });

    const opcionesBodegas = useMemo<TSelectOption[]>(
        () =>
            bodegasCliente.map((bodega) => ({
                value: bodega.id.toString(),
                label: bodega.nombre,
            })),
        [bodegasCliente],
    );

    const bodegaSeleccionadaOption = useMemo(
        () =>
            opcionesBodegas.find((option) => Number(option.value) === bodegaSeleccionadaId) ??
            null,
        [opcionesBodegas, bodegaSeleccionadaId],
    );

    const abrirModalDesvincular = (usuarioEquipo: IUsuarioEquipo) => {
        setEquipoSeleccionado(usuarioEquipo);
        setBodegaSeleccionadaId(null);
        setMotivoDesvinculacion('');
        setErrorDesvinculacion(null);
        setModalDesvincularOpen(true);
    };

    const cerrarModalDesvincular = () => {
        setModalDesvincularOpen(false);
        setEquipoSeleccionado(null);
        setBodegaSeleccionadaId(null);
        setMotivoDesvinculacion('');
        setErrorDesvinculacion(null);
    };

    const confirmarDesvinculacion = async () => {
        if (!equipoSeleccionado) return;

        if (!bodegaSeleccionadaId) {
            setErrorDesvinculacion('Debe seleccionar una bodega destino.');
            return;
        }

        try {
            const response = await desvincularEquipoDesdeDetalle({
                usuarioEquipoId: equipoSeleccionado.id,
                data: {
                    bodega_destino_id: bodegaSeleccionadaId,
                    motivo: motivoDesvinculacion.trim() || undefined,
                },
            }).unwrap();
            toast.success(response.detail || 'Equipo desvinculado correctamente.');
            cerrarModalDesvincular();
        } catch (error: unknown) {
            const mensaje = getErrorMessage(error);
            setErrorDesvinculacion(mensaje);
            toast.error(mensaje);
        }
    };

    if (loadingUsuario) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-zinc-500'>Cargando usuario...</p>
                </Container>
            </PageWrapper>
        );
    }

    if (errorUsuario) {
        return (
            <PageWrapper>
                <Container>
                    <Alert color='red'>
                        No se pudo cargar el usuario. Verifique su conexion e intente nuevamente.
                    </Alert>
                </Container>
            </PageWrapper>
        );
    }

    if (!usuario) {
        return (
            <PageWrapper>
                <Container>
                    <p className='p-4 text-sm text-red-500'>Usuario no encontrado.</p>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <Button icon='HeroArrowLeft' onClick={() => navigate(-1)}>
                        Volver
                    </Button>
                    <h1 className='text-xl font-bold'>{usuario.nombre_usuario}</h1>
                    <Badge color={usuario.estado === '1' ? 'emerald' : 'red'}>
                        {usuario.estado_label}
                    </Badge>
                    {!usuario.is_active && <Badge color='zinc'>Cuenta deshabilitada</Badge>}
                </SubheaderLeft>
            </Subheader>

            <Container>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                    <Card className='lg:col-span-1'>
                        <CardHeader>
                            <CardHeaderChild>
                                <span className='font-semibold'>Informacion Personal</span>
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <dl className='space-y-3 text-sm'>
                                <div>
                                    <dt className='text-zinc-500'>Nombre</dt>
                                    <dd className='font-medium'>{usuario.nombre_usuario || '-'}</dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Email</dt>
                                    <dd className='font-medium'>{usuario.email_usuario || '-'}</dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>RUT</dt>
                                    <dd className='font-medium'>{usuario.papeleta?.rut || 'Sin RUT'}</dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Cargo</dt>
                                    <dd className='font-medium'>{usuario.cargo || '-'}</dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Sucursal</dt>
                                    <dd className='font-medium'>{usuario.nombre_sucursal || '-'}</dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Fecha Ingreso</dt>
                                    <dd className='font-medium'>
                                        {usuario.fecha_ingreso
                                            ? dayjs(usuario.fecha_ingreso).format('DD/MM/YYYY')
                                            : '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className='text-zinc-500'>Fecha Contrato</dt>
                                    <dd className='font-medium'>
                                        {usuario.fecha_contrato
                                            ? dayjs(usuario.fecha_contrato).format('DD/MM/YYYY')
                                            : '-'}
                                    </dd>
                                </div>
                            </dl>
                        </CardBody>
                    </Card>

                    <div className='flex flex-col gap-4 lg:col-span-2'>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Equipos Asignados</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {loadingEquipos ? (
                                    <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                ) : equipos.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>Sin equipos asignados</p>
                                ) : (
                                    <div className='overflow-x-auto'>
                                        <Table className='min-w-[860px]'>
                                            <THead>
                                                <Tr>
                                                    <Th>Tipo</Th>
                                                    <Th>Marca / Modelo</Th>
                                                    <Th>Nro Serie</Th>
                                                    <Th>Origen</Th>
                                                    <Th>Fecha Asignacion</Th>
                                                    <Th>Estado</Th>
                                                    <Th>Acciones</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {equipos.map((ue) => (
                                                    <Tr key={ue.id}>
                                                        <Td>{ue.datos_equipo?.tipo_equipo_label || '-'}</Td>
                                                        <Td>
                                                            {ue.datos_equipo?.marca_label || '-'} /{' '}
                                                            {ue.datos_equipo?.modelo || '-'}
                                                        </Td>
                                                        <Td>{ue.datos_equipo?.numero_serie || '-'}</Td>
                                                        <Td>
                                                            {ue.tarea_otv3 ? (
                                                                <div>
                                                                    <div className='font-semibold'>OT {ue.tarea_otv3.orden_id}</div>
                                                                    <div className='text-sm text-zinc-500'>
                                                                        {ue.tarea_otv3.titulo}
                                                                    </div>
                                                                </div>
                                                            ) : ue.item_guia_origen ? (
                                                                <div>
                                                                    <div className='font-semibold'>Guía #{ue.item_guia_origen.id}</div>
                                                                    <div className='text-sm text-zinc-500'>
                                                                        {ue.item_guia_origen.numero_serie
                                                                            ? typeof ue.item_guia_origen.numero_serie === 'string'
                                                                                ? ue.item_guia_origen.numero_serie
                                                                                : JSON.stringify(ue.item_guia_origen.numero_serie)
                                                                            : 'Sin serie'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            {ue.fecha_asignacion
                                                                ? dayjs(ue.fecha_asignacion).format(
                                                                      'DD/MM/YYYY',
                                                                  )
                                                                : '-'}
                                                        </Td>
                                                        <Td>
                                                            <Badge
                                                                color={ue.estado ? 'emerald' : 'zinc'}>
                                                                {ue.estado ? 'Asignado' : 'Devuelto'}
                                                            </Badge>
                                                        </Td>
                                                        <Td>
                                                            {ue.estado ? (
                                                                <Button
                                                                    size='sm'
                                                                    color='red'
                                                                    variant='solid'
                                                                    onClick={() => abrirModalDesvincular(ue)}>
                                                                    Desvincular
                                                                </Button>
                                                            ) : (
                                                                <span className='text-sm text-zinc-500'>-</span>
                                                            )}
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </TBody>
                                        </Table>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Licencias Vinculadas</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {loadingLicencias ? (
                                    <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                ) : licencias.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>Sin licencias vinculadas</p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Licencia</Th>
                                                <Th>Proveedor</Th>
                                                <Th>Estado</Th>
                                                <Th>Fecha Asignacion</Th>
                                                <Th>Contrato</Th>
                                                <Th>Acciones</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {licencias.map((lic) => (
                                                <Tr key={lic.id}>
                                                    <Td>{lic.nombre_licencia}</Td>
                                                    <Td>{lic.proveedor_licencia || '-'}</Td>
                                                    <Td>
                                                        <Badge color={lic.color_estado}>
                                                            {lic.estado_licencia_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        {lic.fecha_asignacion
                                                            ? dayjs(lic.fecha_asignacion).format(
                                                                  'DD/MM/YYYY',
                                                              )
                                                            : '-'}
                                                    </Td>
                                                    <Td>{lic.nombre_contrato}</Td>
                                                    <Td>
                                                        <Tooltip text='Ver licencia'>
                                                            <Button
                                                                color='violet'
                                                                variant='solid'
                                                                icon='HeroEye'
                                                                size='sm'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/empresa/detalle-cliente/${clienteId}/contrato/${lic.contrato_id}/licencia/${lic.licencia_contrato_id}`,
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <span className='font-semibold'>Contratos Asociados</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='p-0'>
                                {loadingContratos ? (
                                    <p className='p-4 text-sm text-zinc-500'>Cargando...</p>
                                ) : contratos.length === 0 ? (
                                    <p className='p-4 text-sm text-zinc-500'>Sin contratos asociados</p>
                                ) : (
                                    <Table>
                                        <THead>
                                            <Tr>
                                                <Th>Contrato</Th>
                                                <Th>Tipo</Th>
                                                <Th>Estado</Th>
                                                <Th>Rol</Th>
                                                <Th>Vigencia</Th>
                                                <Th>Acciones</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {contratos.map((contrato) => (
                                                <Tr key={contrato.id}>
                                                    <Td>{contrato.nombre_contrato}</Td>
                                                    <Td>
                                                        <Badge color='blue'>
                                                            {contrato.tipo_contrato_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <Badge
                                                            color={
                                                                contrato.estado_contrato === 'activo'
                                                                    ? 'emerald'
                                                                    : contrato.estado_contrato ===
                                                                        'borrador'
                                                                      ? 'amber'
                                                                      : contrato.estado_contrato ===
                                                                            'suspendido'
                                                                        ? 'red'
                                                                        : 'zinc'
                                                            }>
                                                            {contrato.estado_contrato_label}
                                                        </Badge>
                                                    </Td>
                                                    <Td>{contrato.tipo_usuario_label}</Td>
                                                    <Td>
                                                        {dayjs(contrato.fecha_inicio_contrato).format(
                                                            'DD/MM/YYYY',
                                                        )}{' '}
                                                        {'->'}{' '}
                                                        {contrato.fecha_fin_contrato
                                                            ? dayjs(
                                                                  contrato.fecha_fin_contrato,
                                                              ).format('DD/MM/YYYY')
                                                            : 'Indefinido'}
                                                    </Td>
                                                    <Td>
                                                        <Tooltip text='Ver contrato'>
                                                            <Button
                                                                color='violet'
                                                                variant='solid'
                                                                icon='HeroEye'
                                                                size='sm'
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/empresa/detalle-cliente/${clienteId}/contrato/${contrato.contrato_id}`,
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>

            <Modal isOpen={modalDesvincularOpen} setIsOpen={cerrarModalDesvincular}>
                <ModalHeader>Desvincular equipo</ModalHeader>
                <ModalBody>
                    {equipoSeleccionado ? (
                        <div className='space-y-4'>
                            <Alert color='blue'>
                                Esta accion desvincula el equipo del usuario y lo ingresa a una bodega
                                de la empresa cliente.
                            </Alert>

                            <div className='rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700'>
                                <p>
                                    <span className='font-semibold'>Equipo:</span>{' '}
                                    {equipoSeleccionado.datos_equipo?.tipo_equipo_label || '-'}
                                </p>
                                <p>
                                    <span className='font-semibold'>Marca / Modelo:</span>{' '}
                                    {equipoSeleccionado.datos_equipo?.marca_label || '-'} /{' '}
                                    {equipoSeleccionado.datos_equipo?.modelo || '-'}
                                </p>
                                <p>
                                    <span className='font-semibold'>Serie:</span>{' '}
                                    {equipoSeleccionado.datos_equipo?.numero_serie || '-'}
                                </p>
                            </div>

                            <div>
                                <p className='mb-2 text-sm font-semibold'>Bodega destino *</p>
                                {!empresaClienteIdSeleccionada ? (
                                    <Alert color='red'>
                                        No se pudo determinar la empresa cliente para este equipo.
                                    </Alert>
                                ) : (
                                    <SelectReact
                                        name='bodega_destino'
                                        placeholder='Seleccione bodega'
                                        value={bodegaSeleccionadaOption}
                                        options={opcionesBodegas}
                                        isLoading={loadingBodegasCliente}
                                        onChange={(option) => {
                                            const selectedValue = (
                                                option as TSelectOption | null
                                            )?.value;
                                            setBodegaSeleccionadaId(
                                                selectedValue ? Number(selectedValue) : null,
                                            );
                                            setErrorDesvinculacion(null);
                                        }}
                                    />
                                )}
                            </div>

                            <div>
                                <p className='mb-2 text-sm font-semibold'>Motivo (opcional)</p>
                                <Textarea
                                    name='motivo_desvinculacion'
                                    rows={3}
                                    value={motivoDesvinculacion}
                                    onChange={(event) =>
                                        setMotivoDesvinculacion(event.target.value)
                                    }
                                    placeholder='Ej: recambio por mantencion preventiva'
                                />
                            </div>

                            {errorDesvinculacion && (
                                <Alert color='red'>{errorDesvinculacion}</Alert>
                            )}
                        </div>
                    ) : (
                        <p className='text-sm text-zinc-500'>No hay equipo seleccionado.</p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button onClick={cerrarModalDesvincular} isDisable={isDesvinculando}>
                        Cancelar
                    </Button>
                    <Button
                        color='red'
                        variant='solid'
                        onClick={confirmarDesvinculacion}
                        isLoading={isDesvinculando}
                        isDisable={
                            isDesvinculando ||
                            !equipoSeleccionado ||
                            !empresaClienteIdSeleccionada ||
                            !bodegaSeleccionadaId
                        }>
                        Confirmar desvinculacion
                    </Button>
                </ModalFooter>
            </Modal>
        </PageWrapper>
    );
};

export default DetalleUsuarioCliente;
