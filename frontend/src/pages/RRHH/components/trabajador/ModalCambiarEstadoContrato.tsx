import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
interface Props {
  isOpen: boolean;
  estado: string;
  onConfirm: (data: Record<string, string | undefined>) => Promise<void>;
  onCancel: () => void;
  motivoInicial?: string;
  fechaInicial?: string;
}

const MOTIVO_TERMINO_OPTIONS: TSelectOption[] = [
  // Art. 159 — Sin indemnización
  { value: 'renuncia',                   label: 'Renuncia voluntaria (Art. 159 N°2)' },
  { value: 'mutuo_acuerdo',              label: 'Mutuo acuerdo (Art. 159 N°1)' },
  { value: 'vencimiento_plazo',          label: 'Vencimiento del plazo (Art. 159 N°4)' },
  { value: 'conclusion_obra_faena',      label: 'Conclusión de obra o faena (Art. 159 N°5)' },
  { value: 'caso_fortuito_fuerza_mayor', label: 'Caso fortuito o fuerza mayor (Art. 159 N°6)' },
  // Art. 160 — Sin indemnización (causa imputable)
  { value: 'incumplimiento_grave',       label: 'Incumplimiento grave de obligaciones (Art. 160)' },
  { value: 'falta_probidad',             label: 'Falta de probidad (Art. 160 N°1)' },
  { value: 'inasistencias_injustificadas', label: 'Inasistencias injustificadas (Art. 160 N°3)' },
  { value: 'abandono_trabajo',           label: 'Abandono del trabajo (Art. 160 N°4)' },
  // Art. 161 — Con indemnización
  { value: 'necesidades_empresa',        label: 'Necesidades de la empresa (Art. 161)' },
  { value: 'desahucio_empleador',        label: 'Desahucio del empleador (Art. 161 inc. 2)' },
  // Despido injustificado
  { value: 'despido_injustificado',      label: 'Despido injustificado' },
  { value: 'otro',                       label: 'Otro' },
];

const MOTIVO_ANULACION_OPTIONS: TSelectOption[] = [
  { value: 'error_administrativo', label: 'Error administrativo' },
  { value: 'retiro_solicitud', label: 'Retiro de solicitud' },
  { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo' },
  { value: 'cambio_condiciones', label: 'Cambio en condiciones' },
  { value: 'otro', label: 'Otro' },
];

const ModalCambiarEstadoContrato: React.FC<Props> = ({
  isOpen,
  estado,
  onConfirm,
  onCancel,
  motivoInicial,
  fechaInicial,
}) => {
  const [motivo, setMotivo] = useState<string>(motivoInicial ?? '');
  const [fecha, setFecha] = useState<string>(fechaInicial ?? '');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTerminar = estado === 'terminado';
  const isAnular = estado === 'anulado';

  const motivoOptions = isTerminar ? MOTIVO_TERMINO_OPTIONS : MOTIVO_ANULACION_OPTIONS;
  const motivoKey = isTerminar ? 'motivo_termino' : 'motivo_anulacion';
  const isMotivoBloqueado = !motivo || motivo.trim() === '';

  const handleConfirm = async () => {
    if (isMotivoBloqueado) return;

    try {
      setIsSubmitting(true);
      const payload: Record<string, string | undefined> = {};
      if (isTerminar) {
        payload.motivo_termino = motivo;
        if (fecha) payload.fecha_termino_real = fecha;
        if (observaciones) payload.observaciones_termino = observaciones;
      } else {
        payload.motivo_anulacion = motivo;
        if (observaciones) payload.observaciones_termino = observaciones;
      }
      await onConfirm(payload);
      handleClose();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMotivo('');
    setFecha('');
    setObservaciones('');
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={(v) => !v && handleClose()} size='md'>
      <ModalHeader>
        <div>
          <p className='font-semibold leading-tight'>
            {isTerminar ? 'Terminar contrato' : 'Anular contrato'}
          </p>
          <p className='text-xs font-normal text-zinc-500 dark:text-zinc-400'>
            {isTerminar
              ? 'Proporciona el motivo de terminación del contrato.'
              : 'Proporciona el motivo de anulación del contrato.'}
          </p>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          {/* Nota de pre-llenado automático */}
          {motivoInicial && (
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20'>
              <p className='text-xs text-blue-700 dark:text-blue-300'>
                El motivo y la fecha fueron determinados automáticamente. Puedes modificarlos si el caso lo requiere.
              </p>
            </div>
          )}
          {/* Motivo */}
          <div>
            <Label htmlFor={motivoKey}>
              {isTerminar ? 'Motivo de terminación' : 'Motivo de anulación'}{' '}
              <span className='text-red-500'>*</span>
            </Label>
            <p className='mb-2 text-xs text-zinc-500 dark:text-zinc-400'>
              Selecciona el motivo principal de esta acción.
            </p>
            <SelectReact
              name={motivoKey}
              options={motivoOptions}
              value={
                motivoOptions.find((opt) => opt.value === motivo) ||
                null
              }
              onChange={(opt) => setMotivo(opt ? (opt as TSelectOption).value : '')}
              placeholder='Selecciona un motivo...'
              isClearable
            />
          </div>

          {/* Fecha (si aplica) */}
          {isTerminar && (
            <div>
              <Label htmlFor='fecha_termino_real'>
                Fecha de término
              </Label>
              <p className='mb-2 text-xs text-zinc-500 dark:text-zinc-400'>
                Si es diferente a hoy, especifica la fecha.
              </p>
              <Input
                id='fecha_termino_real'
                name='fecha_termino_real'
                type='date'
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <Label htmlFor='observaciones'>Observaciones</Label>
            <p className='mb-2 text-xs text-zinc-500 dark:text-zinc-400'>
              Detalles adicionales sobre esta acción (opcional).
            </p>
            <textarea
              id='observaciones'
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder='Notas adicionales...'
              rows={3}
              className='w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
            />
          </div>

          {/* Warning */}
          <div className='rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20'>
            <p className='text-xs text-red-700 dark:text-red-200'>
              <span className='font-semibold'>⚠️ Acción irreversible:</span> Esta acción no se puede deshacer.
              {isTerminar && ' El contrato será marcado como terminado.'}
              {isAnular && ' El contrato será anulado.'}
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalFooterChild>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </ModalFooterChild>
        <ModalFooterChild>
          <Button
            variant='solid'
            color='red'
            onClick={handleConfirm}
            disabled={isMotivoBloqueado || isSubmitting}
            isLoading={isSubmitting}
          >
            {isTerminar ? 'Terminar contrato' : 'Anular contrato'}
          </Button>
        </ModalFooterChild>
      </ModalFooter>
    </Modal>
  );
};

export default ModalCambiarEstadoContrato;
