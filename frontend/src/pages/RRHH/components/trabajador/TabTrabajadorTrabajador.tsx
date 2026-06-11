import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useActualizarDatosRelacionadosContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useFormik } from 'formik';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface ITabTrabajadorProps {
    contrato: IContratoTrabajador;
}

const Campo = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
        <p className='text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500'>{label}</p>
        <p className='mt-0.5 text-sm text-zinc-900 dark:text-zinc-100'>{value ?? '—'}</p>
    </div>
);

const TabTrabajadorTrabajador = ({ contrato }: ITabTrabajadorProps) => {
    const esNuevoTrabajador = contrato.datos_trabajador_nuevo != null;
    const esEditable = contrato.estado === 'borrador' && esNuevoTrabajador;
    const [editando, setEditando] = useState(false);

    const [actualizarDatos, { isLoading: guardando }] = useActualizarDatosRelacionadosContratoMutation();
    const dtn = contrato.datos_trabajador_nuevo;

    const nombre = contrato.nombre_trabajador ?? (dtn ? `${dtn.first_name ?? ''} ${dtn.last_name ?? ''}`.trim() || null : null);
    const rut = contrato.rut_trabajador ?? dtn?.rut ?? null;
    const email = contrato.email_trabajador ?? dtn?.email ?? null;
    const telefono = contrato.telefono_trabajador ?? null;
    const fechaNac = contrato.fecha_nacimiento_trabajador ?? dtn?.fecha_nacimiento ?? null;
    const nacionalidad = contrato.nacionalidad_trabajador ?? dtn?.nacionalidad ?? null;
    const direccion = contrato.direccion_trabajador ?? dtn?.direccion ?? null;

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            first_name: dtn?.first_name ?? '',
            last_name: dtn?.last_name ?? '',
            rut: dtn?.rut ?? '',
            nacionalidad: dtn?.nacionalidad ?? '',
            fecha_nacimiento: dtn?.fecha_nacimiento ?? '',
            direccion: dtn?.direccion ?? '',
        },
        onSubmit: async (values) => {
            try {
                await actualizarDatos({ id: contrato.id, data: values }).unwrap();
                toast.success('Datos del trabajador actualizados');
                setEditando(false);
            } catch (err: unknown) {
                toast.error(getErrorMessage(err));
            }
        },
    });

    // ── Modo edición ──────────────────────────────────────────────────
    if (editando && esEditable) {
        return (
            <div className='space-y-4'>
                <Card>
                    <CardHeader><span>Editar Datos del Trabajador</span></CardHeader>
                    <CardBody>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div>
                                <Label htmlFor='first_name'>Nombre</Label>
                                <Input id='first_name' name='first_name' value={formik.values.first_name} onChange={formik.handleChange} placeholder='Nombre...' />
                            </div>
                            <div>
                                <Label htmlFor='last_name'>Apellido</Label>
                                <Input id='last_name' name='last_name' value={formik.values.last_name} onChange={formik.handleChange} placeholder='Apellido...' />
                            </div>
                            <div>
                                <Label htmlFor='rut'>RUT</Label>
                                <Input id='rut' name='rut' value={formik.values.rut} onChange={formik.handleChange} placeholder='12.345.678-9' />
                            </div>
                            <div>
                                <Label>Email</Label>
                                <p className='mt-1 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800'>{dtn?.email ?? '—'}</p>
                            </div>
                            <div>
                                <Label htmlFor='nacionalidad'>Nacionalidad</Label>
                                <Input id='nacionalidad' name='nacionalidad' value={formik.values.nacionalidad} onChange={formik.handleChange} placeholder='Chilena...' />
                            </div>
                            <div>
                                <Label htmlFor='fecha_nacimiento'>Fecha de nacimiento</Label>
                                <Input id='fecha_nacimiento' name='fecha_nacimiento' type='date' value={formik.values.fecha_nacimiento} onChange={formik.handleChange} />
                            </div>
                            <div className='sm:col-span-2'>
                                <Label htmlFor='direccion'>Dirección</Label>
                                <Input id='direccion' name='direccion' value={formik.values.direccion} onChange={formik.handleChange} placeholder='Calle 123, Ciudad...' />
                            </div>
                        </div>
                    </CardBody>
                    <CardFooter>
                        <div className='flex justify-end gap-2'>
                            <Button type='button' onClick={() => setEditando(false)} isDisable={guardando}>Cancelar</Button>
                            <Button variant='solid' type='button' onClick={() => formik.handleSubmit()} isLoading={guardando}>Guardar cambios</Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ── Modo lectura ──────────────────────────────────────────────────
    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <span>Identificación del Trabajador</span>
                        {esNuevoTrabajador && (
                            <Badge variant='outline' color='amber'>Pendiente de aprobación</Badge>
                        )}
                    </div>
                    {esEditable && (
                        <Button variant='solid' icon='HeroPencil' size='sm' onClick={() => setEditando(true)} />
                    )}
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3'>
                        <Campo label='Nombre completo' value={nombre} />
                        <Campo label='RUT' value={rut} />
                        <Campo label='Email' value={email} />
                        <Campo label='Teléfono' value={telefono} />
                        <Campo label='Fecha de nacimiento' value={fechaNac} />
                        <Campo label='Nacionalidad' value={nacionalidad} />
                    </div>
                    {direccion && (
                        <div className='mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-700'>
                            <Campo label='Dirección' value={direccion} />
                        </div>
                    )}
                    {contrato.empresa_nombre && (
                        <div className='mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-700'>
                            <div className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3'>
                                <Campo label='Empresa' value={contrato.empresa_nombre} />
                                {contrato.sucursal_nombre && (
                                    <Campo label='Sucursal' value={contrato.sucursal_nombre} />
                                )}
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default TabTrabajadorTrabajador;
