import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import type { IGrupoTurno, IGrupoTurnoWrite, ISlotTurnoWrite } from '@/interface/rrhh.interface';
import {
    useGetGruposTurnoQuery,
    useCreateGrupoTurnoMutation,
    useUpdateGrupoTurnoMutation,
    useNuevaVersionGrupoTurnoMutation,
} from '@/store/slices/rrhh/grupoTurnoApi';
import { useGetTurnosLaboralQuery } from '@/store/slices/rrhh/turnoLaboralApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

// ── Tipos locales ────────────────────────────────────────────────────────────

type TCiclo = 'semanal' | 'quincenal' | 'mensual';
type TFase = 1 | 2 | 3;

interface ISlotDraft {
    turno_id: number | '';
    orden: number;
}

interface IGrupoDraft {
    nombre: string;
    ciclo: TCiclo;
    activo: boolean;
    slots: ISlotDraft[];
}

const GRUPO_VACIO: IGrupoDraft = {
    nombre: '',
    ciclo: 'semanal',
    activo: true,
    slots: [],
};

const CICLO_OPTS: TSelectOption[] = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
];

const CICLO_COLOR: Record<TCiclo, 'blue' | 'violet' | 'emerald'> = {
    semanal: 'blue',
    quincenal: 'violet',
    mensual: 'emerald',
};

// ── Mini-preview de slots ─────────────────────────────────────────────────────

interface ISlotPreviewProps {
    slots: ISlotDraft[];
    turnos: import('@/interface/rrhh.interface').ITurnoLaboral[];
}

const SlotPreview = ({ slots, turnos }: ISlotPreviewProps) => {
    const slotsConNombre = slots
        .filter((s) => s.turno_id !== '')
        .map((s) => {
            const t = turnos.find((x) => x.id === s.turno_id);
            return t ? `T${s.orden} ${t.hora_inicio}–${t.hora_fin}` : null;
        })
        .filter(Boolean);

    if (slotsConNombre.length === 0) return null;

    return (
        <div className='mt-2 flex flex-wrap gap-1'>
            {slotsConNombre.map((chip, i) => (
                <span
                    key={i}
                    className='rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
                    {chip}
                </span>
            ))}
        </div>
    );
};

// ── Modal de creación / edición ───────────────────────────────────────────────

interface IModalGrupoProps {
    isOpen: boolean;
    onClose: () => void;
    grupoEditar?: IGrupoTurno | null;
    empresaId: number;
}

const ModalGrupo = ({ isOpen, onClose, grupoEditar, empresaId }: IModalGrupoProps) => {
    const [fase, setFase] = useState<TFase>(1);
    const [draft, setDraft] = useState<IGrupoDraft>(GRUPO_VACIO);

    const { data: turnos = [] } = useGetTurnosLaboralQuery(
        empresaId ? { empresa_id: empresaId } : undefined,
    );

    const [crear, { isLoading: creando }] = useCreateGrupoTurnoMutation();
    const [actualizar, { isLoading: actualizando }] = useUpdateGrupoTurnoMutation();
    const isLoading = creando || actualizando;

    // Opciones de turno para el selector
    const turnoOpts: TSelectOption[] = turnos.map((t) => ({
        value: String(t.id),
        label: `${t.nombre} (${t.hora_inicio}–${t.hora_fin})`,
    }));

    useEffect(() => {
        if (isOpen) {
            setFase(1);
            if (grupoEditar) {
                setDraft({
                    nombre: grupoEditar.nombre,
                    ciclo: grupoEditar.ciclo,
                    activo: grupoEditar.activo,
                    slots: grupoEditar.slots.map((s) => ({ turno_id: s.turno, orden: s.orden })),
                });
            } else {
                setDraft(GRUPO_VACIO);
            }
        }
    }, [isOpen, grupoEditar]);

    // ── Handlers de slots ──────────────────────────────────────────────────────

    const agregarSlot = () => {
        const siguienteOrden = draft.slots.length + 1;
        setDraft((p) => ({ ...p, slots: [...p.slots, { turno_id: '', orden: siguienteOrden }] }));
    };

    const quitarSlot = (idx: number) => {
        setDraft((p) => {
            const nuevos = p.slots.filter((_, i) => i !== idx).map((s, i) => ({ ...s, orden: i + 1 }));
            return { ...p, slots: nuevos };
        });
    };

    const setSlotTurno = (idx: number, turnoId: number | '') => {
        setDraft((p) => {
            const slots = [...p.slots];
            slots[idx] = { ...slots[idx], turno_id: turnoId };
            return { ...p, slots };
        });
    };

    // ── Validaciones por fase ─────────────────────────────────────────────────

    const fase1Valida = draft.nombre.trim().length > 0;
    const fase2Valida = draft.slots.length > 0 && draft.slots.every((s) => s.turno_id !== '');

    // ── Submit final ──────────────────────────────────────────────────────────

    const submit = async () => {
        if (!fase1Valida || !fase2Valida) {
            toast.error('Completa todos los campos obligatorios.');
            return;
        }

        const payload: IGrupoTurnoWrite = {
            nombre: draft.nombre.trim(),
            ciclo: draft.ciclo,
            activo: draft.activo,
            slots_write: draft.slots.map((s) => ({
                turno: s.turno_id as number,
                orden: s.orden,
            } satisfies ISlotTurnoWrite)),
        };

        try {
            if (grupoEditar) {
                await actualizar({ id: grupoEditar.id, ...payload }).unwrap();
                toast.success('Grupo de turnos actualizado.');
            } else {
                await crear({ ...payload, empresa_id: empresaId }).unwrap();
                toast.success('Grupo de turnos creado.');
            }
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={(v) => { if (!v) onClose(); }} size='md'>
            <ModalHeader>
                <div className='flex items-center gap-3'>
                    <span>{grupoEditar ? 'Editar grupo de turnos' : 'Nuevo grupo de turnos'}</span>
                    <div className='flex gap-1'>
                        {([1, 2, 3] as TFase[]).map((f) => (
                            <span
                                key={f}
                                className={[
                                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                                    fase === f
                                        ? 'bg-blue-500 text-white'
                                        : fase > f
                                          ? 'bg-emerald-500 text-white'
                                          : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400',
                                ].join(' ')}>
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
            </ModalHeader>

            <ModalBody>
                {/* ── Fase 1: Info básica ── */}
                {fase === 1 && (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='gt_nombre'>Nombre <span className='text-red-500'>*</span></Label>
                            <Input
                                id='gt_nombre'
                                name='gt_nombre'
                                value={draft.nombre}
                                onChange={(e) => setDraft((p) => ({ ...p, nombre: e.target.value }))}
                                placeholder='Ej: Turno rotativo 2 semanas'
                            />
                        </div>
                        <div>
                            <Label htmlFor='gt_ciclo'>Ciclo <span className='text-red-500'>*</span></Label>
                            <SelectReact
                                id='gt_ciclo'
                                name='gt_ciclo'
                                options={CICLO_OPTS}
                                value={CICLO_OPTS.find((o) => o.value === draft.ciclo) ?? null}
                                onChange={(opt) => setDraft((p) => ({ ...p, ciclo: (opt as TSelectOption).value as TCiclo }))}
                            />
                        </div>
                        <div className='flex items-center gap-2'>
                            <input
                                id='gt_activo'
                                type='checkbox'
                                className='h-4 w-4 rounded border-zinc-300 text-blue-600'
                                checked={draft.activo}
                                onChange={(e) => setDraft((p) => ({ ...p, activo: e.target.checked }))}
                            />
                            <Label htmlFor='gt_activo' className='mb-0 cursor-pointer'>Activo</Label>
                        </div>
                    </div>
                )}

                {/* ── Fase 2: Slots ── */}
                {fase === 2 && (
                    <div className='space-y-4'>
                        <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                            Agrega los turnos en orden. El orden determina la secuencia de rotación del ciclo <strong>{draft.ciclo}</strong>.
                        </p>
                        {draft.slots.length === 0 && (
                            <p className='rounded border border-dashed border-zinc-300 py-4 text-center text-sm text-zinc-400 dark:border-zinc-600'>
                                Sin slots. Agrega al menos uno.
                            </p>
                        )}
                        <div className='space-y-2'>
                            {draft.slots.map((slot, idx) => (
                                <div key={idx} className='flex items-center gap-2'>
                                    <span className='w-6 flex-shrink-0 text-center text-xs font-semibold text-zinc-500'>
                                        {slot.orden}
                                    </span>
                                    <div className='flex-1'>
                                        <SelectReact
                                            name={`slot_turno_${idx}`}
                                            options={turnoOpts}
                                            value={turnoOpts.find((o) => o.value === String(slot.turno_id)) ?? null}
                                            onChange={(opt) => setSlotTurno(idx, opt ? Number((opt as TSelectOption).value) : '')}
                                            placeholder='Selecciona un turno'
                                        />
                                    </div>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        color='red'
                                        icon='HeroXMark'
                                        onClick={() => quitarSlot(idx)}
                                    />
                                </div>
                            ))}
                        </div>
                        <Button
                            variant='outline'
                            icon='HeroPlusCircle'
                            onClick={agregarSlot}
                            size='sm'>
                            Agregar slot
                        </Button>
                        <SlotPreview slots={draft.slots} turnos={turnos} />
                    </div>
                )}

                {/* ── Fase 3: Preview final ── */}
                {fase === 3 && (
                    <div className='space-y-4'>
                        <p className='text-sm font-medium text-zinc-600 dark:text-zinc-300'>
                            Revisa el grupo antes de guardar:
                        </p>
                        <div className='rounded-lg border border-zinc-200 p-4 dark:border-zinc-700'>
                            <div className='mb-3 flex items-center gap-2'>
                                <span className='text-base font-semibold'>{draft.nombre}</span>
                                <Badge variant='outline' color={CICLO_COLOR[draft.ciclo]}>
                                    {draft.ciclo}
                                </Badge>
                                <Badge variant='outline' color={draft.activo ? 'emerald' : 'zinc'}>
                                    {draft.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>
                            <div className='space-y-1'>
                                {draft.slots.map((slot, idx) => {
                                    const t = turnos.find((x) => x.id === slot.turno_id);
                                    return (
                                        <div key={idx} className='flex items-center gap-2 text-sm'>
                                            <span className='w-6 rounded bg-zinc-100 px-1 text-center text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'>
                                                T{slot.orden}
                                            </span>
                                            <span className='font-medium'>{t?.nombre ?? '—'}</span>
                                            <span className='text-zinc-400'>
                                                {t ? `${t.hora_inicio}–${t.hora_fin}` : ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </ModalBody>

            <ModalFooter>
                <ModalFooterChild>
                    {fase > 1 ? (
                        <Button onClick={() => setFase((f) => (f - 1) as TFase)}>Atrás</Button>
                    ) : (
                        <Button onClick={onClose}>Cancelar</Button>
                    )}
                </ModalFooterChild>
                <ModalFooterChild>
                    {fase < 3 ? (
                        <Button
                            variant='solid'
                            color='blue'
                            isDisable={fase === 1 ? !fase1Valida : !fase2Valida}
                            onClick={() => setFase((f) => (f + 1) as TFase)}>
                            Siguiente
                        </Button>
                    ) : (
                        <Button
                            variant='solid'
                            color='blue'
                            isDisable={isLoading}
                            onClick={submit}>
                            {isLoading ? 'Guardando...' : grupoEditar ? 'Guardar cambios' : 'Crear grupo'}
                        </Button>
                    )}
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

// ── Tab principal ─────────────────────────────────────────────────────────────

interface ITabGruposTurnosProps {
    empresaId: number | '';
}

const TabGruposTurnos = ({ empresaId }: ITabGruposTurnosProps) => {
    const { data: grupos = [], isLoading } = useGetGruposTurnoQuery(
        { empresa_id: empresaId },
        { skip: !empresaId },
    );
    const [nuevaVersion, { isLoading: generandoVersion }] = useNuevaVersionGrupoTurnoMutation();

    const [modalAbierto, setModalAbierto] = useState(false);
    const [grupoEditar, setGrupoEditar] = useState<IGrupoTurno | null>(null);

    const abrirNuevo = () => {
        setGrupoEditar(null);
        setModalAbierto(true);
    };

    const abrirEditar = (grupo: IGrupoTurno) => {
        setGrupoEditar(grupo);
        setModalAbierto(true);
    };

    const handleNuevaVersion = async (grupo: IGrupoTurno) => {
        const ok = await confirmAlert({
            title: `¿Nueva versión de "${grupo.nombre}"?`,
            text: 'Se creará una copia editable del grupo actual. El grupo original quedará inactivo.',
            confirmText: 'Crear versión',
            cancelText: 'Cancelar',
            icon: 'warning',
            confirmColor: '#f59e0b',
        });
        if (!ok) return;
        try {
            await nuevaVersion(grupo.id).unwrap();
            toast.success('Nueva versión creada.');
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    if (!empresaId) {
        return (
            <Alert variant='outline' color='blue' icon='HeroInformationCircle'>
                Selecciona una empresa para gestionar sus grupos de turnos.
            </Alert>
        );
    }

    if (isLoading) return <p className='py-6 text-center text-sm text-zinc-400'>Cargando...</p>;

    return (
        <div className='space-y-4'>
            <div className='flex justify-end'>
                <Button variant='solid' color='blue' icon='HeroPlusCircle' onClick={abrirNuevo}>
                    Nuevo grupo
                </Button>
            </div>

            <Table>
                <THead>
                    <Tr>
                        <Th>Nombre</Th>
                        <Th>Ciclo</Th>
                        <Th>Slots</Th>
                        <Th>Estado</Th>
                        <Th> </Th>
                    </Tr>
                </THead>
                <TBody>
                    {grupos.length === 0 && (
                        <Tr>
                            <Td colSpan={5} className='py-4 text-center text-sm text-zinc-400'>
                                Sin grupos de turnos. Crea el primero con el botón de arriba.
                            </Td>
                        </Tr>
                    )}
                    {grupos.map((grupo) => (
                        <Tr key={grupo.id}>
                            <Td className='font-medium'>{grupo.nombre}</Td>
                            <Td>
                                <Badge variant='outline' color={CICLO_COLOR[grupo.ciclo]}>
                                    {grupo.ciclo}
                                </Badge>
                            </Td>
                            <Td>
                                {grupo.slots.length === 0 ? (
                                    <span className='text-sm text-zinc-400'>—</span>
                                ) : (
                                    <div className='flex flex-wrap gap-1'>
                                        {grupo.slots
                                            .slice()
                                            .sort((a, b) => a.orden - b.orden)
                                            .map((slot) => (
                                                <span
                                                    key={slot.id}
                                                    className='rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'>
                                                    T{slot.orden} {slot.turno_hora_inicio}–{slot.turno_hora_fin}
                                                </span>
                                            ))}
                                    </div>
                                )}
                            </Td>
                            <Td>
                                <Badge variant='outline' color={grupo.activo ? 'emerald' : 'zinc'}>
                                    {grupo.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </Td>
                            <Td>
                                <div className='flex gap-1'>
                                    <Button size='sm' variant='outline' onClick={() => abrirEditar(grupo)}>
                                        Editar
                                    </Button>
                                    {grupo.activo && (
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            color='amber'
                                            isDisable={generandoVersion}
                                            onClick={() => handleNuevaVersion(grupo)}>
                                            Nueva versión
                                        </Button>
                                    )}
                                </div>
                            </Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>

            {empresaId && (
                <ModalGrupo
                    isOpen={modalAbierto}
                    onClose={() => { setModalAbierto(false); setGrupoEditar(null); }}
                    grupoEditar={grupoEditar}
                    empresaId={empresaId as number}
                />
            )}
        </div>
    );
};

export default TabGruposTurnos;
