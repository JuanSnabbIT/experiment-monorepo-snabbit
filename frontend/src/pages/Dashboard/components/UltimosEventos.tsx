import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { detalleEmpresaThunk, useAppDispatch, useAppSelector } from '@/store';
import React, { useEffect } from 'react';

const UltimosEventos = () => {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    useEffect(() => {
        if (personalizacionUsuario?.sucursal_principal) {
            dispatch(
                detalleEmpresaThunk({ id_empresa: personalizacionUsuario.sucursal_principal }),
            );
        }
    }, [dispatch, personalizacionUsuario?.sucursal_principal]);

    return (
        <Card>
            <CardHeader>
                <Badge className='text-xl'>Ultimas Eventos</Badge>
            </CardHeader>
            <CardBody>
                <div>
                    <Badge>Ultimas Eventos</Badge>
                </div>
            </CardBody>
        </Card>
    );
};

export default UltimosEventos;
