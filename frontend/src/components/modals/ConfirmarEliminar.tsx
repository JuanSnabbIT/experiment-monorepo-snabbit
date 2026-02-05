import React, { forwardRef } from 'react';
import Button, { TButtonSize } from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import ApiService from '@/services/ApiService';
import { confirmAlert } from '@/utils/sweetAlert';
import { toast } from 'react-toastify';

interface ConfirmarEliminarProps {
    mensaje?: string;
    peticionUrl: string;
    onDispatch: () => void;
    nombre?: string | null;
    method?: string;
    values?: any;
    buttonSize?: TButtonSize;
    icon?: string;
    tooltipText?: string;
    color?: string;
}
const ConfirmarEliminar = forwardRef<HTMLButtonElement, ConfirmarEliminarProps>(
    (
        {
            mensaje,
            peticionUrl,
            onDispatch,
            nombre = '',
            method = 'delete',
            values = null,
            buttonSize = 'default',
            icon = 'HeroTrash',
            tooltipText = 'Eliminar',
            color = 'red',
        }: ConfirmarEliminarProps,
        ref,
    ) => {
    const handleDelete = async () => {
        const safeNombre = nombre || '';
        const cleanedMensaje = mensaje ? String(mensaje).trim() : '';
        const hasMensaje = cleanedMensaje && !/\bnull\b|\bundefined\b/i.test(cleanedMensaje);
        const defaultText = safeNombre
            ? `¿Está seguro que desea eliminar «${safeNombre}»? Esta acción no se puede deshacer.`
            : '¿Está seguro que desea eliminar este elemento? Esta acción no se puede deshacer.';

        const confirmed = await confirmAlert({
            title: safeNombre ? `Confirmar eliminación: ${safeNombre}` : 'Confirmar eliminación',
            text: hasMensaje ? cleanedMensaje : defaultText,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            icon: 'warning',
            confirmColor: '#ef4444', // red-500
        });

        if (confirmed) {
            try {
                await ApiService.fetchData({
                    url: peticionUrl,
                    method: method,
                    data: values,
                });
                onDispatch();
                toast.success(
                    safeNombre
                        ? `${safeNombre} eliminado correctamente`
                        : 'Eliminado correctamente',
                    { autoClose: 1000 },
                );
            } catch (error: any) {
                const errorMsg = error.response?.data?.detail || error.message || String(error);
                toast.error(
                    safeNombre
                        ? `Error eliminando ${safeNombre}: ${errorMsg}`
                        : `Error eliminando: ${errorMsg}`,
                );
            }
        }
    };

    return (
        <Tooltip text={tooltipText}>
            <Button
                ref={ref}
                icon={icon}
                color={color as any}
                variant='solid'
                size={buttonSize}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                }}
            />
        </Tooltip>
    );
});

ConfirmarEliminar.displayName = 'ConfirmarEliminar';

export default ConfirmarEliminar;
