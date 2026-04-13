import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import type { IOrdenDeTrabajoV3 } from '@/interface/ordenTrabajoV3.interface';
import { useUpdateOrdenV3Mutation } from '@/store/slices/ordenTrabajoV3/ordenTrabajoV3Api';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { toast } from 'react-toastify';

interface IProps {
    orden: IOrdenDeTrabajoV3;
    tecnicosOptions: TSelectOption[];
    solicitantesOptions: TSelectOption[];
}

const PanelBorrador = ({ orden, tecnicosOptions, solicitantesOptions }: IProps) => {
    const [updateOrden, { isLoading }] = useUpdateOrdenV3Mutation();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            fecha_programada: orden.fecha_programada
                ? dayjs(orden.fecha_programada).format('YYYY-MM-DD')
                : '',
            fecha_fin_estimada: orden.fecha_fin_estimada ?? '',
            tecnico_responsable: orden.tecnico_responsable ?? 0,
            cliente_solicitante: orden.cliente_solicitante ?? 0,
            descripcion: (orden as any).descripcion ?? '',
            notas_internas: (orden as any).notas_internas ?? '',
        },
        onSubmit: async (values) => {
            try {
                await updateOrden({
                    id: orden.id,
                    data: {
                        ...(values.fecha_programada ? { fecha_programada: values.fecha_programada } : { fecha_programada: null }),
                        ...(values.fecha_fin_estimada ? { fecha_fin_estimada: values.fecha_fin_estimada } : { fecha_fin_estimada: null }),
                        ...(values.tecnico_responsable ? { tecnico_responsable: values.tecnico_responsable } : { tecnico_responsable: null }),
                        ...(values.cliente_solicitante ? { cliente_solicitante: values.cliente_solicitante } : { cliente_solicitante: null }),
                        descripcion: values.descripcion,
                        notas_internas: values.notas_internas,
                    },
                }).unwrap();
                toast.success('OT actualizada');
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <span className='font-semibold text-gray-700 dark:text-gray-200'>
                        Informacion de la OT
                    </span>
                </CardHeaderChild>
                <CardHeaderChild>
                    <Button
                        variant='solid'
                        color='blue'
                        size='sm'
                        isLoading={isLoading}
                        onClick={() => void formik.submitForm()}>
                        Guardar cambios
                    </Button>
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                    {/* Fecha inicio */}
                    <div>
                        <Label htmlFor='fecha_programada' className='mb-1'>
                            Fecha inicio
                        </Label>
                        <Input
                            id='fecha_programada'
                            name='fecha_programada'
                            type='date'
                            value={formik.values.fecha_programada}
                            onChange={formik.handleChange}
                        />
                    </div>

                    {/* Fecha fin estimada */}
                    <div>
                        <Label htmlFor='fecha_fin_estimada' className='mb-1'>
                            Fecha fin estimada
                        </Label>
                        <Input
                            id='fecha_fin_estimada'
                            name='fecha_fin_estimada'
                            type='date'
                            value={formik.values.fecha_fin_estimada}
                            onChange={formik.handleChange}
                        />
                    </div>

                    {/* Responsable */}
                    <div>
                        <Label htmlFor='tecnico_responsable' className='mb-1'>
                            Responsable
                        </Label>
                        <SelectReact
                            id='tecnico_responsable'
                            name='tecnico_responsable'
                            options={tecnicosOptions}
                            isClearable
                            placeholder='Seleccionar responsable...'
                            value={
                                tecnicosOptions.find(
                                    (o) => Number(o.value) === formik.values.tecnico_responsable,
                                ) ?? null
                            }
                            onChange={(opt) =>
                                formik.setFieldValue(
                                    'tecnico_responsable',
                                    opt ? Number((opt as TSelectOption).value) : 0,
                                )
                            }
                        />
                    </div>

                    {/* Solicitante */}
                    <div>
                        <Label htmlFor='cliente_solicitante' className='mb-1'>
                            Solicitante
                        </Label>
                        <SelectReact
                            id='cliente_solicitante'
                            name='cliente_solicitante'
                            options={solicitantesOptions}
                            isClearable
                            placeholder='Seleccionar solicitante...'
                            value={
                                solicitantesOptions.find(
                                    (o) => Number(o.value) === formik.values.cliente_solicitante,
                                ) ?? null
                            }
                            onChange={(opt) =>
                                formik.setFieldValue(
                                    'cliente_solicitante',
                                    opt ? Number((opt as TSelectOption).value) : 0,
                                )
                            }
                        />
                    </div>

                    {/* Descripcion */}
                    <div className='sm:col-span-2'>
                        <Label htmlFor='descripcion' className='mb-1'>
                            Descripcion
                        </Label>
                        <Textarea
                            id='descripcion'
                            name='descripcion'
                            value={formik.values.descripcion}
                            onChange={formik.handleChange}
                            rows={3}
                            placeholder='Descripcion del trabajo a realizar...'
                        />
                    </div>

                    {/* Notas internas */}
                    <div className='sm:col-span-2'>
                        <Label htmlFor='notas_internas' className='mb-1'>
                            Notas internas
                        </Label>
                        <Textarea
                            id='notas_internas'
                            name='notas_internas'
                            value={formik.values.notas_internas}
                            onChange={formik.handleChange}
                            rows={3}
                            placeholder='Notas visibles solo para el equipo...'
                        />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

export default PanelBorrador;
