import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { FRECUENCIA_VISITA } from '@/constants/contrato.constant';
import { useUpdateContratoMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import classNames from 'classnames';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { buildUpdatePayload } from './contrato.helpers';
import { IContratoEdicion, ITabVisitasProps } from './contrato.types';

const TabVisitas = ({
    detalleContratoEmpresaCliente,
    puedeEditar,
    listaVisitas,
}: ITabVisitasProps) => {
    const [editandoSeccion, setEditandoSeccion] = useState(false);
    const [nuevaVisita, setNuevaVisita] = useState<string>('');
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoMutation();

    // Estado local para la sección
    const [visitas, setVisitas] = useState<IContratoEdicion['visitas']>([]);
    const [eliminarVisitas, setEliminarVisitas] = useState<number[]>([]);

    if (detalleContratoEmpresaCliente.tipo !== 'servicios') {
        return null;
    }

    const handleEditar = () => {
        setVisitas(
            detalleContratoEmpresaCliente.contrato_visitas.map((v) => ({
                id: v.id,
                cantidad: v.cantidad,
                frecuencia: v.frecuencia,
            })),
        );
        setEliminarVisitas([]);
        setNuevaVisita('');
        setEditandoSeccion(true);
    };

    const handleCancelar = () => {
        setEditandoSeccion(false);
        setVisitas([]);
        setEliminarVisitas([]);
        setNuevaVisita('');
    };

    const handleGuardar = async () => {
        try {
            const payload = buildUpdatePayload(detalleContratoEmpresaCliente, {
                visitas,
                eliminar_visitas: eliminarVisitas,
            });
            await updateContrato({
                id: detalleContratoEmpresaCliente.id,
                data: payload,
            }).unwrap();
            setEditandoSeccion(false);
            toast.success('Visitas actualizadas', { autoClose: 1000 });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>Visitas Programadas</div>
                </CardHeaderChild>
                <CardHeaderChild>
                    {puedeEditar && !editandoSeccion && (
                        <Tooltip text='Editar Visitas'>
                            <Button
                                variant='outline'
                                color='blue'
                                icon='HeroPlus'
                                className='text-blue-500'
                                onClick={handleEditar}>
                                Agregar
                            </Button>
                        </Tooltip>
                    )}
                    {editandoSeccion && (
                        <>
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
            <CardBody className='p-4'>
                <div className='flex flex-col'>
                    {editandoSeccion ? (
                        <>
                            {visitas.length > 0 ? (
                                visitas.map((visita, index) => (
                                    <div
                                        className={classNames(
                                            'flex flex-col justify-between p-2',
                                            index > 0 &&
                                                'border border-x-0 border-b-0 border-t-black dark:border-t-white',
                                        )}
                                        key={index}>
                                        <div className='font-bold'>
                                            {'visita_id' in visita
                                                ? listaVisitas.find(
                                                      (vis) => vis.id === visita.visita_id,
                                                  )?.descripcion
                                                : 'id' in visita
                                                  ? detalleContratoEmpresaCliente.contrato_visitas.find(
                                                        (vis) => vis.id === visita.id,
                                                    )?.descripcion_visita
                                                  : 'No se encontró la visita'}
                                            <Button
                                                color='red'
                                                icon='HeroTrash'
                                                onClick={() => {
                                                    const eliminada = visitas[index];
                                                    setVisitas(
                                                        visitas.filter((_, i) => i !== index),
                                                    );
                                                    if (eliminada.id) {
                                                        setEliminarVisitas((prev) => [
                                                            ...prev,
                                                            eliminada.id!,
                                                        ]);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className='grid grid-cols-2 gap-2'>
                                            <div>
                                                <Badge>Frecuencia</Badge>
                                                <SelectReact
                                                    name='cambio_frecuencia'
                                                    options={FRECUENCIA_VISITA}
                                                    value={FRECUENCIA_VISITA.find(
                                                        (fre) =>
                                                            fre.value === visita.frecuencia,
                                                    )}
                                                    onChange={(e) => {
                                                        const nuevas = [...visitas];
                                                        nuevas[index] = {
                                                            ...nuevas[index],
                                                            frecuencia: (e as TSelectOption)
                                                                .value,
                                                        };
                                                        setVisitas(nuevas);
                                                    }}
                                                    noOptionsMessage={(e) =>
                                                        `No Existe ${e.inputValue}`
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Badge>Cantidad</Badge>
                                                <Input
                                                    name={`visitas_cantidad_${index}`}
                                                    type='number'
                                                    value={visita.cantidad}
                                                    onChange={(e) => {
                                                        const nuevas = [...visitas];
                                                        nuevas[index] = {
                                                            ...nuevas[index],
                                                            cantidad: Number(e.target.value),
                                                        };
                                                        setVisitas(nuevas);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div>Sin Visitas</div>
                            )}
                            {listaVisitas
                                .filter(
                                    (vis) =>
                                        !detalleContratoEmpresaCliente.contrato_visitas.some(
                                            (num) =>
                                                num.visita === vis.id &&
                                                !eliminarVisitas.some(
                                                    (formVis) => formVis === num.id,
                                                ),
                                        ),
                                )
                                .filter(
                                    (vis) =>
                                        !visitas.some(
                                            (formVis) => formVis.visita_id === vis.id,
                                        ),
                                ).length > 0 && (
                                <div
                                    className={classNames(
                                        'flex flex-row justify-between p-2',
                                        'border border-x-0 border-b-0 border-t-black dark:border-t-white',
                                    )}>
                                    <div className='w-full'>
                                        <Badge>Agregar Visitas</Badge>
                                        <SelectReact
                                            name='nueva_visita'
                                            options={listaVisitas
                                                .filter(
                                                    (vis) =>
                                                        !detalleContratoEmpresaCliente.contrato_visitas.some(
                                                            (num) =>
                                                                num.visita === vis.id &&
                                                                !eliminarVisitas.some(
                                                                    (formVis) =>
                                                                        formVis === num.id,
                                                                ),
                                                        ),
                                                )
                                                .filter(
                                                    (vis) =>
                                                        !visitas.some(
                                                            (formVis) =>
                                                                formVis.visita_id === vis.id,
                                                        ),
                                                )
                                                .map((vis) => ({
                                                    value: vis.id.toString(),
                                                    label: vis.descripcion,
                                                }))}
                                            onChange={(e) => {
                                                setNuevaVisita((e as TSelectOption).value);
                                            }}
                                            value={{
                                                value: nuevaVisita,
                                                label:
                                                    listaVisitas.find(
                                                        (vis) =>
                                                            vis.id.toString() === nuevaVisita,
                                                    )?.descripcion || '',
                                            }}
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        />
                                    </div>
                                    <Button
                                        onClick={() => {
                                            if (nuevaVisita.trim() === '') {
                                                toast.error(
                                                    'Seleccione una visita para agregarla',
                                                    {
                                                        toastId:
                                                            'Seleccione una visita para agregarla',
                                                    },
                                                );
                                                return;
                                            }
                                            setVisitas((prev) => [
                                                ...prev,
                                                {
                                                    visita_id: Number(nuevaVisita),
                                                    cantidad: 1,
                                                    frecuencia: 'mensual',
                                                },
                                            ]);
                                            setNuevaVisita('');
                                        }}>
                                        Agregar
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {detalleContratoEmpresaCliente.contrato_visitas.length > 0 ? (
                                detalleContratoEmpresaCliente.contrato_visitas.map(
                                    (visita, index) => (
                                        <div
                                            className={classNames(
                                                'flex justify-between p-2',
                                                index > 0 &&
                                                    'border border-x-0 border-b-0 border-t-black',
                                            )}
                                            key={index}>
                                            <div>
                                                <div className='font-bold'>
                                                    {visita.descripcion_visita}
                                                </div>
                                                <div className='text-sm font-light'>
                                                    Frecuencia: {visita.frecuencia_label}
                                                </div>
                                            </div>
                                            <div>
                                                <Badge variant='solid'>{visita.cantidad}</Badge>
                                            </div>
                                        </div>
                                    ),
                                )
                            ) : (
                                <div>Sin Visitas</div>
                            )}
                        </>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default TabVisitas;
