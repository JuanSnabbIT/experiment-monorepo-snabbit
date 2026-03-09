import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ModalCambiarEstadoLicencia from '../modals/ModalCambiarEstadoLicencia';
import ModalLicenciaContrato from '../modals/ModalLicenciaContrato';
import { ITabLicenciasProps } from './contrato.types';

//  Estado para modales 
interface IModalEstadoState {
    isOpen: boolean;
    licenciaId: number;
    estadoActual: string;
    estadoActualLabel: string;
    colorEstado: 'emerald' | 'red' | 'amber' | 'zinc';
}

const MODAL_ESTADO_INITIAL: IModalEstadoState = {
    isOpen: false,
    licenciaId: 0,
    estadoActual: '',
    estadoActualLabel: '',
    colorEstado: 'zinc',
};

const TabLicencias = ({
    formik,
    editando,
    detalleContratoEmpresaCliente,
    listaLicencias,
}: ITabLicenciasProps) => {
    const navigate = useNavigate();
    const { clienteId, contratoId } = useParams<{ clienteId: string; contratoId: string }>();

    // Modal agregar / editar licencia
    const [modalLicencia, setModalLicencia] = useState<{
        isOpen: boolean;
        editIndex?: number;
        editNombre?: string;
    }>({ isOpen: false });

    // Modal cambiar estado
    const [modalEstado, setModalEstado] = useState<IModalEstadoState>(MODAL_ESTADO_INITIAL);

    if (detalleContratoEmpresaCliente.tipo !== 'licencia') return null;

    //  Helpers 

    /** Nombre legible para un item del formik (puede ser existente o nuevo) */
    const getNombreItem = (item: (typeof formik.values.licencias)[number]): string => {
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

    /** Obtener la ContratoLicencia completa para un item del formik */
    const getContratoLicencia = (item: (typeof formik.values.licencias)[number]) =>
        'id' in item && item.id
            ? detalleContratoEmpresaCliente.contrato_licencias.find((c) => c.id === item.id)
            : undefined;

    const handleVerDetalle = (licenciaId: number) => {
        if (clienteId && contratoId) {
            navigate(
                `/empresa/detalle-cliente/${clienteId}/contrato/${contratoId}/licencia/${licenciaId}`,
            );
        }
    };

    const openModalEstado = (
        cl: (typeof detalleContratoEmpresaCliente.contrato_licencias)[number],
    ) => {
        setModalEstado({
            isOpen: true,
            licenciaId: cl.id,
            estadoActual: cl.estado,
            estadoActualLabel: cl.estado_label,
            colorEstado: cl.color_estado,
        });
    };

    const handleEliminarItem = (index: number) => {
        const item = formik.values.licencias[index];
        const nuevas = formik.values.licencias.filter((_, i) => i !== index);
        const nuevosEliminados = [...formik.values.eliminar_licencias];
        if ('id' in item && item.id) nuevosEliminados.push(item.id);
        formik.setFieldValue('licencias', nuevas);
        formik.setFieldValue('eliminar_licencias', nuevosEliminados);
    };

    return (
        <>
            <Card>
                <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                    <CardHeaderChild>
                        <div className='text-xl font-bold text-blue-500'>Licencias</div>
                    </CardHeaderChild>
                    {editando && (
                        <CardHeaderChild>
                            <Button
                                variant='solid'
                                icon='HeroPlus'
                                onClick={() => setModalLicencia({ isOpen: true })}>
                                Nueva Licencia
                            </Button>
                        </CardHeaderChild>
                    )}
                </CardHeader>
                <CardBody className='p-0'>
                    {!editando ? (
                        //  Modo lectura: lista compacta nombre + Ver detalle 
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
                        //  Modo edicion: lista compacta con acciones editar/eliminar 
                        formik.values.licencias.length === 0 ? (
                            <div className='p-4 text-sm text-zinc-500'>Sin licencias</div>
                        ) : (
                            <div className='divide-y divide-zinc-100 dark:divide-zinc-700'>
                                {(
                                    formik.values
                                        .licencias as (typeof formik.values.licencias)[number][]
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
                formik={formik}
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
            />
        </>
    );
};

export default TabLicencias;