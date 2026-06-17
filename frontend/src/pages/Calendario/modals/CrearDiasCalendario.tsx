import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { listaDiasCalendarioThunk, useAppDispatch, useAppSelector } from '@/store';
import { useState } from 'react';
import { toast } from 'react-toastify';

function CrearDiasCalendario() {
    const dispatch = useAppDispatch();
    const { listaDiasCalendario } = useAppSelector((state) => state.calendario);
    const [anioSelected, setAnioSelected] = useState<TSelectOption | undefined>();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const diasDelAnio = anioSelected
        ? listaDiasCalendario.filter(
              (d) => new Date(d.fecha).getFullYear() === Number(anioSelected.value),
          ).length
        : 0;

    const yaExiste = diasDelAnio > 0;

    return (
        <>
            <Tooltip text='Crear Dias'>
                <Button
                    variant='solid'
                    onClick={() => setIsOpen(true)}
                    icon='HeroPlus'></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Feriados</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-3'>
                        <div className='w-full'>
                            <Badge>Año</Badge>
                            <SelectReact
                                name='anio'
                                options={[
                                    { value: '2024', label: '2024' },
                                    { value: '2025', label: '2025' },
                                    { value: '2026', label: '2026' },
                                    { value: '2027', label: '2027' },
                                ]}
                                onChange={(e) => setAnioSelected(e as TSelectOption)}
                                placeholder='Seleccione un año'
                                noOptionsMessage={(e) => `No hay ${e}`}
                            />
                        </div>
                        {anioSelected && yaExiste && (
                            <Alert
                                color='amber'
                                icon='HeroExclamationTriangle'>
                                El año {anioSelected.label} ya tiene {diasDelAnio} feriados registrados.
                                Al continuar se sobreescribirán, perdiendo cualquier edición manual.
                            </Alert>
                        )}
                        {anioSelected && !yaExiste && (
                            <Alert
                                color='emerald'
                                icon='HeroCheckCircle'>
                                No hay feriados registrados para {anioSelected.label}. Se generarán desde la API oficial.
                            </Alert>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                                setAnioSelected(undefined);
                            }}></Button>
                        <Button
                            variant='solid'
                            color={yaExiste ? 'amber' : 'blue'}
                            isDisable={!anioSelected}
                            onClick={async () => {
                                if (!anioSelected) return;
                                try {
                                    await ApiService.fetchData({
                                        url: `/api/dias-calendario/generar_calendario_anual/`,
                                        method: 'post',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ anio: anioSelected.value }),
                                    });
                                    toast.success(
                                        yaExiste
                                            ? `Feriados de ${anioSelected.label} actualizados`
                                            : `Feriados de ${anioSelected.label} creados`,
                                        { autoClose: 1500 },
                                    );
                                    dispatch(listaDiasCalendarioThunk());
                                    setIsOpen(false);
                                    setAnioSelected(undefined);
                                } catch (error: any) {
                                    toast.error(error?.response?.data?.detail ?? 'Error al generar feriados');
                                }
                            }}>
                            {yaExiste ? 'Sobreescribir' : 'Crear'}
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearDiasCalendario;
