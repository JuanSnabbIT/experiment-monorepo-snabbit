import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';
import { useActualizarDatosRelacionadosContratoMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { useFormik } from 'formik';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import TabBancoTrabajador from './TabBancoTrabajador';
import TabPrevisionTrabajador from './TabPrevisionTrabajador';

interface ITabTrabajadorProps {
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

const TabTrabajadorTrabajador = ({ contrato }: ITabTrabajadorProps) => {
    const esNuevoTrabajador = contrato.datos_trabajador_nuevo != null;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clienteId = searchParams.get('clienteId');
    const dtn = contrato.datos_trabajador_nuevo;

    const nombre =
        contrato.nombre_trabajador ??
        (dtn ? `${dtn.first_name ?? ''} ${dtn.last_name ?? ''}`.trim() || null : null);
    const rut = contrato.rut_trabajador ?? dtn?.rut ?? null;
    const email = contrato.email_trabajador ?? dtn?.email ?? null;
    const telefono = contrato.telefono_trabajador ?? null;
    const fechaNac = contrato.fecha_nacimiento_trabajador ?? dtn?.fecha_nacimiento ?? null;
    const nacionalidad = contrato.nacionalidad_trabajador ?? dtn?.nacionalidad ?? null;
    const direccion = contrato.direccion_trabajador ?? dtn?.direccion ?? null;

    // ── Modal editar (solo borrador) ─────────────────────────────────────────
    const [modalEditarOpen, setModalEditarOpen] = useState(false);
    const [actualizarDatos, { isLoading: guardando }] =
        useActualizarDatosRelacionadosContratoMutation();

    const firstNameInicial =
        dtn?.first_name ?? (nombre?.includes(' ') ? nombre.split(' ')[0] : nombre ?? '');
    const lastNameInicial =
        dtn?.last_name ??
        (nombre?.includes(' ') ? nombre.split(' ').slice(1).join(' ') : '') ?? '';

    const formik = useFormik({
        initialValues: {
            first_name: firstNameInicial ?? '',
            last_name: lastNameInicial ?? '',
            rut: rut ?? '',
            fecha_nacimiento: fechaNac ?? '',
            nacionalidad: nacionalidad ?? '',
            direccion: direccion ?? '',
        },
        enableReinitialize: true,
        onSubmit: async (values) => {
            try {
                const payload: Record<string, unknown> = {
                    first_name: values.first_name,
                    last_name: values.last_name,
                    rut: values.rut || null,
                    fecha_nacimiento: values.fecha_nacimiento || null,
                    nacionalidad: values.nacionalidad || null,
                    direccion: values.direccion || null,
                };
                await actualizarDatos({ id: contrato.id, data: payload }).unwrap();
                toast.success('Datos del trabajador actualizados.');
                setModalEditarOpen(false);
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        },
    });

    const handleCerrarModal = () => {
        formik.resetForm();
        setModalEditarOpen(false);
    };

    // ── Botón "ir a ficha" (estados no borrador) ─────────────────────────────
    const handleIrAFicha = async () => {
        const ok = await confirmAlert({
            title: 'Ir a la ficha del trabajador',
            text: 'Serás redirigido a la ficha del trabajador para editar sus datos personales.',
            confirmText: 'Ir a la ficha',
            cancelText: 'Cancelar',
            icon: 'info',
        });
        if (!ok) return;

        const refId = contrato.usuario_empresa;
        if (clienteId && refId) {
            navigate(`/empresa/detalle-cliente/${clienteId}/trabajador/${refId}`);
        } else if (refId) {
            navigate(`/empresa/detalle-cliente/0/trabajador/${refId}`);
        }
    };

    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <span>Identificación del Trabajador</span>
                        {esNuevoTrabajador && (
                            <Badge variant='outline' color='amber'>
                                Pendiente de aprobación
                            </Badge>
                        )}
                    </div>
                    {contrato.estado === 'borrador' ? (
                        <Tooltip text='Editar datos'>
                            <Button
                                variant='solid'
                                icon='HeroPencilSquare'
                                size='sm'
                                color='blue'
                                onClick={() => setModalEditarOpen(true)}
                            />
                        </Tooltip>
                    ) : contrato.usuario_empresa ? (
                        <Tooltip text='Ir a editar'>
                            <Button
                                variant='solid'
                                icon='HeroArrowTopRightOnSquare'
                                size='sm'
                                color='emerald'
                                onClick={handleIrAFicha}
                            />
                        </Tooltip>
                    ) : null}
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
                </CardBody>
            </Card>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <TabPrevisionTrabajador contrato={contrato} />
                <TabBancoTrabajador contrato={contrato} />
            </div>

            {/* ── Modal editar datos del trabajador ──────────────────────── */}
            <Modal isOpen={modalEditarOpen} setIsOpen={(v) => { if (!v) handleCerrarModal(); }}>
                <ModalHeader>Editar datos del trabajador</ModalHeader>
                <ModalBody>
                    <form id='form-editar-trabajador' onSubmit={formik.handleSubmit}>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div>
                                <Label htmlFor='et_first_name'>Nombre</Label>
                                <Input
                                    id='et_first_name'
                                    name='first_name'
                                    value={formik.values.first_name}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor='et_last_name'>Apellido</Label>
                                <Input
                                    id='et_last_name'
                                    name='last_name'
                                    value={formik.values.last_name}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor='et_rut'>RUT</Label>
                                <Input
                                    id='et_rut'
                                    name='rut'
                                    value={formik.values.rut}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor='et_fecha_nacimiento'>Fecha de nacimiento</Label>
                                <Input
                                    id='et_fecha_nacimiento'
                                    name='fecha_nacimiento'
                                    type='date'
                                    value={formik.values.fecha_nacimiento}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor='et_nacionalidad'>Nacionalidad</Label>
                                <Input
                                    id='et_nacionalidad'
                                    name='nacionalidad'
                                    value={formik.values.nacionalidad}
                                    onChange={formik.handleChange}
                                />
                            </div>
                            <div className='sm:col-span-2'>
                                <Label htmlFor='et_direccion'>Dirección</Label>
                                <Input
                                    id='et_direccion'
                                    name='direccion'
                                    value={formik.values.direccion}
                                    onChange={formik.handleChange}
                                />
                            </div>
                        </div>
                    </form>
                </ModalBody>
                <ModalFooter>
                    <Button color='zinc' onClick={handleCerrarModal} isDisable={guardando}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='blue'
                        type='submit'
                        form='form-editar-trabajador'
                        isDisable={guardando}>
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default TabTrabajadorTrabajador;
