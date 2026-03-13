import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { IRelacionEmpresa } from '@/interface/empresas.interface';
import { IContratoEdicion } from '@/pages/Contratos/components/contrato.types';
import { useAppSelector } from '@/store';
import {
    useGetContratoLicenciasVinculosQuery,
    useGetLicenciasCatalogoQuery,
    useGetUsuariosVinculadosLicenciaQuery,
} from '@/store/slices/contratos/contratoApi';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CrearContratoDelCliente from '../../Contratos/modals/CrearContratoDelCliente';
import ModalCambiarEstadoLicencia from '../../Contratos/modals/ModalCambiarEstadoLicencia';
import ModalLicenciaContrato from '../../Contratos/modals/ModalLicenciaContrato';
import CrearUsuarioVinculadoLicencia from '../modals/CrearUsuarioVinculadoLicencia';
import ItemsTablaDeUsuariosVinculadosLicencias from './ItemsTablaDeUsuariosVinculadosLicencias';

type TFlujoCreacion = 'idle' | 'seleccionarLicencia' | 'crearContrato';

interface TablaDeUsuariosVinculadosLicenciasProps {
    detalleCliente?: IRelacionEmpresa;
}

function TablaDeUsuariosVinculadosLicencias({
    detalleCliente,
}: TablaDeUsuariosVinculadosLicenciasProps) {
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    const [expandedLicenciaId, setExpandedLicenciaId] = useState<number | null>(null);
    const [modalEstado, setModalEstado] = useState<{
        open: boolean;
        licenciaId: number;
        estado: string;
        estadoLabel: string;
        color: 'emerald' | 'red' | 'amber' | 'zinc';
    }>({ open: false, licenciaId: 0, estado: '', estadoLabel: '', color: 'zinc' });

    // Flujo creacion de licencia
    const [flujoCreacion, setFlujoCreacion] = useState<TFlujoCreacion>('idle');

    // RTK Query: lista de licencias del cliente
    const { data: listaContratoLicencias = [] } = useGetContratoLicenciasVinculosQuery(
        {
            empresaId: personalizacionUsuario?.empresa ?? '',
            clienteId: detalleCliente?.cliente ?? '',
        },
        { skip: !personalizacionUsuario?.empresa || !detalleCliente?.cliente },
    );

    // RTK Query: usuarios vinculados a la licencia expandida
    const { data: listaUsuariosVinculados = [] } = useGetUsuariosVinculadosLicenciaQuery(
        expandedLicenciaId?.toString() ?? '',
        { skip: expandedLicenciaId == null },
    );

    // Catalogo de licencias para el modal de seleccion
    const { data: listaLicencias = [] } = useGetLicenciasCatalogoQuery();

    // Formik auxiliar para el paso de seleccion de licencia
    const licFormik = useFormik<IContratoEdicion>({
        initialValues: {
            fecha_inicio: '',
            fecha_fin: null,
            observaciones: null,
            nombre: '',
            eliminar_visitas: [],
            visitas: [],
            eliminar_licencias: [],
            licencias: [],
            eliminar_condiciones: [],
            condiciones_especiales: [],
            eliminar_usuarios: [],
            usuarios_vinculados: [],
        },
        onSubmit: () => {},
    });

    // Cuando el usuario selecciona una licencia en el catalogo, avanzar al paso de crear contrato
    useEffect(() => {
        if (flujoCreacion === 'seleccionarLicencia' && licFormik.values.licencias.length > 0) {
            setFlujoCreacion('crearContrato');
        }
    }, [licFormik.values.licencias.length, flujoCreacion]);

    const handleCancelarFlujo = () => {
        setFlujoCreacion('idle');
        licFormik.resetForm();
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <span className='font-semibold'>Licencias y Usuarios Vinculados</span>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <Button
                            variant='solid'
                            icon='HeroPlus'
                            onClick={() => setFlujoCreacion('seleccionarLicencia')}>
                            Crear licencia
                        </Button>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='p-0'>
                    {listaContratoLicencias.length === 0 ? (
                        <p className='p-4 text-center text-sm text-zinc-500'>
                            Este cliente no tiene licencias asociadas
                        </p>
                    ) : (
                        <div className='divide-y divide-zinc-100 dark:divide-zinc-700'>
                            {listaContratoLicencias.map((lic) => {
                                const usados = lic.cantidad - (lic.licencias_disponibles ?? 0);
                                const isExpanded = expandedLicenciaId === lic.id;

                                return (
                                    <div key={lic.id}>
                                        {/* Cabecera del accordion */}
                                        <div className='flex items-center justify-between px-4 py-3'>
                                            {/* Informacion */}
                                            <div
                                                className='flex flex-1 cursor-pointer items-center gap-3'
                                                onClick={() =>
                                                    setExpandedLicenciaId(
                                                        isExpanded ? null : lic.id,
                                                    )
                                                }>
                                                <span className='font-semibold'>
                                                    {lic.nombre_licencia}
                                                </span>
                                                <Badge
                                                    variant='solid'
                                                    color={lic.color_estado}
                                                    className='text-xs'>
                                                    {lic.estado_label}
                                                </Badge>
                                                <span className='text-sm text-zinc-500'>
                                                    {usados}/{lic.cantidad} cupos
                                                </span>
                                                {lic.fecha_fin && (
                                                    <span className='text-xs text-zinc-400'>
                                                        hasta{' '}
                                                        {dayjs(lic.fecha_fin).format('DD/MM/YYYY')}
                                                    </span>
                                                )}
                                                {lic.dias_restantes_licencia != null &&
                                                    lic.estado === 'activa' &&
                                                    lic.dias_restantes_licencia <= 30 && (
                                                        <Badge
                                                            variant='outline'
                                                            color={
                                                                lic.dias_restantes_licencia <= 0
                                                                    ? 'red'
                                                                    : 'amber'
                                                            }
                                                            className='text-xs'>
                                                            {lic.dias_restantes_licencia <= 0
                                                                ? 'Vencida'
                                                                : `${lic.dias_restantes_licencia} dias`}
                                                        </Badge>
                                                    )}
                                            </div>

                                            {/* Acciones */}
                                            <div className='flex items-center gap-1'>
                                                <Tooltip text='Ver detalle'>
                                                    <Button
                                                        icon='HeroEye'
                                                        size='sm'
                                                        onClick={() =>
                                                            navigate(
                                                                `/empresa/detalle-cliente/${detalleCliente?.id}/contrato/${lic.contrato}/licencia/${lic.id}?tab=asignaciones`,
                                                            )
                                                        }
                                                    />
                                                </Tooltip>
                                                <Tooltip text='Cambiar estado'>
                                                    <Button
                                                        icon='HeroArrowPath'
                                                        size='sm'
                                                        onClick={() =>
                                                            setModalEstado({
                                                                open: true,
                                                                licenciaId: lic.id,
                                                                estado: lic.estado,
                                                                estadoLabel: lic.estado_label,
                                                                color: lic.color_estado,
                                                            })
                                                        }
                                                    />
                                                </Tooltip>
                                                <Button
                                                    icon={
                                                        isExpanded
                                                            ? 'HeroChevronUp'
                                                            : 'HeroChevronDown'
                                                    }
                                                    size='sm'
                                                    onClick={() =>
                                                        setExpandedLicenciaId(
                                                            isExpanded ? null : lic.id,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Cuerpo expandible: usuarios vinculados */}
                                        {isExpanded && (
                                            <div className='border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
                                                <div className='mb-2 flex items-center justify-between'>
                                                    <span className='text-sm font-medium'>
                                                        Usuarios vinculados (
                                                        {listaUsuariosVinculados.length})
                                                    </span>
                                                    <CrearUsuarioVinculadoLicencia />
                                                </div>
                                                {listaUsuariosVinculados.length > 0 ? (
                                                    <Table>
                                                        <THead>
                                                            <Tr>
                                                                <Th>Usuario / Nombre</Th>
                                                                <Th>Fecha Asignación</Th>
                                                                <Th>Acciones</Th>
                                                            </Tr>
                                                        </THead>
                                                        <TBody>
                                                            {listaUsuariosVinculados.map((user) => (
                                                                <ItemsTablaDeUsuariosVinculadosLicencias
                                                                    key={user.id}
                                                                    user={user}
                                                                />
                                                            ))}
                                                        </TBody>
                                                    </Table>
                                                ) : (
                                                    <p className='p-4 text-center text-sm text-zinc-500'>
                                                        No hay usuarios vinculados a esta licencia
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal seleccion de licencia del catalogo */}
            <ModalLicenciaContrato
                isOpen={flujoCreacion === 'seleccionarLicencia'}
                onClose={handleCancelarFlujo}
                formik={licFormik}
                listaLicencias={listaLicencias}
            />

            {/* Modal crear contrato con licencia preseleccionada */}
            <CrearContratoDelCliente
                detalleCliente={detalleCliente}
                externalIsOpen={flujoCreacion === 'crearContrato'}
                onExternalClose={handleCancelarFlujo}
                tipoFijo='licencia'
                licenciasIniciales={licFormik.values.licencias}
            />

            {/* Modal cambiar estado */}
            <ModalCambiarEstadoLicencia
                isOpen={modalEstado.open}
                onClose={() => setModalEstado((prev) => ({ ...prev, open: false }))}
                licenciaId={modalEstado.licenciaId}
                estadoActual={modalEstado.estado}
                estadoActualLabel={modalEstado.estadoLabel}
                colorEstado={modalEstado.color}
            />
        </>
    );
}

export default TablaDeUsuariosVinculadosLicencias;
