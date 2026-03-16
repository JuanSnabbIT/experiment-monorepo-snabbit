import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { useUpdateContratoMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModalCambiarEstadoLicencia from '../modals/ModalCambiarEstadoLicencia';
import ModalLicenciaContrato from '../modals/ModalLicenciaContrato';
import { buildUpdatePayload } from './contrato.helpers';
import { IContratoEdicion, ITabLicenciasProps } from './contrato.types';

// Estado para modales
interface IModalEstadoState {
    isOpen: boolean;
    licenciaId: number;
    estadoActual: string;
    estadoActualLabel: string;
    colorEstado: 'emerald' | 'red' | 'amber' | 'zinc';
    sePuedeCancelar: boolean;
}

const MODAL_ESTADO_INITIAL: IModalEstadoState = {
    isOpen: false,
    licenciaId: 0,
    estadoActual: '',
    estadoActualLabel: '',
    colorEstado: 'zinc',
    sePuedeCancelar: false,
};

const INITIAL_VALUES: IContratoEdicion = {
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
};

const TabLicencias = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
    listaLicencias,
}: ITabLicenciasProps) => {
    const navigate = useNavigate();
    const { clienteId, contratoId } = useParams<{ clienteId: string; contratoId: string }>();

    const [editandoSeccion, setEditandoSeccion] = useState(false);
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoMutation();

    // Formik local — ModalLicenciaContrato lee/escribe .licencias[]
    const localFormik = useFormik<IContratoEdicion>({
        initialValues: INITIAL_VALUES,
        onSubmit: () => {},
    });

    // Modal agregar / editar licencia
    const [modalLicencia, setModalLicencia] = useState<{
        isOpen: boolean;
        editIndex?: number;
        editNombre?: string;
    }>({ isOpen: false });

    // Modal cambiar estado
    const [modalEstado, setModalEstado] = useState<IModalEstadoState>(MODAL_ESTADO_INITIAL);

    if (detalleContratoEmpresaCliente.tipo !== 'licencia') return null;

    // Handlers de edición por sección
    const handleEditar = () => {
        localFormik.setValues({
            ...INITIAL_VALUES,
            licencias: detalleContratoEmpresaCliente.contrato_licencias.map((cl) => ({
                id: cl.id,
                licencia_id: cl.licencia,
                tipo_modalidad: cl.tipo_modalidad,
                otro_tipo: cl.otro_tipo,
                cantidad: cl.cantidad,
                precio_unitario: Number(cl.precio_unitario),
                fecha_inicio: cl.fecha_inicio,
                fecha_fin: cl.fecha_fin,
                tipo_moneda: cl.tipo_moneda,
            })),
        });
        setEditandoSeccion(true);
    };

    const handleCancelar = () => {
        setEditandoSeccion(false);
        localFormik.resetForm();
    };

    const handleGuardar = async () => {
        try {
            const payload = buildUpdatePayload(detalleContratoEmpresaCliente, {
                licencias: localFormik.values.licencias,
                eliminar_licencias: localFormik.values.eliminar_licencias,
            });
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: payload,
            }).unwrap();
            setEditandoSeccion(false);
            toast.success('Licencias actualizadas', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    // Helpers
    const getNombreItem = (item: (typeof localFormik.values.licencias)[number]): string => {
        if ('id' in item && item.id) {
            return (
                detalleContratoEmpresaCliente.contrato_licencias.find((c) => c.id === item.id)
                    ?.nombre_licencia ?? ''
            );
        }
        if ('licencia_id' in item && item.licencia_id) {
            return listaLicencias.find((l) => l.id === item.licencia_id)?.nombre ?? '';
        }
        return '';
    };

    const getContratoLicencia = (item: (typeof localFormik.values.licencias)[number]) =>
        'id' in item && item.id
            ? detalleContratoEmpresaCliente.contrato_licencias.find((c) => c.id === item.id)
            : undefined;

    const handleVerDetalle = (licenciaId: number) => {
        if (clienteId && contratoId) {
            navigate(
                `/empresa/detalle-cliente/${clienteId}/contrato/${contratoId}/licencia/${licenciaId}?tab=contratos`,
            );
        }
    };

    const handleEliminarItem = (index: number) => {
        const item = localFormik.values.licencias[index];
        const nuevas = localFormik.values.licencias.filter((_, i) => i !== index);
        const nuevosEliminados = [...localFormik.values.eliminar_licencias];
        if ('id' in item && item.id) nuevosEliminados.push(item.id);
        localFormik.setFieldValue('licencias', nuevas);
        localFormik.setFieldValue('eliminar_licencias', nuevosEliminados);
    };

    return (
        <>
            <Card>
                <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                    <CardHeaderChild>
                        <div className='text-xl font-bold text-blue-500'>Licencias</div>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        {puedeEditar && !editandoSeccion && (
                            <Tooltip text='Editar Licencias'>
                                <Button
                                    variant='outline'
                                    color='blue'
                                    icon='HeroPlus'
                                    className='text-blue-500'
                                    onClick={handleEditar}>
                                    Gestionar licencias
                                </Button>
                            </Tooltip>
                        )}
                        {editandoSeccion && (
                            <>
                                <Button
                                    variant='solid'
                                    icon='HeroPlus'
                                    onClick={() => setModalLicencia({ isOpen: true })}>
                                    Agregar licencia
                                </Button>
                                <Button
                                    icon='HeroXMark'
                                    color='red'
                                    size='sm'
                                    onClick={handleCancelar}>
                                    Cancelar
                                </Button>
                                <Button
                                    icon='HeroCheck'
                                    variant='solid'
                                    color='emerald'
                                    size='sm'
                                    isLoading={guardando}
                                    onClick={handleGuardar}>
                                    Guardar
                                </Button>
                            </>
                        )}
                    </CardHeaderChild>
                </CardHeader>
                <CardBody className='p-0'>
                    <div className='border-b border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700'>
                        Administra las licencias del contrato y entra al detalle para revisar
                        cupos, estado e historial.
                    </div>
                    {!editandoSeccion ? (
                        // Modo lectura: lista compacta nombre + Ver detalle
                        detalleContratoEmpresaCliente.contrato_licencias.length === 0 ? (
                            <div className='p-4 text-sm text-zinc-500'>Sin licencias</div>
                        ) : (
                            <div className='divide-y divide-zinc-100 dark:divide-zinc-700'>
                                {detalleContratoEmpresaCliente.contrato_licencias.map((lic) => (
                                    <div
                                        key={lic.id}
                                        className='flex items-center justify-between px-4 py-3'>
                                        <span className='font-medium'>{lic.nombre_licencia}</span>
                                        {clienteId && contratoId && (
                                            <Tooltip text='Ver detalle'>
                                                <Button
                                                    icon='HeroEye'
                                                    size='sm'
                                                    onClick={() => handleVerDetalle(lic.id)}
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // Modo edición: lista compacta con acciones editar/eliminar
                        localFormik.values.licencias.length === 0 ? (
                            <div className='p-4 text-sm text-zinc-500'>Sin licencias</div>
                        ) : (
                            <div className='divide-y divide-zinc-100 dark:divide-zinc-700'>
                                {(
                                    localFormik.values
                                        .licencias as (typeof localFormik.values.licencias)[number][]
                                ).map((item, index) => {
                                    const cl = getContratoLicencia(item);
                                    const nombre = getNombreItem(item);
                                    return (
                                        <div
                                            key={index}
                                            className='flex items-center justify-between px-4 py-3'>
                                            <div className='flex items-center gap-2'>
                                                <span className='font-medium'>{nombre}</span>
                                                {!cl && (
                                                    <Badge
                                                        variant='outline'
                                                        color='blue'
                                                        className='text-xs'>
                                                        nueva
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className='flex items-center gap-1'>
                                                {cl && clienteId && contratoId && (
                                                    <Tooltip text='Ver detalle'>
                                                        <Button
                                                            icon='HeroEye'
                                                            size='sm'
                                                            onClick={() =>
                                                                handleVerDetalle(cl.id)
                                                            }
                                                        />
                                                    </Tooltip>
                                                )}
                                                <Tooltip text='Editar'>
                                                    <Button
                                                        icon='HeroPencil'
                                                        size='sm'
                                                        onClick={() =>
                                                            setModalLicencia({
                                                                isOpen: true,
                                                                editIndex: index,
                                                                editNombre: nombre,
                                                            })
                                                        }
                                                    />
                                                </Tooltip>
                                                <Tooltip text='Eliminar'>
                                                    <Button
                                                        icon='HeroTrash'
                                                        size='sm'
                                                        color='red'
                                                        onClick={() =>
                                                            handleEliminarItem(index)
                                                        }
                                                    />
                                                </Tooltip>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </CardBody>
            </Card>

            {/* Modal agregar / editar */}
            <ModalLicenciaContrato
                isOpen={modalLicencia.isOpen}
                onClose={() => setModalLicencia({ isOpen: false })}
                formik={localFormik}
                listaLicencias={listaLicencias}
                editIndex={modalLicencia.editIndex}
                editNombreLicencia={modalLicencia.editNombre}
            />

            {/* Modal cambiar estado */}
            <ModalCambiarEstadoLicencia
                isOpen={modalEstado.isOpen}
                onClose={() => setModalEstado(MODAL_ESTADO_INITIAL)}
                licenciaId={modalEstado.licenciaId}
                estadoActual={modalEstado.estadoActual}
                estadoActualLabel={modalEstado.estadoActualLabel}
                colorEstado={modalEstado.colorEstado}
                sePuedeCancelar={modalEstado.sePuedeCancelar}
            />
        </>
    );
};

export default TabLicencias;
