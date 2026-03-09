import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Collapse from '@/components/utils/Collapse';
import classNames from 'classnames';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { ITabCondicionesProps } from './contrato.types';

const TabCondiciones = ({
    formik,
    editando,
    detalleContratoEmpresaCliente,
    listaCondicionesEspeciales,
}: ITabCondicionesProps) => {
    const [condicionCollapse, setCondicionCollapse] = useState<string>('');
    const [nuevaCondicion, setNuevaCondicion] = useState<string>('');

    return (
        <Card>
            <CardHeader className='border border-x-0 border-t-0 border-b-black'>
                <CardHeaderChild>
                    <div className='text-xl font-bold text-blue-500'>Condiciones Especiales</div>
                </CardHeaderChild>
            </CardHeader>
            <CardBody className='p-4'>
                <div className='flex flex-col'>
                    {editando ? (
                        <>
                            {formik.values.condiciones_especiales.length > 0 ? (
                                formik.values.condiciones_especiales.map((condicion, index) => (
                                    <div
                                        key={index}
                                        className='mb-2 flex items-center justify-between border-b p-2'>
                                        <span>
                                            {'condicion_id' in condicion
                                                ? listaCondicionesEspeciales.find(
                                                      (con) => con.id === condicion.condicion_id,
                                                  )?.titulo
                                                : 'id' in condicion
                                                  ? detalleContratoEmpresaCliente.contrato_condiciones_especiales.find(
                                                        (con) => con.id === condicion.id,
                                                    )?.titulo_condicion
                                                  : 'No se encontró la condición'}
                                        </span>
                                        <Button
                                            onClick={() => {
                                                const condicionEliminada =
                                                    formik.values.condiciones_especiales[index];
                                                const nuevasCondiciones =
                                                    formik.values.condiciones_especiales.filter(
                                                        (_, i) => i !== index,
                                                    );
                                                const nuevosEliminados = [
                                                    ...formik.values.eliminar_condiciones,
                                                ];
                                                if (condicionEliminada.id) {
                                                    nuevosEliminados.push(condicionEliminada.id);
                                                }
                                                formik.setFieldValue(
                                                    'condiciones_especiales',
                                                    nuevasCondiciones,
                                                );
                                                formik.setFieldValue(
                                                    'eliminar_condiciones',
                                                    nuevosEliminados,
                                                );
                                            }}
                                            color='red'
                                            icon='HeroTrash'
                                        />
                                    </div>
                                ))
                            ) : (
                                <div>Sin Condiciones</div>
                            )}
                            {listaCondicionesEspeciales
                                .filter(
                                    (con) =>
                                        !detalleContratoEmpresaCliente.contrato_condiciones_especiales.some(
                                            (num) =>
                                                num.condicion === con.id &&
                                                !formik.values.eliminar_condiciones.some(
                                                    (formCon) => formCon === num.id,
                                                ),
                                        ),
                                )
                                .filter(
                                    (con) =>
                                        !formik.values.condiciones_especiales.some(
                                            (formCon) => formCon.condicion_id === con.id,
                                        ),
                                ).length > 0 && (
                                <div className='mt-4 flex items-center justify-between gap-2'>
                                    <div className='w-full'>
                                        <Badge>Agregar Condición</Badge>
                                        <SelectReact
                                            name='nueva_condicion'
                                            placeholder='Agregar Condición'
                                            className='w-full min-w-[200px]'
                                            options={listaCondicionesEspeciales
                                                .filter(
                                                    (con) =>
                                                        !detalleContratoEmpresaCliente.contrato_condiciones_especiales.some(
                                                            (num) =>
                                                                num.condicion === con.id &&
                                                                !formik.values.eliminar_condiciones.some(
                                                                    (formCon) =>
                                                                        formCon === num.id,
                                                                ),
                                                        ),
                                                )
                                                .filter(
                                                    (con) =>
                                                        !formik.values.condiciones_especiales.some(
                                                            (formCon) =>
                                                                formCon.condicion_id === con.id,
                                                        ),
                                                )
                                                .map((con) => ({
                                                    value: con.id.toString(),
                                                    label: con.titulo,
                                                }))}
                                            onChange={(e) => {
                                                setNuevaCondicion((e as TSelectOption).value);
                                            }}
                                            value={{
                                                value: nuevaCondicion,
                                                label:
                                                    listaCondicionesEspeciales.find(
                                                        (con) =>
                                                            con.id.toString() === nuevaCondicion,
                                                    )?.titulo || '',
                                            }}
                                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                                        />
                                    </div>
                                    <Button
                                        onClick={() => {
                                            if (nuevaCondicion.trim() === '') {
                                                toast.error(
                                                    'Seleccione una condición para agregarla',
                                                    {
                                                        toastId:
                                                            'Seleccione una condición para agregarla',
                                                    },
                                                );
                                                return;
                                            }
                                            formik.setFieldValue('condiciones_especiales', [
                                                ...formik.values.condiciones_especiales,
                                                { condicion_id: Number(nuevaCondicion) },
                                            ]);
                                            setNuevaCondicion('');
                                        }}>
                                        Agregar
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {detalleContratoEmpresaCliente.contrato_condiciones_especiales.length >
                            0 ? (
                                detalleContratoEmpresaCliente.contrato_condiciones_especiales.map(
                                    (condicion, index, array) => (
                                        <div
                                            className={classNames(
                                                'border border-black p-2',
                                                index === 0 && 'rounded-t-xl',
                                                index + 1 === array.length && 'rounded-b-xl',
                                            )}
                                            key={index}>
                                            <div
                                                className='flex w-full justify-between'
                                                onClick={() => {
                                                    setCondicionCollapse(
                                                        condicion.id.toString() ===
                                                            condicionCollapse
                                                            ? ''
                                                            : condicion.id.toString(),
                                                    );
                                                }}>
                                                <div>{condicion.titulo_condicion}</div>
                                                <Icon
                                                    icon={
                                                        condicion.id.toString() ===
                                                        condicionCollapse
                                                            ? 'HeroChevronUp'
                                                            : 'HeroChevronDown'
                                                    }
                                                />
                                            </div>
                                            <Collapse
                                                isOpen={
                                                    condicion.id.toString() === condicionCollapse
                                                }>
                                                <div className='pt-2'>
                                                    {condicion.descripcion_condicion}
                                                </div>
                                            </Collapse>
                                        </div>
                                    ),
                                )
                            ) : (
                                <div>Sin Condiciones</div>
                            )}
                        </>
                    )}
                </div>
            </CardBody>
        </Card>
    );
};

export default TabCondiciones;
