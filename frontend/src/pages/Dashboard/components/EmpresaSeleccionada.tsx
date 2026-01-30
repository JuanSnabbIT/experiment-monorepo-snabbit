import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { detalleEmpresaThunk, useAppDispatch, useAppSelector } from '@/store';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EmpresaSeleccionada = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { detalleEmpresa } = useAppSelector((state) => state.empresa);
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (personalizacionUsuario?.sucursal_principal) {
            dispatch(
                detalleEmpresaThunk({ id_empresa: personalizacionUsuario.sucursal_principal }),
            );
        }
    }, [dispatch, personalizacionUsuario?.sucursal_principal]);

    return (
        <>
            <Card>
                <CardHeader className='card-header flex items-center justify-between'>
                    {detalleEmpresa ? (
                        <>
                            <Badge className='text-xl'>{detalleEmpresa.nombre}</Badge>
                            <Button
                                className='btn btn-secondary'
                                variant='outline'
                                onClick={() => navigate(`/empresas/${detalleEmpresa?.id}`)}>
                                {<Icon className='mr-2 text-xl' icon='HeroPencil' />}
                                {'Editar Empresa'}
                            </Button>
                        </>
                    ) : (
                        <p></p>
                    )}
                </CardHeader>
                {detalleEmpresa ? (
                    <CardBody>
                        <div className='mb-4 ml-4'>
                            <Badge className='text-lg font-semibold'>Sucursales:</Badge>
                            <Tooltip
                                text={detalleEmpresa.sucursales
                                    .map((sucursal) => sucursal.nombre)
                                    .join(', ')}>
                                <p className='ml-4'>{detalleEmpresa.sucursales.length}</p>
                            </Tooltip>
                        </div>
                        <div className='ml-4'>
                            <Badge className='text-lg font-semibold'>Dirección Principal:</Badge>
                            <p className='ml-4'>{detalleEmpresa.direccion_principal}</p>
                        </div>
                    </CardBody>
                ) : (
                    <CardBody className='text-center'>
                        <p>Aún no tienes empresa, crea una en este botón:</p>
                        <div className='mb-4 flex items-center justify-center'>
                            <Icon className='text-6xl text-red-500' icon={'DuoWarning1Circle'} />
                        </div>
                        <Button
                            className='btn btn-primary'
                            variant='outline'
                            onClick={() => navigate('/empresa/empresas')}>
                            Crear Empresa
                        </Button>
                    </CardBody>
                )}
            </Card>
        </>
    );
};

export default EmpresaSeleccionada;
