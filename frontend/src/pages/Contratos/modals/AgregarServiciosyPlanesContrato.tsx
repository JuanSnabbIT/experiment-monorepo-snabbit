import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import {
    IAlcanceComercialPayload,
    IContratoEmpresaCliente,
} from '@/interface/contrato.interface';
import { useEditarAlcanceComercialMutation } from '@/store/slices/contratos/contratoApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import SelectorPlanServicios from '../components/SelectorPlanServicios';
import { ISeleccionPlanServicios } from '../components/contrato.types';

interface IAgregarServiciosyPlanesContratoProps {
    contrato: IContratoEmpresaCliente;
    isDisabled?: boolean;
}

const SELECCION_VACIA: ISeleccionPlanServicios = {
    modo: 'plan',
    plan_id: null,
    plan_cantidad: 1,
    plan_precio_unitario: 0,
    plan_num_visitas_mensuales: null,
    servicios: [],
};

function mapItemsComercialesToSeleccion(
    contrato: IContratoEmpresaCliente,
): ISeleccionPlanServicios {
    const items = contrato.items_comerciales ?? [];
    const itemPlan = items.find((i) => i.tipo_origen === 'plan');

    if (itemPlan && itemPlan.plan_version) {
        const addons = items.filter(
            (i) => i.tipo_origen === 'servicio' && i.es_addon && i.servicio_version,
        );
        return {
            modo: 'plan',
            plan_id: itemPlan.plan_version.id,
            plan_cantidad: itemPlan.cantidad,
            plan_precio_unitario: Number(itemPlan.precio_unitario_contratado),
            plan_num_visitas_mensuales: itemPlan.num_visitas_mensuales ?? null,
            servicios: addons.map((a) => ({
                servicio_id: a.servicio_version!.id,
                cantidad: a.cantidad,
                precio_unitario: Number(a.precio_unitario_contratado),
            })),
        };
    }

    const serviciosItems = items.filter(
        (i) => i.tipo_origen === 'servicio' && i.servicio_version,
    );
    if (serviciosItems.length > 0) {
        return {
            modo: 'personalizado',
            plan_id: null,
            plan_cantidad: 1,
            plan_precio_unitario: 0,
            plan_num_visitas_mensuales: null,
            servicios: serviciosItems.map((s) => ({
                servicio_id: s.servicio_version!.id,
                cantidad: s.cantidad,
                precio_unitario: Number(s.precio_unitario_contratado),
            })),
        };
    }

    return { ...SELECCION_VACIA };
}

function buildAlcanceComercialPayload(
    seleccion: ISeleccionPlanServicios,
): IAlcanceComercialPayload {
    if (seleccion.plan_id === null && seleccion.servicios.length === 0) {
        return { modo: 'vacio' };
    }

    if (seleccion.modo === 'plan' && seleccion.plan_id) {
        return {
            modo: 'plan',
            plan_id: seleccion.plan_id,
            plan: {
                tipo_origen: 'plan',
                version_id: seleccion.plan_id,
                cantidad: seleccion.plan_cantidad,
                precio_unitario_contratado: seleccion.plan_precio_unitario,
                ...(seleccion.plan_num_visitas_mensuales != null && {
                    num_visitas_mensuales: seleccion.plan_num_visitas_mensuales,
                }),
            },
            addons: seleccion.servicios.map((s) => ({
                tipo_origen: 'servicio' as const,
                version_id: s.servicio_id,
                cantidad: s.cantidad,
                precio_unitario_contratado: s.precio_unitario,
                es_addon: true,
            })),
            servicios: [],
        };
    }

    return {
        modo: 'personalizado',
        plan_id: null,
        plan: null,
        addons: [],
        servicios: seleccion.servicios.map((s) => ({
            tipo_origen: 'servicio' as const,
            version_id: s.servicio_id,
            cantidad: s.cantidad,
            precio_unitario_contratado: s.precio_unitario,
        })),
    };
}

function AgregarServiciosyPlanesContrato({
    contrato,
    isDisabled = false,
}: IAgregarServiciosyPlanesContratoProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [seleccion, setSeleccion] = useState<ISeleccionPlanServicios>(SELECCION_VACIA);
    const [editarAlcanceComercial, { isLoading: guardando }] = useEditarAlcanceComercialMutation();

    useEffect(() => {
        if (isOpen) {
            setSeleccion(mapItemsComercialesToSeleccion(contrato));
        }
    }, [isOpen, contrato]);

    const handleGuardar = async () => {
        try {
            await editarAlcanceComercial({
                id: contrato.id,
                alcance_comercial: buildAlcanceComercialPayload(seleccion),
            }).unwrap();
            setIsOpen(false);
            toast.success('Plan y servicios actualizados');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <>
            <Tooltip text='Editar plan y servicios'>
                <Button
                    variant='outline'
                    color='blue'
                    icon='HeroPencil'
                    isDisable={isDisabled}
                    className='text-blue-500'
                    onClick={() => {
                        if (!isDisabled) setIsOpen(true);
                    }}>
                    Editar
                </Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='xl'>
                <ModalHeader>Plan y servicios del contrato</ModalHeader>
                <ModalBody>
                    <SelectorPlanServicios value={seleccion} onChange={setSeleccion} />
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild />
                    <ModalFooterChild>
                        <Button color='red' onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant='solid' isLoading={guardando} onClick={handleGuardar}>
                            Guardar
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default AgregarServiciosyPlanesContrato;
