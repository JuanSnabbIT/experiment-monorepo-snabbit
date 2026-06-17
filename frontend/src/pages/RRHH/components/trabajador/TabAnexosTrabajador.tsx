import FileInput from '@/components/form/FileInput';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import type { IAnexoContrato, IContratoTrabajador } from '@/interface/rrhh.interface';
import ApiService from '@/services/ApiService';
import {
    useCrearAnexoContratoMutation,
    useGetAnexosContratoQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';

const TIPO_ANEXO_OPTIONS: TSelectOption[] = [
    { value: 'modificacion_sueldo', label: 'Modificacion de sueldo' },
    { value: 'modificacion_cargo', label: 'Modificacion de cargo' },
    { value: 'modificacion_jornada', label: 'Modificacion de jornada' },
    { value: 'prorroga', label: 'Prorroga / extension' },
    { value: 'otro', label: 'Otro' },
];

interface IProps {
    contrato: IContratoTrabajador;
}

interface IAnexoCardProps {
    a: IAnexoContrato;
    onDescargar: (url: string, id: number) => void;
}

const AnexoCard = ({ a, onDescargar }: IAnexoCardProps) => (
    <div className='rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800'>
        <div className='flex items-start justify-between gap-2'>
            <div>
                <div className='flex items-center gap-2'>
                    {a.numero_anexo && (
                        <span className='shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-xs font-bold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'>
                            N°{a.numero_anexo}
                        </span>
                    )}
                    <p className='text-sm font-semibold text-zinc-800 dark:text-zinc-100'>
                        {a.tipo_label ?? a.tipo}
                    </p>
                </div>
                <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                    Efectivo:{' '}
                    {a.fecha_efectiva ? dayjs(a.fecha_efectiva).format('DD/MM/YYYY') : '—'}
                    {a.nueva_fecha_termino && (
                        <> &bull; Nueva fecha termino: {dayjs(a.nueva_fecha_termino).format('DD/MM/YYYY')}</>
                    )}
                </p>
                {a.descripcion && (
                    <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-300'>{a.descripcion}</p>
                )}
            </div>
            {a.archivo_pdf && (
                <Button
                    icon='HeroDocumentArrowDown'
                    size='sm'
                    onClick={() => onDescargar(a.archivo_pdf!, a.id)}>
                    Descargar PDF
                </Button>
            )}
        </div>
    </div>
);

const TabAnexosTrabajador = ({ contrato }: IProps) => {
    const { data: anexos = [], isLoading } = useGetAnexosContratoQuery(contrato.id);
    const [crearAnexo, { isLoading: creando }] = useCrearAnexoContratoMutation();

    const [formVisible, setFormVisible] = useState(false);
    const [tipo, setTipo] = useState<TSelectOption | null>(null);
    const [fechaEfectiva, setFechaEfectiva] = useState('');
    const [nuevaFechaTermino, setNuevaFechaTermino] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
    const [formErrors, setFormErrors] = useState({ tipo: '', fechaEfectiva: '', descripcion: '' });
    const fileRef = useRef<HTMLInputElement>(null);

    const estado = contrato.estado;
    const esBorrador = estado === 'borrador';
    const esPendiente = estado === 'pendiente_aprobacion';
    const esVigente = estado === 'vigente';
    const esFinal = estado === 'terminado' || estado === 'anulado';
    const puedeCrear = esVigente;
    const esProrroga = tipo?.value === 'prorroga';

    const handleDescargarPdf = async (url: string, id: number) => {
        try {
            const response = await ApiService.fetchData<Blob>({
                url,
                method: 'get',
                responseType: 'blob',
            });
            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' }),
            );
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `anexo_${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const resetForm = () => {
        setTipo(null);
        setFechaEfectiva('');
        setNuevaFechaTermino('');
        setDescripcion('');
        setArchivoPdf(null);
        setFormErrors({ tipo: '', fechaEfectiva: '', descripcion: '' });
        if (fileRef.current) fileRef.current.value = '';
        setFormVisible(false);
    };

    const handleCrear = async () => {
        const errs = {
            tipo: !tipo ? 'Requerido' : '',
            fechaEfectiva: !fechaEfectiva ? 'Requerido' : '',
            descripcion: !descripcion.trim() ? 'Requerido' : '',
        };
        setFormErrors(errs);
        if (Object.values(errs).some(Boolean)) return;

        const ok = await confirmAlert({
            title: 'Crear anexo',
            text: 'El anexo quedará registrado de forma permanente y no podrá eliminarse.',
            confirmText: 'Crear anexo',
            icon: 'warning',
        });
        if (!ok) return;

        const fd = new FormData();
        fd.append('contrato', String(contrato.id));
        fd.append('tipo', tipo!.value);
        fd.append('fecha_efectiva', fechaEfectiva);
        fd.append('descripcion', descripcion.trim());
        if (esProrroga && nuevaFechaTermino) fd.append('nueva_fecha_termino', nuevaFechaTermino);
        if (archivoPdf) fd.append('archivo_pdf', archivoPdf);
        try {
            await crearAnexo(fd).unwrap();
            toast.success('Anexo creado correctamente.');
            resetForm();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    if (esBorrador || esPendiente) {
        return (
            <Card>
                <CardBody>
                    <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                        Los anexos están disponibles únicamente cuando el contrato está Vigente.
                    </Alert>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className='space-y-4'>
            {esVigente && (
                <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                    Para modificar condiciones laborales (sueldo, cargo, jornada), crea un anexo
                    en lugar de un nuevo contrato. Esto preserva la antigüedad del trabajador.
                </Alert>
            )}
            {/* Lista de anexos */}
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between w-full'>
                        <span>{esFinal ? 'Historial de Anexos' : 'Anexos del Contrato'}</span>
                        {esFinal && (
                            <Badge color='zinc' variant='outline'>
                                Solo lectura
                            </Badge>
                        )}
                        {puedeCrear && !formVisible && (
                            <Button
                                icon='HeroPlus'
                                variant='solid'
                                size='sm'
                                onClick={() => setFormVisible(true)}>
                                Agregar anexo
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody>
                    {isLoading ? (
                        <p className='text-sm text-zinc-500'>Cargando...</p>
                    ) : anexos.length === 0 ? (
                        <p className='text-sm text-zinc-400'>No hay anexos registrados.</p>
                    ) : (
                        <div className='space-y-3'>
                            {anexos.map((a: IAnexoContrato) => (
                                <AnexoCard key={a.id} a={a} onDescargar={handleDescargarPdf} />
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Formulario nuevo anexo - solo en vigente */}
            {puedeCrear && formVisible && (
                <Card>
                    <CardHeader>Nuevo anexo</CardHeader>
                    <CardBody>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='anexo_tipo'>Tipo de anexo</Label>
                                    <SelectReact
                                        name='anexo_tipo'
                                        options={TIPO_ANEXO_OPTIONS}
                                        value={tipo}
                                        onChange={(opt) => {
                                            setTipo(opt as TSelectOption | null);
                                            setFormErrors((prev) => ({ ...prev, tipo: '' }));
                                        }}
                                        placeholder='Seleccionar...'
                                    />
                                    {formErrors.tipo && (
                                        <p className='mt-1 text-xs text-red-500'>{formErrors.tipo}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor='anexo_fecha'>Fecha efectiva</Label>
                                    <Input
                                        id='anexo_fecha'
                                        name='anexo_fecha'
                                        type='date'
                                        value={fechaEfectiva}
                                        onChange={(e) => {
                                            setFechaEfectiva(e.target.value);
                                            setFormErrors((prev) => ({ ...prev, fechaEfectiva: '' }));
                                        }}
                                    />
                                    {formErrors.fechaEfectiva && (
                                        <p className='mt-1 text-xs text-red-500'>{formErrors.fechaEfectiva}</p>
                                    )}
                                </div>
                            </div>
                            {esProrroga && (
                                <div>
                                    <Label htmlFor='anexo_nueva_fecha_termino'>
                                        Nueva fecha de termino (prorroga)
                                    </Label>
                                    <Input
                                        id='anexo_nueva_fecha_termino'
                                        name='anexo_nueva_fecha_termino'
                                        type='date'
                                        value={nuevaFechaTermino}
                                        onChange={(e) => setNuevaFechaTermino(e.target.value)}
                                    />
                                    <p className='mt-1 text-xs text-zinc-500'>
                                        Si se indica, actualizara la fecha de termino del contrato al guardar.
                                    </p>
                                </div>
                            )}
                            <div>
                                <Label htmlFor='anexo_descripcion'>Descripcion</Label>
                                <Textarea
                                    id='anexo_descripcion'
                                    value={descripcion}
                                    onChange={(e) => {
                                        setDescripcion(e.target.value);
                                        setFormErrors((prev) => ({ ...prev, descripcion: '' }));
                                    }}
                                    placeholder='Describe el cambio o modificacion...'
                                    rows={3}
                                />
                                {formErrors.descripcion && (
                                    <p className='mt-1 text-xs text-red-500'>{formErrors.descripcion}</p>
                                )}
                            </div>
                            <FileInput
                                ref={fileRef}
                                id='anexo_pdf'
                                name='anexo_pdf'
                                label='PDF del anexo (opcional)'
                                accept='application/pdf'
                                selectedFile={archivoPdf}
                                onFileSelect={(file) => setArchivoPdf(file)}
                            />
                            <div className='flex gap-2'>
                                <Button
                                    variant='solid'
                                    onClick={handleCrear}
                                    isLoading={creando}
                                    isDisable={creando}>
                                    Guardar anexo
                                </Button>
                                <Button onClick={resetForm} isDisable={creando}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default TabAnexosTrabajador;
