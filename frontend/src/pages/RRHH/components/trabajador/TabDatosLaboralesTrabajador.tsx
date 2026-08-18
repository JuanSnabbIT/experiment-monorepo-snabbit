import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useGetPlantillasV2Query } from '@/store/slices/contratos/plantillaContratoV2Api';
import {
    useCreateCargoCatalogoMutation,
    useGetCargosCatalogoQuery,
} from '@/store/slices/rrhh/cargoCatalogoApi';
import { useUpdateContratoTrabajadorMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
    HORAS_SEMANALES_OPTIONS,
    JORNADA_OPTIONS,
    MESES_OPTIONS,
    TIPO_CONTRATO_OPTIONS,
} from './types';

interface ITabDatosLaboralesProps {
    contrato: IContratoTrabajador;
}

const Campo = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
        <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
            {label}
        </p>
        <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

const getAntiguedadDisplay = (fechaInicio: string | null): string | null => {
    if (!fechaInicio) return null;
    const inicio = dayjs(fechaInicio);
    const hoy = dayjs();
    const años = hoy.diff(inicio, 'year');
    const meses = hoy.diff(inicio.add(años, 'year'), 'month');
    const partes: string[] = [];
    if (años > 0) partes.push(`${años} año${años !== 1 ? 's' : ''}`);
    if (meses > 0) partes.push(`${meses} mes${meses !== 1 ? 'es' : ''}`);
    return partes.length > 0 ? partes.join(', ') : 'Menos de 1 mes';
};

const TabDatosLaboralesTrabajador = ({ contrato }: ITabDatosLaboralesProps) => {
    const esBorrador = contrato.estado === 'borrador';
    const esVigente = contrato.estado === 'vigente';
    const [modalOpen, setModalOpen] = useState(false);

    const { data: cargosCatalogo = [] } = useGetCargosCatalogoQuery(undefined, { skip: !modalOpen });
    const { data: todasLasPlantillas = [] } = useGetPlantillasV2Query(undefined, { skip: !modalOpen });
    const [crearCargo] = useCreateCargoCatalogoMutation();
    const [updateContrato, { isLoading: guardando }] = useUpdateContratoTrabajadorMutation();

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cargo: contrato.cargo ?? '',
            tipo_contrato: contrato.tipo_contrato ?? '',
            fecha_inicio: contrato.fecha_inicio ?? '',
            fecha_termino: contrato.fecha_termino ?? '',
            cantidad_meses: '',
            jornada: contrato.jornada ?? '',
            horas_semanales: contrato.horas_semanales ? String(contrato.horas_semanales) : '',
            lugar_trabajo: contrato.lugar_trabajo ?? '',
            funciones: contrato.funciones ?? '',
            plantilla_contrato: contrato.plantilla_contrato ? String(contrato.plantilla_contrato) : '',
            es_indefinido: !contrato.fecha_termino,
        },
        onSubmit: async (values) => {
            try {
                await updateContrato({
                    id: contrato.id,
                    data: {
                        cargo: values.cargo,
                        tipo_contrato: values.tipo_contrato,
                        fecha_inicio: values.fecha_inicio,
                        fecha_termino: values.es_indefinido ? null : (values.fecha_termino || null),
                        jornada: values.jornada,
                        horas_semanales: values.horas_semanales ? Number(values.horas_semanales) : null,
                        lugar_trabajo: values.lugar_trabajo,
                        funciones: values.funciones,
                        plantilla_contrato: values.plantilla_contrato
                            ? Number(values.plantilla_contrato)
                            : null,
                    },
                }).unwrap();
                toast.success('Datos del contrato actualizados');
                setModalOpen(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            }
        },
    });

    const cargoOptions: TSelectOption[] = cargosCatalogo.map((c) => ({
        value: c.nombre,
        label: c.nombre,
    }));

    const plantillasOptions: TSelectOption[] = todasLasPlantillas
        .filter((p) => p.tipo_contrato === 'trabajador' && p.activa)
        .map((p) => ({ value: String(p.id), label: p.titulo }));

    const handleCrearCargo = async (nombre: string) => {
        try {
            await crearCargo({ nombre }).unwrap();
        } catch {
            // acepta texto libre igual
        }
        formik.setFieldValue('cargo', nombre);
    };

    return (
        <>
            <div className='space-y-4'>
                <Card>
                    <CardHeader>
                        <span>Datos del Contrato</span>
                        {esBorrador && (
                            <Tooltip text='Editar'>
                                <Button
                                    variant='solid'
                                    icon='HeroPencil'
                                    size='sm'
                                    onClick={() => setModalOpen(true)}
                                />
                            </Tooltip>
                        )}
                    </CardHeader>
                    <CardBody>
                        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                            <Campo label='Cargo' value={contrato.cargo} />
                            <Campo
                                label='Tipo de contrato'
                                value={contrato.tipo_contrato_label ?? contrato.tipo_contrato}
                            />
                            <Campo
                                label='Estado'
                                value={contrato.estado_label ?? contrato.estado}
                            />
                            <Campo
                                label='Fecha inicio'
                                value={
                                    contrato.fecha_inicio
                                        ? dayjs(contrato.fecha_inicio).format('DD/MM/YYYY')
                                        : null
                                }
                            />
                            <Campo
                                label='Fecha termino'
                                value={
                                    contrato.fecha_termino
                                        ? dayjs(contrato.fecha_termino).format('DD/MM/YYYY')
                                        : 'Indefinido'
                                }
                            />
                            <Campo
                                label='Jornada'
                                value={contrato.jornada_label ?? contrato.jornada}
                            />
                            <Campo label='Horas semanales' value={contrato.horas_semanales ?? '—'} />
                            <Campo label='Lugar de trabajo' value={contrato.lugar_trabajo} />
                            <Campo
                                label='Plantilla de contrato'
                                value={
                                    contrato.plantilla_contrato_titulo ??
                                    (contrato.plantilla_contrato
                                        ? `#${contrato.plantilla_contrato}`
                                        : '—')
                                }
                            />
                            {esVigente && (
                                <Campo
                                    label='Antigüedad'
                                    value={getAntiguedadDisplay(contrato.fecha_inicio)}
                                />
                            )}
                        </div>

                        {contrato.grupo_turno_snapshot ? (
                            <div className='col-span-2 mt-4'>
                                <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                    Grupo de turnos
                                </p>
                                <div className='mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900'>
                                    <div className='mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200'>
                                        {contrato.grupo_turno_snapshot.nombre}
                                        <span className='ml-2 font-normal text-zinc-400'>
                                            · ciclo {contrato.grupo_turno_snapshot.ciclo}
                                        </span>
                                    </div>
                                    <div className='space-y-0.5'>
                                        {contrato.grupo_turno_snapshot.slots.map((slot, i) => (
                                            <div
                                                key={i}
                                                className='text-xs text-zinc-600 dark:text-zinc-300'>
                                                <span className='mr-1 font-medium'>
                                                    {slot.orden + 1}.
                                                </span>
                                                {slot.nombre}
                                                <span className='ml-1 text-zinc-400'>
                                                    {slot.hora_inicio}–{slot.hora_fin}
                                                </span>
                                                {slot.horas_turno && (
                                                    <span className='ml-1 text-zinc-400'>
                                                        · {slot.horas_turno}h
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : contrato.horario_detalle ? (
                            <div className='col-span-2 mt-4'>
                                <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                    Horario
                                </p>
                                <p className='mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                                    {contrato.horario_detalle}
                                </p>
                            </div>
                        ) : null}

                        {contrato.funciones && (
                            <div className='mt-4'>
                                <p className='text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                                    Funciones
                                </p>
                                <p className='mt-1 whitespace-pre-wrap text-sm font-medium text-zinc-800 dark:text-zinc-100'>
                                    {contrato.funciones}
                                </p>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {(contrato.empresa_nombre || contrato.sucursal_nombre) && (
                    <Card>
                        <CardHeader>Asignacion Organizacional</CardHeader>
                        <CardBody>
                            <div className='grid grid-cols-2 gap-4'>
                                <Campo label='Empresa' value={contrato.empresa_nombre} />
                                <Campo label='Sucursal' value={contrato.sucursal_nombre} />
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>

            <Modal isOpen={modalOpen} setIsOpen={setModalOpen}>
                <ModalHeader>Editar datos del contrato</ModalHeader>
                <ModalBody>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <Label htmlFor='m_plantilla_contrato'>Plantilla de contrato</Label>
                            <SelectReact
                                id='m_plantilla_contrato'
                                name='plantilla_contrato'
                                options={plantillasOptions}
                                value={
                                    plantillasOptions.find(
                                        (o) => o.value === formik.values.plantilla_contrato,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'plantilla_contrato',
                                        (opt as TSelectOption)?.value ?? '',
                                    )
                                }
                                placeholder='Selecciona una plantilla...'
                                isClearable
                            />
                        </div>

                        <div className='sm:col-span-2'>
                            <Label htmlFor='m_cargo'>Cargo</Label>
                            <SelectReact
                                id='m_cargo'
                                name='cargo'
                                isCreatable
                                options={cargoOptions}
                                value={
                                    formik.values.cargo
                                        ? { value: formik.values.cargo, label: formik.values.cargo }
                                        : null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue('cargo', (opt as TSelectOption)?.value ?? '')
                                }
                                onCreateOption={handleCrearCargo}
                                placeholder='Selecciona o escribe un cargo...'
                            />
                        </div>

                        <div>
                            <Label htmlFor='m_tipo_contrato'>Tipo de contrato</Label>
                            <SelectReact
                                id='m_tipo_contrato'
                                name='tipo_contrato'
                                options={TIPO_CONTRATO_OPTIONS}
                                value={
                                    TIPO_CONTRATO_OPTIONS.find(
                                        (o) => o.value === formik.values.tipo_contrato,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'tipo_contrato',
                                        (opt as TSelectOption)?.value ?? '',
                                    )
                                }
                                placeholder='Tipo...'
                            />
                        </div>

                        <div>
                            <Label htmlFor='m_fecha_inicio'>Fecha inicio</Label>
                            <Input
                                id='m_fecha_inicio'
                                name='fecha_inicio'
                                type='date'
                                value={formik.values.fecha_inicio}
                                onChange={formik.handleChange}
                            />
                        </div>

                        <div className='sm:col-span-2'>
                            <Checkbox
                                id='m_es_indefinido'
                                name='es_indefinido'
                                checked={formik.values.es_indefinido}
                                onChange={formik.handleChange}
                                label='Contrato indefinido (sin fecha de término)'
                                dimension='sm'
                            />
                        </div>

                        {!formik.values.es_indefinido && (
                            <>
                                <div>
                                    <Label htmlFor='m_fecha_termino'>Fecha término</Label>
                                    <Input
                                        id='m_fecha_termino'
                                        name='fecha_termino'
                                        type='date'
                                        value={formik.values.fecha_termino}
                                        onChange={formik.handleChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='m_cantidad_meses'>Duración (meses)</Label>
                                    <SelectReact
                                        id='m_cantidad_meses'
                                        name='cantidad_meses'
                                        options={MESES_OPTIONS}
                                        value={
                                            MESES_OPTIONS.find(
                                                (o) =>
                                                    o.value === String(formik.values.cantidad_meses),
                                            ) ?? null
                                        }
                                        onChange={(opt) => {
                                            const meses = Number(
                                                (opt as TSelectOption)?.value ?? 0,
                                            );
                                            formik.setFieldValue('cantidad_meses', meses);
                                            if (meses && formik.values.fecha_inicio) {
                                                const ft = dayjs(formik.values.fecha_inicio)
                                                    .add(meses, 'month')
                                                    .subtract(1, 'day')
                                                    .format('YYYY-MM-DD');
                                                formik.setFieldValue('fecha_termino', ft);
                                            }
                                        }}
                                        placeholder='Meses...'
                                        isClearable
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <Label htmlFor='m_jornada'>Jornada</Label>
                            <SelectReact
                                id='m_jornada'
                                name='jornada'
                                options={JORNADA_OPTIONS}
                                value={
                                    JORNADA_OPTIONS.find(
                                        (o) => o.value === formik.values.jornada,
                                    ) ?? null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'jornada',
                                        (opt as TSelectOption)?.value ?? '',
                                    )
                                }
                                placeholder='Jornada...'
                            />
                        </div>

                        <div>
                            <Label htmlFor='m_horas_semanales'>Horas semanales</Label>
                            <SelectReact
                                id='m_horas_semanales'
                                name='horas_semanales'
                                isCreatable
                                options={HORAS_SEMANALES_OPTIONS}
                                value={
                                    formik.values.horas_semanales
                                        ? {
                                              value: formik.values.horas_semanales,
                                              label: `${formik.values.horas_semanales} hrs`,
                                          }
                                        : null
                                }
                                onChange={(opt) =>
                                    formik.setFieldValue(
                                        'horas_semanales',
                                        (opt as TSelectOption)?.value ?? '',
                                    )
                                }
                                onCreateOption={(val) =>
                                    formik.setFieldValue('horas_semanales', val)
                                }
                                placeholder='Horas...'
                                isClearable
                            />
                        </div>

                        <div className='sm:col-span-2'>
                            <Label htmlFor='m_lugar_trabajo'>Lugar de trabajo</Label>
                            <Input
                                id='m_lugar_trabajo'
                                name='lugar_trabajo'
                                value={formik.values.lugar_trabajo}
                                onChange={formik.handleChange}
                                placeholder='Dirección o descripción del lugar...'
                            />
                        </div>

                        <div className='sm:col-span-2'>
                            <Label htmlFor='m_funciones'>Funciones</Label>
                            <Textarea
                                id='m_funciones'
                                name='funciones'
                                value={formik.values.funciones}
                                onChange={formik.handleChange}
                                rows={4}
                                placeholder='Descripción de funciones...'
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        type='button'
                        onClick={() => setModalOpen(false)}
                        isDisable={guardando}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        type='button'
                        onClick={() => formik.handleSubmit()}
                        isLoading={guardando}>
                        Guardar cambios
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default TabDatosLaboralesTrabajador;
