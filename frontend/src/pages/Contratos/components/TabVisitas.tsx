import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { FRECUENCIA_VISITA } from '@/constants/contrato.constant';
import classNames from 'classnames';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { ITabVisitasProps } from './contrato.types';

const TabVisitas = ({
    formik,
    editando,
    detalleContratoEmpresaCliente,
    listaVisitas,
}: ITabVisitasProps) => {
    const [nuevaVisita, setNuevaVisita] = useState<string>('');

    if (detalleContratoEmpresaCliente.tipo !== 'servicios') {
        return null;
    }

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>Visitas Programadas</div>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                <div className='flex flex-col'>
                    {editando ? (
                        <>
                            {formik.values.visitas.length > 0 ? (
                                formik.values.visitas.map((visita, index) => (
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
                                                    const visitaEliminada =
                                                        formik.values.visitas[index];
                                                    const nuevasVisitas =
                                                        formik.values.visitas.filter(
                                                            (_, i) => i !== index,
                                                        );
                                                    const nuevosEliminados = [
                                                        ...formik.values.eliminar_visitas,
                                                    ];
                                                    if (visitaEliminada.id) {
                                                        nuevosEliminados.push(visitaEliminada.id);
                                                    }
                                                    formik.setFieldValue('visitas', nuevasVisitas);
                                                    formik.setFieldValue(
                                                        'eliminar_visitas',
                                                        nuevosEliminados,
                                                    );
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
                                                        formik.setFieldValue(
                                                            `visitas[${index}].frecuencia`,
                                                            (e as TSelectOption).value,
                                                        );
                                                    }}
                                                    noOptionsMessage={(e) =>
                                                        `No Existe ${e.inputValue}`
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Badge>Cantidad</Badge>
                                                <Input
                                                    name={`visitas[${index}].cantidad`}
                                                    type='number'
                                                    value={visita.cantidad}
                                                    onChange={formik.handleChange}
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
                                                !formik.values.eliminar_visitas.some(
                                                    (formVis) => formVis === num.id,
                                                ),
                                        ),
                                )
                                .filter(
                                    (vis) =>
                                        !formik.values.visitas.some(
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
                                                                !formik.values.eliminar_visitas.some(
                                                                    (formVis) =>
                                                                        formVis === num.id,
                                                                ),
                                                        ),
                                                )
                                                .filter(
                                                    (vis) =>
                                                        !formik.values.visitas.some(
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
                                            formik.setFieldValue('visitas', [
                                                ...formik.values.visitas,
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
