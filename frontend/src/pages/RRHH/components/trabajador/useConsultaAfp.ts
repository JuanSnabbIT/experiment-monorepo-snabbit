import type { IConsultaAfpResponse } from '@/interface/rrhh.interface';
import {
    useDispararConsultaAfpMutation,
    useGetConsultaAfpQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessage } from '@/utils/errorHandlers';
import { confirmAlert } from '@/utils/sweetAlert';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const POLLING_MS = 2500;

/**
 * Advertencia legal previa a consultar spensiones.cl. Devuelve true si el
 * usuario acepta. Se usa en el wizard y en la ficha antes de disparar la
 * consulta al registro público de la Superintendencia de Pensiones.
 */
export const confirmarConsultaAfpLegal = (): Promise<boolean> =>
    confirmAlert({
        title: 'Consulta a registro público',
        text:
            'Se consultará la afiliación previsional del trabajador en el registro ' +
            'público de la Superintendencia de Pensiones (spensiones.cl). El resultado ' +
            'es de carácter referencial y puede tener un desfase de hasta dos meses. ' +
            '¿Deseas continuar?',
        confirmText: 'Sí, consultar',
        cancelText: 'Cancelar',
        icon: 'warning',
    });

/**
 * Encapsula la consulta de afiliación AFP/AFC: dispara la Celery task vía
 * mutation y luego pollea el resultado por RUT contra el cache (Redis).
 * Reutilizable tanto en el wizard como en la ficha del trabajador.
 */
export const useConsultaAfp = () => {
    const [rut, setRut] = useState<string | null>(null);
    // `activo` controla el polling; se apaga al completar/fallar.
    const [activo, setActivo] = useState(false);
    const [resultado, setResultado] = useState<IConsultaAfpResponse | null>(null);

    const [disparar, { isLoading: disparando }] = useDispararConsultaAfpMutation();

    const { data } = useGetConsultaAfpQuery(
        { rut: rut ?? '' },
        { skip: !rut || !activo, pollingInterval: activo ? POLLING_MS : 0 },
    );

    useEffect(() => {
        if (!data) return;
        if (data.status === 'completed' || data.status === 'failed') {
            setResultado(data);
            setActivo(false);
            if (data.status === 'failed') {
                toast.error(data.error || 'No se pudo obtener la afiliación.');
            }
        }
    }, [data]);

    const consultar = useCallback(
        async (rutInput: string, forzar = false) => {
            if (!rutInput) {
                toast.error('No hay RUT disponible para consultar.');
                return;
            }
            setRut(rutInput);
            setResultado(null);
            setActivo(true);
            try {
                const resp = await disparar({ rut: rutInput, forzar }).unwrap();
                // Cache hit: el POST ya trae el resultado, cortamos el polling.
                if (resp.status === 'completed' || resp.status === 'failed') {
                    setResultado(resp);
                    setActivo(false);
                    if (resp.status === 'failed') {
                        toast.error(resp.error || 'No se pudo obtener la afiliación.');
                    }
                }
            } catch (err) {
                setActivo(false);
                toast.error(getErrorMessage(err));
            }
        },
        [disparar],
    );

    const reset = useCallback(() => {
        setRut(null);
        setActivo(false);
        setResultado(null);
    }, []);

    return {
        consultar,
        reset,
        afiliacion: resultado?.status === 'completed' ? resultado.resultado : undefined,
        isConsultando: disparando || activo,
        error: resultado?.status === 'failed' ? resultado.error : undefined,
    };
};
