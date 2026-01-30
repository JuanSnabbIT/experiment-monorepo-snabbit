import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import {
    detalleContratoLicenciaThunk,
    LIMPIAR_DETALLE_LICENCIA,
    LIMPIAR_USUARIOS_VINCULADOS_LICENCIA,
    listaContratoLicenciaDeEmpresaYClienteThunk,
    listaUsuariosVinculadosLicenciaThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useEffect, useState } from 'react';
import CrearUsuarioVinculadoLicencia from '../modals/CrearUsuarioVinculadoLicencia';
import ItemsTablaDeUsuariosVinculadosLicencias from './ItemsTablaDeUsuariosVinculadosLicencias';

function TablaDeUsuariosVinculadosLicencias() {
    const dispatch = useAppDispatch();
    const { detalleCliente } = useAppSelector((state) => state.empresa);
    const {
        listaContratoLicenciaDeEmpresaYCliente,
        listaUsuariosVinculadosLicencia,
        detalleContratoLicencia,
    } = useAppSelector((state) => state.contrato);
    const [contratoLicencia, setContratoLicencia] = useState<
        { id: string; nombre: string } | undefined
    >();

    useEffect(() => {
        if (detalleCliente) {
            dispatch(
                listaContratoLicenciaDeEmpresaYClienteThunk({
                    id_cliente: detalleCliente.cliente,
                    id_empresa: detalleCliente.prestador_servicios,
                }),
            );
        }

        return () => {
            dispatch(LIMPIAR_USUARIOS_VINCULADOS_LICENCIA());
            dispatch(LIMPIAR_DETALLE_LICENCIA());
        };
    }, [detalleCliente]);

    useEffect(() => {
        if (contratoLicencia) {
            // LLAMAR A USUARIOS DENTRO DE LA LICENCIA
            dispatch(listaUsuariosVinculadosLicenciaThunk({ id_licencia: contratoLicencia.id }));
            dispatch(detalleContratoLicenciaThunk({ id_licencia: contratoLicencia.id }));
        }
    }, [contratoLicencia]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardHeaderChild>
                        <Badge className='text-xl'>
                            Licencias Vinculadas{' '}
                            {detalleContratoLicencia &&
                                `${detalleContratoLicencia.nombre_contrato}: ${detalleContratoLicencia.nombre_licencia}`}
                        </Badge>
                    </CardHeaderChild>
                    <CardHeaderChild>
                        <div>
                            <CrearUsuarioVinculadoLicencia />
                        </div>
                        <div className='w-[200px]'>
                            <Badge>Licencias</Badge>
                            <SelectReact
                                name='selectContratoLicencia'
                                noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                placeholder='Seleccione una licencia'
                                options={listaContratoLicenciaDeEmpresaYCliente.map((con) => ({
                                    value: con.id.toString(),
                                    label: `${con.nombre_contrato}: ${con.nombre_licencia}`,
                                }))}
                                onChange={(e) => {
                                    if (e) {
                                        setContratoLicencia({
                                            id: (e as TSelectOption).value,
                                            nombre: (e as TSelectOption).label,
                                        });
                                    } else {
                                        setContratoLicencia(undefined);
                                    }
                                }}
                                value={
                                    contratoLicencia
                                        ? {
                                              value: contratoLicencia.id,
                                              label: contratoLicencia.nombre,
                                          }
                                        : undefined
                                }
                            />
                        </div>
                    </CardHeaderChild>
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                        {detalleContratoLicencia && (
                            <>
                                <div>
                                    <Badge>Cantidad / Disponibles</Badge>
                                    <div className='ml-4'>
                                        {detalleContratoLicencia.cantidad} /{' '}
                                        {detalleContratoLicencia.licencias_disponibles}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Fecha de Inicio / Fin de Edición</Badge>
                                    <div className='ml-4'>
                                        {detalleContratoLicencia.fecha_inicio_edicion
                                            ? dayjs(detalleContratoLicencia.fecha_inicio_edicion)
                                                  .locale('es')
                                                  .format('DD/MM/YYYY')
                                            : 'Sin Fecha de Inicio'}{' '}
                                        -{' '}
                                        {detalleContratoLicencia.fecha_fin_edicion
                                            ? dayjs(detalleContratoLicencia.fecha_fin_edicion)
                                                  .locale('es')
                                                  .format('DD/MM/YYYY')
                                            : 'Sin Fecha de Fin'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Partner</Badge>
                                    <div className='ml-4'>
                                        {detalleContratoLicencia.partner ? 'Si' : 'No'}
                                    </div>
                                </div>
                                <div>
                                    <Badge>Dias Restantes de Licencia</Badge>
                                    <div className='ml-4'>
                                        {detalleContratoLicencia.dias_restantes_licencia}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </CardBody>
            </Card>

            {contratoLicencia && (
                <Card>
                    <CardHeader>
                        <Badge className='text-xl'>Usuarios Vinculados</Badge>
                    </CardHeader>
                    <CardBody className='z-0 flex flex-col gap-4'>
                        <div className='overflow-auto'>
                            <div className='flex min-w-[600px] flex-col gap-4'>
                                <div className='grid grid-cols-3 rounded-xl border border-blue-500'>
                                    <div className='border-r border-r-blue-500 p-4'>
                                        <Badge>Nombre / Correo</Badge>
                                    </div>
                                    <div className='border-r border-r-blue-500 p-4'>
                                        <Badge>Fecha de Asignación</Badge>
                                    </div>
                                    <div className='p-4'>
                                        <Badge>Acciones</Badge>
                                    </div>
                                </div>
                                {listaUsuariosVinculadosLicencia.length > 0 ? (
                                    <>
                                        {listaUsuariosVinculadosLicencia.map((user, index) => (
                                            <ItemsTablaDeUsuariosVinculadosLicencias
                                                user={user}
                                                key={index}
                                            />
                                        ))}
                                    </>
                                ) : (
                                    <div className='p-4 text-center'>Sin Usuarios</div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}
        </>
    );
}

export default TablaDeUsuariosVinculadosLicencias;
